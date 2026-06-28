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
  updateRecordWithNewPhoto,
} from "../db/offlineAttendance";
import { mobileFaceNet } from "../ml/mobilefacenet";
import { studentClassifier } from "../ml/classifier";
import { faceDetector } from "../ml/faceDetector";
import { useAttendanceStore } from "../store/attendance.store";
import {
  OfflineAttendanceSession,
  OfflineAttendanceRecord,
} from "../types/attendance.types";

// ─────────────────────────────────────────────────────────────────
// saveCropToFilesystem
// Saves a base64-encoded face crop as a JPEG on the device.
// Returns the absolute path as stored by FileSystem (already includes
// file:// on Expo/Android) — ready for <Image source={{ uri }}>.
// ─────────────────────────────────────────────────────────────────
const saveCropToFilesystem = async (
  cropBase64: string,
  sessionId: string,
  rollNumber: number
): Promise<string | undefined> => {
  try {
    // FileSystem.documentDirectory already ends with "/" and starts with "file://"
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

    // filePath already looks like:
    //   file:///data/user/0/com.xxx/files/attendance_crops/session/roll_1_123.jpg
    // Return it as-is — do NOT add another file:// prefix.
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
  if (!session)
    throw new Error("No active session. Call startOfflineSession() first.");

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
      // 1. Extract 512-dim embedding
      //    cropBase64 is already 112×112 JPEG from faceDetector — no resize needed
      const embResult = await mobileFaceNet.extractEmbedding(face.cropBase64);

      // 2. Classify → student index + confidence
      const clfResult = await studentClassifier.classify(embResult.embedding);

      // 3. Map index → student (sorted by rollNumber ASC, matching training order)
      const student = sectionStudents[clfResult.studentIndex];
      if (!student) {
        console.warn(
          `[OfflineAttendance] Classifier returned index ${clfResult.studentIndex} ` +
            `but sectionStudents only has ${sectionStudents.length} entries.`
        );
        continue;
      }

      let status: "PRESENT" | "MANUAL" = "PRESENT";
      let studentId = student.studentId;
      let rollNumber = student.rollNumber;
      let studentName = `${student.firstName} ${student.lastName}`;
      const confidence = clfResult.confidence;

      if (confidence < 0.45) {
        // Unknown face — needs manual review
        status = "MANUAL";
        studentId = `UNKNOWN_${uuidv4()}`;
        rollNumber = -1;
        studentName = "Unknown Student";
      } else if (confidence < 0.6) {
        // Low confidence — found student but needs review
        status = "MANUAL";
      }

      // If we already have a better (higher confidence) photo of this student, skip saving this one
      const existingRecord = store.currentRecords[studentId];
      if (existingRecord) {
        if (existingRecord.isManualOverride || existingRecord.confidence >= confidence) {
          onProgress?.(`Skipped ${studentName} (better match exists)`);
          continue;
        }
      }

      // 4. Save crop — returns file:// URI ready for <Image>
      const cropImagePath = await saveCropToFilesystem(
        face.cropBase64,
        session.id,
        rollNumber
      );

      // 5. Upsert record in SQLite
      const record: Omit<OfflineAttendanceRecord, "id"> = {
        sessionId: session.id,
        studentId,
        rollNumber,
        studentName,
        status,
        confidence,
        cropImagePath,
        embeddingVector: embResult.embedding,
        capturedAt: new Date().toISOString(),
        isManualOverride: false,
      };

      const savedRecord = await upsertOfflineRecord(record);
      store.setRecord(savedRecord);

      onProgress?.(`✓ ${studentName} — ${status}`);
    } catch (err: any) {
      console.error("[OfflineAttendance] Error processing face:", err.message);
    }
  }

  onProgress?.("Photo processing complete.");
};

// ─────────────────────────────────────────────────────────────────
// finalizeOfflineSession
// Mark all students not yet detected as ABSENT.
// Session stays PENDING_SYNC until the sync manager uploads it.
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

  // Highest-score face is first after NMS sort
  const face = faces[0];

  const embResult = await mobileFaceNet.extractEmbedding(face.cropBase64);

  // Save crop — returns file:// URI
  const cropImagePath = await saveCropToFilesystem(
    face.cropBase64,
    sessionId,
    rollNumber
  );

  if (!cropImagePath) {
    throw new Error("Failed to save the face crop.");
  }

  await updateRecordWithNewPhoto(recordId, cropImagePath, embResult.embedding);
};