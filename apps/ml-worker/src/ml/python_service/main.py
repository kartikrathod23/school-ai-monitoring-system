import os
import numpy as np
import cv2
import requests
import torch
import torch.nn as nn
import onnxruntime as ort
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any
from io import BytesIO
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="MobileFaceNet ML Service")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Load MobileFaceNet backbone ───────────────────────────────────
print("Loading MobileFaceNet backbone...")
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH = os.path.join(BASE_DIR, "w600k_mbf.onnx")
DET_PATH  = os.path.join(BASE_DIR, "det_500m.onnx")

backbone = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
detector = ort.InferenceSession(DET_PATH,  providers=['CPUExecutionProvider'])

INP_NAME = backbone.get_inputs()[0].name
OUT_NAME = backbone.get_outputs()[0].name

# Use insightface for face detection (handles all the complexity)
from insightface.app import FaceAnalysis
face_app = FaceAnalysis(name='buffalo_sc')
face_app.prepare(ctx_id=-1, det_size=(640, 640))
print("MobileFaceNet loaded OK")

# ── Confidence thresholds ─────────────────────────────────────────
PRESENT_THRESHOLD = 0.40   # cosine similarity >= this → PRESENT
MANUAL_THRESHOLD  = 0.30   # cosine similarity >= this → MANUAL
                            # below MANUAL_THRESHOLD   → ABSENT

# ── Helpers ───────────────────────────────────────────────────────
def download_image(url: str) -> np.ndarray:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def get_embedding(face_crop_bgr: np.ndarray) -> np.ndarray:
    img = cv2.resize(face_crop_bgr, (112, 112))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    img = (img - 127.5) / 127.5
    img = np.transpose(img, (2, 0, 1))[np.newaxis]
    emb = backbone.run([OUT_NAME], {INP_NAME: img})[0][0]
    norm = np.linalg.norm(emb)
    return emb / (norm + 1e-8)

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))

def detect_and_embed(img_bgr: np.ndarray):
    """Returns list of (embedding, bbox) for each face in image"""
    faces = face_app.get(img_bgr)
    results = []
    for face in faces:
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        x1, y1 = max(0, x1), max(0, y1)
        crop = img_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        emb = get_embedding(crop)
        results.append(emb)
    return results

# ── Request models ────────────────────────────────────────────────
class OnboardingRequest(BaseModel):
    studentId:  str
    imageUrls:  List[str]

class EmbeddingRecord(BaseModel):
    studentId:  str
    embedding:  Any   # JSON from DB — could be list or nested

class AttendanceRequest(BaseModel):
    attendanceSessionId: str
    sectionId:           str
    imageUrls:           List[str]
    studentEmbeddings:   List[EmbeddingRecord]

class MealRequest(BaseModel):
    mealSessionId: str
    imageUrls:     List[str]

# ─────────────────────────────────────────────────────────────────
# ROUTE 1: /onboarding
# Gets 5 photo URLs → detects face in each → stores all embeddings
# ─────────────────────────────────────────────────────────────────
@app.post("/onboarding")
async def onboarding(req: OnboardingRequest):
    all_embeddings = []

    for url in req.imageUrls:
        try:
            img  = download_image(url)
            embs = detect_and_embed(img)
            if embs:
                # Take the largest/most prominent face per photo
                all_embeddings.append(embs[0].tolist())
                print(f"  OK: {url[-40:]}")
            else:
                print(f"  No face: {url[-40:]}")
        except Exception as e:
            print(f"  Error on image: {e}")
            continue

    if not all_embeddings:
        return {
            "success": False,
            "error":   "No face detected in any uploaded image"
        }

    return {
        "success":      True,
        "embeddings":   all_embeddings,      # list of 512-d arrays (up to 5)
        "modelVersion": "MobileFaceNet-v1",
        "facesFound":   len(all_embeddings),
        "totalImages":  len(req.imageUrls)
    }

