import { z } from "zod";

export const sectionIdParamSchema = z.object({
  sectionId: z.string().uuid("Invalid section id"),
});

export const attendanceStartSchema = z.object({
  sectionId: z.string().uuid("Invalid section id"),
});

export const attendanceRecordUpdateSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "MANUAL"]),
});

export const mealSessionStartSchema = z.object({
  sectionId: z.string().uuid("Invalid section id"),
});

export const verifyLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});