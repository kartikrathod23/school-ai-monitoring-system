import { z } from "zod";

export const createTeacherSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  mobileNumber: z.string().min(10).max(10),
  password: z.string().min(6),
  sectionIds: z.array(z.string()).min(1, "At least one section required"),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  mobileNumber: z.string().min(10).max(10),
  password: z.string().min(6),
  sectionId: z.string(),
  rollNumber: z.number().int().positive(),
});


export const createSchoolSchema = z.object({
  name: z.string().min(3),
  address: z.string().min(5),

  district: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  contactNumber: z.string().optional(),

  latitude: z.number(),
  longitude: z.number(),
  geoRadius: z.number().positive(),
});

