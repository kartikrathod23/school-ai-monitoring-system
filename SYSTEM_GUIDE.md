# School AI Monitoring System — Complete Technical Guide

> **Version**: Production v1.0 | **Architecture**: Offline-First Hybrid AI

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Services & How to Run](#services--how-to-run)
3. [End-to-End Sequence Diagrams](#end-to-end-sequence-diagrams)
   - [Face Onboarding Flow](#1-face-onboarding-flow-server-side)
   - [Classifier Training Flow](#2-classifier-training-flow-triggered-post-onboarding)
   - [Offline Attendance Flow](#3-offline-attendance-flow-client-side)
   - [Offline Sync Flow](#4-offline-sync-flow-when-network-returns)
4. [Component Deep-Dive](#component-deep-dive)
5. [Data Flow & Database Architecture](#data-flow--database-architecture)
6. [Key Gaps & Current Status](#key-gaps--current-status)
7. [Environment Variables Reference](#environment-variables-reference)

---

## System Overview

This system captures student attendance for a school using **on-device AI** so teachers can work fully offline. It has two phases:

| Phase | Location | Online Required? |
|---|---|---|
| **Onboarding** (enroll student face) | Server-side (Python ML) | ✅ Yes |
| **Attendance** (identify students) | Client-side (Mobile ONNX) | ❌ No |

```
[Server Side — Onboarding]                [Client Side — Attendance]
Teacher photos → S3 → ML Worker           Camera → MobileFaceNet ONNX
→ Python extracts MobileFaceNet embeddings → NN Classifier → PRESENT/ABSENT
→ Store 512-dim vectors in DB              → Save to SQLite locally
→ Python trains NN classifier per section  → Auto-sync to server on reconnect
→ Upload .onnx to S3, register in DB       
→ Mobile downloads .onnx at next login
```

---

## Services & How to Run

You need **4 terminals** open simultaneously. Run them in this order:

### 1. Backend API
```bash
cd apps/backend
npm run dev
```
- **Port**: 5000
- **What it does**: Central REST API server. Manages auth, students, attendance records, model assets.
- **Requires**: PostgreSQL running on `localhost:5433`, Redis on `localhost:6379`

### 2. ML Worker
```bash
cd apps/ml-worker
npm run dev
```
- **What it does**: Listens to BullMQ Redis queue. Spawns Python scripts for face embedding extraction and classifier training.
- **Requires**: Redis + PostgreSQL + Python environment with dependencies installed
- **Python env setup** (one-time):
```bash
cd apps/ml-worker/src/ml/attendance_system
pip install -r requirements.txt
```

### 3. Web Admin Dashboard
```bash
cd apps/web-admin
npm run dev
```
- **Port**: 3000 (Next.js)
- **What it does**: Admin interface to manage schools, teachers, students, and view reports.

### 4. Mobile Teacher App
```bash
cd apps/mobile-teacher
npm start -- -c   # -c clears Metro cache (required after dependency changes)
```
- **What it does**: Expo React Native app. Teachers use this for face onboarding, offline attendance, and meal count.
- **Scan the QR code** with Expo Go on your Android/iOS device.

### Infrastructure (Docker)
Make sure these are running:
```bash
docker ps  # check if PostgreSQL and Redis containers are active
```
| Service | Port | Used by |
|---|---|---|
| PostgreSQL | 5433 | Backend, ML Worker |
| Redis | 6379 | Backend (BullMQ queue), ML Worker |
| S3 (AWS) | Cloud | Backend (photo upload), ML Worker (model upload) |

---

## End-to-End Sequence Diagrams

### 1. Face Onboarding Flow (Server-Side)

```
Teacher App              Backend (API)           ML Worker (Node)       Python Script
    │                        │                        │                      │
    │── POST /face-onboarding ────────────────────►  │                      │
    │   {studentId, latitude, longitude}              │                      │
    │   + multiple face photos (multipart)            │                      │
    │                        │                        │                      │
    │                        │ 1. Validate Geofence   │                      │
    │                        │ 2. Create FaceOnboardingSession               │
    │                        │ 3. Upload photos → S3  │                      │
    │                        │ 4. Create StudentFaceImage entries            │
    │                        │ 5. Push BullMQ job     │                      │
    │                        │    FACE_EMBEDDING_GENERATION                  │
    │◄── 201 Created ──────────                       │                      │
    │                        │                        │                      │
    │                        │             BullMQ picks up job               │
    │                        │                        │                      │
    │                        │                        │ python3 process_onboarding.py
    │                        │                        │    --urls '[...]'    │
    │                        │                        │────────────────────► │
    │                        │                        │                      │ Download images from S3
    │                        │                        │                      │ Run SCRFDDetector (face detection)
    │                        │                        │                      │ Run MobileFaceNetExtractor (512-dim)
    │                        │                        │◄── JSON response ─── │
    │                        │                        │  {success, embeddings[], facesFound, modelVersion}
    │                        │                        │                      │
    │                        │◄── Store to DB ──────── │                      │
    │                        │  StudentFaceEmbedding    │                      │
    │                        │  (one row per face)     │                      │
    │                        │  Student.faceStatus = ADDED                   │
```

### 2. Classifier Training Flow (Triggered Post-Onboarding)

```
Admin / System           Backend (API)           ML Worker (Node)       Python Script
    │                        │                        │                      │
    │── POST /model-sync/train ───────────────────►  │                      │
    │   or: manual trigger    │                        │                      │
    │                        │ Push BullMQ job        │                      │
    │                        │ TRAIN_CLASSIFIER        │                      │
    │                        │── ─ ─ ─ ─ ─ ─ ─ ─ ─►  │                      │
    │                        │                        │                      │
    │                        │                        │ python3 train_for_section.py
    │                        │                        │    --section-id <UUID>              │
    │                        │                        │────────────────────► │
    │                        │                        │                      │ 1. build_db_dataset(section_id)
    │                        │                        │                      │    Pull 512-dim embeddings from DB
    │                        │                        │                      │    (StudentFaceEmbedding + AttendanceCropImage)
    │                        │                        │                      │ 2. ClassifierTrainer.train()
    │                        │                        │                      │    Train 512→128→N_students NN
    │                        │                        │                      │ 3. ONNXExporter.export()
    │                        │                        │                      │    Save attendance_classifier.onnx
    │                        │                        │                      │ 4. Upload backbone + classifier → S3
    │                        │                        │                      │ 5. POST /model-sync/register-asset
    │                        │                        │◄─── complete ─────── │
    │◄── 200 OK ───────────── │                        │                      │
    │                        │                        │                      │
    │                        │                        │ Teacher App syncs next time online
    │                        │                        │ Downloads backbone + classifier .onnx
```

### 3. Offline Attendance Flow (Client-Side)

```
Teacher App                                        SQLite (Local DB)         ONNX Models
    │                                                    │                      │
    │── Open Attendance Capture screen                   │                      │
    │── GPS location check against cached school coords  │                      │
    │   (No network call — uses AsyncStorage cache)      │                      │
    │                                                    │                      │
    │── startOfflineSession()                            │                      │
    │──────────────────────────────────────────────────► │                      │
    │                        INSERT offline_attendance_sessions                 │
    │                                                    │                      │
    │── Teacher captures group photo(s) with camera      │                      │
    │                                                    │                      │
    │── processAttendancePhoto(base64) ──────────────────────────────────────► │
    │                                           faceDetector.detectFaces()      │
    │                                           → array of detected face crops  │
    │                                           mobileFaceNet.extractEmbedding() │
    │                                           → 512-dim L2-normalized vector  │
    │                                           studentClassifier.classify()    │
    │                                           → { studentIndex, confidence }  │
    │                                                    │                      │
    │── Map index → student (sorted by rollNumber ASC)   │                      │
    │   If confidence < 0.45 → mark as UNKNOWN/MANUAL    │                      │
    │                                                    │                      │
    │── upsertOfflineRecord() ───────────────────────► ─ │                      │
    │   Save: studentId, status, confidence, crop, 512-dim embedding            │
    │                                                    │                      │
    │── finalizeOfflineSession()                         │                      │
    │   Mark all undetected students ABSENT              │                      │
    │                                                    │                      │
    │── Navigate to attendance-review.tsx                │                      │
    │   (Teacher can correct misidentifications)         │                      │
```

### 4. Offline Sync Flow (When Network Returns)

```
Teacher App               Backend (API)           PostgreSQL           S3
    │                        │                        │               │
    │ NetInfo detects online  │                        │               │
    │ ─── syncOfflineAttendance(token) ────────────►  │               │
    │                        │                        │               │
    │ For each PENDING_SYNC session:                  │               │
    │── POST /attendance/offline-sync ──────────────► │               │
    │   {sectionId, date, deviceId, records:[         │               │
    │     {studentId, status, confidence,             │               │
    │      cropImageBase64, embeddingVector}          │               │
    │   ]}                   │                        │               │
    │                        │ 1. Validate teacher section            │
    │                        │ 2. Create AttendanceSession            │
    │                        │    isOfflineSync=true                  │
    │                        │ 3. For each record:                   │
    │                        │    Create AttendanceRecord            │
    │                        │    Upload crop → S3 ─────────────────►│
    │                        │    Create AttendanceCropImage         │
    │                        │    (crop + 512-dim embedding = training data)
    │                        │ 4. Mark session PROCESSED             │
    │                        │                        │               │
    │◄── 201 { sessionId } ─── │                        │               │
    │                        │                        │               │
    │ Update local SQLite: status=SYNCED              │               │
```

---

## Component Deep-Dive

### Backend (`apps/backend`)

| Module | Route Prefix | Purpose |
|---|---|---|
| `auth` | `/api/auth` | Login / JWT token |
| `admin` | `/api/admin` | Manage schools, teachers, students |
| `teachers` | `/api/teacher` | Teacher profile, dashboard summary, section students |
| `face-onboarding` | `/api/face-onboarding` | Upload student face images → triggers ML |
| `attendance` | `/api/attendance` | Offline sync endpoint, history |
| `model-sync` | `/api/model-sync` | Download model metadata, register new trained models |
| `meal` | `/api/meal` | Mid-day meal counting (separate from attendance) |

**Key Notes:**
- JSON body limit is set to **50mb** to handle base64 crop images in offline sync payloads.
- `USE_LOCAL_UPLOAD=true` in `.env` will store files locally in `uploads/` instead of S3.

### ML Worker (`apps/ml-worker`)

**Job Queue**: `ml-processing` on Redis

| Job Name | Handler | What it does |
|---|---|---|
| `FACE_EMBEDDING_GENERATION` | `onboarding.service.ts` | Spawns `process_onboarding.py` to extract 512-dim embeddings |
| `TRAIN_CLASSIFIER` | `train_classifier.service.ts` | Spawns `train_for_section.py` to train & upload NN |
| `MEAL_COUNT_PROCESSING` | `meal.service.ts` | Processes meal count photos |

**Python ML Pipeline** (`src/ml/attendance_system/`):

| Script/Module | Purpose |
|---|---|
| `process_onboarding.py` | CLI entrypoint: download images, detect faces, extract embeddings, output JSON |
| `train_for_section.py` | CLI entrypoint: build dataset → train NN → export ONNX → upload S3 → register asset |
| `src/detector/scrfd_detector.py` | SCRFD face detector (ONNX) |
| `src/alignment/face_alignment.py` | Align detected face to 112×112 |
| `src/embedding/mobilefacenet.py` | MobileFaceNet ONNX wrapper → 512-dim embedding |
| `src/dataset_builder/db_dataset_builder.py` | Pull embeddings from PostgreSQL for training |
| `src/classifier/train.py` | PyTorch 512→128→N NN trainer |
| `src/classifier/export_onnx.py` | Export trained model to ONNX format |

### Mobile Teacher App (`apps/mobile-teacher`)

**Key Screens:**
| Screen | File | Purpose |
|---|---|---|
| Dashboard | `app/(protected)/dashboard.tsx` | Shows AI status, location, buttons |
| Face Onboarding | `app/(protected)/face-onboarding.tsx` | Capture student face photos |
| Attendance Capture | `app/(protected)/attendance-capture.tsx` | Capture group photos, run local inference |
| Attendance Review | `app/(protected)/attendance-review.tsx` | Review + correct AI results, sync to server |

**Key Services:**
| Service | File | Purpose |
|---|---|---|
| Offline DB | `src/db/localDb.ts` | SQLite init |
| Offline Attendance | `src/services/offlineAttendance.service.ts` | Run inference, save records |
| Sync Manager | `src/services/syncManager.service.ts` | Upload pending sessions to server |
| Model Sync | `src/services/modelSync.service.ts` | Download .onnx models from S3 |
| Section Cache | `src/lib/sectionCache.ts` | Cache school coords for offline geo-fence |
| Student Cache | `src/db/sectionStudentCache.ts` | Cache student list + embeddings locally |

**Local SQLite Tables:**
| Table | Purpose |
|---|---|
| `offline_attendance_sessions` | One row per attendance session |
| `offline_attendance_records` | One row per student per session (with 512-dim embedding) |
| `model_assets` | Tracks downloaded ONNX model metadata |
| `section_student_cache` | Reference embeddings for all students in the section |

---

## Data Flow & Database Architecture

### Embedding Data Flow

```
ONBOARDING                           TRAINING                          INFERENCE
─────────────                        ────────                          ─────────
StudentFaceImage (S3 URL)            StudentFaceEmbedding              ONNX Models (S3)
        │                                 │                                  │
        ▼                                 ▼                                  ▼
process_onboarding.py            db_dataset_builder.py            mobile section_student_cache
(SCRFDDetector + MFN)            (pulls from DB)                  (512-dim reference vectors)
        │                                 │
        ▼                                 ▼
StudentFaceEmbedding             train.py + export_onnx.py
(512-dim stored in DB)           (PyTorch → ONNX)
                                          │
                                          ▼
                               S3: models/{sectionId}/
                               backbone + classifier .onnx
                               + label_map.json
                                          │
                                          ▼
                               ModelAsset (DB) — isActive=true
                                          │
                                          ▼
                               Teacher App downloads .onnx on login
```

### Attendance Data Flow (Online → DB → Retraining)

```
Mobile captures group photo
        │
        ▼
MobileFaceNet → 512-dim embedding  ────── stored in offline_attendance_records
        │                                                   │
        ▼                                                   ▼
NN Classifier → studentIndex                    syncOfflineAttendance()
        │                                                   │
        ▼                                                   ▼
PRESENT/ABSENT record saved locally         POST /attendance/offline-sync
                                                            │
                                                            ▼
                                            AttendanceRecord (DB)
                                            AttendanceCropImage (DB)  ◄── used for
                                              + embeddingVector            next NN training cycle
```

---

## Key Gaps & Current Status

> [!IMPORTANT]
> The following parts of the system are **stubs** — the interface is complete but the ONNX inference is not yet wired in the mobile app.

### 1. Mobile ONNX Inference (CRITICAL)
- **Files**: `src/ml/mobilefacenet.ts`, `src/ml/classifier.ts`, `src/ml/faceDetector.ts`
- **Status**: These are **stubs**. They define the correct interface but `extractEmbedding()` and `classify()` both throw `"not implemented"`.
- **What you need to do**:
  1. Install `onnxruntime-react-native` in `apps/mobile-teacher`
  2. Implement the inference logic in each stub using the ONNX session API
  3. The pipeline is already correctly wired — only the internals need filling in.

### 2. Dashboard 400 Errors
The dashboard is making 400 requests because the `getDashboardSummary` API returns an error when the teacher has no section assigned or there are no students. This should be handled gracefully.

### 3. Location Verification Loading Forever
The `startLocationTracking` in `dashboard.tsx` only updates `locationStatus` when GPS has moved 30m or after 60 seconds. On first load, there's a one-time location check that isn't happening — add `checkCurrentLocation()` on mount to get an immediate first reading.

---

## Environment Variables Reference

### `apps/backend/.env`
```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=mysecretkey
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
USE_LOCAL_UPLOAD=true       # Set true to skip S3 and save to local /uploads
LOCAL_UPLOAD_BASE_URL=http://192.168.x.x:5000  # Your machine's local IP for local upload
```

### `apps/ml-worker/.env`
```env
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL=postgresql://...
BACKEND_URL=http://localhost:5000/api
BACKEND_TOKEN=<admin JWT token>  # Required to register trained models
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### `apps/mobile-teacher` (`.env` / `app.json`)
```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api   # Replace with your machine's local IP
```

---

## Quick Verification Checklist

After starting all services, verify these work in order:

- [ ] **Backend health**: `curl http://localhost:5000/` returns `"API is Running!"`
- [ ] **DB connected**: Backend logs show no Prisma errors
- [ ] **Redis connected**: ML Worker logs show `ML Worker Running...`
- [ ] **Mobile loads**: Expo QR code appears, app loads on device
- [ ] **Login works**: Teacher can log in, dashboard shows
- [ ] **Section data saves**: Dashboard loads teacher section, location widget shows distance
- [ ] **Onboarding works**: Teacher can upload student photos, ML Worker processes job
- [ ] **Model sync**: After training, teacher app downloads model on dashboard refresh
- [ ] **Offline attendance**: Capture photos, AI processes, attendance-review shows results
- [ ] **Sync**: Pull to review screen, "Sync Now" button uploads to server
