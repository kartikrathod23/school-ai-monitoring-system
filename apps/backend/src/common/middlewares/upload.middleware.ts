import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => ({
    folder: "school-ai/students",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      {
        width: 500,
        height: 500,
        crop: "limit",
      },
    ],
  }),
});

export const uploadStudentImage = multer({
  storage,
});