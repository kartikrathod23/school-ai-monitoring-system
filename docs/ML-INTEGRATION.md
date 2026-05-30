# ML Integration Handover Guide

## Overview

The application architecture is already complete.

The backend:

* Receives images from the teacher mobile app
* Uploads images to AWS S3
* Creates ML processing jobs
* Pushes jobs into BullMQ (Redis)

The ML Worker:

* Consumes jobs from Redis
* Executes model inference
* Updates PostgreSQL records

Currently all ML logic is mocked and must be replaced with actual model inference.

No frontend changes are required.

No backend API changes are required.

Only ML inference implementation is pending.

---

# High Level Architecture

Teacher App
↓
Backend API
↓
AWS S3 Upload
↓
BullMQ Queue
↓
ML Worker
↓
Model Inference
↓
PostgreSQL Update
↓
Teacher App Displays Results

---

# AWS S3 Storage

Bucket:

```text
uitb-school-ai-prod
```

Folders:

```text
face-onboarding/
attendance/
meals/
```

Images are uploaded directly to S3.

Images are NOT stored locally.

Database stores only S3 URLs.

Example URL:

```text
https://uitb-school-ai-prod.s3.ap-south-1.amazonaws.com/face-onboarding/image.jpg
```

---

# Redis Queue

Queue Name:

```text
ml-processing
```

Defined in:

```text
backend/src/queues/ml.queue.ts
```

Worker listens to:

```text
ml-worker/src/workers/ml.worker.ts
```

---

# Job Types

The system currently creates three job types.

---

## FACE_EMBEDDING_GENERATION

Purpose:

Generate face embedding for student onboarding.

Job Payload:

```ts
{
  mlJobId,
  onboardingSessionId,
  studentId
}
```

---

## ATTENDANCE_PROCESSING

Purpose:

Recognize students present in attendance images.

Job Payload:

```ts
{
  mlJobId,
  attendanceSessionId,
  sectionId
}
```

---

## MEAL_COUNT_PROCESSING

Purpose:

Count students receiving meals.

Job Payload:

```ts
{
  mlJobId,
  mealSessionId,
  sectionId
}
```

---

# Worker Entry Point

File:

```text
ml-worker/src/workers/ml.worker.ts
```

Current Routing:

```ts
FACE_EMBEDDING_GENERATION
→ processFaceOnboardingJob()

ATTENDANCE_PROCESSING
→ processAttendanceJob()

MEAL_COUNT_PROCESSING
→ processMealJob()
```

Do not change worker architecture.

Only replace internal inference logic.

---

# Files To Modify

Only these files require ML implementation:

```text
ml-worker/src/services/onboarding.service.ts

ml-worker/src/services/attendance.service.ts

ml-worker/src/services/meal.service.ts
```

Everything else should remain unchanged.

---

# Recommended Structure

Create:

```text
ml-worker/src/ml/
```

Suggested structure:

```text
ml/
├── imageDownloader.ts
├── faceEmbedding.ts
├── attendanceRecognition.ts
├── mealCounting.ts
├── mlClient.ts
└── constants.ts
```

Worker services should call these modules.

Keep model code separate from job orchestration code.

---

# Face Onboarding Integration

## Purpose

Generate a face embedding for each student.

---

## Current Dummy Logic

File:

```text
onboarding.service.ts
```

Current code:

```ts
await prisma.studentFaceEmbedding.create({
  data: {
    studentId,
    embedding: [
      0.12,
      0.44,
      0.88,
      0.91
    ],
    modelVersion: "FaceNet-v1"
  }
});
```

This is fake data.

---

## Replace With

### Step 1

Fetch onboarding images.

```ts
const images =
  await prisma.studentFaceImage.findMany({
    where: {
      onboardingSessionId
    }
  });
```

---

### Step 2

Download images from S3.

Example:

```ts
image.imageUrl
```

contains public S3 URL.

---

### Step 3

Run face detection.

Suggested:

