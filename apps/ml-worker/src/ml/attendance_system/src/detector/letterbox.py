import cv2
import numpy as np


def letterbox(
    image,
    new_shape=(640, 640),
    color=(0, 0, 0)
):
    """
    Resize image while preserving aspect ratio
    and pad remaining area.

    Returns
    -------
    padded_image
    scale
    pad_x
    pad_y
    """

    h, w = image.shape[:2]

    target_h, target_w = new_shape

    scale = min(
        target_w / w,
        target_h / h
    )

    new_w = int(round(w * scale))
    new_h = int(round(h * scale))

    resized = cv2.resize(
        image,
        (new_w, new_h),
        interpolation=cv2.INTER_LINEAR
    )

    padded = np.full(
        (
            target_h,
            target_w,
            3
        ),
        color,
        dtype=np.uint8
    )

    pad_x = (target_w - new_w) // 2
    pad_y = (target_h - new_h) // 2

    padded[
        pad_y:pad_y + new_h,
        pad_x:pad_x + new_w
    ] = resized

    return (
        padded,
        scale,
        pad_x,
        pad_y
    )


def reverse_letterbox_boxes(
    boxes,
    scale,
    pad_x,
    pad_y
):
    """
    Convert detector boxes back to
    original image coordinates.
    """

    boxes = boxes.copy()

    boxes[:, [0, 2]] -= pad_x
    boxes[:, [1, 3]] -= pad_y

    boxes /= scale

    return boxes


def reverse_letterbox_landmarks(
    landmarks,
    scale,
    pad_x,
    pad_y
):
    """
    Convert detector landmarks back to
    original image coordinates.
    """

    landmarks = landmarks.copy()

    landmarks[:, :, 0] -= pad_x
    landmarks[:, :, 1] -= pad_y

    landmarks /= scale

    return landmarks
