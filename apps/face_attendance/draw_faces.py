import cv2, json, sqlite3, numpy as np, os, warnings
from insightface.app import FaceAnalysis
warnings.filterwarnings('ignore')

GROUP_PHOTOS_FOLDER = "group_photos"
OUTPUT_FOLDER       = "annotated"
DB_PATH             = "attendance.db"
THRESHOLD           = 0.35

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

print("Loading model...")
app = FaceAnalysis(name='buffalo_sc')
app.prepare(ctx_id=-1, det_size=(640, 640))

conn = sqlite3.connect(DB_PATH)
rows = conn.execute("SELECT roll_number, embedding FROM students").fetchall()
conn.close()

db = {}
for roll, emb_json in rows:
    emb = np.array(json.loads(emb_json))
    if roll not in db:
        db[roll] = []
    db[roll].append(emb)

def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def identify_face(face_emb):
    face_emb = face_emb / np.linalg.norm(face_emb)
    best_roll, best_score = None, -1
    for roll, embeddings in db.items():
        score = max(cosine_similarity(face_emb, e) for e in embeddings)
        if score > best_score:
            best_score = score
            best_roll  = roll
    if best_score >= THRESHOLD:
        return best_roll, round(best_score, 3)
    return "UNKNOWN", round(best_score, 3)

photos = sorted([f for f in os.listdir(GROUP_PHOTOS_FOLDER)
                 if f.lower().endswith(('.jpg','.jpeg','.png'))])

for photo in photos:
    path = os.path.join(GROUP_PHOTOS_FOLDER, photo)
    img  = cv2.imread(path)
    faces = app.get(img)

    for face in faces:
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        roll, score = identify_face(np.array(face.embedding))

        # Green box = recognized, Red = unknown
        color = (0, 255, 0) if roll != "UNKNOWN" else (0, 0, 255)
        label = f"{roll} ({score})"

        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        # Background for text
        cv2.rectangle(img, (x1, y1-28), (x1+len(label)*11, y1), color, -1)
        cv2.putText(img, label, (x1+2, y1-8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

    out_path = os.path.join(OUTPUT_FOLDER, photo)
    cv2.imwrite(out_path, img)
    print(f"Saved → {out_path}")

print("\nDone! Open the 'annotated' folder to see all photos with labels.")
