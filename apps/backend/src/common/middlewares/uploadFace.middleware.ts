import multer from "multer";
import path from "path";
import fs from "fs";

const createStorage = (folder: string) => {

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }

  return multer.diskStorage({
    destination: (_, __, cb) => {
      cb(null, folder);
    },

    filename: (_, file, cb) => {
      const unique = Date.now() +"-" +Math.round( Math.random() * 1e9);
      cb(null, unique +path.extname(file.originalname));
    },
  });
};

const commonConfig = {
  limits: {
    fileSize:5 * 1024 * 1024,
  },
};

export const uploadFaceImages =multer({
  storage: createStorage("uploads/face-onboarding"),
  ...commonConfig,
});

export const uploadAttendanceImages =multer({
  storage: createStorage("uploads/attendance"),
  ...commonConfig,
});

export const uploadMealImages =multer({
  storage: createStorage("uploads/meals"),
  ...commonConfig,
});