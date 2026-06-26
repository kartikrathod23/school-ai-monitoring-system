import os
import cv2
import numpy as np
import pandas as pd

from tqdm import tqdm

from src.config import (
    STUDENTS_DIR,
    EMBEDDINGS_PATH,
    TRAINING_METADATA_PATH,
    VALID_IMAGE_EXTENSIONS
)

from src.detector.scrfd_detector import (
    SCRFDDetector
)

from src.detector.scrfd_utils import (
    get_largest_face_index
)

from src.alignment.face_alignment import (
    align_face
)

from src.embedding.mobilefacenet import (
    MobileFaceNetExtractor
)


class EmbeddingDatasetBuilder:

    def __init__(self):

        self.detector = SCRFDDetector()

        self.extractor = (
            MobileFaceNetExtractor()
        )

    # =====================================================
    # DISCOVER STUDENTS
    # =====================================================

    def get_student_folders(
        self
    ):

        folders = []

        for item in os.listdir(
            STUDENTS_DIR
        ):

            full_path = (
                STUDENTS_DIR / item
            )

            if (
                full_path.is_dir()
                and item.startswith(
                    "student_"
                )
            ):
                folders.append(
                    item
                )

        folders.sort()

        return folders

    # =====================================================
    # BUILD CLASS MAP
    # =====================================================

    def build_class_mapping(
        self
    ):
        """
        Example

        student_01 -> 0

        student_02 -> 1

        student_03 -> 2
        """

        student_folders = (
            self.get_student_folders()
        )

        mapping = {}

        for idx, folder in enumerate(
            student_folders
        ):

            roll_no = (
                folder.replace(
                    "student_",
                    ""
                )
            )

            mapping[
                roll_no
            ] = idx

        return mapping

    # =====================================================
    # GET IMAGE FILES
    # =====================================================

    def get_images(
        self,
        student_folder
    ):

        folder_path = (
            STUDENTS_DIR
            / student_folder
        )

        image_files = []

        for file_name in os.listdir(
            folder_path
        ):

            ext = os.path.splitext(
                file_name
            )[1].lower()

            if (
                ext in
                VALID_IMAGE_EXTENSIONS
            ):

                image_files.append(
                    folder_path / file_name
                )

        image_files.sort()

        return image_files

    # =====================================================
    # IMAGE TO EMBEDDING
    # =====================================================

    def image_to_embedding(
        self,
        image_path
    ):

        image = cv2.imread(
            str(image_path)
        )

        if image is None:
            return None

        (
            boxes,
            scores,
            landmarks
        ) = self.detector.detect(
            image
        )

        if len(boxes) == 0:
            return None

        largest_idx = (
            get_largest_face_index(
                boxes
            )
        )

        if largest_idx is None:
            return None

        aligned_face = (
            align_face(
                image,
                landmarks[
                    largest_idx
                ]
            )
        )

        embedding = (
            self.extractor
            .get_embedding(
                aligned_face
            )
        )

        return embedding

    # =====================================================
    # BUILD DATASET
    # =====================================================

    def build(
        self
    ):

        print(
            "\nBuilding Embeddings Dataset..."
        )

        mapping = (
            self.build_class_mapping()
        )

        embeddings = []

        metadata_rows = []

        failed_images = []

        sample_id = 0

        student_folders = (
            self.get_student_folders()
        )

        print(
            f"\nStudents Found: "
            f"{len(student_folders)}"
        )

        for folder in student_folders:

            roll_no = (
                folder.replace(
                    "student_",
                    ""
                )
            )

            class_id = (
                mapping[roll_no]
            )

            image_files = (
                self.get_images(
                    folder
                )
            )

            print(
                f"\nProcessing "
                f"{folder}"
            )

            for image_path in tqdm(
                image_files
            ):

                embedding = (
                    self.image_to_embedding(
                        image_path
                    )
                )

                if embedding is None:

                    failed_images.append(
                        str(
                            image_path
                        )
                    )

                    continue

                embeddings.append(
                    embedding
                )

                metadata_rows.append(
                    {
                        "sample_id":
                        sample_id,

                        "class_id":
                        class_id,

                        "roll_no":
                        roll_no,

                        "image_path":
                        str(
                            image_path
                        )
                    }
                )

                sample_id += 1

        embeddings = np.array(
            embeddings,
            dtype=np.float32
        )

        metadata_df = (
            pd.DataFrame(
                metadata_rows
            )
        )

        np.save(
            EMBEDDINGS_PATH,
            embeddings
        )

        metadata_df.to_csv(
            TRAINING_METADATA_PATH,
            index=False
        )

        print("\n================================")
        print("Dataset Creation Complete")
        print("================================")

        print(
            "Embeddings Shape:",
            embeddings.shape
        )

        print(
            "Metadata Shape:",
            metadata_df.shape
        )

        print(
            "Failed Images:",
            len(
                failed_images
            )
        )

        return (
            embeddings,
            metadata_df,
            failed_images
        )


def build_embeddings_dataset():

    builder = (
        EmbeddingDatasetBuilder()
    )

    return builder.build()