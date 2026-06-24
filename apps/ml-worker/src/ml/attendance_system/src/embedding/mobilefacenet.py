import cv2
import numpy as np
import onnxruntime as ort

from src.config import (
    REC_MODEL_PATH,
    FACE_SIZE
)


class MobileFaceNetExtractor:
    """
    MobileFaceNet ONNX wrapper.

    Input:
        aligned face (112x112)

    Output:
        embedding (512,)
    """

    def __init__(
        self,
        model_path=None
    ):

        if model_path is None:
            model_path = str(
                REC_MODEL_PATH
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
        face
    ):
        """
        Input:
            BGR image

        Output:
            Shape:
            (1,3,112,112)
        """

        if face.shape[0] != FACE_SIZE or \
           face.shape[1] != FACE_SIZE:

            face = cv2.resize(
                face,
                (
                    FACE_SIZE,
                    FACE_SIZE
                )
            )

        rgb = cv2.cvtColor(
            face,
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

        return blob

    # =====================================================
    # EMBEDDING
    # =====================================================

    def get_embedding(
        self,
        aligned_face
    ):
        """
        Returns:
            (512,)
        """

        blob = self.preprocess(
            aligned_face
        )

        embedding = self.session.run(
            None,
            {
                self.input_name: blob
            }
        )[0][0]

        embedding = embedding.astype(
            np.float32
        )

        norm = np.linalg.norm(
            embedding
        )

        if norm > 0:

            embedding = (
                embedding / norm
            )

        return embedding

    # =====================================================
    # BATCH EMBEDDINGS
    # =====================================================

    def get_embeddings(
        self,
        aligned_faces
    ):
        """
        Parameters
        ----------
        aligned_faces : list

        Returns
        -------
        ndarray

        Shape:
            (N,512)
        """

        embeddings = []

        for face in aligned_faces:

            emb = self.get_embedding(
                face
            )

            embeddings.append(
                emb
            )

        if len(embeddings) == 0:

            return np.empty(
                (
                    0,
                    512
                ),
                dtype=np.float32
            )

        return np.asarray(
            embeddings,
            dtype=np.float32
        )

    # =====================================================
    # COSINE SIMILARITY
    # =====================================================

    @staticmethod
    def cosine_similarity(
        emb1,
        emb2
    ):
        """
        Debug helper.

        Returns:
            float
        """

        emb1 = emb1.astype(
            np.float32
        )

        emb2 = emb2.astype(
            np.float32
        )

        return float(
            np.dot(
                emb1,
                emb2
            )
        )

    # =====================================================
    # INFO
    # =====================================================

    def embedding_size(
        self
    ):
        return 512