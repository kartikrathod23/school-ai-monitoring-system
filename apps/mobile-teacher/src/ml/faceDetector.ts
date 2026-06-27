/**
 * ml/faceDetector.ts
 * On-device face detection using ONNX Runtime.
 *
 * Implements SCRFD/RetinaFace logic in TypeScript:
 *  - Letterbox preprocessing
 *  - ONNX inference
 *  - Bounding box decoding (distance2bbox)
 *  - NMS (Non-Maximum Suppression)
 *
 * Cropping is done in pure JavaScript via jpeg-js to avoid
 * expo-image-manipulator's silent failure bug on Android when
 * cropping small regions from large images.
 */

import { DetectedFace } from "./types";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import { Buffer } from "buffer";
import * as jpeg from "jpeg-js";

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const SCORE_THRESHOLD = 0.5;
const NMS_THRESHOLD = 0.4;
const STRIDES = [8, 16, 32];
const SCORE_KEYS = ["443", "468", "493"];
const BBOX_KEYS = ["446", "471", "496"];
const KPS_KEYS = ["449", "474", "499"];
const DET_INPUT_SIZE = 640;

// ArcFace 112x112 alignment constants
const ARCFACE_SIZE = 112;
const ARCFACE_EYE_DIST = 35.2;
const ARCFACE_EYE_Y_RATIO = 0.46;

// ─────────────────────────────────────────────────────────────────
// getImageSize
// ─────────────────────────────────────────────────────────────────
const getImageSize = (
  uri: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
};

// ─────────────────────────────────────────────────────────────────
// resizeImageToBase64
// Uses expo-image-manipulator v14 API to resize only (no crop).
// Resize on a full image works reliably; crop does not on Android.
// ─────────────────────────────────────────────────────────────────
async function resizeImageToBase64(
  uri: string,
  width: number,
  height: number
): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width, height });
  const ref = await ctx.renderAsync();
  const result = await ref.saveAsync({
    format: SaveFormat.JPEG,
    compress: 1.0,
    base64: true,
  });
  if (!result.base64) throw new Error("resizeImageToBase64: no base64 returned");
  return result.base64;
}

