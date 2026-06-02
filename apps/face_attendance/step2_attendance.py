import os, json, sqlite3, csv, numpy as np, cv2
from insightface.app import FaceAnalysis
import warnings
warnings.filterwarnings('ignore')

# ── CONFIG ──────────────────────────────────────────
GROUP_PHOTOS_FOLDER = "group_photos"
DB_PATH             = "attendance.db"
OUTPUT_CSV          = "results.csv"
THRESHOLD           = 0.35   # MobileFaceNet cosine similarity threshold
# ────────────────────────────────────────────────────

print("Loading MobileFaceNet model...")
app = FaceAnalysis(name='buffalo_sc')
app.prepare(ctx_id=-1, det_size=(640, 640))
print("Model loaded OK\n")

# ── Load all stored embeddings ──
conn = sqlite3.connect(DB_PATH)
rows = conn.execute("SELECT roll_number, embedding FROM students").fetchall()
conn.close()

db = {}
for roll, emb_json in rows:
    emb = np.array(json.loads(emb_json))
    if roll not in db:
        db[roll] = []
    db[roll].append(emb)

ALL_STUDENTS = sorted(db.keys())
print(f"DB loaded: {len(ALL_STUDENTS)} students, {len(rows)} total embeddings")
print(f"Students: {ALL_STUDENTS}\n")

def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def identify_face(face_emb):
    face_emb = face_emb / np.linalg.norm(face_emb)
    best_roll  = None
    best_score = -1
    for roll, embeddings in db.items():
        score = max(cosine_similarity(face_emb, e) for e in embeddings)
        if score > best_score:
            best_score = score
            best_roll  = roll
    if best_score >= THRESHOLD:
        return best_roll, round(best_score, 3)
    return "UNKNOWN", round(best_score, 3)

# ── Process each group photo ──
photos = sorted([f for f in os.listdir(GROUP_PHOTOS_FOLDER)
                 if f.lower().endswith(('.jpg','.jpeg','.png'))])

all_results = []

for photo in photos:
    path = os.path.join(GROUP_PHOTOS_FOLDER, photo)
    img  = cv2.imread(path)

    if img is None:
        print(f"SKIP {photo} — cannot read")
        continue

    faces = app.get(img)
    total_heads = len(faces)

    print(f"{'='*55}")
    print(f"Photo : {photo}")
    print(f"Faces detected : {total_heads}")
    print(f"{'─'*55}")

    marked_present = {}   # roll → score
    unknown_count  = 0

    for i, face in enumerate(faces):
        roll, score = identify_face(np.array(face.embedding))
        if roll == "UNKNOWN":
            print(f"  Face {i+1}: UNKNOWN  (best score={score})")
            unknown_count += 1
        else:
            if roll not in marked_present:
                marked_present[roll] = score
                print(f"  Face {i+1}: {roll}  score={score}  ✓ PRESENT")
            else:
                print(f"  Face {i+1}: {roll}  score={score}  (duplicate, already marked)")

    absent = [r for r in ALL_STUDENTS if r not in marked_present]

    print(f"{'─'*55}")
    print(f"  Total heads detected : {total_heads}")
    print(f"  Marked present       : {len(marked_present)}  → {list(marked_present.keys())}")
    print(f"  Absent               : {len(absent)}  → {absent}")
    print(f"  Unknown faces        : {unknown_count}")

    # Head count mismatch warning
    if total_heads != len(marked_present) + unknown_count:
        print(f"  WARNING: head count mismatch!")
    if total_heads < len(ALL_STUDENTS):
        print(f"  NOTE: Only {total_heads} heads in photo, expected up to {len(ALL_STUDENTS)}")

    all_results.append({
        "photo"               : photo,
        "total_heads_detected": total_heads,
        "present_count"       : len(marked_present),
        "absent_count"        : len(absent),
        "unknown_count"       : unknown_count,
        "present_students"    : ",".join(marked_present.keys()),
        "absent_students"     : ",".join(absent),
        "avg_confidence"      : round(np.mean(list(marked_present.values())), 3) if marked_present else 0
    })

print(f"\n{'='*55}")

# ── Save CSV ──
with open(OUTPUT_CSV, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=all_results[0].keys())
    writer.writeheader()
    writer.writerows(all_results)

print(f"Results saved → {OUTPUT_CSV}")

# ── Quick summary ──
print(f"\n{'='*55}")
print(f"  ATTENDANCE SUMMARY — ALL PHOTOS")
print(f"{'='*55}")
print(f"  {'Photo':<35} {'Present':>8} {'Absent':>8} {'Unknown':>8}")
print(f"  {'─'*35} {'─'*8} {'─'*8} {'─'*8}")
for r in all_results:
    print(f"  {r['photo']:<35} {r['present_count']:>8} {r['absent_count']:>8} {r['unknown_count']:>8}")
print(f"{'='*55}")
