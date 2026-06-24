/**
 * ml/classifier.ts
 * Neural Network classifier stub for on-device inference.
 *
 * CURRENT STATE: STUB — interface ready, implementation pending model.
 *
 * ARCHITECTURE:
 *   Input:  512-dim L2-normalized MobileFaceNet embedding
 *   Output: student index (0-based, argmax of 40-dim softmax)
 *
 * IMPORTANT: The 40-dim softmax output is computed INTERNALLY and
 * immediately discarded. Only the student index + confidence are
 * returned. The 40-dim values are NEVER stored anywhere.
 *
 * HOW TO ACTIVATE (when teammate provides model file):
 *   1. Place the .onnx (or .tflite) classifier file on device
 *   2. Call studentClassifier.loadModel(modelPath, version)
 *   3. The classify() method will then work
 *
 * STUDENT INDEX MAPPING:
 *   The classifier outputs index 0..39 (for sections of up to 40 students).
 *   Index i corresponds to the student at position i when students are
 *   sorted by roll number ascending (same order as GET /model-sync/embeddings).
 */

import { ClassifierResult } from "./types";

class StudentClassifier {
  private isReady = false;
  private _version = "not-loaded";

  /**
   * Load the NN classifier model from local filesystem.
   *
   * @param modelPath - Absolute path to the .onnx or .tflite file
   * @param version   - Version string (e.g. "nn-classifier-v2")
   */
  async loadModel(modelPath: string, version: string): Promise<void> {
    this._version = version;

    // ── TODO: replace stub with actual ONNX/TFLite load ──────────
    // Example (onnxruntime-react-native):
    //   import { InferenceSession, Tensor } from "onnxruntime-react-native";
    //   this.session = await InferenceSession.create(modelPath);
    //   this.isReady = true;
    // ─────────────────────────────────────────────────────────────

    console.warn("[Classifier] STUB — model not yet wired. Awaiting model file.");
    // Leave isReady = false until actual model is integrated
  }

  /**
   * Classify a 512-dim embedding into a student index.
   *
   * @param embedding - 512-element number[] from MobileFaceNet
   * @returns ClassifierResult with studentIndex and confidence
   * @throws Error if model is not loaded
   */
  classify(embedding: number[]): ClassifierResult {
    if (!this.isReady) {
      throw new Error(
        "[Classifier] Model not loaded. Call loadModel() first."
      );
    }

    // ── TODO: replace with actual inference ───────────────────────
    // Steps:
    //   1. Convert embedding to Float32Array
    //   2. Create ONNX Tensor: new Tensor("float32", float32Array, [1, 512])
    //   3. Run inference → logits tensor of shape [1, 40]
    //   4. Apply softmax: exp(logit - max) / sum(exp(logit - max))
    //   5. studentIndex = argmax(probs)
    //   6. confidence = probs[studentIndex]
    //   7. Discard probs array — return only index + confidence
    // ─────────────────────────────────────────────────────────────

    throw new Error("[Classifier] Inference stub — not implemented yet.");
  }

  get ready(): boolean {
    return this.isReady;
  }

  get version(): string {
    return this._version;
  }
}

// Singleton — shared across the app
export const studentClassifier = new StudentClassifier();
