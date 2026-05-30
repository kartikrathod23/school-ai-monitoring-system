import { PutObjectCommand, } from "@aws-sdk/client-s3";
import { s3 } from "../../config/s3";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
) => {

  console.log("Uploading to S3...");
  console.log("Bucket:", process.env.AWS_BUCKET_NAME);
  console.log("Folder:", folder);
  console.log("File:", file.originalname);

  const key =
    `${folder}/${Date.now()}-${file.originalname}`;

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