/**
 * services/modelSync.service.ts
 * Downloads model assets and reference embeddings from the backend.
 */

import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { API_URL } from "../lib/api";
import { getActiveModelAsset, saveModelAsset } from "../db/modelAsset";
import { cacheSectionStudents, getCachedStudents } from "../db/sectionStudentCache";
import { useAttendanceStore } from "../store/attendance.store";
import { mobileFaceNet } from "../ml/mobilefacenet";
import { studentClassifier } from "../ml/classifier";
import { CachedStudent } from "../types/model.types";

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

export const syncModelAssets = async (sectionId: string, token: string): Promise<void> => {
  try {
    // 1. Check if we already have this model active locally
    const localAsset = await getActiveModelAsset(sectionId);
    let needsDownload = true;

    if (localAsset) {
      const bbInfo = await FileSystem.getInfoAsync(localAsset.backbonePath);
      const clfInfo = await FileSystem.getInfoAsync(localAsset.classifierPath);
      const detInfo = await FileSystem.getInfoAsync(`${MODELS_DIR}det_Det_Retina_Net.onnx`);

      // If files exist and are large enough, we can use the local model
      if (bbInfo.exists && bbInfo.size > 100000 && clfInfo.exists && clfInfo.size > 100000 && detInfo.exists && detInfo.size > 100000) {
        console.log(`[ModelSync] Model exists locally. Skipping API fetch.`);
        console.log(`[ModelSync] Location (Backbone): ${localAsset.backbonePath}`);
        console.log(`[ModelSync] Location (Classifier): ${localAsset.classifierPath}`);
        console.log(`[ModelSync] Location (Detector): ${MODELS_DIR}det_Det_Retina_Net.onnx`);
        await loadModelsIntoMemory(localAsset.backbonePath, localAsset.classifierPath, localAsset.classifierVersion);
        useAttendanceStore.getState().setActiveModel(localAsset);
        needsDownload = false;
        return; // Early return to prevent fetching
      } else {
        console.log("[ModelSync] Found corrupted local model. Forcing re-download.");
      }
    }

    if (!needsDownload) return;

    // 2. If no valid local model, fetch current active model metadata from server
    const res = await axios.get(`${API_URL}/model-sync/assets/${sectionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const serverAsset = res.data.data;
    if (!serverAsset) {
      console.log("[ModelSync] No active model assigned to this section.");
      return;
    }

    console.log("[ModelSync] Downloading new model...");

    // 3. Ensure models directory exists
    const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
    }

    // 4. Download backbone and classifier models
    const bbFilename = `bb_${serverAsset.backboneVersion}.onnx`;
    const clfFilename = `clf_${serverAsset.classifierVersion}.onnx`;
    const detFilename = `det_Det_Retina_Net.onnx`;
    const bbPath = `${MODELS_DIR}${bbFilename}`;
    const clfPath = `${MODELS_DIR}${clfFilename}`;
    const detPath = `${MODELS_DIR}${detFilename}`;

    console.log(`[ModelSync] Downloading backbone to: ${bbPath}`);
    await FileSystem.downloadAsync(serverAsset.backboneUrl, bbPath);

    console.log(`[ModelSync] Downloading classifier to: ${clfPath}`);
    await FileSystem.downloadAsync(serverAsset.classifierUrl, clfPath);

    console.log(`[ModelSync] Downloading detector to: ${detPath}`);
    // API_URL includes /api at the end, so we replace it to get the base URL
    const baseUrl = API_URL.replace(/\/api$/, '');
    const detectorUrl = `${baseUrl}/uploads/models/Det_Retina_Net.onnx`;
    await FileSystem.downloadAsync(detectorUrl, detPath);

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
    const localStudents = await getCachedStudents(sectionId);
    if (localStudents && localStudents.length > 0) {
      console.log(`[ModelSync] Student embeddings exist locally. Skipping API fetch.`);
      useAttendanceStore.getState().setSectionStudents(localStudents);
      return;
    }

    const res = await axios.get(`${API_URL}/model-sync/embeddings/${sectionId}`, {
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
