# # # # # # # # import cv2

# # # # # # # # from src.detector.letterbox import letterbox

# # # # # # # # img = cv2.imread("test.jpeg")

# # # # # # # # result, scale, px, py = letterbox(img)

# # # # # # # # print(result.shape)
# # # # # # # # print(scale)
# # # # # # # # print(px)
# # # # # # # # print(py)

# # # # # # # from src.detector.scrfd_utils import (
# # # # # # #     generate_centers,
# # # # # # #     distance2bbox,
# # # # # # #     distance2kps
# # # # # # # )

# # # # # # # centers = generate_centers(
# # # # # # #     80,
# # # # # # #     80,
# # # # # # #     8
# # # # # # # )

# # # # # # # print(centers.shape)

# # # # # # import cv2

# # # # # # from src.detector.scrfd_detector import (
# # # # # #     SCRFDDetector
# # # # # # )

# # # # # # detector = SCRFDDetector()

# # # # # # image = cv2.imread(
# # # # # #     "test.jpeg"
# # # # # # )

# # # # # # boxes, scores, landmarks = (
# # # # # #     detector.detect(image)
# # # # # # )

# # # # # # print(
# # # # # #     "Faces Found:",
# # # # # #     len(boxes)
# # # # # # )

# # # # # # print(
# # # # # #     "Boxes Shape:",
# # # # # #     boxes.shape
# # # # # # )

# # # # # # print(
# # # # # #     "Landmarks Shape:",
# # # # # #     landmarks.shape
# # # # # # )

# # # # # import cv2

# # # # # from src.detector.scrfd_detector import (
# # # # #     SCRFDDetector
# # # # # )

# # # # # from src.alignment.face_alignment import (
# # # # #     align_face
# # # # # )

# # # # # detector = SCRFDDetector()

# # # # # image = cv2.imread(
# # # # #     "test.jpeg"
# # # # # )

# # # # # boxes, scores, landmarks = (
# # # # #     detector.detect(image)
# # # # # )

# # # # # print(
# # # # #     "Faces Found:",
# # # # #     len(boxes)
# # # # # )

# # # # # if len(landmarks) > 0:

# # # # #     aligned = align_face(
# # # # #         image,
# # # # #         landmarks[0]
# # # # #     )

# # # # #     cv2.imwrite(
# # # # #         "aligned_face.jpg",
# # # # #         aligned
# # # # #     )

# # # # #     print(
# # # # #         "Aligned Face Saved"
# # # # #     )

# # # # import cv2

# # # # from src.detector.scrfd_detector import (
# # # #     SCRFDDetector
# # # # )

# # # # from src.alignment.face_alignment import (
# # # #     align_face
# # # # )

# # # # from src.embedding.mobilefacenet import (
# # # #     MobileFaceNetExtractor
# # # # )

# # # # detector = SCRFDDetector()

# # # # extractor = MobileFaceNetExtractor()

# # # # image = cv2.imread(
# # # #     "test.jpeg"
# # # # )

# # # # boxes, scores, landmarks = (
# # # #     detector.detect(image)
# # # # )

# # # # print(
# # # #     "Faces:",
# # # #     len(boxes)
# # # # )

# # # # if len(boxes) > 0:

# # # #     aligned_face = align_face(
# # # #         image,
# # # #         landmarks[0]
# # # #     )

# # # #     embedding = (
# # # #         extractor
# # # #         .get_embedding(
# # # #             aligned_face
# # # #         )
# # # #     )

# # # #     print(
# # # #         embedding.shape
# # # #     )

# # # #     print(
# # # #         embedding[:10]
# # # #     )
# # # from src.dataset_builder.build_embeddings import (
# # #     build_embeddings_dataset
# # # )

# # # embeddings, metadata, failed = (
# # #     build_embeddings_dataset()
# # # )

# # # print(
# # #     embeddings.shape
# # # )

# # # print(
# # #     metadata.head()
# # # )

# # # from src.classifier.model import (
# # #     create_model
# # # )

# # # model = create_model()

# # # print(model)

# # # from src.config import get_num_students

# # # print(get_num_students())


# # # import torch

# # # from src.classifier.model import (
# # #     create_model
# # # )

# # # model = create_model()

# # # x = torch.randn(
# # #     1,
# # #     512
# # # )

# # # y = model(x)

# # # print("Output Shape:")
# # # print(y.shape)

# # # test_train.py

# # from src.classifier.train import (
# #     train_classifier
# # )

# # train_classifier()


# # test_export.py

# from src.classifier.export_onnx import (
#     export_classifier_to_onnx
# )

# export_classifier_to_onnx()


# from src.attendance.predictor import (
#     AttendancePredictor
# )

# import numpy as np

# predictor = (
#     AttendancePredictor()
# )

# embedding = np.random.randn(
#     512
# ).astype(
#     np.float32
# )

# result = predictor.predict(
#     embedding
# )

# print(result)

# from src.attendance.attendance_generator import (
#     generate_attendance_records
# )

# attendance_rows, confidence_rows = (
#     generate_attendance_records()
# )

# print()
# print("=" * 50)
# print("ATTENDANCE ROWS")
# print("=" * 50)

# for row in attendance_rows:

#     print(row)

# print()
# print("=" * 50)
# print("CONFIDENCE ROWS")
# print("=" * 50)

# for row in confidence_rows[:10]:

#     print(row)

# print()
# print(
#     f"Attendance Rows: "
#     f"{len(attendance_rows)}"
# )

# print(
#     f"Confidence Rows: "
#     f"{len(confidence_rows)}"
# )


# from src.attendance.attendance_generator import (
#     generate_attendance_records
# )

# from src.attendance.csv_writer import (
#     save_attendance_csv
# )

# attendance_rows, confidence_rows = (
#     generate_attendance_records()
# )

# save_attendance_csv(
#     attendance_rows,
#     confidence_rows
# )

# print()
# print("DONE")


from src.attendance.attendance_generator import (
    generate_attendance_records
)

from src.attendance.csv_writer import (
    save_attendance_csv
)

attendance_rows, confidence_rows = (
    generate_attendance_records()
)

save_attendance_csv(
    attendance_rows,
    confidence_rows
)

print()
print("DONE")
