import multer from "multer";
import path from "path";
import fs from "fs";

const uploadPath = "uploads/face-onboarding";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, uploadPath);
  },

  filename: (_, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      unique + path.extname(file.originalname)
    );
  },
});

export const uploadFaceImages = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});