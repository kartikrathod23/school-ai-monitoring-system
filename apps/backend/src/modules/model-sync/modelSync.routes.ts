import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import {
  getActiveModelAsset,
  getSectionEmbeddings,
} from "./modelSync.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/model-sync/assets/:sectionId
// Returns active model (backbone + classifier) metadata + download URLs
router.get("/assets/:sectionId", getActiveModelAsset);

// GET /api/model-sync/embeddings/:sectionId
// Returns all students with their 512-dim MobileFaceNet embeddings
// for offline inference on the teacher's device
router.get("/embeddings/:sectionId", getSectionEmbeddings);

export default router;
