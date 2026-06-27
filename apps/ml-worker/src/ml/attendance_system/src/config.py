from pathlib import Path
import os

# ============================================================
# PROJECT ROOT
# ============================================================

# attendance_system/
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# ============================================================
# MODELS
# ============================================================

MODELS_DIR = PROJECT_ROOT / "models"

DET_MODEL_PATH = MODELS_DIR / "Det_Retina_Net.onnx"

REC_MODEL_PATH = MODELS_DIR / "Rec_Mobile_Net.onnx"

CLASSIFIER_ONNX_PATH = (
    MODELS_DIR / "attendance_classifier.onnx"
)

# ============================================================
# DATASET
# ============================================================

DATASET_DIR = PROJECT_ROOT / "dataset"

STUDENTS_DIR = DATASET_DIR / "students"

GROUP_PHOTOS_DIR = DATASET_DIR / "group_photos"

# ============================================================
# ARTIFACTS
# ============================================================

ARTIFACT_DIR = PROJECT_ROOT / "artifacts"

EMBEDDINGS_PATH = (
    ARTIFACT_DIR / "embeddings.npy"
)

TRAINING_METADATA_PATH = (
    ARTIFACT_DIR / "training_metadata.csv"
)

CLASSIFIER_PTH_PATH = (
    ARTIFACT_DIR / "attendance_classifier.pth"
)

# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = PROJECT_ROOT / "output"

ATTENDANCE_CSV_PATH = (
    OUTPUT_DIR / "attendance.csv"
)

ATTENDANCE_FACES_DIR = (
    OUTPUT_DIR / "AttendanceFaces"
)

# ============================================================
# DETECTOR SETTINGS
# ============================================================

DET_INPUT_SIZE = (640, 640)

SCORE_THRESHOLD = 0.50

NMS_THRESHOLD = 0.40

STRIDES = [8, 16, 32]

# ============================================================
# FACE ALIGNMENT
# ============================================================

FACE_SIZE = 112

ARCFACE_DST = [
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041]
]

# ============================================================
# TRAINING SETTINGS
# ============================================================

BATCH_SIZE = 32

EPOCHS = 50

LEARNING_RATE = 1e-3

# ============================================================
# ATTENDANCE SETTINGS
# ============================================================
CONFIDENCE_THRESHOLD = 0.40

# ============================================================THRESTHRES
# IMAGE EXTENSIONS
# ============================================================

VALID_IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp"
]

# ============================================================
# CREATE REQUIRED DIRECTORIES
# ============================================================

REQUIRED_DIRS = [
    ARTIFACT_DIR,
    OUTPUT_DIR,
    ATTENDANCE_FACES_DIR
]

for directory in REQUIRED_DIRS:
    os.makedirs(directory, exist_ok=True)

# ============================================================
# STUDENT DISCOVERY
# ============================================================

def get_student_folders():
    """
    Returns all folders like:

    student_01
    student_02
    student_03
    """

    if not STUDENTS_DIR.exists():
        return []

    folders = []

    for item in os.listdir(STUDENTS_DIR):

        full_path = STUDENTS_DIR / item

        if (
            full_path.is_dir()
            and item.startswith("student_")
        ):
            folders.append(item)

    folders.sort()

    return folders


def get_num_students():
    """
    Dynamically determine
    output dimension of classifier.
    """

    return len(
        get_student_folders()
    )


# ============================================================
# DEBUG
# ============================================================

if __name__ == "__main__":

    print("PROJECT ROOT")
    print(PROJECT_ROOT)

    print()

    print("Students Found:")
    print(get_num_students())

    print()

    print("Student Folders:")
    print(get_student_folders())