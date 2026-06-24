import os
import cv2
import numpy as np

from src.config import (
    GROUP_PHOTOS_DIR,
    ATTENDANCE_FACES_DIR,
    VALID_IMAGE_EXTENSIONS,
    CONFIDENCE_THRESHOLD
)

from src.detector.scrfd_detector import (
    SCRFDDetector
)

from src.alignment.face_alignment import (
    align_face
)

from src.embedding.mobilefacenet import (
    MobileFaceNetExtractor
)

from src.attendance.predictor import (
    AttendancePredictor
)


class AttendanceGenerator:

    def __init__(self):

        self.detector = SCRFDDetector()

        self.extractor = (
            MobileFaceNetExtractor()
        )

        self.predictor = (
            AttendancePredictor()
        )

        self.all_roll_numbers = sorted(
            list(
                self.predictor
                .class_to_roll
                .values()
            )
        )

    # =====================================================
    # GET GROUP PHOTOS
    # =====================================================

    def get_group_photos(self):

        photos = []

        for file_name in os.listdir(
            GROUP_PHOTOS_DIR
        ):

            ext = os.path.splitext(
                file_name
            )[1].lower()

            if (
                ext
                in
                VALID_IMAGE_EXTENSIONS
            ):

                photos.append(
                    GROUP_PHOTOS_DIR
                    / file_name
                )

        photos.sort()

        return photos

    # =====================================================
    # EXTRACT DATE
    # =====================================================

    def get_date_from_filename(
        self,
        image_path
    ):

        return os.path.splitext(
            image_path.name
        )[0]

    # =====================================================
    # SAVE FACE THUMBNAIL
    # =====================================================

    def save_face_thumbnail(
        self,
        date_string,
        roll_no,
        confidence,
        face_image
    ):

        save_dir = (
            ATTENDANCE_FACES_DIR
            / date_string
        )

        os.makedirs(
            save_dir,
            exist_ok=True
        )

        save_path = (
            save_dir
            /
            f"{roll_no}_{confidence:.2f}.jpg"
        )

        cv2.imwrite(
            str(save_path),
            face_image
        )

    # =====================================================
    # PROCESS ONE GROUP PHOTO
    # =====================================================

    def process_image(
        self,
        image_path
    ):

        print()
        print(
            f"Processing:"
        )
        print(
            image_path.name
        )

        image = cv2.imread(
            str(image_path)
        )

        if image is None:

            print(
                "Unable to read image."
            )

            return None

        date_string = (
            self.get_date_from_filename(
                image_path
            )
        )

        (
            boxes,
            scores,
            landmarks
        ) = self.detector.detect(
            image
        )

        print(
            f"Faces Detected:"
            f" {len(boxes)}"
        )

        # ----------------------------------
        # roll_no -> best prediction
        # ----------------------------------

        best_predictions = {}

        for face_idx in range(
            len(boxes)
        ):

            try:

                aligned_face = (
                    align_face(
                        image,
                        landmarks[
                            face_idx
                        ]
                    )
                )

                embedding = (
                    self.extractor
                    .get_embedding(
                        aligned_face
                    )
                )

                prediction = (
                    self.predictor
                    .predict(
                        embedding
                    )
                )

                roll_no = (
                    prediction[
                        "roll_no"
                    ]
                )

                confidence = (
                    prediction[
                        "confidence"
                    ]
                )

                if (
                    confidence
                    <
                    CONFIDENCE_THRESHOLD
                ):
                    continue

                if (
                    roll_no
                    not in
                    best_predictions
                ):

                    best_predictions[
                        roll_no
                    ] = {

                        "confidence":
                            confidence,

                        "face":
                            aligned_face
                    }

                else:

                    old_conf = (
                        best_predictions[
                            roll_no
                        ][
                            "confidence"
                        ]
                    )

                    if (
                        confidence
                        >
                        old_conf
                    ):

                        best_predictions[
                            roll_no
                        ] = {

                            "confidence":
                                confidence,

                            "face":
                                aligned_face
                        }

            except Exception as e:

                print(
                    f"Face Error: {e}"
                )

                continue

        # ----------------------------------
        # SAVE THUMBNAILS
        # ----------------------------------

        for (
            roll_no,
            data
        ) in best_predictions.items():

            self.save_face_thumbnail(
                date_string=
                date_string,

                roll_no=
                roll_no,

                confidence=
                data[
                    "confidence"
                ],

                face_image=
                data[
                    "face"
                ]
            )

        # ----------------------------------
        # ATTENDANCE VECTOR
        # ----------------------------------

        attendance_row = {

            "Date":
                date_string,

            "TotalStudents":
                len(
                    best_predictions
                )
        }

        for roll_no in (
            self.all_roll_numbers
        ):

            attendance_row[
                roll_no
            ] = 0

        for roll_no in (
            best_predictions
        ):

            attendance_row[
                roll_no
            ] = 1

        # ----------------------------------
        # CONFIDENCE ROWS
        # ----------------------------------

        confidence_rows = []

        for (
            roll_no,
            data
        ) in best_predictions.items():

            confidence_rows.append(
                {
                    "Date":
                        date_string,

                    "RollNo":
                        roll_no,

                    "Confidence":
                        data[
                            "confidence"
                        ]
                }
            )

        print(
            f"Present:"
            f" {len(best_predictions)}"
        )

        return {

            "attendance":
                attendance_row,

            "confidence":
                confidence_rows
        }

    # =====================================================
    # PROCESS ALL PHOTOS
    # =====================================================

    def generate(self):

        photos = (
            self.get_group_photos()
        )

        attendance_rows = []

        confidence_rows = []

        print()
        print(
            "=" * 60
        )
        print(
            "ATTENDANCE GENERATION"
        )
        print(
            "=" * 60
        )

        print()

        print(
            f"Photos Found:"
            f" {len(photos)}"
        )

        for image_path in photos:

            result = (
                self.process_image(
                    image_path
                )
            )

            if result is None:
                continue

            attendance_rows.append(
                result[
                    "attendance"
                ]
            )

            confidence_rows.extend(
                result[
                    "confidence"
                ]
            )

        print()
        print(
            "=" * 60
        )
        print(
            "ATTENDANCE COMPLETE"
        )
        print(
            "=" * 60
        )

        return (
            attendance_rows,
            confidence_rows
        )


# =========================================================
# PUBLIC FUNCTION
# =========================================================

def generate_attendance_records():

    generator = (
        AttendanceGenerator()
    )

    return generator.generate()