from src.dataset_builder.build_embeddings import (
    build_embeddings_dataset
)

from src.classifier.train import (
    train_classifier
)

from src.classifier.export_onnx import (
    export_classifier_to_onnx
)


def main():

    print()
    print("=" * 60)
    print("STEP 1 : BUILD EMBEDDINGS DATASET")
    print("=" * 60)

    (
        embeddings,
        metadata,
        failed_images
    ) = build_embeddings_dataset()

    print()

    print("=" * 60)
    print("STEP 2 : TRAIN CLASSIFIER")
    print("=" * 60)

    model = train_classifier()

    print()

    print("=" * 60)
    print("STEP 3 : EXPORT ONNX")
    print("=" * 60)

    export_classifier_to_onnx()

    print()

    print("=" * 60)
    print("TRAINING PIPELINE COMPLETE")
    print("=" * 60)

    print()

    print("Generated Files")

    print()

    print(
        "artifacts/embeddings.npy"
    )

    print(
        "artifacts/training_metadata.csv"
    )

    print(
        "artifacts/attendance_classifier.pth"
    )

    print(
        "models/attendance_classifier.onnx"
    )

    print()

    print(
        f"Total Embeddings : "
        f"{len(metadata)}"
    )

    print(
        f"Failed Images : "
        f"{len(failed_images)}"
    )


if __name__ == "__main__":

    main()