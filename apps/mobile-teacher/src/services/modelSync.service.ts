/**
 * services/modelSync.service.ts
 * Downloads model assets and reference embeddings from the backend.
 */

import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { getActiveModelAsset, saveModelAsset } from "../db/modelAsset";
import { cacheSectionStudents } from "../db/sectionStudentCache";
import { useAttendanceStore } from "../store/attendance.store";
import { mobileFaceNet } from "../ml/mobilefacenet";
import { studentClassifier } from "../ml/classifier";
import { CachedStudent } from "../types/model.types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.82:5000/api";
const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

export const syncModelAssets = async (sectionId: string, token: string): Promise<void> => {
  try {
    // 1. Fetch current active model metadata for this section
    const res = await axios.get(`${API_BASE}/model-sync/assets/${sectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const serverAsset = res.data.data;
    if (!serverAsset) {
      console.log("[ModelSync] No active model assigned to this section.");
      return;
    }

    // 2. Check if we already have this model active locally
    const localAsset = await getActiveModelAsset(sectionId);
    let forceDownload = false;

    if (localAsset) {
      const bbInfo = await FileSystem.getInfoAsync(localAsset.backbonePath);
      const clfInfo = await FileSystem.getInfoAsync(localAsset.classifierPath);
      
      // If files are missing or too small (< 100KB), they might be corrupted XML files or missing .data
      // A valid classifier is at least ~265KB due to the 512x128 linear layer.
      if (!bbInfo.exists || bbInfo.size < 100000 || !clfInfo.exists || clfInfo.size < 100000) {
        console.log("[ModelSync] Found corrupted local model. Forcing re-download.");
        forceDownload = true;
      }
    }

    if (
      !forceDownload &&
      localAsset &&
      localAsset.backboneVersion === serverAsset.backboneVersion &&
      localAsset.classifierVersion === serverAsset.classifierVersion
    ) {
      console.log(`[ModelSync] Model is up to date.`);
      console.log(`[ModelSync] Location (Backbone): ${localAsset.backbonePath}`);
      console.log(`[ModelSync] Location (Classifier): ${localAsset.classifierPath}`);
      await loadModelsIntoMemory(localAsset.backbonePath, localAsset.classifierPath, localAsset.classifierVersion);
      return;
    }

    console.log("[ModelSync] New model available or local is corrupted. Downloading...");

    // 3. Ensure models directory exists
    const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
    }

    // 4. Download backbone and classifier models
    const bbFilename = `bb_${serverAsset.backboneVersion}.onnx`;
    const clfFilename = `clf_${serverAsset.classifierVersion}.onnx`;
    const bbPath = `${MODELS_DIR}${bbFilename}`;
    const clfPath = `${MODELS_DIR}${clfFilename}`;

    console.log(`[ModelSync] Downloading backbone to: ${bbPath}`);
    await FileSystem.downloadAsync(serverAsset.backboneUrl, bbPath);
    
    console.log(`[ModelSync] Downloading classifier to: ${clfPath}`);
    await FileSystem.downloadAsync(serverAsset.classifierUrl, clfPath);

    // 5. Save metadata to SQLite
    const newLocalAsset = await saveModelAsset({
      backboneVersion: serverAsset.backboneVersion,
      classifierVersion: serverAsset.classifierVersion,
      sectionId,
      backbonePath: bbPath,
      classifierPath: clfPath,
    });

    console.log("[ModelSync] Download complete. Loading models...");
    
    // 6. Load into memory
    await loadModelsIntoMemory(bbPath, clfPath, serverAsset.classifierVersion);

    // 7. Update store
    useAttendanceStore.getState().setActiveModel(newLocalAsset);

  } catch (error) {
    console.error("[ModelSync] Failed to sync model assets:", error);
  }
};

export const syncStudentEmbeddings = async (sectionId: string, token: string): Promise<void> => {
  try {
    const res = await axios.get(`${API_BASE}/model-sync/embeddings/${sectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const students: CachedStudent[] = res.data.data.students.map((s: any) => ({
      ...s,
      sectionId,
      cachedAt: new Date().toISOString(),
    }));

    await cacheSectionStudents(students);
    useAttendanceStore.getState().setSectionStudents(students);
    console.log(`[ModelSync] Synced ${students.length} student embeddings.`);
    
  } catch (error) {
    console.error("[ModelSync] Failed to sync student embeddings:", error);
  }
};

export const loadModelsIntoMemory = async (bbPath: string, clfPath: string, clfVersion: string) => {
  try {
    await mobileFaceNet.loadModel(bbPath);
    await studentClassifier.loadModel(clfPath, clfVersion);
  } catch (err) {
    console.warn("[ModelSync] Model stubs threw error (expected until ONNX wired):", err);
  }
};
