/**
 * ml/types.ts
 * Shared ML inference types for the mobile app.
 */

// ─────────────────────────────────────────────────────────────────
// FaceDetectionResult
// One detected face from a group/classroom photo
// ─────────────────────────────────────────────────────────────────

export interface DetectedFace {
  /** Bounding box in the original image (pixels) */
  bbox: { x: number; y: number; width: number; height: number };
  /** Base64-encoded JPEG crop of the face */
  cropBase64: string;
  /** Detection confidence from the face detector (0-1) */
  detScore: number;
}

// ─────────────────────────────────────────────────────────────────
// EmbeddingResult
// Output of the MobileFaceNet backbone
// ─────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  /** 512-dim L2-normalized embedding vector */
  embedding: number[];
  /** Which backbone version produced this (for training data lineage) */
  backboneVersion: string;
}

// ─────────────────────────────────────────────────────────────────
// ClassifierResult
// Output of the Neural Network classifier (40-dim → argmax)
//
// IMPORTANT: The raw 40-dim output is NOT exposed here.
// It is computed inside the classifier and immediately discarded.
// Only the student index (argmax) and confidence are returned.
// ─────────────────────────────────────────────────────────────────

export interface ClassifierResult {
  /** 0-based index into the section's student list (sorted by roll number) */
  studentIndex: number;
  /** Softmax probability of the winning class (0-1) */
  confidence: number;
  /** Version of the classifier used */
  classifierVersion: string;
}

// ─────────────────────────────────────────────────────────────────
// InferenceResult
// Full result for one detected face: detected → embedded → classified
// ─────────────────────────────────────────────────────────────────

export interface InferenceResult {
  face: DetectedFace;
  embedding: EmbeddingResult;
  classification: ClassifierResult;
}
