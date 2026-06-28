import prisma from "../../database/prisma";
import { validateGeofence } from "../../common/utils/geofence";
import { mlQueue } from "../../queues/ml.queue";
import { uploadToS3 } from "../../common/utils/s3Upload";

export const createFaceOnboardingService = async (
  userId: string,
  body: any,
  files: Express.Multer.File[]
) => {
  const student = await prisma.student.findUnique({
    where: {
      id: body.studentId,
    },

    include: {
      section: {
        include: {
          standard: {
            include: {
              school: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const school = student.section.standard.school;

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  const geoResult = validateGeofence(
    latitude,
    longitude,
    school
  );

  await prisma.geofenceValidation.create({
    data: {
      teacherUserId: userId,
      validationType: "FACE_ONBOARDING",
      latitude: latitude,
      longitude: longitude,
      distance: geoResult.distance,
      isWithinGeofence: geoResult.isInside,
      schoolId: school.id,
      referenceId: student.id,
    },
  });

  if (!geoResult.isInside) {
    throw new Error(
      "You are outside school premises"
    );
  }

  const onboarding =
    await prisma.faceOnboardingSession.create({
      data: {
        studentId: student.id,
        teacherUserId: userId,
        sectionId: student.sectionId,
        status: "IMAGES_CAPTURED",
        totalImages: files.length,
      },
    });

  for (const file of files) {
    const imageUrl = await uploadToS3(file,"face-onboarding");

    await prisma.studentFaceImage.create({
      data: {
        studentId: student.id,
        onboardingSessionId: onboarding.id,
        imageUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  await prisma.student.update({
    where: {
      id: student.id,
    },
    data: {
      faceStatus: "PENDING",
    },
  });

  return onboarding;

  // Duplicate removed
};