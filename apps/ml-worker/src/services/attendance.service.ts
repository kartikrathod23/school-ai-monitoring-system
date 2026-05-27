import prisma from "../config/prisma";

export const processAttendanceJob = async (data: any) => {
    console.log("Attendance Processing:", data);

    await prisma.mlProcessingJob.update({
        where: {
            id: data.mlJobId,
        },

        data: {
            status: "PROCESSING",
            startedAt: new Date(),
        },
    });

    await new Promise((resolve) =>
        setTimeout(resolve, 5000)
    );

    const students = await prisma.student.findMany({
        where: {
            sectionId: data.sectionId,
        },

        include: {
            user: true,
        },

        orderBy: {
            rollNumber: "asc",
        },
    });

    const detectedStudents = students.slice(0, 6);

    for (const student of detectedStudents) {

        const confidence = Math.random() * (0.98 - 0.68) + 0.68;
        let status = "PRESENT";

        if (confidence < 0.80) {
            status = "MANUAL";
        }

        await prisma.attendanceRecord.create({
            data: {
                attendanceSessionId: data.attendanceSessionId,
                studentId: student.id,
                status: status as any,
                confidenceScore: confidence,
            },
        });
    }

    const totalStudents = await prisma.student.count({
        where: {
            sectionId: data.sectionId,
        },
    });

    const detectedCount = detectedStudents.length;
    const absentCount = totalStudents - detectedCount;

    for (let i = 0; i < absentCount; i++) {

        await prisma.attendanceRecord.create({
            data: {
                attendanceSessionId: data.attendanceSessionId,
                status: "ABSENT",
                confidenceScore: 0,
            },
        });
    }

    await prisma.attendanceSession.update({
        where: {
            id: data.attendanceSessionId,
        },

        data: {
            status: "PROCESSED",
            confidenceScore: 0.89,
        },
    });

    await prisma.mlProcessingJob.update({
        where: {
            id: data.mlJobId,
        },

        data: {
            status: "COMPLETED",
            completedAt: new Date(),
        },
    });

    console.log("Attendance completed");
};