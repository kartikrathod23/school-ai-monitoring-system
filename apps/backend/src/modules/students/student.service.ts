import prisma from "../../database/prisma";

export const getStudentMeService = async (
  userId: string
) => {

  const student = await prisma.student.findFirst({
    where: {
      userId,
    },

    include: {
      user: true,

      section: {
        include: {
          standard: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  return {
    id: student.id,

    firstName: student.user.firstName,
    lastName: student.user.lastName,

    userCode: student.user.userCode,

    rollNumber: student.rollNumber,

    section: student.section.name,
    standard: student.section.standard.value,
  };
};

export const getTodayAttendanceService = async (
  userId: string
) => {

  const student = await prisma.student.findFirst({
    where: {
      userId,
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const attendance =
    await prisma.attendanceRecord.findFirst({
        where: {
        studentId: student.id,

        attendanceSession: {
            date: {
            gte: today,
            lt: tomorrow,
            },
        },
        },

        include: {
        attendanceSession: true,
        },

        orderBy: {
        markedAt: "desc",
        },
    });

  if (!attendance) {
    return {
      status: "NOT_MARKED",
    };
  }

  return {
    status: attendance.status,
    markedAt: attendance.markedAt,
  };
};

export const getMonthlySummaryService = async (
  userId: string,
  month: number,
  year: number
) => {

  const student = await prisma.student.findFirst({
    where: {
      userId,
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const startDate =
    new Date(year, month - 1, 1);

  const endDate =
    new Date(year, month, 1);

  const records =
    await prisma.attendanceRecord.findMany({
        where: {
        studentId: student.id,

        attendanceSession: {
            date: {
            gte: startDate,
            lt: endDate,
            },
        },
        },

        include: {
        attendanceSession: true,
        },

        orderBy: {
        markedAt: "desc",
        },
    });

    const uniqueDays = new Map();

    for (const record of records) {

    const day =
        record.attendanceSession.date
        .toISOString()
        .split("T")[0];

    if (!uniqueDays.has(day)) {
        uniqueDays.set(day, record);
    }
    }

    const finalRecords =
    Array.from(uniqueDays.values());

    const present =
    finalRecords.filter(
        (r) => r.status === "PRESENT"
    ).length;

    const absent =
    finalRecords.filter(
        (r) => r.status === "ABSENT"
    ).length;

    const total = present + absent;

  return {
    present,

    absent,

    attendancePercentage:
      total > 0
        ? Number(
            (
              (present / total) *
              100
            ).toFixed(2)
          )
        : 0,
  };
};

export const getMonthlyAttendanceService =
  async (
    userId: string,
    month: number,
    year: number
  ) => {

    const student =
      await prisma.student.findFirst({
        where: {
          userId,
        },
      });

    if (!student) {
      throw new Error(
        "Student not found"
      );
    }

    const startDate =
      new Date(year, month - 1, 1);

    const endDate =
      new Date(year, month, 1);

    const records =
      await prisma.attendanceRecord.findMany({
        where: {
          studentId: student.id,

          attendanceSession: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },

        include: {
          attendanceSession: true,
        },

        orderBy: {
          markedAt: "desc",
        },
      });

    const uniqueDays = new Map();

    for (const record of records) {

      const day =
        record.attendanceSession.date
          .toISOString()
          .split("T")[0];

      if (!uniqueDays.has(day)) {

        uniqueDays.set(day, {
          day: record.attendanceSession.date.getDate(),
          date: record.attendanceSession.date,
          status: record.status,
        });

      }
    }

    return Array.from(uniqueDays.values());
  };


export const getRecentAttendanceService =
  async (userId: string) => {

    const student =
      await prisma.student.findFirst({
        where: {
          userId,
        },
      });

    if (!student) {
      throw new Error("Student not found");
    }

    const records =
      await prisma.attendanceRecord.findMany({
        where: {
          studentId: student.id,
        },

        include: {
          attendanceSession: true,
        },

        orderBy: {
          attendanceSession: {
            date: "desc",
          },
        },
      });

    const uniqueDays = new Map();

    for (const record of records) {

      const day =
        record.attendanceSession.date
          .toISOString()
          .split("T")[0];

      if (!uniqueDays.has(day)) {

        uniqueDays.set(day, {
          date: record.attendanceSession.date,
          status: record.status,
        });

      }
    }

    return Array
      .from(uniqueDays.values())
      .slice(0, 7);
  };

export const getAttendanceStatisticsService =
  async (userId: string) => {

    const student =
      await prisma.student.findFirst({
        where: {
          userId,
        },
      });

    if (!student) {
      throw new Error(
        "Student not found"
      );
    }

    const records =
    await prisma.attendanceRecord.findMany({
        where: {
        studentId: student.id,
        },

        include: {
        attendanceSession: true,
        },

        orderBy: {
        markedAt: "desc",
        },
    });

    const uniqueDays = new Map();

    for (const record of records) {

    const day =
        record.attendanceSession.date
        .toISOString()
        .split("T")[0];

    if (!uniqueDays.has(day)) {
        uniqueDays.set(day, record);
    }
    }

    const finalRecords =
    Array.from(uniqueDays.values());

    const present =
    finalRecords.filter(
        (r) => r.status === "PRESENT"
    ).length;

    const absent =
    finalRecords.filter(
        (r) => r.status === "ABSENT"
    ).length;

    const total =
    present + absent;

    return {
    totalSchoolDays: total,

    presentDays: present,

    absentDays: absent,

    attendancePercentage:
        total > 0
        ? Number(
            (
                (present / total) *
                100
            ).toFixed(2)
            )
        : 0,
    };
  };