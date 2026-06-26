import { z } from "zod";

export const monthlyAttendanceSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
});