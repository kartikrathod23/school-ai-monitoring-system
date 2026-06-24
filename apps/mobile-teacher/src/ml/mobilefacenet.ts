/**
 * ml/mobilefacenet.ts
 * MobileFaceNet backbone stub for on-device inference.
 *
 * CURRENT STATE: STUB — model integration wired but not active.
 *
 * HOW TO ACTIVATE (when teammate provides model file):
 *   1. Place the model file in the app's document directory or bundle
 *   2. Install the ONNX Runtime or TFLite package:
 *      - ONNX: npm install onnxruntime-react-native
 *      - TFLite: @tensorflow/tfjs-react-native + @tensorflow/tfjs-tflite
 *   3. Implement extractEmbedding() below
 *   4. Call mobileFaceNet.loadModel(modelPath) at app startup
 *
 * INTERFACE CONTRACT (stable — do not change):
 *   - Input:  base64-encoded JPEG/PNG face crop
 *   - Output: number[] of length 512, L2-normalized
 */

import { EmbeddingResult } from "./types";

const BACKBONE_VERSION = "MobileFaceNet-v1";

class MobileFaceNetBackbone {
  private isReady = false;
  private modelPath: string | null = null;

  /**
   * Load the backbone model from the local filesystem.
   * Call once at app startup after downloading from server.
   *
   * @param modelPath - Absolute path to the model file on device
   */
  async loadModel(modelPath: string): Promise<void> {
    this.modelPath = modelPath;

    // ── TODO: replace stub with actual ONNX/TFLite load ──────────
    // Example (onnxruntime-react-native):
    //   import { InferenceSession } from "onnxruntime-react-native";
    //   this.session = await InferenceSession.create(modelPath);
    //   this.isReady = true;
    // ─────────────────────────────────────────────────────────────

    console.warn("[MobileFaceNet] STUB — model not yet wired. Awaiting model file.");
    // Leave isReady = false until actual model is integrated
  }

  /**
   * Extract a 512-dim L2-normalized embedding from a face crop.
   *
   * @param cropBase64 - Base64-encoded JPEG face crop
   * @returns EmbeddingResult with 512-dim vector + version
   * @throws Error if model is not loaded
   */
  extractEmbedding(cropBase64: string): EmbeddingResult {
    if (!this.isReady) {
      throw new Error(
        "[MobileFaceNet] Model not loaded. Call loadModel() first."
      );
    }

    // ── TODO: replace with actual inference ───────────────────────
    // Steps:
    //   1. Decode base64 → pixel buffer
    //   2. Resize to 112×112
    //   3. Normalize: (pixel - 127.5) / 127.5
    //   4. Run ONNX/TFLite model
    //   5. L2-normalize the 512-dim output
    // ─────────────────────────────────────────────────────────────

    throw new Error("[MobileFaceNet] Inference stub — not implemented yet.");
  }

  get ready(): boolean {
    return this.isReady;
  }

  get version(): string {
    return BACKBONE_VERSION;
  }
}

// Singleton — shared across the app
export const mobileFaceNet = new MobileFaceNetBackbone();
