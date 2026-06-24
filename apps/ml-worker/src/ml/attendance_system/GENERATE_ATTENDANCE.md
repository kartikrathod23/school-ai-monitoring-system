# Attendance Generation Pipeline

## Overview

This pipeline generates attendance from classroom group photographs.

The trained classifier predicts which students are present in each image.

---

# Input Folder

```text
dataset/

└── group_photos/
    ├── 12-03-2026.jpeg
    ├── 13-03-2026.jpeg
    └── ...
```

The date is extracted from the image filename.

Example:

```text
12-03-2026.jpeg
```

Attendance Date:

```text
12-03-2026
```

---

# Attendance Pipeline

```text
Group Photo
        ↓
SCRFD Face Detection
        ↓
Face Alignment
        ↓
MobileFaceNet
        ↓
512-D Embedding
        ↓
Classifier ONNX
        ↓
Student Prediction
        ↓
Attendance CSV
```

---

# Step 1: Face Detection

Model:

```text
models/det_500m.onnx
```

Detects:

* Face Bounding Box
* Five Facial Landmarks

---

# Step 2: Face Alignment

Each face is aligned using the detected landmarks.

Output:

```text
112 × 112
```

aligned face image.

---

# Step 3: Embedding Generation

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
512-D Embedding
```

---

# Step 4: Student Prediction

Model:

```text
models/attendance_classifier.onnx
```

Input:

```text
512-D Embedding
```

Output:

```text
Class Scores
```

Softmax is applied to obtain:

```text
Confidence Score
```

Example:

```text
Roll Number: 07

Confidence: 0.98
```

---

# Step 5: Confidence Threshold

Only predictions above:

```python
CONFIDENCE_THRESHOLD
```

are accepted.

Default:

```python
0.70
```

Example:

```text
Prediction: 07
Confidence: 0.55
```

Result:

```text
Ignored
```

---

# Step 6: Duplicate Removal

If the same student is predicted multiple times:

Example:

```text
Student 03 → 0.91
Student 03 → 0.85
Student 03 → 0.97
```

The highest confidence prediction is retained.

Result:

```text
Student 03 → 0.97
```

---

# Step 7: Save Face Thumbnails

Generated Folder:

```text
output/

AttendanceFaces/
```

Example:

```text
AttendanceFaces/

12-03-2026/

01_0.98.jpg
03_0.95.jpg
07_0.92.jpg
```

These images provide an audit trail for attendance verification.

---

# Step 8: Generate Attendance CSV

Generated File:

```text
output/attendance.csv
```

Example:

```csv
Date,TotalStudents,01,02,03,04
12-03-2026,25,1,0,1,1
13-03-2026,22,1,1,0,1
```

Where:

```text
1 = Present
0 = Absent
```

---

# Step 9: Generate Confidence CSV

Generated File:

```text
output/confidence_scores.csv
```

Example:

```csv
Date,RollNo,Confidence
12-03-2026,01,0.98
12-03-2026,03,0.95
12-03-2026,07,0.92
```

This file can be used for:

* Manual Verification
* Error Analysis
* System Evaluation
* Research Reporting

---

# Run Attendance Generation

```bash
python generate_attendance.py
```

Generated Outputs:

```text
output/

├── attendance.csv
├── confidence_scores.csv
│
└── AttendanceFaces/
```

---

# Final Output

For every classroom image the system produces:

1. Attendance Sheet
2. Confidence Report
3. Saved Face Thumbnails

allowing automatic attendance generation with traceable predictions.
