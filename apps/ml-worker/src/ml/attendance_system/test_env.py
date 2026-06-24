import cv2
import torch
import onnx
import onnxruntime as ort
import pandas as pd
import numpy as np

print("OpenCV:", cv2.__version__)
print("Torch:", torch.__version__)
print("ONNX:", onnx.__version__)
print("ONNXRuntime:", ort.__version__)
print("Pandas:", pd.__version__)
print("NumPy:", np.__version__)