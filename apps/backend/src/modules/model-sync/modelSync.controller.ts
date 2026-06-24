import { Request, Response } from "express";
import {
  getActiveModelAssetService,
  getSectionEmbeddingsService,
} from "./modelSync.service";

// GET /api/model-sync/assets/:sectionId
// Returns the currently active model (backbone + classifier) metadata
// for the given section. Teacher app downloads the model files
// using the returned URLs.
export const getActiveModelAsset = async (req: any, res: Response) => {
  try {
    const { sectionId } = req.params;
    const data = await getActiveModelAssetService(req.user.userId, sectionId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "No active model found for this section. Contact admin.",
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/model-sync/embeddings/:sectionId
// Returns all students in the section with their stored 512-dim
// MobileFaceNet embeddings. Teacher app syncs this at login / on
// model update so offline inference has all reference vectors.
export const getSectionEmbeddings = async (req: any, res: Response) => {
  try {
    const { sectionId } = req.params;
    const data = await getSectionEmbeddingsService(req.user.userId, sectionId);

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
