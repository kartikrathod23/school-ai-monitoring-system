import os, json, sqlite3, numpy as np, cv2
from insightface.app import FaceAnalysis
import warnings
warnings.filterwarnings('ignore')

# ── CONFIG ──────────────────────────────────────────
STUDENTS_FOLDER = "students"
DB_PATH         = "attendance.db"
# ────────────────────────────────────────────────────

# Load MobileFaceNet via InsightFace
print("Loading MobileFaceNet model...")
app = FaceAnalysis(name='buffalo_sc')
app.prepare(ctx_id=-1, det_size=(640, 640))
print("Model loaded OK\n")

# Create DB
conn = sqlite3.connect(DB_PATH)
conn.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT NOT NULL,
        photo_name  TEXT,
        embedding   TEXT NOT NULL
    )
""")
conn.commit()

total_ok   = 0
total_skip = 0

for folder in sorted(os.listdir(STUDENTS_FOLDER)):
    folder_path = os.path.join(STUDENTS_FOLDER, folder)
    if not os.path.isdir(folder_path):
        continue

    photos = [f for f in os.listdir(folder_path)
              if f.lower().endswith(('.jpg','.jpeg','.png'))]

    print(f"--- Enrolling {folder} ({len(photos)} photos) ---")
    count = 0

    for photo in sorted(photos):
        path = os.path.join(folder_path, photo)
        img  = cv2.imread(path)

        if img is None:
            print(f"  SKIP → {photo}  (cannot read image)")
            total_skip += 1
            continue

        faces = app.get(img)

        if len(faces) == 0:
            print(f"  SKIP → {photo}  (no face detected)")
            total_skip += 1
            continue

        if len(faces) > 1:
            print(f"  WARN → {photo}  ({len(faces)} faces found, using largest)")

        # Pick the face with largest bounding box (most prominent)
        face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

        emb = np.array(face.embedding)
        emb = emb / np.linalg.norm(emb)   # L2 normalize

        conn.execute(
            "INSERT INTO students (roll_number, photo_name, embedding) VALUES (?,?,?)",
            (folder, photo, json.dumps(emb.tolist()))
        )
        conn.commit()
        print(f"  OK   → {photo}  (embedding size: {len(emb)})")
        count    += 1
        total_ok += 1

    print(f"  Saved {count}/5 embeddings for {folder}\n")

print("=" * 45)
print("       ENROLLMENT COMPLETE")
print("=" * 45)
print(f"  Model         : MobileFaceNet (w600k_mbf.onnx)")
print(f"  Students      : 9")
print(f"  Total OK      : {total_ok}")
print(f"  Total Skipped : {total_skip}")
print(f"  Database      : {DB_PATH}")
print("=" * 45)
conn.close()
