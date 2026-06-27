/**
 * ml/mobilefacenet.ts
 * MobileFaceNet backbone for on-device face recognition inference.
 *
 * Input:  cropBase64 — base64 JPEG, already 112×112 (output of faceDetector)
 *         No resize is done here; faceDetector handles crop + resize in one step.
 * Output: 512-dim L2-normalized embedding vector.
 */

import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { Buffer } from "buffer";
import * as jpeg from "jpeg-js";
import { EmbeddingResult } from "./types";

const BACKBONE_VERSION = "MobileFaceNet-v1";
const INPUT_SIZE = 112;

class MobileFaceNetBackbone {
  private isReady = false;
  private session: InferenceSession | null = null;

  async loadModel(modelPath: string): Promise<void> {
    try {
      this.session = await InferenceSession.create(modelPath);
      this.isReady = true;
      console.log("[MobileFaceNet] Successfully loaded ONNX model!");
    } catch (err) {
      console.error("[MobileFaceNet] Error loading ONNX model:", err);
      this.isReady = false;
    }
  }

  async extractEmbedding(cropBase64: string): Promise<EmbeddingResult> {
    if (!this.isReady || !this.session) {
      throw new Error(
        "[MobileFaceNet] Model not loaded. Call loadModel() first."
      );
    }

    // faceDetector already outputs a 112×112 JPEG — decode directly.
    const buffer = Buffer.from(cropBase64, "base64");
    const rawImageData = jpeg.decode(buffer, { useTArray: true });

    const { width, height } = rawImageData;

    if (width !== INPUT_SIZE || height !== INPUT_SIZE) {
      console.warn(
        `[MobileFaceNet] Unexpected crop size ${width}×${height}, expected ${INPUT_SIZE}×${INPUT_SIZE}.`
      );
    }

    // Build CHW Float32 tensor [1, 3, 112, 112]
    // Normalization: (pixel - 127.5) / 128.0
    const channelSize = height * width;
    const float32Data = new Float32Array(3 * channelSize);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4; // RGBA source
        const dstIdx = y * width + x;

        float32Data[dstIdx] =
          (rawImageData.data[srcIdx] - 127.5) / 128.0;             // R
        float32Data[dstIdx + channelSize] =
          (rawImageData.data[srcIdx + 1] - 127.5) / 128.0;         // G
        float32Data[dstIdx + 2 * channelSize] =
          (rawImageData.data[srcIdx + 2] - 127.5) / 128.0;         // B
      }
    }

    // Run inference
    const tensor = new Tensor("float32", float32Data, [
      1, 3, INPUT_SIZE, INPUT_SIZE,
    ]);
    const feeds: Record<string, Tensor> = {};
    feeds[this.session.inputNames[0]] = tensor;

    const output = await this.session.run(feeds);
    const rawOutput = output[this.session.outputNames[0]].data as Float32Array;

    // L2 normalize
    let sumSq = 0;
    for (let i = 0; i < rawOutput.length; i++) sumSq += rawOutput[i] ** 2;
    const norm = Math.sqrt(sumSq) || 1;

    const normalized = Array.from(rawOutput, (v) => v / norm);

    return {
      embedding: normalized,
      backboneVersion: BACKBONE_VERSION,
    };
  }

  get ready(): boolean {
    return this.isReady;
  }

  get version(): string {
    return BACKBONE_VERSION;
  }
}

export const mobileFaceNet = new MobileFaceNetBackbone();