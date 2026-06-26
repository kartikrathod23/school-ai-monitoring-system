import cv2
import numpy as np
import onnxruntime as ort

from src.config import (
    DET_MODEL_PATH,
    DET_INPUT_SIZE,
    SCORE_THRESHOLD,
    NMS_THRESHOLD,
    STRIDES
)

from src.detector.letterbox import (
    letterbox,
    reverse_letterbox_boxes,
    reverse_letterbox_landmarks
)

from src.detector.scrfd_utils import (
    generate_centers,
    distance2bbox,
    distance2kps
)


class SCRFDDetector:

    def __init__(
        self,
        model_path=None
    ):

        if model_path is None:
            model_path = str(
                DET_MODEL_PATH
            )

        self.session = ort.InferenceSession(
            model_path,
            providers=[
                "CPUExecutionProvider"
            ]
        )

        self.input_name = (
            self.session
            .get_inputs()[0]
            .name
        )

    # =====================================================
    # PREPROCESS
    # =====================================================

    def preprocess(
        self,
        image
    ):

        padded_image, scale, pad_x, pad_y = (
            letterbox(
                image,
                DET_INPUT_SIZE
            )
        )

        rgb = cv2.cvtColor(
            padded_image,
            cv2.COLOR_BGR2RGB
        )

        blob = rgb.astype(
            np.float32
        )

        blob = (
            blob - 127.5
        ) / 128.0

        blob = np.transpose(
            blob,
            (2, 0, 1)
        )

        blob = np.expand_dims(
            blob,
            axis=0
        )

        return (
            blob,
            scale,
            pad_x,
            pad_y
        )

    # =====================================================
    # DECODE
    # =====================================================

    def decode(
        self,
        outputs,
        score_threshold=SCORE_THRESHOLD
    ):

        scores_list = outputs[:3]

        bbox_list = outputs[3:6]

        kps_list = outputs[6:9]

        all_boxes = []

        all_scores = []

        all_landmarks = []

        for (
            score_pred,
            bbox_pred,
            kps_pred,
            stride
        ) in zip(
            scores_list,
            bbox_list,
            kps_list,
            STRIDES
        ):

            feature_map_h = (
                DET_INPUT_SIZE[0]
                // stride
            )

            feature_map_w = (
                DET_INPUT_SIZE[1]
                // stride
            )

            centers = generate_centers(
                feature_map_h,
                feature_map_w,
                stride
            )

            scores = score_pred[:, 0]

            keep = (
                scores >
                score_threshold
            )

            if keep.sum() == 0:
                continue

            centers = centers[keep]

            scores = scores[keep]

            bbox_pred = bbox_pred[keep]

            kps_pred = kps_pred[keep]

            boxes = distance2bbox(
                centers,
                bbox_pred,
                stride
            )

            landmarks = distance2kps(
                centers,
                kps_pred,
                stride
            )

            all_boxes.append(
                boxes
            )

            all_scores.append(
                scores
            )

            all_landmarks.append(
                landmarks
            )

        if len(all_boxes) == 0:

            return (
                np.empty((0, 4)),
                np.empty((0,)),
                np.empty((0, 5, 2))
            )

        boxes = np.concatenate(
            all_boxes,
            axis=0
        )

        scores = np.concatenate(
            all_scores,
            axis=0
        )

        landmarks = np.concatenate(
            all_landmarks,
            axis=0
        )

        return (
            boxes,
            scores,
            landmarks
        )

    # =====================================================
    # NMS
    # =====================================================

    def apply_nms(
        self,
        boxes,
        scores,
        landmarks
    ):

        if len(boxes) == 0:

            return (
                np.empty((0, 4)),
                np.empty((0,)),
                np.empty((0, 5, 2))
            )

        nms_boxes = []

        for box in boxes:

            x1, y1, x2, y2 = box

            nms_boxes.append(
                [
                    float(x1),
                    float(y1),
                    float(x2 - x1),
                    float(y2 - y1)
                ]
            )

        indices = cv2.dnn.NMSBoxes(
            nms_boxes,
            scores.tolist(),
            SCORE_THRESHOLD,
            NMS_THRESHOLD
        )

        if len(indices) == 0:

            return (
                np.empty((0, 4)),
                np.empty((0,)),
                np.empty((0, 5, 2))
            )

        indices = indices.flatten()

        return (
            boxes[indices],
            scores[indices],
            landmarks[indices]
        )

    # =====================================================
    # DETECT
    # =====================================================

    def detect(
        self,
        image
    ):

        (
            blob,
            scale,
            pad_x,
            pad_y
        ) = self.preprocess(
            image
        )

        outputs = self.session.run(
            None,
            {
                self.input_name: blob
            }
        )

        (
            boxes,
            scores,
            landmarks
        ) = self.decode(
            outputs
        )

        (
            boxes,
            scores,
            landmarks
        ) = self.apply_nms(
            boxes,
            scores,
            landmarks
        )

        if len(boxes) == 0:

            return (
                np.empty((0, 4)),
                np.empty((0,)),
                np.empty((0, 5, 2))
            )

        boxes = reverse_letterbox_boxes(
            boxes,
            scale,
            pad_x,
            pad_y
        )

        landmarks = (
            reverse_letterbox_landmarks(
                landmarks,
                scale,
                pad_x,
                pad_y
            )
        )

        return (
            boxes,
            scores,
            landmarks
        )