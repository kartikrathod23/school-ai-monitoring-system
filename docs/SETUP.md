# UITB School AI System - Local Setup Guide

## Prerequisites

Install the following before starting.

### 1. Git

Verify installation:

```bash
git --version
```

---

### 2. Docker Desktop

Verify installation:

```bash
docker --version
docker compose version
```

---

### 3. Node.js

Recommended:

```text
Node.js v22+
npm v10+
```

Verify:

```bash
node -v
npm -v
```

---

### 4. Redis

Redis is required for BullMQ queues used by the ML worker.

#### Windows (Recommended)

Run Redis using Docker:

```bash
docker run -d --name redis -p 6379:6379 redis
```

Verify:

```bash
docker ps
```

Expected container:

```text
redis
```

---

### 5. Expo Go

Install Expo Go on Android device for testing the mobile application.

---

# Step 1: Clone Repository

```bash
git clone <repository-url>
```

Navigate to project root:

```bash
cd <project-root>
```

---

# Step 2: Start PostgreSQL Database

From project root:

```bash
docker compose up -d
```

Verify container:

```bash
docker ps
```

Expected container:

```text
school_postgres
```

Database details:

```text
Host: localhost
Port: 5433
Database: school_db
Username: postgres
Password: Kkr@13245
```

---

# Step 3: Backend Setup

Navigate:

```bash
cd apps/backend
```

Install dependencies:

```bash
npm install
```

Create `.env` file.

Required variables:

```env
DATABASE_URL=

JWT_SECRET=

REDIS_HOST=
REDIS_PORT=

AWS_REGION=
AWS_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

---

# Step 4: Run Prisma Migrations

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate deploy
```

For local development:

```bash
npx prisma migrate dev
```

---

# Database Initialization

After migrations complete, create the initial admin account.

Navigate to backend:

```bash
cd apps/backend
```

Run seed:

```bash
npx ts-node prisma/seed.ts
```

Expected output:

```text
Admin created
```

Default admin credentials:

```text
User Code: ADM_001
Password: admin123
Role: ADMIN
```

---

# Optional: Prisma Studio

Prisma Studio provides a UI for viewing and editing database records.

Run:

```bash
npx prisma studio
```

Open:

```text
http://localhost:5555
```

Useful for viewing:

* Schools
* Standards
* Sections
* Teachers
* Students
* Attendance Records
* Meal Sessions
* Face Embeddings
* ML Processing Jobs

---

# First Login

Login to Admin Dashboard using:

```text
User Code: ADM_001
Password: admin123
```

---

# Initial Data Creation

The database initially contains only the admin account.

Create data in the following order:

1. Create School
2. Create Standards
3. Create Sections
4. Create Teachers
5. Create Students
6. Assign Teacher To Section

Without these steps:

* Teacher Login will not work
* Face Onboarding will not work
* Attendance will not work
* Meal Count will not work

---

# Sample System Flow

Admin Dashboard:

```text
School
 └── Standard
      └── Section
           ├── Students
           └── Teacher Assignment
```

Teacher App:

```text
Teacher Login
     ↓
Face Onboarding
     ↓
Attendance Capture
     ↓
Meal Count Capture
     ↓
Reports
```

---

# Step 5: Start Backend

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Verify:

```text
http://localhost:5000/
```

Expected response:

```text
API is Running!
```

---

# Step 6: Verify Redis

Verify Redis is running:

```bash
redis-cli ping
```

Expected:

```text
PONG
```

If Redis was started using Docker:

```bash
docker ps
```

Expected container:

```text
redis
```

---

# Step 7: ML Worker Setup

Open a new terminal.

Navigate:

```bash
cd apps/ml-worker
```

Install dependencies:

```bash
npm install
```

Create `.env` file using provided values.

Example:

```env
REDIS_HOST=localhost
REDIS_PORT=6379

DATABASE_URL=

BACKEND_URL=

MODEL_URL=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=
```

Start worker:

```bash
npm run dev
```

Expected:

```text
Worker Started
```

---

# Step 8: Mobile Teacher App Setup

Open another terminal.

Navigate:

```bash
cd apps/mobile-teacher
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start --clear
```

Scan QR code using Expo Go.

---

# Project Architecture

## Backend

Responsible for:

* Authentication
* Face Onboarding
* Attendance
* Meal Counting
* Geofence Validation
* Queue Creation
* Database Operations
* AWS S3 Uploads

---

## ML Worker

Responsible for:

* Face Embedding Generation
* Attendance Processing
* Meal Count Processing

Consumes jobs from BullMQ queue and updates database results.

---

## Mobile Teacher

Responsible for:

* Teacher Login
* Face Onboarding
* Attendance Capture
* Meal Count Capture
* Attendance History
* Reports

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

All images are uploaded directly to AWS S3.

Local uploads folder is no longer used.

Image URLs are stored in PostgreSQL.

---

# Shared vs Local Resources

## Shared

* GitHub Repository
* AWS S3 Bucket
* Source Code

## Local To Each Developer

* PostgreSQL Database
* Docker Containers
* Redis Instance
* ML Worker Process

Database records are NOT shared automatically.

Each developer has their own local database.

---

# Common Commands

Generate Prisma Client:

```bash
npx prisma generate
```

Run Migrations:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

Run Seed:

```bash
npx ts-node prisma/seed.ts
```

Reset Database:

```bash
npx prisma migrate reset
```

---

# Troubleshooting

## Backend Not Starting

Check:

```bash
docker ps
```

Ensure PostgreSQL container is running.

---

## Redis Connection Error

Verify Redis:

```bash
redis-cli ping
```

Expected:

```text
PONG
```

---

## Prisma Connection Error

Verify:

```env
DATABASE_URL=
```

Matches PostgreSQL container configuration.

---

## S3 Upload Failure

Verify:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=
```

And confirm AWS IAM user has S3 permissions.

---

# Security Notes

1. Never commit `.env` files.
2. Never commit AWS credentials.
3. Never share access keys publicly.
4. Rotate AWS credentials if exposed.
5. Store secrets securely.

---
