/**
 * services/train_classifier.service.ts
 *
 * BullMQ job handler for TRAIN_CLASSIFIER.
 *
 * Delegates training to the Python ml-service via HTTP.
 * Training is async — ml-service returns a job_id immediately
 * and we poll GET /train/{job_id} until complete.
 *
 * Flow:
 *   1. POST ml-service /train → receive { jobId }
 *   2. Poll GET /train/{jobId} every 10s until status = completed | failed
 *   3. Update mlProcessingJob in DB accordingly
 */

import axios, { AxiosError } from "axios";
import prisma from "../config/prisma";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 180; // 30 minutes max

// ── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TrainJobStatus {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: {
    classifierVersion: string;
    backboneVersion: string;
    classifierUrl: string;
    backboneUrl: string;
    numClasses: number;
    numSamples: number;
  };
  error?: string;
  completedAt?: string;
}

// ── Job handler ──────────────────────────────────────────────────

export const processTrainClassifierJob = async (data: any) => {
  console.log(
    "[trainer] Processing job:", data.mlJobId,
    "| section:", data.sectionId
  );

  await prisma.mlProcessingJob.update({
    where: { id: data.mlJobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    // 1. Start the async training job in ml-service
    console.log(`[trainer] Starting training via ml-service for section ${data.sectionId}`);

    let mlJobId: string;
    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/train`,
        {
          sectionId: data.sectionId,
          version: data.version || "v1",
        },
        { timeout: 30_000 }
      );
      mlJobId = response.data.jobId;
      console.log(`[trainer] ml-service accepted training job: ${mlJobId}`);
    } catch (err: any) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      const detail = axiosErr.response?.data?.detail || axiosErr.message;
      throw new Error(`ml-service /train failed: ${detail}`);
    }

    // 2. Poll until training completes or fails
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await sleep(POLL_INTERVAL_MS);
      attempts++;

      const pollResponse = await axios.get<TrainJobStatus>(
        `${ML_SERVICE_URL}/train/${mlJobId}`,
        { timeout: 10_000 }
      );

      const jobStatus = pollResponse.data;
      console.log(
        `[trainer] Poll #${attempts} | ml-job=${mlJobId} | status=${jobStatus.status}`
      );

      if (jobStatus.status === "completed") {
        console.log("[trainer] Training complete:", jobStatus.result);
        break;
      }

      if (jobStatus.status === "failed") {
        throw new Error(
          `ml-service training failed: ${jobStatus.error || "unknown error"}`
        );
      }
    }

    if (attempts >= MAX_POLL_ATTEMPTS) {
      throw new Error("Training timed out after 30 minutes");
    }

    // 3. Mark job as complete
    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    console.log(`[trainer] Job ${data.mlJobId} completed successfully`);
  } catch (error: any) {
    console.error("[trainer] Job failed:", error.message);

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
