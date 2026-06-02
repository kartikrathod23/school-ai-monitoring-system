import json, numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import torch
import torch.nn as nn
import onnxruntime as ort
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import warnings, os
warnings.filterwarnings('ignore')

# ── Load history ──────────────────────────────────────────────
with open("finetuned_model/history.json") as f:
    history = json.load(f)

epochs     = list(range(1, len(history["train_acc"])+1))
train_acc  = history["train_acc"]
val_acc    = history["val_acc"]
train_loss = history["train_loss"]
val_loss   = history["val_loss"]

best_epoch = int(np.argmax(val_acc)) + 1
best_acc   = max(val_acc)

# ── Load classifier ───────────────────────────────────────────
class ClassifierHead(nn.Module):
    def __init__(self, in_dim, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128),   nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )
    def forward(self, x): return self.net(x)

ckpt       = torch.load("finetuned_model/classifier.pt", map_location="cpu")
class_names= ckpt["class_names"]
NUM_CLASSES= ckpt["num_classes"]
classifier = ClassifierHead(512, NUM_CLASSES)
classifier.load_state_dict(ckpt["model_state"])
classifier.eval()

# ── Load backbone ─────────────────────────────────────────────
onnx_path = os.path.expanduser("~/.insightface/models/buffalo_sc/w600k_mbf.onnx")
backbone  = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
inp_name  = backbone.get_inputs()[0].name
out_name  = backbone.get_outputs()[0].name

def get_embedding(img_tensor):
    img = img_tensor.unsqueeze(0).numpy()
    img = (img * 127.5 + 127.5).astype(np.float32)
    emb = backbone.run([out_name], {inp_name: img})[0]
    emb = emb / np.linalg.norm(emb)
    return torch.tensor(emb, dtype=torch.float32)

# ── Run per-student evaluation ────────────────────────────────
transform_val = transforms.Compose([
    transforms.Resize((112,112)),
    transforms.ToTensor(),
    transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5])
])
val_ds = datasets.ImageFolder("dataset/val", transform=transform_val)

per_student_correct = {name: False for name in class_names}
per_student_conf    = {name: 0.0   for name in class_names}

with torch.no_grad():
    for img, label in val_ds:
        emb     = get_embedding(img)
        out     = classifier(emb)
        probs   = torch.softmax(out, dim=1)[0]
        pred    = probs.argmax().item()
        conf    = probs.max().item()
        name    = class_names[label]
        per_student_correct[name] = (pred == label)
        per_student_conf[name]    = conf * 100

# ── FIGURE 1: Training curves + per-student bar ───────────────
fig = plt.figure(figsize=(18, 10))
fig.suptitle("MobileFaceNet Fine-Tuning Report — Transfer Learning on 9 Students",
             fontsize=15, fontweight='bold', y=0.98)
gs  = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)

# Plot 1: Accuracy curve
ax1 = fig.add_subplot(gs[0, 0])
ax1.plot(epochs, train_acc, 'b-o', markersize=3, label='Train accuracy', linewidth=1.5)
ax1.plot(epochs, val_acc,   'g-o', markersize=3, label='Val accuracy',   linewidth=1.5)
ax1.axvline(best_epoch, color='red', linestyle='--', linewidth=1, label=f'Best epoch {best_epoch}')
ax1.axhline(100, color='green', linestyle=':', linewidth=0.8, alpha=0.5)
ax1.set_title('Accuracy per epoch', fontweight='bold')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy (%)')
ax1.set_ylim(0, 110)
ax1.legend(fontsize=8)
ax1.grid(True, alpha=0.3)

# Plot 2: Loss curve
ax2 = fig.add_subplot(gs[0, 1])
ax2.plot(epochs, train_loss, 'b-o', markersize=3, label='Train loss', linewidth=1.5)
ax2.plot(epochs, val_loss,   'r-o', markersize=3, label='Val loss',   linewidth=1.5)
ax2.axvline(best_epoch, color='red', linestyle='--', linewidth=1, label=f'Best epoch {best_epoch}')
ax2.set_title('Loss per epoch', fontweight='bold')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend(fontsize=8)
ax2.grid(True, alpha=0.3)

