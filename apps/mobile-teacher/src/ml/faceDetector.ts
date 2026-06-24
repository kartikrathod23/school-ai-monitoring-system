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

class FaceDetector {
  private isReady = false;

  /**
   * Initialize the face detector.
   * Call once at app startup.
   */
  async initialize(): Promise<void> {
    // ── TODO: initialize face detection model ─────────────────────
    console.warn("[FaceDetector] STUB — detection not yet wired.");
  }

  /**
   * Detect all faces in a group photo.
   *
   * @param imageBase64 - Base64-encoded JPEG of the full group photo
   * @returns Array of DetectedFace, each with a cropped face image
   */
  async detectFaces(imageBase64: string): Promise<DetectedFace[]> {
    if (!this.isReady) {
      // In stub mode: return empty so caller can handle gracefully
      console.warn("[FaceDetector] Not initialized — returning empty results.");
      return [];
    }

    // ── TODO: actual face detection ───────────────────────────────
    // Steps:
    //   1. Decode base64 → image
    //   2. Run face detection model (bounding boxes)
    //   3. For each bbox: crop the face region → base64
    //   4. Return DetectedFace[]
    // ─────────────────────────────────────────────────────────────

    throw new Error("[FaceDetector] Inference stub — not implemented yet.");
  }

  get ready(): boolean {
    return this.isReady;
  }
}

// Singleton
export const faceDetector = new FaceDetector();
