import os, cv2, numpy as np
from insightface.app import FaceAnalysis
from PIL import Image, ImageEnhance
import warnings
warnings.filterwarnings('ignore')

STUDENTS_FOLDER = "students"
TRAIN_FOLDER    = "dataset/train"
VAL_FOLDER      = "dataset/val"

app = FaceAnalysis(name='buffalo_sc')
app.prepare(ctx_id=-1, det_size=(640, 640))

def crop_face(img_bgr):
    faces = app.get(img_bgr)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
    x1,y1,x2,y2 = [int(v) for v in face.bbox]
    x1,y1 = max(0,x1), max(0,y1)
    crop = img_bgr[y1:y2, x1:x2]
    return cv2.resize(crop, (112, 112))

def augment(img):
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if np.random.rand() > 0.5:
        pil = pil.transpose(Image.FLIP_LEFT_RIGHT)
    pil = ImageEnhance.Brightness(pil).enhance(np.random.uniform(0.7, 1.3))
    pil = ImageEnhance.Contrast(pil).enhance(np.random.uniform(0.8, 1.2))
    pil = pil.rotate(np.random.uniform(-15, 15), fillcolor=(128,128,128))
    z = np.random.uniform(0.88, 1.0)
    w, h = pil.size
    mw, mh = int((1-z)*w/2), int((1-z)*h/2)
    if mw > 0 and mh > 0:
        pil = pil.crop((mw, mh, w-mw, h-mh))
    pil = pil.resize((112, 112))
    arr = np.array(pil).astype(np.float32)
    arr += np.random.normal(0, 4, arr.shape)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

total = 0
label_map = {}

for idx, folder in enumerate(sorted(os.listdir(STUDENTS_FOLDER))):
    folder_path = os.path.join(STUDENTS_FOLDER, folder)
    if not os.path.isdir(folder_path):
        continue

    photos = sorted([f for f in os.listdir(folder_path)
                     if f.lower().endswith(('.jpg','.jpeg','.png'))])

    # photo 5 goes to val, photos 1-4 go to train
    train_photos = photos[:4]
    val_photos   = photos[4:]

    train_out = os.path.join(TRAIN_FOLDER, folder)
    val_out   = os.path.join(VAL_FOLDER,   folder)
    os.makedirs(train_out, exist_ok=True)
    os.makedirs(val_out,   exist_ok=True)

    label_map[folder] = idx
    count = 0
    print(f"\n{folder} (label={idx})")

    for photo in train_photos:
        img  = cv2.imread(os.path.join(folder_path, photo))
        face = crop_face(img)
        if face is None:
            print(f"  SKIP {photo}")
            continue
        cv2.imwrite(os.path.join(train_out, f"orig_{photo}"), face)
        count += 1
        for i in range(9):   # 9 augmented = 4×10 = 40 per student
            aug = augment(face)
            cv2.imwrite(os.path.join(train_out, f"aug{i}_{photo}"), aug)
            count += 1

    for photo in val_photos:
        img  = cv2.imread(os.path.join(folder_path, photo))
        face = crop_face(img)
        if face is not None:
            cv2.imwrite(os.path.join(val_out, photo), face)

    print(f"  {count} training images saved")
    total += count

# Save label map
import json
with open("finetuned_model/label_map.json", "w") as f:
    json.dump(label_map, f, indent=2)

print(f"\n{'='*40}")
print(f"AUGMENTATION DONE")
print(f"Total training images : {total}")
print(f"Expected              : ~360 (9 students × 40)")
print(f"Val images            : 9 (1 per student)")
print(f"Label map saved       : finetuned_model/label_map.json")
print(f"{'='*40}")
