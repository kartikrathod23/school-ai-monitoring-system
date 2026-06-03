import prisma from "../config/prisma";
import axios from "axios";
import { presignImageUrls } from "../utils/s3Presign";

const ML_URL = process.env.MODEL_URL || "http://localhost:8000";

export const processFaceOnboardingJob = async (data: any) => {
  console.log("Processing onboarding:", data);

  await prisma.mlProcessingJob.update({
    where: { id: data.mlJobId },
    data: { status: "PROCESSING", startedAt: new Date() }
  });

  try {
    const images = await prisma.studentFaceImage.findMany({
      where: { onboardingSessionId: data.onboardingSessionId }
    });

    if (images.length === 0) {
      throw new Error("No images found for onboarding session");
    }

    const imageUrls = await presignImageUrls(images.map((img) => img.imageUrl));

    const mlResponse = await axios.post(`${ML_URL}/onboarding`, {
      studentId: data.studentId,
      imageUrls
    }, { timeout: 60000 });

    const result = mlResponse.data;

    if (!result.success) {
      throw new Error(result.error || "Face detection failed");
    }

    // Store EACH embedding separately (better match accuracy)
    for (const embedding of result.embeddings) {
      await prisma.studentFaceEmbedding.create({
        data: {
          studentId: data.studentId,
          embedding: embedding,
          modelVersion: result.modelVersion
        }
      });
    }

    await prisma.faceOnboardingSession.update({
      where: { id: data.onboardingSessionId },
      data: { status: "COMPLETED" }
    });

    await prisma.student.update({
      where: { id: data.studentId },
      data: { faceStatus: "ADDED" }
    });

    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: { status: "COMPLETED", completedAt: new Date() }
    });

    console.log(`Onboarding done. Embeddings stored: ${result.facesFound}`);

  } catch (error: any) {
    console.error("Onboarding failed:", error.message);

    await prisma.faceOnboardingSession.update({
      where: { id: data.onboardingSessionId },
      data: { status: "FAILED" }
    });

    await prisma.student.update({
      where: { id: data.studentId },
      data: { faceStatus: "RESCAN" }
    });

    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error.message
      }
    });
  }
};