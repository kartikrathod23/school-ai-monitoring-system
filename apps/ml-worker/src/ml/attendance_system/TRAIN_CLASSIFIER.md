# Training Classifier Pipeline

## Overview

This pipeline trains a face recognition classifier for attendance marking.

The system uses:

* SCRFD Face Detector (`det_500m.onnx`)
* Face Alignment using 5 facial landmarks
* MobileFaceNet (`w600k_mbf.onnx`)
* Custom Neural Network Classifier
* ONNX Export for deployment

---

# Input Dataset Structure

```text
dataset/

└── students/
    ├── student_01/
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── ...
    │
    ├── student_02/
    │   ├── image1.jpg
    │   └── ...
    │
    └── ...
```

Each folder corresponds to one student.

The roll number is extracted from the folder name.

Example:

```text
student_01 → Roll Number 01
student_02 → Roll Number 02
```

---

# Training Pipeline

```text
Student Image
        ↓
SCRFD Face Detection
        ↓
Largest Face Selection
        ↓
Face Alignment
        ↓
MobileFaceNet
        ↓
512-D Embedding
        ↓
Embedding Dataset
        ↓
Neural Network Classifier
        ↓
ONNX Export
```

---

# Step 1: Face Detection

Model:

```text
models/det_500m.onnx
```

SCRFD detects:

* Face Bounding Box
* Five Facial Landmarks

Landmarks:

1. Left Eye
2. Right Eye
3. Nose
4. Left Mouth Corner
5. Right Mouth Corner

---

# Step 2: Largest Face Selection

Some student images may contain multiple faces.

The largest detected face is selected.

```text
Detected Faces
      ↓
Largest Face
      ↓
Training Sample
```

---

# Step 3: Face Alignment

The detected landmarks are used to compute a similarity transformation.

The face is:

* Rotated
* Scaled
* Centered

Output:

```text
112 × 112 Aligned Face
```

---

# Step 4: MobileFaceNet Embedding

Model:

```text
models/w600k_mbf.onnx
```

Input:

```text
112 × 112 Face
```

Output:

```text
512-D Face Embedding
```

Shape:

```python
(512,)
```

---

# Step 5: Build Embedding Dataset

Generated Files:

```text
artifacts/

embeddings.npy
training_metadata.csv
```

Embeddings:

```python
(N,512)
```

Metadata:

```csv
sample_id,class_id,roll_no,image_path
```

Example:

```csv
0,0,01,student_01/img1.jpg
1,0,01,student_01/img2.jpg
2,1,02,student_02/img1.jpg
```

---

# Step 6: Classifier Training

Architecture:

```text
512
 ↓
128
 ↓
Number Of Students
```

Example:

```text
512
 ↓
128
 ↓
40
```

if 40 student folders exist.

The output size is determined dynamically.

---

# Dynamic Output Layer

The system automatically counts:

```text
dataset/students/
```

Example:

```text
student_01
student_02
...
student_40
```

Output Layer:

```text
40 Neurons
```

No hardcoded class count is used.

---

# Step 7: Save Trained Model

Generated File:

```text
artifacts/attendance_classifier.pth
```

Contains:

* Model Weights
* Classifier Parameters

---

# Step 8: Export ONNX

Generated File:

```text
models/attendance_classifier.onnx
```

Input:

```text
(batch_size,512)
```

Output:

```text
(batch_size,num_students)
```

Example:

```text
(batch_size,40)
```

---

# Run Training

```bash
python train_classifier.py
```

Generated Files:

```text
artifacts/
├── embeddings.npy
├── training_metadata.csv
└── attendance_classifier.pth

models/
└── attendance_classifier.onnx
```
