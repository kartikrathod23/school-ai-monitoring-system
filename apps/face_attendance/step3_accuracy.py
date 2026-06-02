import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
import warnings
warnings.filterwarnings('ignore')

# ── GROUND TRUTH (you confirmed all labels correct) ──────────────
ALL_STUDENTS = [
    "student_01","student_02","student_03","student_04","student_05",
    "student_06","student_07","student_08","student_09"
]

GROUND_TRUTH = {
    "12-03-2026.jpeg"           : ["student_09","student_02","student_03","student_06","student_04","student_01"],
    "13-02-2026_193703_008.jpeg": ["student_01","student_02","student_04","student_09","student_03"],
    "13-03-2026.jpeg"           : ["student_07","student_08"],
    "16-02-2026_001.jpeg"       : ["student_09","student_01","student_04","student_05"],
    "16-02-2026_002.jpeg"       : ["student_04","student_09","student_01","student_05"],
    "17-03-2026.jpeg"           : ["student_04","student_09","student_01","student_05"],
    "18-03-2026.jpeg"           : ["student_09","student_01","student_04","student_05"],
    "19-03-2026.jpeg"           : ["student_08","student_07"],
    "20-03-2026.jpeg"           : ["student_04","student_06"],
    "23-03-2026.jpeg"           : ["student_08","student_07"],
    "25-03-2026.jpeg"           : ["student_04","student_06"],
}
# ─────────────────────────────────────────────────────────────────

results_df = pd.read_csv("results.csv")

y_true, y_pred = [], []
confidence_scores = []

for _, row in results_df.iterrows():
    photo = row['photo']
    if photo not in GROUND_TRUTH:
        continue
    actual_present = GROUND_TRUTH[photo]
    system_present = row['present_students'].split(',') if pd.notna(row['present_students']) and row['present_students'] else []

    for student in ALL_STUDENTS:
        actual    = 1 if student in actual_present else 0
        predicted = 1 if student in system_present else 0
        y_true.append(actual)
        y_pred.append(predicted)

y_true = np.array(y_true)
y_pred = np.array(y_pred)

# ── METRICS ──────────────────────────────────────────────────────
correct  = np.sum(y_true == y_pred)
total    = len(y_true)
accuracy = correct / total * 100

tp = int(np.sum((y_true==1) & (y_pred==1)))
fp = int(np.sum((y_true==0) & (y_pred==1)))
fn = int(np.sum((y_true==1) & (y_pred==0)))
tn = int(np.sum((y_true==0) & (y_pred==0)))

precision = tp/(tp+fp) if (tp+fp)>0 else 0
recall    = tp/(tp+fn) if (tp+fn)>0 else 0
f1        = 2*precision*recall/(precision+recall) if (precision+recall)>0 else 0
fpr       = fp/(fp+tn) if (fp+tn)>0 else 0   # false positive rate

print("=" * 52)
print("        MODEL ACCURACY REPORT")
print("        MobileFaceNet — Face Attendance")
print("=" * 52)
print(f"  Model            : MobileFaceNet (w600k_mbf.onnx)")
print(f"  Framework        : InsightFace + ONNX Runtime")
print(f"  Detector         : det_500m (RetinaFace)")
print(f"  Threshold        : 0.35 cosine similarity")
print(f"  Embedding Size   : 512-d")
print(f"  Students Enrolled: 9")
print(f"  Enrollment Photos: 5 per student (45 total)")
print(f"  Test Group Photos: {len(GROUND_TRUTH)}")
print(f"  Total Predictions: {total}")
print("-" * 52)
print(f"  Accuracy         : {accuracy:.2f}%")
print(f"  Precision        : {precision:.4f}  ({precision*100:.2f}%)")
print(f"  Recall           : {recall:.4f}  ({recall*100:.2f}%)")
print(f"  F1 Score         : {f1:.4f}")
print(f"  False Positive   : {fpr:.4f}  ({fpr*100:.2f}%)")
print("-" * 52)
print(f"  True Positives   : {tp}   (correctly marked present)")
print(f"  True Negatives   : {tn}   (correctly marked absent)")
print(f"  False Positives  : {fp}   (wrongly marked present)")
print(f"  False Negatives  : {fn}   (missed present students)")
print("=" * 52)

# ── CHART 1: Confusion Matrix ─────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('MobileFaceNet Face Attendance System — Model Evaluation', fontsize=14, fontweight='bold')

