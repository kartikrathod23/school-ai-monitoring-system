const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const uploadDetector = async () => {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const modelPath = '/home/samadhan/Drive1/Projects/school-ai-monitoring-system/apps/ml-worker/src/ml/attendance_system/models/Det_Retina_Net.onnx';
  const bucket = process.env.AWS_BUCKET_NAME;
  const key = 'models/Det_Retina_Net.onnx';

  try {
    const fileContent = fs.readFileSync(modelPath);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: 'application/octet-stream',
    });

    console.log(`Uploading ${modelPath} to s3://${bucket}/${key}...`);
    await s3.send(command);
    
    const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('Upload successful!');
    console.log('Public URL:', url);
  } catch (error) {
    console.error('Error uploading to S3:', error);
  }
};

uploadDetector();
