import argparse
import json
# pyrefly: ignore [missing-import]
import cv2
import numpy as np
import urllib.request
import sys
from pathlib import Path

# Resolve project root so `src.*` imports work
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.detector.scrfd_detector import SCRFDDetector
from src.alignment.face_alignment import align_face
from src.embedding.mobilefacenet import MobileFaceNetExtractor

def url_to_image(url):
    try:
        req = urllib.request.urlopen(url)
        arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
        img = cv2.imdecode(arr, -1)
        return img
    except Exception as e:
        print(f"Error downloading {url}: {e}", file=sys.stderr)
        return None

def process_onboarding(urls):
    detector = SCRFDDetector()
    extractor = MobileFaceNetExtractor()
    
    embeddings = []
    
    for url in urls:
        img = url_to_image(url)
        if img is None:
            continue
            
        boxes, scores, landmarks = detector.detect(img)
        
        # We assume only 1 student face per onboarding photo, so we take the most prominent one
        if len(boxes) > 0:
            # You might want to pick the largest box, but typically index 0 is fine 
            # if the photo is specifically an onboarding photo.
            aligned_face = align_face(img, landmarks[0])
            embedding = extractor.get_embedding(aligned_face)
            embeddings.append(embedding.tolist())
    
    result = {
        "success": True,
        "embeddings": embeddings,
        "facesFound": len(embeddings),
        "modelVersion": "MobileFaceNet-v1"
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract embeddings for onboarding")
    parser.add_argument("--urls", required=True, help="JSON string array of image URLs")
    args = parser.parse_args()
    
    try:
        urls = json.loads(args.urls)
        process_onboarding(urls)
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