```text
MTCNN
RetinaFace
YOLO Face
```

---

### Step 4

Generate embeddings.

Suggested:

```text
FaceNet
ArcFace
InsightFace
```

---

### Step 5

Store embedding.

```ts
await prisma.studentFaceEmbedding.create({
  data: {
    studentId,
    embedding,
    modelVersion
  }
});
```

---

### Step 6

Update status.

Success:

```ts
student.faceStatus = "ADDED"
```

Failure:

```ts
student.faceStatus = "RESCAN"
```

---

# Attendance Integration

## Purpose

Recognize students in classroom images.

---

## Current Dummy Logic

File:

```text
attendance.service.ts
```

Current code:

```ts
const detectedStudents =
  students.slice(0, 6);
```

This is fake logic.

---

## Replace With

### Step 1

Fetch attendance images.

```ts
await prisma.attendanceImage.findMany(...)
```

---

### Step 2

Download images from S3.

---

### Step 3

Detect faces.

---

### Step 4

Generate embeddings.

---

### Step 5

Fetch stored student embeddings.

```ts
await prisma.studentFaceEmbedding.findMany(...)
```

---

### Step 6

Compare embeddings.

Recommended:

```text
Cosine Similarity
```

or

```text
Euclidean Distance
```

---

### Step 7

Create attendance records.

```ts
await prisma.attendanceRecord.create(...)
```

---

## Status Rules

High confidence:

```text
PRESENT
```

Low confidence:

```text
MANUAL
```

Not detected:

```text
ABSENT
```

---

## Manual Review Threshold

Recommended:

```text
confidence >= 0.85
→ PRESENT

0.70 - 0.85
→ MANUAL

below 0.70
→ ABSENT
```

---

## Final Updates

After inference:

```ts
attendanceSession.status =
  "PROCESSED";
```

and

```ts
mlJob.status =
  "COMPLETED";
```

---

# Meal Counting Integration

## Purpose

Count students receiving meals.

---

## Current Dummy Logic

File:

```text
meal.service.ts
```

Current code:

```ts
Math.random()
```

This is fake logic.

---

## Replace With

### Step 1

Fetch meal images.

```ts
await prisma.mealImage.findMany(...)
```

---

### Step 2

Download images from S3.

---

### Step 3

Run counting model.

Suggested:

```text
YOLO
YOLOv11
RT-DETR
Crowd Counting Model
```

---

### Step 4

Count students.

---

### Step 5

Update MealSession.

```ts
await prisma.mealSession.update({
  data: {
    totalDetected,
    confidenceScore,
    status: "PROCESSED"
  }
});
```

---

# Database Tables Used By ML

## StudentFaceImage

Stores onboarding images.

---

## StudentFaceEmbedding

Stores face embeddings.

---

## AttendanceImage

Stores attendance images.

---

## AttendanceRecord

Stores attendance results.

---

## MealImage

Stores meal images.

---

## MealSession

Stores meal count results.

---

## MlProcessingJob

Tracks processing lifecycle.

Statuses:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

---

# Required Job Lifecycle

Every ML service must follow:

```text
PENDING
↓
PROCESSING
↓
COMPLETED
```

or

```text
PENDING
↓
PROCESSING
↓
FAILED
```

Required fields:

```ts
startedAt
completedAt
status
```

---

# Environment Variables

ML Worker:

```env
REDIS_HOST=
REDIS_PORT=

DATABASE_URL=

BACKEND_URL=

MODEL_URL=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=
```

---

# What Must NOT Be Modified

Do NOT modify:

```text
Backend APIs
Teacher Mobile App
BullMQ Queue
Redis Setup
AWS Upload Logic
Database Schema
Authentication
Geofence Validation
Admin Dashboard
```

Only replace dummy logic inside:

```text
processFaceOnboardingJob()

processAttendanceJob()

processMealJob()
```

The entire application pipeline is already connected and functioning end-to-end.
Only actual model inference is pending.
