import { z } from "zod";

export const createOnboardingSchema = z.object({
  studentId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
});