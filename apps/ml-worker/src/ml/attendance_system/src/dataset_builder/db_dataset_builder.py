"""
dataset_builder/db_dataset_builder.py

Builds the training dataset (embeddings.npy + training_metadata.csv)
by pulling directly from the production PostgreSQL database.

Data sources (both are used):
  1. StudentFaceEmbedding  — 512-dim vectors stored during onboarding
  2. AttendanceCropImage   — 512-dim vectors from VERIFIED offline sessions

This replaces the old EmbeddingDatasetBuilder that read from a local
dataset/students/ folder.

Usage:
    from src.dataset_builder.db_dataset_builder import build_db_dataset
    embeddings, labels, class_map, reverse_map = build_db_dataset(section_id)
"""

import os
import json
import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras

from src.config import (
    ARTIFACT_DIR,
    EMBEDDINGS_PATH,
    TRAINING_METADATA_PATH,
)


# ============================================================
# HELPERS
# ============================================================

def _get_conn():
    """Return a psycopg2 connection using DATABASE_URL env var."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise EnvironmentError(
            "DATABASE_URL environment variable is not set. "
            "It must point to the production PostgreSQL database."
        )
    return psycopg2.connect(db_url)


def _fetch_students_for_section(cur, section_id: str) -> list:
    """
    Return all students in a section ordered by roll_number ASC.
    This ordering defines class_id (index 0 = lowest roll number).
    """
    cur.execute(
        """
        SELECT s.id AS student_id, s."rollNumber"
        FROM "Student" s
        WHERE s."sectionId" = %s
          AND s."faceStatus" = 'ADDED'
        ORDER BY s."rollNumber" ASC
        """,
        (section_id,),
    )
    return cur.fetchall()


def _fetch_onboarding_embeddings(cur, student_id: str) -> list:
    """
    Return all 512-dim embeddings for a student from StudentFaceEmbedding.
    These come from the onboarding pipeline (MobileFaceNet backbone).
    """
    cur.execute(
        """
        SELECT sfe.embedding
        FROM "StudentFaceEmbedding" sfe
        WHERE sfe."studentId" = %s
        ORDER BY sfe."createdAt" ASC
        """,
        (student_id,),
    )
    rows = cur.fetchall()
    embeddings = []
    for row in rows:
        emb = row[0]  # psycopg2 returns JSON columns as Python dicts/lists
        if isinstance(emb, list) and len(emb) == 512:
            embeddings.append(emb)
        elif isinstance(emb, str):
            parsed = json.loads(emb)
            if isinstance(parsed, list) and len(parsed) == 512:
                embeddings.append(parsed)
    return embeddings


def _fetch_crop_embeddings(cur, student_id: str) -> list:
    """
    Return 512-dim embeddings from AttendanceCropImage where
    isVerified = true (teacher confirmed the student identity).
    These are real-world face crops from group photos — excellent
    augmentation data for the classifier.
    """
    cur.execute(
        """
        SELECT aci."embeddingVector"
        FROM "AttendanceCropImage" aci
        WHERE aci."studentId" = %s
          AND aci."isVerified" = true
        ORDER BY aci."capturedAt" ASC
        """,
        (student_id,),
    )
    rows = cur.fetchall()
    embeddings = []
    for row in rows:
        emb = row[0]
        if isinstance(emb, list) and len(emb) == 512:
            embeddings.append(emb)
        elif isinstance(emb, str):
            parsed = json.loads(emb)
            if isinstance(parsed, list) and len(parsed) == 512:
                embeddings.append(parsed)
    return embeddings


# ============================================================
# MAIN BUILDER
# ============================================================

def build_db_dataset(section_id: str):
    """
    Build the training dataset for a specific section by fetching
    embeddings from the production database.

    Returns
    -------
    embeddings  : np.ndarray of shape (N, 512)
    labels      : np.ndarray of shape (N,) — integer class ids
    class_map   : dict  roll_number_str -> class_id  (for saving)
    reverse_map : dict  class_id_str   -> student_id (for mobile inference)
    """

    print("\n" + "=" * 60)
    print("DB DATASET BUILDER")
    print("=" * 60)
    print(f"Section ID: {section_id}")

    conn = _get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        students = _fetch_students_for_section(cur, section_id)

        if not students:
            raise ValueError(
                f"No students with faceStatus=ADDED found "
                f"for section_id={section_id}. "
                "Run face onboarding first."
            )

        print(f"\nStudents with embeddings: {len(students)}")

        all_embeddings = []
        all_labels = []
        metadata_rows = []

        # class_id is simply 0-based index in roll_number ASC order
        # This MUST match the order used by getSectionEmbeddingsService
        # (ORDER BY rollNumber ASC) and the mobile getCachedStudents query.
        class_map = {}      # roll_number_str -> class_id
        reverse_map = {}    # class_id_str    -> student_id

        for class_id, student in enumerate(students):
            student_id = student["student_id"]
            roll_number = student["rollNumber"]
            roll_str = str(roll_number)
            
            class_map[roll_str] = class_id
            reverse_map[str(class_id)] = student_id

            # Source 1: Onboarding embeddings (always present)
            onboarding_embs = _fetch_onboarding_embeddings(cur, student_id)

            # Source 2: Verified attendance crop embeddings (real-world data)
            crop_embs = _fetch_crop_embeddings(cur, student_id)

            combined = onboarding_embs + crop_embs

            if not combined:
                print(
                    f"  WARNING: Student {roll_str} (id={student_id}) "
                    f"has no embeddings — skipping."
                )
                continue

            print(
                f"  Roll {roll_str:>4} | class_id={class_id} | "
                f"onboarding={len(onboarding_embs)} "
                f"crops={len(crop_embs)} "
                f"total={len(combined)}"
            )

            for emb in combined:
                all_embeddings.append(emb)
                all_labels.append(class_id)
                metadata_rows.append({
                    "sample_id": len(metadata_rows),
                    "class_id": class_id,
                    "student_id": student_id,
                    "roll_number": roll_number,
                })

    finally:
        cur.close()
        conn.close()

    if not all_embeddings:
        raise ValueError(
            "No embeddings found for any student in this section. "
            "Complete face onboarding before training."
        )

    embeddings = np.array(all_embeddings, dtype=np.float32)
    labels = np.array(all_labels, dtype=np.int64)
    metadata_df = pd.DataFrame(metadata_rows)

    # ── Persist to artifact directory ────────────────────────────
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    np.save(EMBEDDINGS_PATH, embeddings)
    metadata_df.to_csv(TRAINING_METADATA_PATH, index=False)

    # Save label maps so the mobile app and predictor can use them
    label_map_path = ARTIFACT_DIR / "label_map.json"
    reverse_map_path = ARTIFACT_DIR / "reverse_label_map.json"

    with open(label_map_path, "w") as f:
        json.dump(class_map, f, indent=2)

    with open(reverse_map_path, "w") as f:
        json.dump(reverse_map, f, indent=2)

    print("\n" + "=" * 60)
    print("DATASET BUILD COMPLETE")
    print("=" * 60)
    print(f"  Embeddings shape : {embeddings.shape}")
    print(f"  Num classes      : {len(class_map)}")
    print(f"  Total samples    : {len(labels)}")
    print(f"  Saved to         : {ARTIFACT_DIR}")

    return embeddings, labels, class_map, reverse_map
