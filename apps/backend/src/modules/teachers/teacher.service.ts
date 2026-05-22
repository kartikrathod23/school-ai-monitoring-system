import prisma from "../../database/prisma";
import { calculateDistanceInMeters, validateGeofence } from "../../common/utils/geofence";

export const getTeacherMeService = async (userId: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      userId,
    },

    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userCode: true,
          mobileNumber: true,
          role: true,
        },
      },

      sections: {
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
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  return teacher;
};

export const getTeacherSectionsService = async (userId: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      userId,
    },

    include: {
      sections: {
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
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  return teacher.sections.map((item) => ({
    teacherSectionId: item.id,

    sectionId: item.section.id,
    sectionName: item.section.name,

    standardId: item.section.standard.id,
    standardValue: item.section.standard.value,

    schoolId: item.section.standard.school.id,
    schoolName: item.section.standard.school.name,
  }));
};

export const getSectionStudentsService = async (
  userId: string,
  sectionId: string
) => {
  const teacherSection = await prisma.teacherSection.findFirst({
    where: {
      teacher: {
        userId,
      },

      sectionId,
    },
  });

  if (!teacherSection) {
    throw new Error("You are not assigned to this section");
  }

  const students = await prisma.student.findMany({
    where: {
      sectionId,
    },

    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userCode: true,
          mobileNumber: true,
        },
      },

      section: {
        include: {
          standard: {
            include: {
              school: true,
            },
          },
        },
      },

      faceImages: true,
    },

    orderBy: {
      rollNumber: "asc",
    },
  });

  return students;
};


export const verifyTeacherLocationService = async (
  userId: string,
  latitude: number,
  longitude: number
) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      userId,
    },

    include: {
      sections: {
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
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  const school =teacher.sections[0]?.section?.standard?.school;
  if (!school) {
    throw new Error("School not found");
  }

  const { distance, isInside } =validateGeofence(latitude,longitude,school);

  return {
    isInside,
    distance: Math.round(distance),

    schoolLocation: {
      latitude: school.latitude,
      longitude: school.longitude,
      radius: school.geoRadius,
    },
  };
};