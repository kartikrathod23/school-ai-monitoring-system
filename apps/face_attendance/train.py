import os, json, numpy as np, time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# ── CONFIG ──────────────────────────────────────────────────────
TRAIN_DIR   = "dataset/train"
VAL_DIR     = "dataset/val"
MODEL_OUT   = "finetuned_model/classifier.pt"
EPOCHS      = 30
BATCH_SIZE  = 16
LR          = 0.001
DEVICE      = torch.device("cpu")
# ────────────────────────────────────────────────────────────────

print("="*50)
print("  MobileFaceNet Transfer Learning")
print("="*50)
print(f"  Device     : {DEVICE}")
print(f"  Epochs     : {EPOCHS}")
print(f"  Batch size : {BATCH_SIZE}")

# ── STEP 1: Load augmented dataset ──────────────────────────────
transform_train = transforms.Compose([
    transforms.Resize((112, 112)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.ToTensor(),
    transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5])
])
transform_val = transforms.Compose([
    transforms.Resize((112, 112)),
    transforms.ToTensor(),
    transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5])
])

train_ds = datasets.ImageFolder(TRAIN_DIR, transform=transform_train)
val_ds   = datasets.ImageFolder(VAL_DIR,   transform=transform_val)
train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False)

NUM_CLASSES  = len(train_ds.classes)
class_names  = train_ds.classes
print(f"  Students   : {NUM_CLASSES}")
print(f"  Train imgs : {len(train_ds)}")
print(f"  Val imgs   : {len(val_ds)}")
print(f"  Classes    : {class_names}")

# ── STEP 2: Extract embeddings using InsightFace MobileFaceNet ──
# We use the real MobileFaceNet (w600k_mbf.onnx) as our frozen backbone
# Then train a small classifier on top of its 512-d embeddings

print("\nLoading MobileFaceNet backbone (InsightFace)...")
import cv2
import onnxruntime as ort

onnx_path = os.path.expanduser("~/.insightface/models/buffalo_sc/w600k_mbf.onnx")
backbone  = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
inp_name  = backbone.get_inputs()[0].name
out_name  = backbone.get_outputs()[0].name
print(f"  Backbone loaded: {onnx_path}")

def get_embedding_batch(img_tensors):
    """Convert torch tensor batch → numpy → run through MobileFaceNet → embeddings"""
    imgs = img_tensors.numpy()           # (B, 3, 112, 112)  range [-1,1]
    imgs = (imgs * 127.5 + 127.5)       # back to [0,255]
    imgs = imgs.astype(np.float32)
    embs = backbone.run([out_name], {inp_name: imgs})[0]   # (B, 512)
    # L2 normalize
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    embs  = embs / (norms + 1e-8)
    return torch.tensor(embs, dtype=torch.float32)

# ── STEP 3: Pre-compute all embeddings (saves time during training) ──
print("\nPre-computing embeddings from backbone...")

def precompute(loader, name):
    all_embs, all_labels = [], []
    for imgs, labels in tqdm(loader, desc=f"  {name}"):
        with torch.no_grad():
            embs = get_embedding_batch(imgs)
        all_embs.append(embs)
        all_labels.append(labels)
    return torch.cat(all_embs), torch.cat(all_labels)

train_embs, train_labels = precompute(train_dl, "Train")
val_embs,   val_labels   = precompute(val_dl,   "Val  ")
print(f"  Train embeddings shape: {train_embs.shape}")
print(f"  Val   embeddings shape: {val_embs.shape}")

# ── STEP 4: Define classifier head ──────────────────────────────
class ClassifierHead(nn.Module):
    def __init__(self, in_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )
    def forward(self, x):
        return self.net(x)

classifier = ClassifierHead(512, NUM_CLASSES).to(DEVICE)
print(f"\nClassifier parameters: {sum(p.numel() for p in classifier.parameters()):,}")

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(classifier.parameters(), lr=LR, weight_decay=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

# ── STEP 5: Training loop ────────────────────────────────────────
print("\nStarting training...\n")

best_val_acc = 0.0
history = {"train_loss":[], "train_acc":[], "val_loss":[], "val_acc":[]}

# Create mini DataLoader from precomputed embeddings
from torch.utils.data import TensorDataset
train_emb_ds = TensorDataset(train_embs, train_labels)
val_emb_ds   = TensorDataset(val_embs,   val_labels)
train_emb_dl = DataLoader(train_emb_ds, batch_size=32, shuffle=True)
val_emb_dl   = DataLoader(val_emb_ds,   batch_size=32, shuffle=False)

for epoch in range(1, EPOCHS+1):
    # ── Train ──
    classifier.train()
    t_loss, t_correct, t_total = 0.0, 0, 0
    for embs, labels in train_emb_dl:
        embs, labels = embs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        outputs = classifier(embs)
        loss    = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        t_loss    += loss.item() * len(labels)
        t_correct += (outputs.argmax(1) == labels).sum().item()
        t_total   += len(labels)
    scheduler.step()

    # ── Validate ──
    classifier.eval()
    v_loss, v_correct, v_total = 0.0, 0, 0
    with torch.no_grad():
        for embs, labels in val_emb_dl:
            embs, labels = embs.to(DEVICE), labels.to(DEVICE)
            outputs  = classifier(embs)
            loss     = criterion(outputs, labels)
            v_loss   += loss.item() * len(labels)
            v_correct+= (outputs.argmax(1) == labels).sum().item()
            v_total  += len(labels)

    t_acc = t_correct / t_total * 100
    v_acc = v_correct / v_total * 100
    t_l   = t_loss    / t_total
    v_l   = v_loss    / v_total

    history["train_loss"].append(t_l)
    history["train_acc"].append(t_acc)
    history["val_loss"].append(v_l)
    history["val_acc"].append(v_acc)

    marker = " ← best" if v_acc > best_val_acc else ""
    print(f"Epoch {epoch:02d}/{EPOCHS}  "
          f"train_loss={t_l:.4f}  train_acc={t_acc:.1f}%  "
          f"val_loss={v_l:.4f}  val_acc={v_acc:.1f}%{marker}")

    if v_acc > best_val_acc:
        best_val_acc = v_acc
        torch.save({
            "epoch":        epoch,
            "model_state":  classifier.state_dict(),
            "class_names":  class_names,
            "val_acc":      v_acc,
            "num_classes":  NUM_CLASSES
        }, MODEL_OUT)

print(f"\n{'='*50}")
print(f"  TRAINING COMPLETE")
print(f"  Best val accuracy : {best_val_acc:.1f}%")
print(f"  Model saved       : {MODEL_OUT}")
print(f"{'='*50}")

# Save training history
with open("finetuned_model/history.json","w") as f:
    json.dump(history, f)
print("  History saved     : finetuned_model/history.json")