// ─────────────────────────────────────────────────────────────────
// cropRGBA
// Pure-JS crop of a decoded RGBA pixel buffer.
// Returns a new RGBA Uint8Array of size (cropW * cropH * 4).
// ─────────────────────────────────────────────────────────────────
function cropRGBA(
  srcData: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  x1: number,
  y1: number,
  cropW: number,
  cropH: number
): Uint8Array {
  const out = new Uint8Array(cropW * cropH * 4);
  for (let row = 0; row < cropH; row++) {
    const srcRow = y1 + row;
    if (srcRow >= srcHeight) break;
    for (let col = 0; col < cropW; col++) {
      const srcCol = x1 + col;
      if (srcCol >= srcWidth) break;
      const srcIdx = (srcRow * srcWidth + srcCol) * 4;
      const dstIdx = (row * cropW + col) * 4;
      out[dstIdx]     = srcData[srcIdx];     // R
      out[dstIdx + 1] = srcData[srcIdx + 1]; // G
      out[dstIdx + 2] = srcData[srcIdx + 2]; // B
      out[dstIdx + 3] = srcData[srcIdx + 3]; // A
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// resizeRGBA
// Pure-JS nearest-neighbour resize of an RGBA pixel buffer.
// Used to scale the cropped face region to ARCFACE_SIZE×ARCFACE_SIZE.
// ─────────────────────────────────────────────────────────────────
function resizeRGBA(
  srcData: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Uint8Array {
  const out = new Uint8Array(dstWidth * dstHeight * 4);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let row = 0; row < dstHeight; row++) {
    const srcRow = Math.min(Math.floor(row * yRatio), srcHeight - 1);
    for (let col = 0; col < dstWidth; col++) {
      const srcCol = Math.min(Math.floor(col * xRatio), srcWidth - 1);
      const srcIdx = (srcRow * srcWidth + srcCol) * 4;
      const dstIdx = (row * dstWidth + col) * 4;
      out[dstIdx]     = srcData[srcIdx];
      out[dstIdx + 1] = srcData[srcIdx + 1];
      out[dstIdx + 2] = srcData[srcIdx + 2];
      out[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// encodeRGBAtoJpegBase64
// Encode a raw RGBA pixel buffer to a JPEG base64 string via jpeg-js.
// ─────────────────────────────────────────────────────────────────
function encodeRGBAtoJpegBase64(
  rgbaData: Uint8Array,
  width: number,
  height: number,
  quality: number = 90
): string {
  const encoded = jpeg.encode(
    { data: rgbaData, width, height },
    quality
  );
  return Buffer.from(encoded.data).toString("base64");
}

// ─────────────────────────────────────────────────────────────────
// IoU + NMS
// ─────────────────────────────────────────────────────────────────
function computeIoU(box1: number[], box2: number[]): number {
  const x1 = Math.max(box1[0], box2[0]);
  const y1 = Math.max(box1[1], box2[1]);
  const x2 = Math.min(box1[2], box2[2]);
  const y2 = Math.min(box1[3], box2[3]);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  const interArea = w * h;
  const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
  const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
  return interArea / (area1 + area2 - interArea);
}

function nms(
  boxes: number[][],
  scores: number[],
  iouThreshold: number
): number[] {
  const indices = Array.from({ length: scores.length }, (_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);
  const keep: number[] = [];
  while (indices.length > 0) {
    const current = indices.shift()!;
    keep.push(current);
    const currentBox = boxes[current];
    for (let i = indices.length - 1; i >= 0; i--) {
      if (computeIoU(currentBox, boxes[indices[i]]) > iouThreshold) {
        indices.splice(i, 1);
      }
    }
  }
  return keep;
}

// ─────────────────────────────────────────────────────────────────
// FaceDetector
// ─────────────────────────────────────────────────────────────────
class FaceDetector {
  private isReady = false;
  private session: InferenceSession | null = null;

  async initialize(): Promise<void> {
    if (this.isReady) return;
    try {
      console.log("[FaceDetector] Loading ONNX model from filesystem...");
      const modelPath = `${FileSystem.documentDirectory}models/det_Det_Retina_Net.onnx`;
      const info = await FileSystem.getInfoAsync(modelPath);
      if (!info.exists) {
        throw new Error("Detector model not found at " + modelPath);
      }
      this.session = await InferenceSession.create(modelPath);
      this.isReady = true;
      console.log("[FaceDetector] Successfully loaded Face Detector ONNX model!");
      console.log("[FaceDetector] Input names:", this.session.inputNames);
      console.log("[FaceDetector] Output names:", this.session.outputNames);
    } catch (err) {
      console.error("[FaceDetector] Failed to initialize:", err);
    }
  }

  async detectFaces(imageBase64: string): Promise<DetectedFace[]> {
    if (!this.isReady || !this.session) {
      console.warn("[FaceDetector] Not initialized.");
      return [];
    }

    // Write base64 to temp file for ImageManipulator resize
    const tempFilePath = `${FileSystem.cacheDirectory}temp_group_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempFilePath, imageBase64, {
      encoding: "base64" as any,
    });

    // FileSystem paths already include file:// on Expo/Android
    const tempFileUri = tempFilePath.startsWith("file://")
      ? tempFilePath
      : `file://${tempFilePath}`;

    try {
      const { width: imgWidth, height: imgHeight } =
        await getImageSize(tempFileUri);
      console.log(`[FaceDetector] Image size: ${imgWidth}x${imgHeight}`);

      // ── 1. Letterbox scale + padding ────────────────────────────────────
      const scale = Math.min(
        DET_INPUT_SIZE / imgWidth,
        DET_INPUT_SIZE / imgHeight
      );
      const newW = Math.round(imgWidth * scale);
      const newH = Math.round(imgHeight * scale);
      const padX = Math.floor((DET_INPUT_SIZE - newW) / 2);
      const padY = Math.floor((DET_INPUT_SIZE - newH) / 2);

      // ── 2. Resize full image for tensor (ImageManipulator resize is fine) ─
      const resizedBase64 = await resizeImageToBase64(tempFileUri, newW, newH);

      // ── 3. Decode resized JPEG → RGBA ────────────────────────────────────
      const resizedBuf = Buffer.from(resizedBase64, "base64");
      const resizedRaw = jpeg.decode(resizedBuf, { useTArray: true });

      // ── 4. Also decode the ORIGINAL full-res JPEG for JS-side cropping ──
      //    We need pixel data from the original so we can crop accurately.
      const origBuf = Buffer.from(imageBase64, "base64");
      const origRaw = jpeg.decode(origBuf, { useTArray: true });
      const pixelRatio = origRaw.width / imgWidth;
      console.log(
        `[FaceDetector] Decoded original: ${origRaw.width}×${origRaw.height} (ratio=${pixelRatio})`
      );

      // ── 5. Build CHW Float32 tensor (1×3×640×640) ────────────────────────
      const float32Data = new Float32Array(
        1 * 3 * DET_INPUT_SIZE * DET_INPUT_SIZE
      ).fill(-0.99609375); // black padding

      const channelOffset = DET_INPUT_SIZE * DET_INPUT_SIZE;
      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const inIdx = (y * newW + x) * 4;
          const outIdx = (padY + y) * DET_INPUT_SIZE + (padX + x);
          float32Data[outIdx] =
            (resizedRaw.data[inIdx] - 127.5) / 128.0;
          float32Data[outIdx + channelOffset] =
            (resizedRaw.data[inIdx + 1] - 127.5) / 128.0;
          float32Data[outIdx + 2 * channelOffset] =
            (resizedRaw.data[inIdx + 2] - 127.5) / 128.0;
        }
      }

      const tensor = new Tensor("float32", float32Data, [
        1, 3, DET_INPUT_SIZE, DET_INPUT_SIZE,
      ]);
      const feeds: Record<string, Tensor> = {};
      feeds[this.session.inputNames[0]] = tensor;

      // ── 6. Run ONNX inference ────────────────────────────────────────────
      const output = await this.session.run(feeds);

      const allBoxes: number[][] = [];
      const allScores: number[] = [];
      const allLandmarks: number[][] = [];

      // ── 7. Decode model outputs ──────────────────────────────────────────
      for (let i = 0; i < STRIDES.length; i++) {
        const stride = STRIDES[i];
        const scoreOut = output[SCORE_KEYS[i]].data as Float32Array;
        const bboxOut = output[BBOX_KEYS[i]].data as Float32Array;
        const kpsOut = output[KPS_KEYS[i]].data as Float32Array;

        const fmh = DET_INPUT_SIZE / stride;
        const fmw = DET_INPUT_SIZE / stride;

        let j = 0;
        for (let y = 0; y < fmh; y++) {
          for (let x = 0; x < fmw; x++) {
            const cx = (x + 0.5) * stride;
            const cy = (y + 0.5) * stride;
            for (let a = 0; a < 2; a++) {
              const score = scoreOut[j];
              if (score > SCORE_THRESHOLD) {
                const l = bboxOut[j * 4 + 0] * stride;
                const t = bboxOut[j * 4 + 1] * stride;
                const r = bboxOut[j * 4 + 2] * stride;
                const b = bboxOut[j * 4 + 3] * stride;
                allBoxes.push([cx - l, cy - t, cx + r, cy + b]);
                allScores.push(score);

                const lm: number[] = [];
                for (let k = 0; k < 5; k++) {
                  lm.push(cx + kpsOut[j * 10 + k * 2 + 0] * stride);
                  lm.push(cy + kpsOut[j * 10 + k * 2 + 1] * stride);
                }
                allLandmarks.push(lm);
              }
              j++;
            }
          }
        }
      }

      // ── 8. NMS ───────────────────────────────────────────────────────────
      const keepIndices = nms(allBoxes, allScores, NMS_THRESHOLD);
      const detectedFaces: DetectedFace[] = [];

      // ── 9. Reverse letterbox + ArcFace alignment + JS crop ───────────────
      for (const idx of keepIndices) {
        const box = allBoxes[idx];
        const score = allScores[idx];
        const lm = allLandmarks[idx];

        // Map landmarks to original image coords
        const leX = (lm[0] - padX) / scale;
        const leY = (lm[1] - padY) / scale;
        const reX = (lm[2] - padX) / scale;
        const reY = (lm[3] - padY) / scale;

        const ecX = (leX + reX) / 2;
        const ecY = (leY + reY) / 2;
        const ed = Math.hypot(reX - leX, reY - leY);

        let x1: number, y1: number, x2: number, y2: number;

        if (ed > 5) {
          const targetSize = ed * (ARCFACE_SIZE / ARCFACE_EYE_DIST);
          x1 = ecX - targetSize / 2;
          y1 = ecY - targetSize * ARCFACE_EYE_Y_RATIO;
          x2 = x1 + targetSize;
          y2 = y1 + targetSize;
        } else {
          const bx1 = (box[0] - padX) / scale;
          const by1 = (box[1] - padY) / scale;
          const bx2 = (box[2] - padX) / scale;
          const by2 = (box[3] - padY) / scale;
          const expandW = (bx2 - bx1) * 0.2;
          const expandH = (by2 - by1) * 0.2;
          x1 = bx1 - expandW / 2;
          y1 = by1 - expandH / 2;
          x2 = bx2 + expandW / 2;
          y2 = by2 + expandH / 2;
        }

        // Clamp strictly inside image bounds, applying pixelRatio to scale coordinates
        const safeX1 = Math.max(0, Math.floor(x1 * pixelRatio));
        const safeY1 = Math.max(0, Math.floor(y1 * pixelRatio));
        const safeX2 = Math.min(origRaw.width - 1, Math.ceil(x2 * pixelRatio));
        const safeY2 = Math.min(origRaw.height - 1, Math.ceil(y2 * pixelRatio));
        const safeW = safeX2 - safeX1;
        const safeH = safeY2 - safeY1;

        if (safeW < 10 || safeH < 10) {
          console.warn(
            `[FaceDetector] Face ${idx}: crop too small (${safeW}×${safeH}), skipping.`
          );
          continue;
        }

        console.log(
          `[FaceDetector] Face ${idx}: ed=${ed.toFixed(1)} ` +
          `crop=[${safeX1},${safeY1},${safeW}×${safeH}]`
        );

        // ── Pure-JS crop from full-res decoded pixels ─────────────────────
        const croppedRGBA = cropRGBA(
          origRaw.data as Uint8Array,
          origRaw.width,
          origRaw.height,
          safeX1,
          safeY1,
          safeW,
          safeH
        );

        // ── Pure-JS resize to 112×112 ─────────────────────────────────────
        const resizedCropRGBA = resizeRGBA(
          croppedRGBA,
          safeW,
          safeH,
          ARCFACE_SIZE,
          ARCFACE_SIZE
        );

        // ── Encode to JPEG base64 ─────────────────────────────────────────
        const cropBase64 = encodeRGBAtoJpegBase64(
          resizedCropRGBA,
          ARCFACE_SIZE,
          ARCFACE_SIZE,
          90
        );

        console.log(
          `[FaceDetector] Face ${idx}: encoded bytes=${Math.floor(cropBase64.length * 0.75)} cropBase64=${cropBase64.length}`
        );

        detectedFaces.push({
          bbox: { x: safeX1, y: safeY1, width: safeW, height: safeH },
          cropBase64,
          detScore: score,
        });
      }

      console.log(
        `[FaceDetector] Found ${detectedFaces.length} faces via ONNX RetinaNet.`
      );
      return detectedFaces;
    } catch (err) {
      console.error("[FaceDetector] Error detecting faces:", err);
      return [];
    } finally {
      await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
    }
  }

  get ready(): boolean {
    return this.isReady;
  }
}

export const faceDetector = new FaceDetector();