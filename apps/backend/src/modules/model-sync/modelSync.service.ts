import prisma from "../../database/prisma";

// ─────────────────────────────────────────────────────────────────
// getActiveModelAssetService
// Returns the active ModelAsset for a given section.
// Teacher app calls this at login / periodically to check if a
// newer model is available for download.
// ─────────────────────────────────────────────────────────────────
export const getActiveModelAssetService = async (
  userId: string,
  sectionId: string
) => {
  // Verify the teacher is assigned to this section
  const teacherSection = await prisma.teacherSection.findFirst({
    where: {
      teacher: { userId },
      sectionId,
    },
  });

  if (!teacherSection) {
    throw new Error("Section not assigned to this teacher");
  }

  const asset = await prisma.modelAsset.findFirst({
    where: { sectionId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!asset) {
    return null; // No model registered yet — app should warn teacher
  }

  return {
    id: asset.id,
    backboneVersion: asset.backboneVersion,
    classifierVersion: asset.classifierVersion,
    backboneUrl: asset.backboneUrl,
    classifierUrl: asset.classifierUrl,
    trainedAt: asset.trainedAt,
    description: asset.description,
  };
};

// ─────────────────────────────────────────────────────────────────
// getSectionEmbeddingsService
// Returns all students in the section with their stored 512-dim
// MobileFaceNet embedding vectors. Teacher app syncs these locally
// (SQLite) so the on-device NN classifier can run offline.
//
// Each student may have multiple embeddings (one per onboarding
// photo). The app receives all of them.
// ─────────────────────────────────────────────────────────────────
export const getSectionEmbeddingsService = async (
  userId: string,
  sectionId: string
) => {
  // Verify the teacher is assigned to this section
  const teacherSection = await prisma.teacherSection.findFirst({
    where: {
      teacher: { userId },
      sectionId,
    },
  });

  if (!teacherSection) {
    throw new Error("Section not assigned to this teacher");
  }

  const students = await prisma.student.findMany({
    where: { sectionId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      faceEmbeddings: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  // Only include students who have at least one embedding (onboarding done)
  const studentsWithEmbeddings = students.filter(
    (s) => s.faceEmbeddings.length > 0
  );

  return {
    sectionId,
    totalStudents: students.length,
    readyStudents: studentsWithEmbeddings.length,
    students: studentsWithEmbeddings.map((s) => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      faceStatus: s.faceStatus,
      // All 512-dim embedding vectors for this student.
      // App stores these locally and the on-device classifier
      // uses them for inference.
      embeddingVectors: s.faceEmbeddings.map((e) => ({
        id: e.id,
        embedding: e.embedding, // 512-dim array (Json in DB)
        modelVersion: e.modelVersion,
        createdAt: e.createdAt,
      })),
    })),
  };
};
