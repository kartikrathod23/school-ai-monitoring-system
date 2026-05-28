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


export const getDashboardSummaryService =async (userId:string) => {
    const teacher =await prisma.teacher.findFirst({
        where:{
          userId,
        },

        include:{
          sections:{
            include:{
              section:true,
            },
          },
        },
      });

    if (
      !teacher ||
      teacher.sections.length === 0
    ) {
      throw new Error(
        "Teacher section not found"
      );
    }

    const sectionId = teacher.sections[0].sectionId;
    const totalStudents = await prisma.student.count({
        where:{
          sectionId,
        },
    });

    const added = await prisma.student.count({
        where:{
          sectionId,
          faceStatus:"ADDED",
        },
    });

    const pending = await prisma.student.count({
        where:{
          sectionId,
          faceStatus:"PENDING",
        },
    });

    const rescan = await prisma.student.count({
        where:{
          sectionId,
          faceStatus:"RESCAN",
        },
    });

    const latestAttendance = await prisma.attendanceSession.findFirst({
        where:{
          sectionId,
          status:"PROCESSED",
        },

        include:{
          records:true,
        },

        orderBy:{
          createdAt:"desc",
        },
      });

    const presentStudents = latestAttendance?.records.filter((record) =>record.status === "PRESENT").length || 0;

    const absentStudents =latestAttendance?.records.filter((record) =>record.status === "ABSENT").length || 0;

    const attendancePercentage =
      totalStudents > 0
        ? Math.round(
            (
              presentStudents /
              totalStudents
            ) * 100
          )
        : 0;

    const latestMeal =await prisma.mealSession.findFirst({
        where:{
          sectionId,
          status:"CONFIRMED",
        },

        orderBy:{
          createdAt:"desc",
        },
      });

    const mealsServed =latestMeal?.totalDetected || 0;

    return {
      totalStudents,
      attendance:{
        presentStudents,
        absentStudents,
        attendancePercentage,
      },

      meals:{
        mealsServed,
      },

      onboarding:{
        added,
        pending,
        rescan,
      },
    };
};