# ─────────────────────────────────────────────────────────────────
# ROUTE 2: /attendance
# Gets classroom photo URLs + stored embeddings → marks attendance
# ─────────────────────────────────────────────────────────────────
@app.post("/attendance")
async def attendance(req: AttendanceRequest):

    # Build DB embedding map: studentId → list of np arrays
    db_map: dict = {}
    for rec in req.studentEmbeddings:
        sid = rec.studentId
        raw = rec.embedding

        # Handle both flat list and nested list from Prisma JSON
        if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list):
            emb = np.array(raw[0], dtype=np.float32)
        else:
            emb = np.array(raw, dtype=np.float32)

        norm = np.linalg.norm(emb)
        emb  = emb / (norm + 1e-8)

        if sid not in db_map:
            db_map[sid] = []
        db_map[sid].append(emb)

    all_student_ids = list(db_map.keys())
    print(f"Students in DB for this section: {len(all_student_ids)}")

    detected_map: dict = {}   # studentId → {confidence, status}
    total_heads = 0

    for url in req.imageUrls:
        try:
            img  = download_image(url)
            embs = detect_and_embed(img)
            total_heads += len(embs)
            print(f"  Photo faces detected: {len(embs)}")

            for query_emb in embs:
                best_id    = None
                best_score = -1.0

                for sid, stored_embs in db_map.items():
                    score = max(cosine_sim(query_emb, e) for e in stored_embs)
                    if score > best_score:
                        best_score = score
                        best_id    = sid

                print(f"    Best match: {best_id} score={best_score:.3f}")

                if best_score >= PRESENT_THRESHOLD:
                    status = "PRESENT"
                elif best_score >= MANUAL_THRESHOLD:
                    status = "MANUAL"
                else:
                    status = "ABSENT"
                    best_id = None

                if best_id and best_id not in detected_map:
                    detected_map[best_id] = {
                        "studentId":  best_id,
                        "confidence": round(best_score, 4),
                        "status":     status
                    }
                elif best_id and best_score > detected_map[best_id]["confidence"]:
                    # Keep highest confidence if same student detected twice
                    detected_map[best_id] = {
                        "studentId":  best_id,
                        "confidence": round(best_score, 4),
                        "status":     status
                    }

        except Exception as e:
            print(f"  Error processing photo: {e}")
            continue

    # Students not matched → ABSENT
    final_results = list(detected_map.values())
    for sid in all_student_ids:
        if sid not in detected_map:
            final_results.append({
                "studentId":  sid,
                "confidence": 0.0,
                "status":     "ABSENT"
            })

    present_count = sum(1 for r in final_results if r["status"] == "PRESENT")
    manual_count  = sum(1 for r in final_results if r["status"] == "MANUAL")
    absent_count  = sum(1 for r in final_results if r["status"] == "ABSENT")
    conf_values   = [r["confidence"] for r in detected_map.values()]
    avg_conf      = float(np.mean(conf_values)) if conf_values else 0.0

    print(f"Result — Present:{present_count} Manual:{manual_count} Absent:{absent_count} Heads:{total_heads}")

    return {
        "results":       final_results,
        "totalHeads":    total_heads,
        "detectedCount": len(detected_map),
        "absentCount":   absent_count,
        "avgConfidence": round(avg_conf, 4)
    }

# ─────────────────────────────────────────────────────────────────
# ROUTE 3: /meal
# Gets meal photo URLs → counts faces (= students receiving meal)
# ─────────────────────────────────────────────────────────────────
@app.post("/meal")
async def meal(req: MealRequest):
    total_detected = 0
    all_scores     = []

    for url in req.imageUrls:
        try:
            img   = download_image(url)
            faces = face_app.get(img)
            total_detected += len(faces)
            scores = [float(f.det_score) for f in faces]
            all_scores.extend(scores)
            print(f"  Meal photo faces: {len(faces)}")
        except Exception as e:
            print(f"  Error on meal image: {e}")
            continue

    avg_confidence = float(np.mean(all_scores)) if all_scores else 0.0

    return {
        "totalDetected":  total_detected,
        "confidenceScore": round(avg_confidence, 4)
    }

# ─────────────────────────────────────────────────────────────────
# ROUTE 4: /health
# ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model":  "MobileFaceNet (w600k_mbf.onnx)",
        "detector": "RetinaFace (det_500m.onnx)"
    }