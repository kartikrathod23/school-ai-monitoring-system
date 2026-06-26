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


import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { Buffer } from "buffer";
import * as jpeg from "jpeg-js";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { EmbeddingResult } from "./types";

const BACKBONE_VERSION = "MobileFaceNet-v1";

class MobileFaceNetBackbone {
  private isReady = false;
  private session: InferenceSession | null = null;
  private modelPath: string | null = null;

  async loadModel(modelPath: string): Promise<void> {
    this.modelPath = modelPath;
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
      throw new Error("[MobileFaceNet] Model not loaded. Call loadModel() first.");
    }

    // 1. Resize to 112x112 exactly (MobileFaceNet input size)
    const tempFile = `${FileSystem.cacheDirectory}temp_crop_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempFile, cropBase64, { encoding: "base64" as any });
    
    const resized = await manipulateAsync(
      `file://${tempFile}`,
      [{ resize: { width: 112, height: 112 } }],
      { base64: true, format: SaveFormat.JPEG, compress: 1.0 }
    );
    await FileSystem.deleteAsync(tempFile, { idempotent: true });

    if (!resized.base64) throw new Error("Resize failed");

    // 2. Decode JPEG to raw RGBA pixels
    const buffer = Buffer.from(resized.base64, "base64");
    const rawImageData = jpeg.decode(buffer, { useTArray: true });

    // 3. Convert RGBA to Float32Array [1, 3, 112, 112]
    // MobileFaceNet requires: RGB format, normalized (pixel - 127.5) / 128.0
    const width = rawImageData.width;
    const height = rawImageData.height;
    const channelCount = 3;
    const float32Data = new Float32Array(1 * channelCount * height * width);

    let offset = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = rawImageData.data[i];
        const g = rawImageData.data[i + 1];
        const b = rawImageData.data[i + 2];

        // Normalization
        float32Data[offset] = (r - 127.5) / 128.0;
        float32Data[offset + height * width] = (g - 127.5) / 128.0;
        float32Data[offset + 2 * height * width] = (b - 127.5) / 128.0;
        offset++;
      }
    }

    // 4. Create ONNX Tensor
    const tensor = new Tensor("float32", float32Data, [1, 3, 112, 112]);

    // 5. Run inference
    const feeds: Record<string, Tensor> = {};
    feeds[this.session.inputNames[0]] = tensor;
    
    const output = await this.session.run(feeds);
    const outputTensor = output[this.session.outputNames[0]];

    // 6. L2 Normalize the output (512 dims)
    const rawOutput = outputTensor.data as Float32Array;
    let sumSq = 0;
    for (let i = 0; i < rawOutput.length; i++) {
      sumSq += rawOutput[i] * rawOutput[i];
    }
    const norm = Math.sqrt(sumSq);
    const normalized = new Array(rawOutput.length);
    for (let i = 0; i < rawOutput.length; i++) {
      normalized[i] = rawOutput[i] / norm;
    }

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

// Singleton — shared across the app
export const mobileFaceNet = new MobileFaceNetBackbone();