cm = confusion_matrix(y_true, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0],
            xticklabels=['Predicted\nAbsent','Predicted\nPresent'],
            yticklabels=['Actually\nAbsent','Actually\nPresent'],
            annot_kws={"size":14, "weight":"bold"})
axes[0].set_title(f'Confusion Matrix\nAccuracy: {accuracy:.1f}%', fontweight='bold')

# ── CHART 2: Metrics Bar Chart ────────────────────────────────────
metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score']
values  = [accuracy/100, precision, recall, f1]
colors  = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0']
bars = axes[1].bar(metrics, values, color=colors, edgecolor='black', linewidth=0.5)
axes[1].set_ylim(0, 1.1)
axes[1].set_title('Performance Metrics', fontweight='bold')
axes[1].set_ylabel('Score')
for bar, val in zip(bars, values):
    axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                 f'{val*100:.1f}%', ha='center', fontweight='bold', fontsize=11)

# ── CHART 3: Per-photo present count ─────────────────────────────
photos_short = [p.replace('.jpeg','').replace('.jpg','') for p in results_df['photo']]
x = np.arange(len(photos_short))
w = 0.35
actual_counts  = [len(GROUND_TRUTH.get(p, [])) for p in results_df['photo']]
predict_counts = list(results_df['present_count'])

axes[2].bar(x - w/2, actual_counts,  w, label='Actual Present',    color='#4CAF50', edgecolor='black', linewidth=0.5)
axes[2].bar(x + w/2, predict_counts, w, label='System Detected',   color='#2196F3', edgecolor='black', linewidth=0.5)
axes[2].set_xticks(x)
axes[2].set_xticklabels(photos_short, rotation=45, ha='right', fontsize=7)
axes[2].set_title('Actual vs Detected — Per Photo', fontweight='bold')
axes[2].set_ylabel('Number of Students')
axes[2].legend()
axes[2].set_ylim(0, max(max(actual_counts), max(predict_counts)) + 1)

plt.tight_layout()
plt.savefig("accuracy_report.png", dpi=150, bbox_inches='tight')
plt.show()
print("\nChart saved → accuracy_report.png")

# ── CHART 4: Confidence scores per photo ─────────────────────────
fig2, ax = plt.subplots(figsize=(12, 5))
conf_data = results_df[['photo','avg_confidence']].copy()
conf_data['photo'] = conf_data['photo'].str.replace('.jpeg','').str.replace('.jpg','')
colors_bar = ['#4CAF50' if v >= 0.6 else '#FF9800' if v >= 0.4 else '#F44336'
              for v in conf_data['avg_confidence']]
bars = ax.bar(conf_data['photo'], conf_data['avg_confidence'],
              color=colors_bar, edgecolor='black', linewidth=0.5)
ax.axhline(y=0.35, color='red', linestyle='--', linewidth=1.5, label='Threshold (0.35)')
ax.axhline(y=0.70, color='green', linestyle='--', linewidth=1.5, label='High confidence (0.70)')
ax.set_ylim(0, 1.0)
ax.set_title('Average Confidence Score per Photo — MobileFaceNet', fontweight='bold')
ax.set_ylabel('Cosine Similarity Score')
ax.set_xticklabels(conf_data['photo'], rotation=45, ha='right', fontsize=8)
for bar, val in zip(bars, conf_data['avg_confidence']):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
            f'{val:.2f}', ha='center', fontsize=9, fontweight='bold')
ax.legend()
plt.tight_layout()
plt.savefig("confidence_scores.png", dpi=150, bbox_inches='tight')
plt.show()
print("Chart saved → confidence_scores.png")

# ── PER PHOTO DETAIL TABLE ────────────────────────────────────────
print(f"\n{'='*75}")
print(f"  PER-PHOTO BREAKDOWN")
print(f"{'='*75}")
print(f"  {'Photo':<38} {'Actual':>6} {'Detect':>6} {'Match':>6} {'Conf':>6}")
print(f"  {'─'*38} {'─'*6} {'─'*6} {'─'*6} {'─'*6}")
for _, row in results_df.iterrows():
    actual = len(GROUND_TRUTH.get(row['photo'], []))
    det    = row['present_count']
    match  = "✓ YES" if actual == det else "✗ NO"
    conf   = row['avg_confidence']
    print(f"  {row['photo']:<38} {actual:>6} {det:>6} {match:>6} {conf:>6.3f}")
print(f"{'='*75}")
print(f"\nFiles saved:")
print(f"  results.csv          — attendance data")
print(f"  accuracy_report.png  — confusion matrix + metrics charts")
print(f"  confidence_scores.png— confidence per photo")
