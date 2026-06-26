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

import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { ClassifierResult } from "./types";

class StudentClassifier {
  private isReady = false;
  private session: InferenceSession | null = null;
  private _version = "not-loaded";

  async loadModel(modelPath: string, version: string): Promise<void> {
    this._version = version;
    try {
      this.session = await InferenceSession.create(modelPath);
      this.isReady = true;
      console.log(`[Classifier] Successfully loaded ONNX model v${version}!`);
    } catch (err) {
      console.error("[Classifier] Error loading ONNX model:", err);
      this.isReady = false;
    }
  }

  async classify(embedding: number[]): Promise<ClassifierResult> {
    if (!this.isReady || !this.session) {
      throw new Error("[Classifier] Model not loaded. Call loadModel() first.");
    }

    // 1. Convert embedding to Float32Array
    const float32Array = new Float32Array(embedding);

    // 2. Create ONNX Tensor: shape [1, 512]
    const tensor = new Tensor("float32", float32Array, [1, 512]);

    // 3. Run inference -> logits tensor of shape [1, N]
    const feeds: Record<string, Tensor> = {};
    feeds[this.session.inputNames[0]] = tensor;
    
    const output = await this.session.run(feeds);
    const logitsTensor = output[this.session.outputNames[0]];
    const logits = logitsTensor.data as Float32Array;

    // 4. Apply softmax: exp(logit - max) / sum(exp(logit - max))
    let maxLogit = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (logits[i] > maxLogit) maxLogit = logits[i];
    }

    let sumExp = 0;
    const exps = new Float32Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      exps[i] = Math.exp(logits[i] - maxLogit);
      sumExp += exps[i];
    }

    // 5. Calculate probabilities and find argmax
    let studentIndex = -1;
    let maxProb = -1;
    for (let i = 0; i < logits.length; i++) {
      const prob = exps[i] / sumExp;
      if (prob > maxProb) {
        maxProb = prob;
        studentIndex = i;
      }
    }

    return {
      studentIndex,
      confidence: maxProb,
      classifierVersion: this._version,
    };
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
