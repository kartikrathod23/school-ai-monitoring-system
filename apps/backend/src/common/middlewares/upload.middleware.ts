import multer from "multer";
import path from "path";
import fs from "fs";

const studentPath = path.join(
  __dirname,
  "../../../uploads/students"
);

if (!fs.existsSync(studentPath)) {
  fs.mkdirSync(studentPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s/g, "");

    cb(null, uniqueName);
  },
});

export const uploadStudentImage = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg/png allowed"));
    }
  },
});