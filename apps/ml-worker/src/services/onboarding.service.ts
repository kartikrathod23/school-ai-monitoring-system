import prisma from "../config/prisma";

export const processFaceOnboardingJob = async (data: any) => {
  console.log("Processing onboarding:", data);

  await prisma.mlProcessingJob.update({
    where: {
      id: data.mlJobId,
    },

    data: {
      status: "PROCESSING",
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));
  const isSuccess = Math.random() > 0.3;

  await prisma.mlProcessingJob.update({
    where: { id: data.mlJobId, },

    data: {
      status: isSuccess ? "COMPLETED" : "FAILED",
    },
  });

  await prisma.faceOnboardingSession.update({
    where: {
      id: data.onboardingSessionId,
    },

    data: {
      status: isSuccess ? "COMPLETED" : "FAILED",
    },
  });

  await prisma.student.update({
    where: {
      id: data.studentId,
    },

    data: {
      faceStatus: isSuccess ? "ADDED" : "RESCAN",
    },
  });

  await prisma.studentFaceEmbedding.create({
    data: {
      studentId: data.studentId,

      embedding: [
        0.12,
        0.44,
        0.88,
        0.91
      ],

      modelVersion: "FaceNet-v1",
    },
  });

  console.log("AI processing completed");
};