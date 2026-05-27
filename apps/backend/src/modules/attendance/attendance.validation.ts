import { z } from "zod";

export const createAttendanceSchema = z.object({
    sectionId: z.string().uuid(),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
});

export const finalizeAttendanceSchema = z.object({
    attendanceSessionId: z.string().uuid(),
});

export const updateAttendanceRecordSchema = z.object({
    status: z.enum([
        "PRESENT",
        "ABSENT",
        "MANUAL",
    ]),
});