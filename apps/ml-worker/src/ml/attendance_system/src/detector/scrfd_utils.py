import numpy as np


def generate_centers(
    feature_map_height,
    feature_map_width,
    stride,
    num_anchors=2
):
    """
    Generate anchor centers for SCRFD.

    Parameters
    ----------
    feature_map_height : int

    feature_map_width : int

    stride : int

    num_anchors : int
        SCRFD uses 2 anchors per location.

    Returns
    -------
    centers : ndarray
        Shape:
        (feature_map_height * feature_map_width * num_anchors, 2)

        Columns:
        [center_x, center_y]
    """

    ys, xs = np.mgrid[
        :feature_map_height,
        :feature_map_width
    ]

    centers = np.stack(
        [xs, ys],
        axis=-1
    ).astype(np.float32)

    centers = (
        centers + 0.5
    ) * stride

    centers = centers.reshape(
        -1,
        2
    )

    centers = np.repeat(
        centers,
        num_anchors,
        axis=0
    )

    return centers


def distance2bbox(
    points,
    distances,
    stride
):
    """
    Decode SCRFD bbox regression outputs.

    Parameters
    ----------
    points : ndarray
        Shape:
        (N,2)

        [center_x, center_y]

    distances : ndarray
        Shape:
        (N,4)

        [left, top, right, bottom]

    stride : int

    Returns
    -------
    boxes : ndarray
        Shape:
        (N,4)

        [x1, y1, x2, y2]
    """

    x1 = (
        points[:, 0]
        - distances[:, 0] * stride
    )

    y1 = (
        points[:, 1]
        - distances[:, 1] * stride
    )

    x2 = (
        points[:, 0]
        + distances[:, 2] * stride
    )

    y2 = (
        points[:, 1]
        + distances[:, 3] * stride
    )

    boxes = np.stack(
        [
            x1,
            y1,
            x2,
            y2
        ],
        axis=1
    )

    return boxes


def distance2kps(
    points,
    predictions,
    stride
):
    """
    Decode SCRFD landmark predictions.

    Parameters
    ----------
    points : ndarray
        Shape:
        (N,2)

    predictions : ndarray
        Shape:
        (N,10)

    stride : int

    Returns
    -------
    landmarks : ndarray
        Shape:
        (N,5,2)

        Landmark order:

        left_eye
        right_eye
        nose
        left_mouth
        right_mouth
    """

    predictions = predictions.reshape(
        -1,
        5,
        2
    )

    landmarks = np.zeros_like(
        predictions,
        dtype=np.float32
    )

    landmarks[:, :, 0] = (
        points[:, None, 0]
        + predictions[:, :, 0] * stride
    )

    landmarks[:, :, 1] = (
        points[:, None, 1]
        + predictions[:, :, 1] * stride
    )

    return landmarks


def compute_area(
    boxes
):
    """
    Compute area of boxes.

    Parameters
    ----------
    boxes : ndarray
        Shape:
        (N,4)

    Returns
    -------
    area : ndarray
        Shape:
        (N,)
    """

    widths = (
        boxes[:, 2]
        - boxes[:, 0]
    )

    heights = (
        boxes[:, 3]
        - boxes[:, 1]
    )

    return widths * heights


def get_largest_face_index(
    boxes
):
    """
    Return index of largest face.

    Useful during training because
    student images may occasionally
    contain multiple detected faces.
    """

    if len(boxes) == 0:
        return None

    areas = compute_area(
        boxes
    )

    return int(
        np.argmax(
            areas
        )
    )