/**
 * services/offlineAttendance.service.ts
 * Core logic for running on-device inference and saving attendance.
 *
 * Flow:
 *   1. Teacher starts session → createOfflineSession in SQLite
 *   2. For each captured group photo:
 *      a. FaceDetector → array of DetectedFace (bbox + crop)
 *      b. MobileFaceNet backbone → 512-dim embedding per face
 *      c. NN classifier → student index + confidence
 *      d. Map index → student (sorted by rollNumber ASC, same as cache)
 *      e. Save face crop JPEG to device filesystem
 *      f. Upsert AttendanceRecord in SQLite (with crop path + embedding)
 *   3. Mark undetected students as ABSENT
 *   4. Session status = PENDING_SYNC — synced when network returns
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Device from "expo-device";

import { v4 as uuidv4 } from "uuid";

import {
  createOfflineSession,
  upsertOfflineRecord,
  updateSessionStatus,
  updateRecordWithNewPhoto,
} from "../db/offlineAttendance";
import { mobileFaceNet } from "../ml/mobilefacenet";
import { studentClassifier } from "../ml/classifier";
import { faceDetector } from "../ml/faceDetector";
import { useAttendanceStore } from "../store/attendance.store";
import { OfflineAttendanceSession, OfflineAttendanceRecord } from "../types/attendance.types";

// ─────────────────────────────────────────────────────────────────
// saveCropToFilesystem
// Saves a base64-encoded face crop as a JPEG on the device.
// Returns the absolute local file path (used later during sync upload).
// ─────────────────────────────────────────────────────────────────
const saveCropToFilesystem = async (
  cropBase64: string,
  sessionId: string,
  rollNumber: number
): Promise<string | undefined> => {
  try {
    const cropsDir = `${FileSystem.documentDirectory}attendance_crops/${sessionId}/`;

    const dirInfo = await FileSystem.getInfoAsync(cropsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cropsDir, { intermediates: true });
    }

    const filename = `roll_${rollNumber}_${Date.now()}.jpg`;
    const filePath = `${cropsDir}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, cropBase64, {
      encoding: "base64" as any,
    });

    return filePath;
  } catch (err) {
    console.warn("[OfflineAttendance] Failed to save crop to filesystem:", err);
    return undefined;
  }
};

// ─────────────────────────────────────────────────────────────────
// startOfflineSession
// ─────────────────────────────────────────────────────────────────
export const startOfflineSession = async (
  sectionId: string
): Promise<OfflineAttendanceSession> => {
  const bbVersion = mobileFaceNet.version;
  const clfVersion = studentClassifier.version;

  const deviceId =
    Device.osInternalBuildId || Device.modelId || "unknown_device";
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

// ─────────────────────────────────────────────────────────────────
// processAttendancePhoto
// Detect faces → embed → classify → save record for one group photo.
// ─────────────────────────────────────────────────────────────────
export const processAttendancePhoto = async (
  imageBase64: string,
  onProgress?: (msg: string) => void
): Promise<void> => {
  const store = useAttendanceStore.getState();
  const session = store.currentSession;
  if (!session) throw new Error("No active session. Call startOfflineSession() first.");

  const sectionStudents = store.sectionStudents;
  if (!sectionStudents.length) {
    console.warn(
      "[OfflineAttendance] No students cached for this section. " +
        "Sync student data before taking attendance."
    );
  }

  onProgress?.("Detecting faces...");
  const faces = await faceDetector.detectFaces(imageBase64);

  if (faces.length === 0) {
    onProgress?.("No faces detected in this photo.");
    return;
  }

  onProgress?.(`Found ${faces.length} face(s). Running AI...`);

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];

    try {
      // 1. Extract 512-dim embedding via MobileFaceNet backbone
      const embResult = await mobileFaceNet.extractEmbedding(face.cropBase64);

      // 2. Classify embedding → student index + confidence
      const clfResult = await studentClassifier.classify(embResult.embedding);

      // 3. Map index → student
      //    sectionStudents is sorted by rollNumber ASC (same as training order)
      const student = sectionStudents[clfResult.studentIndex];
      if (!student) {
        console.warn(
          `[OfflineAttendance] Classifier returned index ${clfResult.studentIndex} ` +
            `but no student found at that position in cached list (${sectionStudents.length} students).`
        );
        continue;
      }

      let status: "PRESENT" | "MANUAL" = "PRESENT";
      let studentId = student.studentId;
      let rollNumber = student.rollNumber;
      let studentName = `${student.firstName} ${student.lastName}`;
      let confidence = clfResult.confidence;

      // Handle Unknown Faces
      if (confidence < 0.45) {
        status = "MANUAL"; // Needs review
        studentId = `UNKNOWN_${uuidv4()}`;
        rollNumber = -1;
        studentName = "Unknown Student";
      } else if (confidence < 0.6) {
        status = "MANUAL"; // Found student but needs review
      }

      // 5. Save the face crop to the device filesystem
      // Note: for unknown students, rollNumber is -1, which is fine for the filename
      const cropImagePath = await saveCropToFilesystem(
        face.cropBase64,
        session.id,
        rollNumber
      );

      // 6. Upsert the attendance record in SQLite
      const record: Omit<OfflineAttendanceRecord, "id"> = {
        sessionId: session.id,
        studentId,
        rollNumber,
        studentName,
        status,
        confidence,
        cropImagePath,             // local path — used at sync time to upload crop
        embeddingVector: embResult.embedding, // 512-dim — uploaded for NN retraining
        capturedAt: new Date().toISOString(),
        isManualOverride: false,
      };

      const savedRecord = await upsertOfflineRecord(record);
      store.setRecord(savedRecord);

      onProgress?.(`✓ ${studentName} — ${status}`);
    } catch (err: any) {
      // In stub mode each face will throw — swallow gracefully during dev
      console.error("[OfflineAttendance] Error processing face:", err.message);
    }
  }

  onProgress?.("Photo processing complete.");
};

// ─────────────────────────────────────────────────────────────────
// finalizeOfflineSession
// Mark all students not yet detected as ABSENT. Session stays
// PENDING_SYNC until the sync manager uploads it.
// ─────────────────────────────────────────────────────────────────
export const finalizeOfflineSession = async (): Promise<void> => {
  const store = useAttendanceStore.getState();
  const session = store.currentSession;
  if (!session) return;

  const currentRecords = store.currentRecords;
  const sectionStudents = store.sectionStudents;

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
      const saved = await upsertOfflineRecord(absentRecord);
      store.setRecord(saved);
    }
  }

  // Session stays PENDING_SYNC — cleared from UI state
  store.clearSession();
};

// ─────────────────────────────────────────────────────────────────
// captureSingleStudentPhoto
// Takes a live photo from the review screen, detects the face,
// embeds it, and updates the student's absent record to PRESENT.
// ─────────────────────────────────────────────────────────────────
export const captureSingleStudentPhoto = async (
  imageBase64: string,
  recordId: string,
  sessionId: string,
  rollNumber: number
): Promise<void> => {
  const faces = await faceDetector.detectFaces(imageBase64);

  if (faces.length === 0) {
    throw new Error("No face detected in the photo. Please try again.");
  }

  // If multiple faces found, just take the largest one (index 0)
  const face = faces[0];

  // Extract 512-dim embedding
  const embResult = await mobileFaceNet.extractEmbedding(face.cropBase64);

  // Save crop
  const cropImagePath = await saveCropToFilesystem(
    face.cropBase64,
    sessionId,
    rollNumber
  );

  if (!cropImagePath) {
    throw new Error("Failed to save the face crop.");
  }

  // Update record in SQLite
  await updateRecordWithNewPhoto(
    recordId,
    cropImagePath,
    embResult.embedding
  );
};

