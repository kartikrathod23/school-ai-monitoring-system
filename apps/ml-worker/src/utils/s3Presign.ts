import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME || "uitb-school-ai-prod";

function extractKeyFromUrl(url: string): string {
  // Input:  https://uitb-school-ai-prod.s3.ap-south-1.amazonaws.com/face-onboarding/image.jpg
  // Output: face-onboarding/image.jpg
  const urlObj = new URL(url);
  return urlObj.pathname.slice(1); // remove leading /
}

export async function presignImageUrls(urls: string[]): Promise<string[]> {
  return Promise.all(
    urls.map(async (url) => {
      const key = extractKeyFromUrl(url);
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      });
      // URL valid for 15 minutes — enough for any ML job
      return getSignedUrl(s3, command, { expiresIn: 900 });
    })
  );
}