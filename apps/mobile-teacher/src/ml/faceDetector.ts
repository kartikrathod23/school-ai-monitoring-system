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
// ArcFace 112x112 Alignment (Umeyama + Affine Warp)
// ─────────────────────────────────────────────────────────────────
const ARCFACE_DST = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

function estimateSimilarityTransform(src: number[][], dst: number[][]): number[][] {
  const num = src.length;
  let meanSrcX = 0, meanSrcY = 0, meanDstX = 0, meanDstY = 0;
  for (let i = 0; i < num; i++) {
    meanSrcX += src[i][0]; meanSrcY += src[i][1];
    meanDstX += dst[i][0]; meanDstY += dst[i][1];
  }
  meanSrcX /= num; meanSrcY /= num;
  meanDstX /= num; meanDstY /= num;

  let sumSrcVar = 0, C11 = 0, C12 = 0, C21 = 0, C22 = 0;
  for (let i = 0; i < num; i++) {
    const srcCx = src[i][0] - meanSrcX, srcCy = src[i][1] - meanSrcY;
    const dstCx = dst[i][0] - meanDstX, dstCy = dst[i][1] - meanDstY;
    sumSrcVar += (srcCx * srcCx + srcCy * srcCy);
    C11 += srcCx * dstCx; C12 += srcCx * dstCy;
    C21 += srcCy * dstCx; C22 += srcCy * dstCy;
  }
  
  const varSrc = sumSrcVar / num;
  const S1 = (C11 + C22) / num, S2 = (C12 - C21) / num;
  const norm = Math.sqrt(S1 * S1 + S2 * S2);
  const scale = norm / varSrc;
  const cosTheta = S1 / norm, sinTheta = S2 / norm;
  
  const a = scale * cosTheta, b = scale * sinTheta;
  const tx = meanDstX - (a * meanSrcX - b * meanSrcY);
  const ty = meanDstY - (b * meanSrcX + a * meanSrcY);
  
  return [[a, -b, tx], [b, a, ty]];
}

function invertAffine(M: number[][]): number[][] {
  const a = M[0][0], b = M[0][1], tx = M[0][2];
  const c = M[1][0], d = M[1][1], ty = M[1][2];
  const det = a * d - b * c;
  if (det === 0) throw new Error("Matrix not invertible");
  const invA = d / det, invB = -b / det, invC = -c / det, invD = a / det;
  return [[invA, invB, -(invA * tx + invB * ty)], [invC, invD, -(invC * tx + invD * ty)]];
}

function warpAffineRGBA(
  srcData: Uint8Array, srcWidth: number, srcHeight: number,
  dstWidth: number, dstHeight: number, matrix: number[][]
): Uint8Array {
  const invM = invertAffine(matrix);
  const out = new Uint8Array(dstWidth * dstHeight * 4);
  const [invA, invB, invTx] = invM[0];
  const [invC, invD, invTy] = invM[1];

  for (let dstY = 0; dstY < dstHeight; dstY++) {
    for (let dstX = 0; dstX < dstWidth; dstX++) {
      const srcX = invA * dstX + invB * dstY + invTx;
      const srcY = invC * dstX + invD * dstY + invTy;
      const dstIdx = (dstY * dstWidth + dstX) * 4;
      
      const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
      const x1 = x0 + 1, y1 = y0 + 1;
      
      if (x0 >= 0 && x1 < srcWidth && y0 >= 0 && y1 < srcHeight) {
        const dx = srcX - x0, dy = srcY - y0;
        const w00 = (1 - dx) * (1 - dy), w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy, w11 = dx * dy;
        
        const i00 = (y0 * srcWidth + x0) * 4, i10 = (y0 * srcWidth + x1) * 4;
        const i01 = (y1 * srcWidth + x0) * 4, i11 = (y1 * srcWidth + x1) * 4;
        
        out[dstIdx]   = srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11;
        out[dstIdx+1] = srcData[i00+1] * w00 + srcData[i10+1] * w10 + srcData[i01+1] * w01 + srcData[i11+1] * w11;
        out[dstIdx+2] = srcData[i00+2] * w00 + srcData[i10+2] * w10 + srcData[i01+2] * w01 + srcData[i11+2] * w11;
        out[dstIdx+3] = 255;
      } else {
        out[dstIdx] = 0; out[dstIdx+1] = 0; out[dstIdx+2] = 0; out[dstIdx+3] = 255;
      }
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
      // We resize it to max dimension 640. This is fast natively.
      const resizedBase64 = await resizeImageToBase64(tempFileUri, newW, newH);

      // ── 3. Decode resized JPEG → RGBA ────────────────────────────────────
      // This is MUCH faster than decoding the 12MP original image.
      const resizedBuf = Buffer.from(resizedBase64, "base64");
      const resizedRaw = jpeg.decode(resizedBuf, { useTArray: true });

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

      // ── 9. ArcFace alignment + JS crop from the 640px image ───────────────
      for (const idx of keepIndices) {
        const box = allBoxes[idx];
        const score = allScores[idx];
        const lm = allLandmarks[idx];

        // Map landmarks directly to the resized image coords (subtract padding)
        const srcPoints: number[][] = [];
        for (let k = 0; k < 5; k++) {
          srcPoints.push([lm[k * 2] - padX, lm[k * 2 + 1] - padY]);
        }

        // Estimate similarity transform from detected landmarks to ArcFace standard
        const matrix = estimateSimilarityTransform(srcPoints, ARCFACE_DST);

        // Warp image using pure-JS affine transform (bilinear interpolation)
        const resizedCropRGBA = warpAffineRGBA(
          resizedRaw.data as Uint8Array,
          resizedRaw.width,
          resizedRaw.height,
          ARCFACE_SIZE,
          ARCFACE_SIZE,
          matrix
        );

        // ── Encode to JPEG base64 ─────────────────────────────────────────
        const cropBase64 = encodeRGBAtoJpegBase64(
          resizedCropRGBA,
          ARCFACE_SIZE,
          ARCFACE_SIZE,
          90
        );

        // Map the bounding box back to original image scale for UI display if needed
        const origBoxX = (box[0] - padX) / scale;
        const origBoxY = (box[1] - padY) / scale;
        const origBoxW = (box[2] - box[0]) / scale;
        const origBoxH = (box[3] - box[1]) / scale;

        detectedFaces.push({
          bbox: { x: origBoxX, y: origBoxY, width: origBoxW, height: origBoxH },
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