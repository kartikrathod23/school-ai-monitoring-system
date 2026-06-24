/**
 * services/offlineAttendance.service.ts
 * Core logic for running on-device inference and saving attendance.
 */

import {
  createOfflineSession,
  upsertOfflineRecord,
  updateSessionStatus,
} from "../db/offlineAttendance";
import { mobileFaceNet } from "../ml/mobilefacenet";
import { studentClassifier } from "../ml/classifier";
import { faceDetector } from "../ml/faceDetector";
import { useAttendanceStore } from "../store/attendance.store";
import { OfflineAttendanceSession, OfflineAttendanceRecord } from "../types/attendance.types";
import * as Device from "expo-device";

/**
 * Start a new offline attendance session
 */
export const startOfflineSession = async (sectionId: string): Promise<OfflineAttendanceSession> => {
  const bbVersion = mobileFaceNet.version;
  const clfVersion = studentClassifier.version;
  
  const deviceId = Device.osInternalBuildId || Device.modelId || "unknown_device";
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const session = await createOfflineSession({
    sectionId,
    date,
    backboneVersion: bbVersion,
    classifierVersion: clfVersion,
    deviceId,
  });

  useAttendanceStore.getState().setCurrentSession(session);
  return session;
};

/**
 * Process a group photo: detect faces, run backbone, run classifier, save records
 */
export const processAttendancePhoto = async (
  imageBase64: string,
  onProgress?: (msg: string) => void
): Promise<void> => {
  const store = useAttendanceStore.getState();
  const session = store.currentSession;
  if (!session) throw new Error("No active session");
  
  const sectionStudents = store.sectionStudents;
  if (!sectionStudents.length) {
    console.warn("No students cached for this section. Inference cannot map to students.");
  }

  onProgress?.("Detecting faces...");
  const faces = await faceDetector.detectFaces(imageBase64);
  
  if (faces.length === 0) {
    onProgress?.("No faces detected.");
    return;
  }

  onProgress?.(`Found ${faces.length} faces. Analyzing...`);

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    try {
      // 1. Run backbone
      const embResult = mobileFaceNet.extractEmbedding(face.cropBase64);
      
      // 2. Run classifier
      const clfResult = studentClassifier.classify(embResult.embedding);
      
      // 3. Map index to student (assuming cache is sorted by roll number)
      const student = sectionStudents[clfResult.studentIndex];
      if (!student) {
        console.warn(`Classifier returned index ${clfResult.studentIndex} but student not found in cache.`);
        continue;
      }

      // 4. Determine status based on confidence
      let status: "PRESENT" | "MANUAL" = "PRESENT";
      if (clfResult.confidence < 0.6) {
        status = "MANUAL"; // Needs teacher review
      }

      // 5. Create record
      const record: Omit<OfflineAttendanceRecord, "id"> = {
        sessionId: session.id,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        studentName: `${student.firstName} ${student.lastName}`,
        status,
        confidence: clfResult.confidence,
        // TODO: ideally save cropBase64 to local file system and store path here
        cropImagePath: undefined, 
        embeddingVector: embResult.embedding, // For retraining
        capturedAt: new Date().toISOString(),
        isManualOverride: false,
      };

      const savedRecord = await upsertOfflineRecord(record);
      store.setRecord(savedRecord);

    } catch (err) {
      console.error("Error processing face:", err);
      // In stub mode, this will be hit for every face.
      // We gracefully swallow it during development.
    }
  }

  onProgress?.("Done analyzing photo.");
};

/**
 * Mark students absent who weren't detected, and finish session
 */
export const finalizeOfflineSession = async (): Promise<void> => {
  const store = useAttendanceStore.getState();
  const session = store.currentSession;
  if (!session) return;

  const currentRecords = store.currentRecords;
  const sectionStudents = store.sectionStudents;

  // Mark all undetected students as ABSENT
  for (const student of sectionStudents) {
    if (!currentRecords[student.studentId]) {
      const absentRecord: Omit<OfflineAttendanceRecord, "id"> = {
        sessionId: session.id,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        studentName: `${student.firstName} ${student.lastName}`,
        status: "ABSENT",
        confidence: 0,
        capturedAt: new Date().toISOString(),
        isManualOverride: false,
      };
      const savedRecord = await upsertOfflineRecord(absentRecord);
      store.setRecord(savedRecord);
    }
  }

  // Session remains PENDING_SYNC. Sync manager will pick it up.
  store.clearSession();
};
