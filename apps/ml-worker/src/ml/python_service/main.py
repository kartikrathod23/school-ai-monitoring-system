from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import json, sqlite3, os, requests, cv2, torch
import torch.nn as nn
import onnxruntime as ort
from insightface.app import FaceAnalysis
from io import BytesIO
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

app = FastAPI()

# ── Load MobileFaceNet backbone ──────────────────────────────────
print("Loading MobileFaceNet...")
face_app = FaceAnalysis(name='buffalo_sc')
face_app.prepare(ctx_id=-1, det_size=(640, 640))

onnx_path = os.path.expanduser("~/.insightface/models/buffalo_sc/w600k_mbf.onnx")
backbone  = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
inp_name  = backbone.get_inputs()[0].name
out_name  = backbone.get_outputs()[0].name

# ── Load classifier ──────────────────────────────────────────────
class ClassifierHead(nn.Module):
    def __init__(self, in_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128),   nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )
    def forward(self, x): return self.net(x)

CLASSIFIER_PATH = os.environ.get("CLASSIFIER_PATH", "../classifier.pt")
ckpt = torch.load(CLASSIFIER_PATH, map_location="cpu")
CLASS_NAMES = ckpt["class_names"]   # ["student_01", "student_02", ...]
NUM_CLASSES  = ckpt["num_classes"]
classifier  = ClassifierHead(512, NUM_CLASSES)
classifier.load_state_dict(ckpt["model_state"])
classifier.eval()
print(f"Classifier loaded. Classes: {CLASS_NAMES}")

# ── Helpers ──────────────────────────────────────────────────────
def download_image(url: str) -> np.ndarray:
    """Download image from S3 URL → numpy BGR array"""
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def get_embedding(face_crop_bgr: np.ndarray) -> np.ndarray:
    """112x112 BGR crop → 512-d normalized embedding"""
    img = cv2.resize(face_crop_bgr, (112, 112))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32)
    img = (img - 127.5) / 127.5
    img = np.transpose(img, (2, 0, 1))[np.newaxis]   # (1,3,112,112)
    emb = backbone.run([out_name], {inp_name: img})[0][0]
    emb = emb / np.linalg.norm(emb)
    return emb

def cosine_similarity(a, b):
    return float(np.dot(a, b))

# ── API models ───────────────────────────────────────────────────
class OnboardingRequest(BaseModel):
    studentId:   str
    imageUrls:   list[str]

class AttendanceRequest(BaseModel):
    attendanceSessionId: str
    sectionId:           str
    imageUrls:           list[str]
    studentEmbeddings:   list[dict]  # [{studentId, embedding: [...512 floats]}]

class MealRequest(BaseModel):
    mealSessionId: str
    imageUrls:     list[str]

# ────────────────────────────────────────────────────────────────
# ROUTE 1: Face Onboarding
# Input: student's enrollment image URLs
# Output: 512-d embedding to store in DB
# ────────────────────────────────────────────────────────────────
@app.post("/onboarding")
async def onboarding(req: OnboardingRequest):
    embeddings = []

    for url in req.imageUrls:
        try:
            img   = download_image(url)
            faces = face_app.get(img)

            if not faces:
                print(f"  No face in {url}")
                continue

            # Pick largest face
            face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
            x1,y1,x2,y2 = [int(v) for v in face.bbox]
            x1,y1 = max(0,x1), max(0,y1)
            crop  = img[y1:y2, x1:x2]
            emb   = get_embedding(crop)
            embeddings.append(emb.tolist())

        except Exception as e:
            print(f"  Error on {url}: {e}")
            continue

    if not embeddings:
        return {"success": False, "error": "No face detected in any image"}

    # Average all embeddings → one representative vector
    avg_emb = np.mean(embeddings, axis=0)
    avg_emb = avg_emb / np.linalg.norm(avg_emb)

    return {
        "success":      True,
        "embedding":    avg_emb.tolist(),
        "modelVersion": "MobileFaceNet-v1",
        "facesFound":   len(embeddings),
        "totalImages":  len(req.imageUrls)
    }

