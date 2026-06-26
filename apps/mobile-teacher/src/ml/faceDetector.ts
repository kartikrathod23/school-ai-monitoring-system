/**
 * ml/faceDetector.ts
 * On-device face detection stub.
 *
 * CURRENT STATE: STUB
 *
 * PURPOSE:
 *   Detects faces in a group/classroom photo and returns crops +
 *   bounding boxes for each face. Each crop is then passed to
 *   the MobileFaceNet backbone for embedding extraction.
 *
 * HOW TO ACTIVATE (options when model arrives):
 *   Option A — Use expo-camera barcode scanner + custom face detection
 *   Option B — Use react-native-vision-camera with a face detection plugin
 *   Option C — Call the Python ML service remotely for detection, then
 *               run backbone + classifier locally
 *
 * INTERFACE CONTRACT (stable):
 *   Input:  base64-encoded full group photo
 *   Output: array of DetectedFace (each with bbox + base64 crop)
 */

import { DetectedFace } from "./types";
import FaceDetection from "@react-native-ml-kit/face-detection";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { Image } from "react-native";

const getImageSize = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
};

class FaceDetector {
  private isReady = false;

  async initialize(): Promise<void> {
    this.isReady = true;
    console.log("[FaceDetector] Initialized MLKit Face Detection.");
  }

  async detectFaces(imageBase64: string): Promise<DetectedFace[]> {
    if (!this.isReady) {
      console.warn("[FaceDetector] Not initialized.");
      return [];
    }

    // 1. Save base64 to a temporary file because MLKit needs a URI
    const tempFilePath = `${FileSystem.cacheDirectory}temp_group_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempFilePath, imageBase64, {
      encoding: "base64" as any,
    });

    try {
      // Get dimensions to clamp crop boxes
      const { width: imgWidth, height: imgHeight } = await getImageSize(`file://${tempFilePath}`);

      // 2. Detect faces using MLKit
      const mlkitFaces = await FaceDetection.detect(`file://${tempFilePath}`);
      
      const detectedFaces: DetectedFace[] = [];

      // 3. For each face, crop it using expo-image-manipulator
      for (const face of mlkitFaces) {
        const { frame } = face;
        
        // Clamp bounding box to image dimensions
        const rightEdge = Math.min(imgWidth, frame.left + frame.width);
        const bottomEdge = Math.min(imgHeight, frame.top + frame.height);
        
        const x = Math.max(0, frame.left);
        const y = Math.max(0, frame.top);
        
        const w = rightEdge - x;
        const h = bottomEdge - y;

        if (w <= 0 || h <= 0) continue;

        const bbox = {
          x,
          y,
          width: w,
          height: h,
        };

        // Crop the image
        const cropResult = await manipulateAsync(
          `file://${tempFilePath}`,
          [{ crop: { originX: bbox.x, originY: bbox.y, width: Math.floor(bbox.width), height: Math.floor(bbox.height) } }],
          { base64: true, format: SaveFormat.JPEG, compress: 0.8 }
        );

        if (cropResult.base64) {
          detectedFaces.push({
            bbox: bbox,
            cropBase64: cropResult.base64,
            detScore: 1.0,
          });
        }
      }

      console.log(`[FaceDetector] Found ${detectedFaces.length} faces.`);
      return detectedFaces;

    } catch (err) {
      console.error("[FaceDetector] Error detecting faces:", err);
      return [];
    } finally {
      // Cleanup temp file
      await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
    }
  }

  get ready(): boolean {
    return this.isReady;
  }
}

// Singleton
export const faceDetector = new FaceDetector();
