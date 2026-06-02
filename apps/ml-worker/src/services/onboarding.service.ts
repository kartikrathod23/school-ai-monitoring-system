import prisma from "../config/prisma";
import axios from "axios";

const ML_URL = process.env.MODEL_URL || "http://localhost:8000";

export const processFaceOnboardingJob = async (data: any) => {
  console.log("Processing onboarding:", data);

  // Mark job as PROCESSING
  await prisma.mlProcessingJob.update({
    where: { id: data.mlJobId },
    data: { status: "PROCESSING", startedAt: new Date() }
  });

  try {
    // Step 1: Fetch onboarding images from DB
    const images = await prisma.studentFaceImage.findMany({
      where: { onboardingSessionId: data.onboardingSessionId }
    });

    if (images.length === 0) {
      throw new Error("No images found for onboarding session");
    }

    // Step 2: Call Python ML API
    const imageUrls = images.map(img => img.imageUrl);

    const mlResponse = await axios.post(`${ML_URL}/onboarding`, {
      studentId: data.studentId,
      imageUrls: imageUrls
    }, { timeout: 60000 });

    const result = mlResponse.data;

    if (!result.success) {
      throw new Error(result.error || "Face detection failed");
    }

    // Step 3: Store embedding in DB
    await prisma.studentFaceEmbedding.create({
      data: {
        studentId: data.studentId,
        embedding: result.embedding,   // 512-d array stored as JSON
        modelVersion: result.modelVersion
      }
    });

    // Step 4: Update onboarding session
    await prisma.faceOnboardingSession.update({
      where: { id: data.onboardingSessionId },
      data: { status: "COMPLETED" }
    });

    // Step 5: Update student face status
    await prisma.student.update({
      where: { id: data.studentId },
      data: { faceStatus: "ADDED" }
    });

    // Step 6: Mark job complete
    await prisma.mlProcessingJob.update({
      where: { id: data.mlJobId },
      data: { status: "COMPLETED", completedAt: new Date() }
    });

    console.log(`Onboarding done. Faces found: ${result.facesFound}/${result.totalImages}`);

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