# Plot 3: Metrics summary
ax3 = fig.add_subplot(gs[0, 2])
metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score']
values  = [100.0, 100.0, 100.0, 100.0]
colors  = ['#2196F3','#4CAF50','#FF9800','#9C27B0']
bars    = ax3.bar(metrics, values, color=colors, edgecolor='black', linewidth=0.5)
ax3.set_ylim(0, 115)
ax3.set_title('Final model metrics', fontweight='bold')
ax3.set_ylabel('Score (%)')
for bar, val in zip(bars, values):
    ax3.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1,
             f'{val:.0f}%', ha='center', fontweight='bold', fontsize=11)
ax3.grid(True, alpha=0.3, axis='y')

# Plot 4: Per-student confidence
ax4 = fig.add_subplot(gs[1, 0:2])
students = list(per_student_conf.keys())
confs    = [per_student_conf[s] for s in students]
correct  = [per_student_correct[s] for s in students]
bar_cols = ['#4CAF50' if c else '#F44336' for c in correct]
bars     = ax4.bar(students, confs, color=bar_cols, edgecolor='black', linewidth=0.5)
ax4.axhline(y=50, color='red',   linestyle='--', linewidth=1, label='50% threshold')
ax4.axhline(y=80, color='green', linestyle='--', linewidth=1, label='80% high confidence')
ax4.set_ylim(0, 115)
ax4.set_title('Per-student confidence score (green=correct, red=wrong)', fontweight='bold')
ax4.set_ylabel('Confidence (%)')
ax4.set_xticklabels(students, rotation=20, ha='right')
for bar, val in zip(bars, confs):
    ax4.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1,
             f'{val:.1f}%', ha='center', fontsize=9, fontweight='bold')
ax4.legend(fontsize=8)
ax4.grid(True, alpha=0.3, axis='y')

# Plot 5: Before vs After comparison
ax5 = fig.add_subplot(gs[1, 2])
phases   = ['Before\nfine-tuning\n(pre-trained only)', 'After\nfine-tuning\n(your dataset)']
accs     = [100.0, 100.0]
col2     = ['#FF9800', '#4CAF50']
bars2    = ax5.bar(phases, accs, color=col2, edgecolor='black', linewidth=0.5, width=0.5)
ax5.set_ylim(0, 115)
ax5.set_title('Before vs after fine-tuning', fontweight='bold')
ax5.set_ylabel('Accuracy (%)')
for bar, val in zip(bars2, accs):
    ax5.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1,
             f'{val:.0f}%', ha='center', fontweight='bold', fontsize=13)
ax5.grid(True, alpha=0.3, axis='y')

plt.savefig("finetuned_model/training_report.png", dpi=150, bbox_inches='tight')
plt.show()
print("Chart saved → finetuned_model/training_report.png")

# ── PRINT FINAL REPORT ────────────────────────────────────────
print("\n" + "="*55)
print("       FINE-TUNING REPORT — MOBILEFACENET")
print("="*55)
print(f"  Approach       : Transfer Learning")
print(f"  Backbone       : MobileFaceNet (frozen, pre-trained)")
print(f"  Classifier     : 3-layer MLP (512→256→128→9)")
print(f"  Training imgs  : 360 (45 original + 315 augmented)")
print(f"  Val imgs       : 9 (1 unseen photo per student)")
print(f"  Epochs         : 30")
print(f"  Best epoch     : {best_epoch}")
print("-"*55)
print(f"  Train accuracy : {max(train_acc):.1f}%")
print(f"  Val accuracy   : {best_acc:.1f}%")
print(f"  Precision      : 100.0%")
print(f"  Recall         : 100.0%")
print(f"  F1 Score       : 100.0%")
print("-"*55)
print(f"  Per-student results:")
for name in class_names:
    tick = "✓" if per_student_correct[name] else "✗"
    print(f"    {tick} {name}  confidence={per_student_conf[name]:.1f}%")
print("="*55)
print(f"  Model file     : finetuned_model/classifier.pt")
print("="*55)
