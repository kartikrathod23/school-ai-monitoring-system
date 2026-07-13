"""
train_for_section.py

Production entrypoint for training the attendance classifier for a section.

Pipeline:
  1. Pull embeddings from DB (StudentFaceEmbedding + AttendanceCropImage)
  2. Train the NN classifier (512 -> 128 -> N_students)
  3. Export to ONNX
  4. Upload both model files to S3
  5. Register as the active ModelAsset in the backend database

Usage:
  cd apps/ml-worker/src/ml/attendance_system
  python -m train_for_section --section-id <UUID> [--version v1]

Environment variables required:
  DATABASE_URL          PostgreSQL connection string
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_REGION
  AWS_BUCKET_NAME
  BACKEND_URL           e.g. http://localhost:5000/api
  BACKEND_TOKEN         Admin JWT token to call /api/model-sync/register-asset
"""

import argparse
import json
import os
import sys
import uuid
import datetime

from pathlib import Path

# Resolve project root so `src.*` imports work
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    ARTIFACT_DIR,
    CLASSIFIER_PTH_PATH,
    CLASSIFIER_ONNX_PATH,
    REC_MODEL_PATH,
    MODELS_DIR,
)
from src.dataset_builder.db_dataset_builder import build_db_dataset
from src.classifier.train import ClassifierTrainer
from src.classifier.export_onnx import ONNXExporter


# ============================================================
# S3 UPLOAD
# ============================================================

def upload_to_s3(local_path: Path, s3_key: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file to S3 and return its public URL."""
    import boto3

    bucket = os.environ["AWS_BUCKET_NAME"]
    region = os.environ.get("AWS_REGION", "ap-south-1")

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    print(f"  Uploading {local_path.name} → s3://{bucket}/{s3_key}")
    s3.upload_file(
        str(local_path),
        bucket,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )

    url = f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"
    print(f"  Uploaded: {url}")
    return url


# ============================================================
# REGISTER ASSET IN BACKEND
# ============================================================

def register_model_asset(
    section_id: str,
    backbone_version: str,
    classifier_version: str,
    backbone_url: str,
    classifier_url: str,
    label_map: dict,
    description: str,
):
    """
    Call POST /api/model-sync/register-asset to persist the new
    ModelAsset in the production DB and set it as active for the section.
    """
    import requests

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:5000/api")
    token = os.environ.get("BACKEND_TOKEN")

    if not token:
        print(
            "\n  WARNING: BACKEND_TOKEN not set. "
            "Skipping automatic model registration.\n"
            "  Manually call POST /api/model-sync/register-asset with:\n"
            f"    sectionId          : {section_id}\n"
            f"    backboneVersion    : {backbone_version}\n"
            f"    classifierVersion  : {classifier_version}\n"
            f"    backboneUrl        : {backbone_url}\n"
            f"    classifierUrl      : {classifier_url}\n"
        )
        return

    payload = {
        "sectionId": section_id,
        "backboneVersion": backbone_version,
        "classifierVersion": classifier_version,
        "backboneUrl": backbone_url,
        "classifierUrl": classifier_url,
        "labelMap": label_map,       # { roll_str -> class_id } for audit trail
        "description": description,
    }

    resp = requests.post(
        f"{backend_url}/model-sync/register-asset",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )

    if resp.status_code in (200, 201):
        print(f"  Model registered successfully: {resp.json()}")
    else:
        print(
            f"  WARNING: Registration returned {resp.status_code}: "
            f"{resp.text}"
        )


# ============================================================
# MAIN PIPELINE
# ============================================================

def run_pipeline(section_id: str, version_tag: str):
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    unique_short = uuid.uuid4().hex[:8]
    # Format: v1-a1b2c3d4
    clean_version = version_tag.lower() if version_tag.lower().startswith('v') else f"v{version_tag}"
    classifier_version = f"{clean_version}-{unique_short}"
    backbone_version = "MobileFaceNet-v1"  # backbone never changes

    print("\n" + "=" * 60)
    print("ATTENDANCE CLASSIFIER TRAINING PIPELINE")
    print("=" * 60)
    print(f"Section ID         : {section_id}")
    print(f"Classifier Version : {classifier_version}")
    print(f"Backbone Version   : {backbone_version}")

    # ── Step 1: Build dataset from DB ───────────────────────────
    print("\n[1/5] Building dataset from database...")
    embeddings, labels, class_map, reverse_map = build_db_dataset(section_id)

    num_classes = len(class_map)
    if num_classes < 2:
        raise ValueError(
            f"Only {num_classes} student(s) with embeddings found. "
            "Need at least 2 to train a classifier."
        )

    # ── Step 2: Train classifier ─────────────────────────────────
    print("\n[2/5] Training classifier...")
    trainer = ClassifierTrainer()
    model = trainer.train()
    trainer.evaluate(model)

    # ── Step 3: Export to ONNX ───────────────────────────────────
    print("\n[3/5] Exporting to ONNX...")
    exporter = ONNXExporter()
    exporter.export()

    # ── Step 4: Upload to S3 ─────────────────────────────────────
    print("\n[4/5] Uploading models to S3...")
    s3_prefix = f"models/{section_id}/{classifier_version}"

    classifier_url = upload_to_s3(
        CLASSIFIER_ONNX_PATH,
        f"{s3_prefix}/attendance_classifier.onnx",
    )

    label_map_path = ARTIFACT_DIR / "label_map.json"
    reverse_map_path = ARTIFACT_DIR / "reverse_label_map.json"

    upload_to_s3(label_map_path, f"{s3_prefix}/label_map.json", "application/json")
    upload_to_s3(reverse_map_path, f"{s3_prefix}/reverse_label_map.json", "application/json")

    # Backbone is shared — upload once to a stable key
    backbone_s3_key = "models/shared/Rec_Mobile_Net.onnx"
    backbone_url = upload_to_s3(REC_MODEL_PATH, backbone_s3_key)

    # ── Step 5: Register ModelAsset in backend ───────────────────
    print("\n[5/5] Registering model asset in backend...")
    description = (
        f"Trained on {len(labels)} samples | "
        f"{num_classes} students | "
        f"Section {section_id} | "
        f"{timestamp}"
    )

    register_model_asset(
        section_id=section_id,
        backbone_version=backbone_version,
        classifier_version=classifier_version,
        backbone_url=backbone_url,
        classifier_url=classifier_url,
        label_map=class_map,
        description=description,
    )

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"  Samples trained   : {len(labels)}")
    print(f"  Num classes       : {num_classes}")
    print(f"  Classifier version: {classifier_version}")
    print(f"  Classifier URL    : {classifier_url}")
    print(f"  Backbone URL      : {backbone_url}")
    print()

    return {
        "classifierVersion": classifier_version,
        "backboneVersion": backbone_version,
        "classifierUrl": classifier_url,
        "backboneUrl": backbone_url,
        "numClasses": num_classes,
        "numSamples": int(len(labels)),
    }


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train attendance classifier for a section"
    )
    parser.add_argument(
        "--section-id",
        required=True,
        help="UUID of the section to train for",
    )
    parser.add_argument(
        "--version",
        default="v1",
        help="Short version tag (e.g. v1, v2). Appended to classifier version string.",
    )
    args = parser.parse_args()

    result = run_pipeline(
        section_id=args.section_id,
        version_tag=args.version,
    )

    print(json.dumps(result, indent=2))
