/**
 * services/onboarding.service.ts
 *
 * BullMQ job handler for FACE_EMBEDDING_GENERATION.
 *
 * Delegates all ML computation to the Python ml-service via HTTP.
 * The ml-service runs ONNX models in-process (loaded once at startup),
 * so there is no cold-start overhead per job.
 *
 * Flow:
 *   1. Fetch face images for the onboarding session
 *   2. Generate S3 presigned URLs so the ml-service can download them
 *   3. POST to ml-service /onboard → get 512-dim embeddings
 *   4. Store embeddings in StudentFaceEmbedding table
 *   5. Update session + student status
 */

import axios, { AxiosError } from "axios";
import prisma from "../config/prisma";
import { presignImageUrls } from "../utils/s3Presign";
import { mlQueue } from "../queues/ml.queue";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────

interface OnboardResponse {
  success: boolean;
  embeddings: number[][];
  facesFound: number;
  modelVersion: string;
  skippedImages: number;
}

// ── Job handler ──────────────────────────────────────────────────

export const processFaceOnboardingJob = async (data: any) => {
  console.log("[onboarding] Processing job:", data.mlJobId, "| student:", data.studentId);

  await prisma.mlProcessingJob.update({
    where: { id: data.mlJobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    // 1. Fetch image records
    const images = await prisma.studentFaceImage.findMany({
      where: { onboardingSessionId: data.onboardingSessionId },
    });

    if (images.length === 0) {
      throw new Error("No images found for onboarding session");
    }

    // 2. Presign S3 URLs so the ml-service can download them directly
    const imageUrls = await presignImageUrls(images.map((img) => img.imageUrl));

    // 3. Call ml-service — models are already loaded in memory
    console.log(`[onboarding] Calling ml-service with ${imageUrls.length} image(s)...`);

    let result: OnboardResponse;
    try {
      const response = await axios.post<OnboardResponse>(
        `${ML_SERVICE_URL}/onboard`,
        {
          imageUrls,
          studentId: data.studentId,
        },
        { timeout: 120_000 } // 2 min max for large batches
      );
      result = response.data;
    } catch (err: any) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      const detail = axiosErr.response?.data?.detail || axiosErr.message;
      throw new Error(`ml-service /onboard failed: ${detail}`);
    }

    if (!result.success || result.embeddings.length === 0) {
      throw new Error(
        `ml-service returned no embeddings. Faces found: ${result.facesFound}`
      );
    }

    // 4. Store each embedding separately (one row per detected face)
    for (const embedding of result.embeddings) {
      await prisma.studentFaceEmbedding.create({
        data: {
          studentId: data.studentId,
          embedding: embedding,
          modelVersion: result.modelVersion,
        },
      });
    }

    // 5. Update session + student
    await prisma.faceOnboardingSession.update({
      where: { id: data.onboardingSessionId },
      data: { status: "COMPLETED" },
    });

    const student = await prisma.student.update({
      where: { id: data.studentId },
      data: { faceStatus: "ADDED" },
    });

    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    console.log(
      `[onboarding] Done. Embeddings stored: ${result.facesFound} | Skipped: ${result.skippedImages}`
    );
  } catch (error: any) {
    console.error("[onboarding] Job failed:", error.message);

    await prisma.faceOnboardingSession.update({
      where: { id: data.onboardingSessionId },
      data: { status: "FAILED" },
    });

    await prisma.student.update({
      where: { id: data.studentId },
      data: { faceStatus: "RESCAN" },
    });

    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error.message,
      },
    });
  }
};