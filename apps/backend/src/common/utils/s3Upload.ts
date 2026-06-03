import fs from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../../config/s3";

const useLocalUpload = () => process.env.USE_LOCAL_UPLOAD === "true";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
) => {
  if (useLocalUpload()) {
    const uploadRoot = path.join(__dirname, "../../../uploads", folder);
    fs.mkdirSync(uploadRoot, { recursive: true });
    const filename = `${Date.now()}-${file.originalname}`;
    fs.writeFileSync(path.join(uploadRoot, filename), file.buffer);
    const base =
      process.env.LOCAL_UPLOAD_BASE_URL ||
      `http://127.0.0.1:${process.env.PORT || 5000}`;
    const url = `${base}/uploads/${folder}/${filename}`;
    console.log("Local upload:", url);
    return url;
  }

  console.log("Uploading to S3...");
  console.log("Bucket:", process.env.AWS_BUCKET_NAME);
  console.log("Folder:", folder);
  console.log("File:", file.originalname);

  const key = `${folder}/${Date.now()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  console.log("Upload successful:", key);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
