import numpy as np
import pandas as pd
import onnxruntime as ort

from src.config import (
    CLASSIFIER_ONNX_PATH,
    TRAINING_METADATA_PATH
)


class AttendancePredictor:

    def __init__(
        self,
        model_path=None
    ):

        if model_path is None:
            model_path = str(
                CLASSIFIER_ONNX_PATH
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

        self.class_to_roll = (
            self.load_class_mapping()
        )

    # =====================================================
    # LOAD CLASS MAPPING
    # =====================================================

    def load_class_mapping(
        self
    ):
        """
        Build mapping from:

        class_id -> roll_no

        using training_metadata.csv
        """

        metadata = pd.read_csv(
            TRAINING_METADATA_PATH
        )

        mapping_df = (
            metadata[
                [
                    "class_id",
                    "roll_no"
                ]
            ]
            .drop_duplicates()
            .sort_values(
                "class_id"
            )
        )

        mapping = {}

        for _, row in (
            mapping_df.iterrows()
        ):

            mapping[
                int(
                    row["class_id"]
                )
            ] = str(
                row["roll_no"]
            )

        return mapping

    # =====================================================
    # SOFTMAX
    # =====================================================

    @staticmethod
    def softmax(
        logits
    ):

        logits = (
            logits
            -
            np.max(
                logits,
                axis=1,
                keepdims=True
            )
        )

        exp_scores = np.exp(
            logits
        )

        probs = (
            exp_scores
            /
            np.sum(
                exp_scores,
                axis=1,
                keepdims=True
            )
        )

        return probs

    # =====================================================
    # PREDICT CLASS
    # =====================================================

    def predict(
        self,
        embedding
    ):
        """
        Input:
            embedding.shape == (512,)

        Returns:
            {
                class_id,
                roll_no,
                confidence
            }
        """

        embedding = np.asarray(
            embedding,
            dtype=np.float32
        )

        embedding = embedding.reshape(
            1,
            512
        )

        logits = self.session.run(
            None,
            {
                self.input_name:
                embedding
            }
        )[0]

        probabilities = (
            self.softmax(
                logits
            )
        )

        class_id = int(
            np.argmax(
                probabilities
            )
        )

        confidence = float(
            probabilities[
                0,
                class_id
            ]
        )

        roll_no = (
            self.class_to_roll[
                class_id
            ]
        )

        return {
            "class_id":
                class_id,

            "roll_no":
                roll_no,

            "confidence":
                confidence
        }

    # =====================================================
    # BATCH PREDICT
    # =====================================================

    def predict_batch(
        self,
        embeddings
    ):
        """
        Input:
            (N,512)

        Returns:
            list of predictions
        """

        embeddings = np.asarray(
            embeddings,
            dtype=np.float32
        )

        logits = self.session.run(
            None,
            {
                self.input_name:
                embeddings
            }
        )[0]

        probabilities = (
            self.softmax(
                logits
            )
        )

        predictions = []

        for i in range(
            len(probabilities)
        ):

            class_id = int(
                np.argmax(
                    probabilities[i]
                )
            )

            confidence = float(
                probabilities[
                    i,
                    class_id
                ]
            )

            roll_no = (
                self.class_to_roll[
                    class_id
                ]
            )

            predictions.append(
                {
                    "class_id":
                        class_id,

                    "roll_no":
                        roll_no,

                    "confidence":
                        confidence
                }
            )

        return predictions

    # =====================================================
    # INFO
    # =====================================================

    def num_classes(
        self
    ):

        return len(
            self.class_to_roll
        )