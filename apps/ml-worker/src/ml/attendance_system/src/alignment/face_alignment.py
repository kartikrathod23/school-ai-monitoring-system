import cv2
import numpy as np

from src.config import (
    FACE_SIZE,
    ARCFACE_DST
)


ARCFACE_DST = np.array(
    ARCFACE_DST,
    dtype=np.float32
)


def get_reference_landmarks():
    """
    Return ArcFace reference landmarks.

    Landmark order:

    0 -> left eye
    1 -> right eye
    2 -> nose
    3 -> left mouth
    4 -> right mouth
    """

    return ARCFACE_DST.copy()


def estimate_similarity_transform(
    source_landmarks
):
    """
    Estimate affine transform from
    detected landmarks to ArcFace template.

    Parameters
    ----------
    source_landmarks : ndarray
        Shape:
        (5,2)

    Returns
    -------
    transform_matrix : ndarray
        Shape:
        (2,3)
    """

    source_landmarks = np.asarray(
        source_landmarks,
        dtype=np.float32
    )

    transform_matrix, _ = (
        cv2.estimateAffinePartial2D(
            source_landmarks,
            ARCFACE_DST,
            method=cv2.LMEDS
        )
    )

    return transform_matrix


def align_face(
    image,
    landmarks,
    output_size=FACE_SIZE
):
    """
    Align a face using
    5 facial landmarks.

    Parameters
    ----------
    image : ndarray

    landmarks : ndarray
        Shape:
        (5,2)

    output_size : int

    Returns
    -------
    aligned_face : ndarray
        Shape:
        (112,112,3)
    """

    transform_matrix = (
        estimate_similarity_transform(
            landmarks
        )
    )

    if transform_matrix is None:

        raise ValueError(
            "Could not estimate face transform."
        )

    aligned_face = cv2.warpAffine(
        image,
        transform_matrix,
        (
            output_size,
            output_size
        ),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0
    )

    return aligned_face


def align_faces(
    image,
    landmarks_list,
    output_size=FACE_SIZE
):
    """
    Align all detected faces.

    Parameters
    ----------
    image : ndarray

    landmarks_list : ndarray
        Shape:
        (N,5,2)

    Returns
    -------
    aligned_faces : list
    """

    aligned_faces = []

    for landmarks in landmarks_list:

        try:

            aligned_face = align_face(
                image=image,
                landmarks=landmarks,
                output_size=output_size
            )

            aligned_faces.append(
                aligned_face
            )

        except Exception:

            continue

    return aligned_faces


def crop_face_from_box(
    image,
    box,
    margin=0
):
    """
    Optional helper.

    Crops face directly from bbox.

    Useful for debugging only.

    Parameters
    ----------
    image

    box
        [x1,y1,x2,y2]

    margin

    Returns
    -------
    face_crop
    """

    h, w = image.shape[:2]

    x1, y1, x2, y2 = box

    x1 = int(max(0, x1 - margin))
    y1 = int(max(0, y1 - margin))

    x2 = int(min(w, x2 + margin))
    y2 = int(min(h, y2 + margin))

    return image[
        y1:y2,
        x1:x2
    ]


def draw_landmarks(
    image,
    landmarks,
    radius=2
):
    """
    Debug helper.

    Draw landmarks on image.

    Returns
    -------
    image_copy
    """

    image_copy = image.copy()

    for point in landmarks:

        x, y = point.astype(int)

        cv2.circle(
            image_copy,
            (x, y),
            radius,
            (0, 0, 255),
            -1
        )

    return image_copy