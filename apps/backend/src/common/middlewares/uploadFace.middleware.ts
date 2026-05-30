import multer from "multer";

const commonConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};

export const uploadFaceImages =multer(commonConfig);
export const uploadAttendanceImages =multer(commonConfig);
export const uploadMealImages =multer(commonConfig);