# ────────────────────────────────────────────────────────────────
# ROUTE 2: Attendance Recognition
# Input: classroom group photo URLs + stored student embeddings
# Output: list of {studentId, status, confidence}
# ────────────────────────────────────────────────────────────────
@app.post("/attendance")
async def attendance(req: AttendanceRequest):
    PRESENT_THRESHOLD = 0.85
    MANUAL_THRESHOLD  = 0.70

    # Build stored embedding map: studentId → list of np arrays
    db_embeddings = {}
    for rec in req.studentEmbeddings:
        sid = rec["studentId"]
        emb = np.array(rec["embedding"])
        # embedding stored as JSON array in DB — could be nested
        if isinstance(emb[0], list):
            emb = np.array(emb[0])
        emb = emb / (np.linalg.norm(emb) + 1e-8)
        if sid not in db_embeddings:
            db_embeddings[sid] = []
        db_embeddings[sid].append(emb)

    all_student_ids = list(db_embeddings.keys())
    detected_results = []   # [{studentId, confidence, status}]
    total_heads = 0

    for url in req.imageUrls:
        try:
            img   = download_image(url)
            faces = face_app.get(img)
            total_heads += len(faces)

            for face in faces:
                x1,y1,x2,y2 = [int(v) for v in face.bbox]
                x1,y1 = max(0,x1), max(0,y1)
                crop  = img[y1:y2, x1:x2]

                if crop.size == 0:
                    continue

                query_emb = get_embedding(crop)

                # Compare against every stored student embedding
                best_student = None
                best_score   = -1

                for sid, stored_embs in db_embeddings.items():
                    score = max(cosine_similarity(query_emb, e) for e in stored_embs)
                    if score > best_score:
                        best_score   = score
                        best_student = sid

                if best_score >= PRESENT_THRESHOLD:
                    status = "PRESENT"
                elif best_score >= MANUAL_THRESHOLD:
                    status = "MANUAL"
                else:
                    status = "ABSENT"
                    best_student = None

                if best_student:
                    detected_results.append({
                        "studentId":  best_student,
                        "confidence": round(best_score, 4),
                        "status":     status
                    })

        except Exception as e:
            print(f"  Error on {url}: {e}")
            continue

    # Deduplicate: if same student detected multiple times keep highest confidence
    seen = {}
    for r in detected_results:
        sid = r["studentId"]
        if sid not in seen or r["confidence"] > seen[sid]["confidence"]:
            seen[sid] = r

    # Students not detected → ABSENT
    absent_results = []
    for sid in all_student_ids:
        if sid not in seen:
            absent_results.append({
                "studentId":  sid,
                "confidence": 0.0,
                "status":     "ABSENT"
            })

    final = list(seen.values()) + absent_results
    detected_count = len(seen)
    avg_conf = np.mean([r["confidence"] for r in seen.values()]) if seen else 0.0

    return {
        "results":       final,
        "totalHeads":    total_heads,
        "detectedCount": detected_count,
        "absentCount":   len(absent_results),
        "avgConfidence": round(float(avg_conf), 4)
    }

# ────────────────────────────────────────────────────────────────
# ROUTE 3: Meal Counting
# Input: meal photo URLs
# Output: count of people detected
# ────────────────────────────────────────────────────────────────
@app.post("/meal")
async def meal(req: MealRequest):
    total_detected = 0
    confidence_scores = []

    for url in req.imageUrls:
        try:
            img   = download_image(url)
            faces = face_app.get(img)
            count = len(faces)
            total_detected += count

            # confidence based on detection quality scores
            if faces:
                scores = [float(f.det_score) for f in faces]
                confidence_scores.extend(scores)

        except Exception as e:
            print(f"  Error on {url}: {e}")
            continue

    avg_confidence = float(np.mean(confidence_scores)) if confidence_scores else 0.0

    return {
        "totalDetected":  total_detected,
        "confidenceScore": round(avg_confidence, 4)
    }

@app.get("/health")
async def health():
    return {"status": "ok", "model": "MobileFaceNet-v1", "classes": len(CLASS_NAMES)}
