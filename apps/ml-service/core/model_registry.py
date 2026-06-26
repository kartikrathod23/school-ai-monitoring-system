"""
core/model_registry.py

Singleton that loads and caches ONNX models at startup.
All routers import the same singleton instance — models are loaded once,
never re-loaded per request.
"""

import logging
import sys
from pathlib import Path

# ── Path resolution ───────────────────────────────────────────────
# The ml-service lives at apps/ml-service/.
# The attendance_system library lives at apps/ml-worker/src/ml/attendance_system/
# We allow two layouts:
#   1. Local dev: attendance_system is a sibling dir of apps/
#   2. Docker:    attendance_system is copied to /app/attendance_system/

_HERE = Path(__file__).resolve().parent.parent       # apps/ml-service/
_ATT_SYS_LOCAL = _HERE.parent / "ml-worker" / "src" / "ml" / "attendance_system"
_ATT_SYS_DOCKER = Path("/app/attendance_system")

for candidate in [_ATT_SYS_LOCAL, _ATT_SYS_DOCKER]:
    if candidate.exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from src.detector.scrfd_detector import SCRFDDetector  # noqa: E402
from src.alignment.face_alignment import align_face     # noqa: E402, F401 — re-export
from src.embedding.mobilefacenet import MobileFaceNetExtractor  # noqa: E402

logger = logging.getLogger("ml-service.registry")


class ModelRegistry:
    """
    Holds singleton references to all heavy ONNX models.
    Call load_all() once at startup, then access detector / extractor
    from any router without reloading.
    """

    def __init__(self):
        self.detector: SCRFDDetector | None = None
        self.extractor: MobileFaceNetExtractor | None = None

    def load_all(self) -> None:
        logger.info("Loading SCRFDDetector (face detection)...")
        self.detector = SCRFDDetector()
        logger.info("✓ SCRFDDetector loaded")

        logger.info("Loading MobileFaceNetExtractor (face embedding)...")
        self.extractor = MobileFaceNetExtractor()
        logger.info("✓ MobileFaceNetExtractor loaded")

    @property
    def detector_ready(self) -> bool:
        return self.detector is not None

    @property
    def extractor_ready(self) -> bool:
        return self.extractor is not None

    def require_inference_models(self):
        """Raise if models aren't loaded — called by inference endpoints."""
        if not self.detector_ready or not self.extractor_ready:
            raise RuntimeError(
                "Models not loaded. Service is still starting up."
            )


# Global singleton imported by all routers
model_registry = ModelRegistry()
