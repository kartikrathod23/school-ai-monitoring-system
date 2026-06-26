import torch

from src.config import (
    CLASSIFIER_PTH_PATH,
    CLASSIFIER_ONNX_PATH
)

from src.classifier.model import (
    AttendanceClassifier
)


# ============================================================
# EXPORTER
# ============================================================

class ONNXExporter:

    def __init__(self):
        pass

    # ========================================================
    # GET NUMBER OF CLASSES
    # ========================================================

    def get_num_classes(
        self
    ):
        """
        Infer number of classes from
        trained checkpoint.

        This avoids depending on
        current student folder count.
        """

        checkpoint = torch.load(
            CLASSIFIER_PTH_PATH,
            map_location="cpu"
        )

        num_classes = checkpoint[
            "fc2.weight"
        ].shape[0]

        return num_classes

    # ========================================================
    # LOAD MODEL
    # ========================================================

    def load_model(
        self
    ):

        num_classes = (
            self.get_num_classes()
        )

        model = (
            AttendanceClassifier(
                num_classes=num_classes
            )
        )

        state_dict = torch.load(
            CLASSIFIER_PTH_PATH,
            map_location="cpu"
        )

        model.load_state_dict(
            state_dict
        )

        model.eval()

        return model

    # ========================================================
    # EXPORT
    # ========================================================

    def export(
        self
    ):

        model = self.load_model()

        dummy_input = torch.randn(
            1,
            512,
            dtype=torch.float32
        )

        torch.onnx.export(
            model,

            dummy_input,

            str(
                CLASSIFIER_ONNX_PATH
            ),

            export_params=True,

            opset_version=18,

            do_constant_folding=True,

            input_names=[
                "embedding"
            ],

            output_names=[
                "scores"
            ],

            dynamic_axes={
                "embedding": {
                    0: "batch_size"
                },
                "scores": {
                    0: "batch_size"
                }
            }
        )

        print(
            "Embedding external data into a single ONNX file..."
        )
        import onnx
        import os
        onnx_model = onnx.load(str(CLASSIFIER_ONNX_PATH), load_external_data=True)
        onnx.save(onnx_model, str(CLASSIFIER_ONNX_PATH))
        
        # Clean up the .data file if it exists
        data_path = str(CLASSIFIER_ONNX_PATH) + ".data"
        if os.path.exists(data_path):
            os.remove(data_path)

        print(
            "=" * 50
        )
        print(
            "ONNX EXPORT COMPLETE"
        )
        print(
            "=" * 50
        )

        print()
        print(
            "Saved:"
        )
        print(
            CLASSIFIER_ONNX_PATH
        )

        print()

        print(
            "Input:"
        )
        print(
            "(batch_size, 512)"
        )

        print()

        print(
            "Output:"
        )

        print(
            f"(batch_size, "
            f"{self.get_num_classes()})"
        )


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def export_classifier_to_onnx():

    exporter = ONNXExporter()

    exporter.export()