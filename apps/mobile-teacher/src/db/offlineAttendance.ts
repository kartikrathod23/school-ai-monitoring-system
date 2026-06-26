/**
 * db/offlineAttendance.ts
 * CRUD operations for offline attendance sessions and records.
 */

import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./localDb";
import {
  OfflineAttendanceSession,
  OfflineAttendanceRecord,
  AttendanceStatus,
  SyncStatus,
} from "../types/attendance.types";

// ─────────────────────────────────────────────────────────────────
// Session operations
// ─────────────────────────────────────────────────────────────────

export const createOfflineSession = async (
  params: Omit<OfflineAttendanceSession, "id" | "status" | "createdAt">
): Promise<OfflineAttendanceSession> => {
  const db = getDb();
  const session: OfflineAttendanceSession = {
    id: uuidv4(),
    status: "PENDING_SYNC",
    createdAt: new Date().toISOString(),
    ...params,
  };

  await db.runAsync(
    `INSERT INTO offline_attendance_sessions
       (id, section_id, date, status, backbone_version, classifier_version,
        device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.sectionId,
      session.date,
      session.status,
      session.backboneVersion,
      session.classifierVersion,
      session.deviceId,
      session.createdAt,
    ]
  );

  return session;
};

export const getOfflineSessionById = async (
  id: string
): Promise<OfflineAttendanceSession | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM offline_attendance_sessions WHERE id = ?`,
    [id]
  );
  return row ? mapSession(row) : null;
};

export const getPendingSyncSessions = async (): Promise<OfflineAttendanceSession[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_attendance_sessions
     WHERE status IN ('PENDING_SYNC', 'SYNC_FAILED')
     ORDER BY created_at ASC`
  );
  return rows.map(mapSession);
};

export const updateSessionStatus = async (
  id: string,
  status: SyncStatus,
  extra?: { syncedAt?: string; serverSessionId?: string }
): Promise<void> => {
  const db = getDb();
  await db.runAsync(
    `UPDATE offline_attendance_sessions
     SET status = ?, synced_at = ?, server_session_id = ?
     WHERE id = ?`,
    [status, extra?.syncedAt ?? null, extra?.serverSessionId ?? null, id]
  );
};

export const getAllSessions = async (sectionId: string): Promise<OfflineAttendanceSession[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_attendance_sessions
     WHERE section_id = ?
     ORDER BY date DESC`,
    [sectionId]
  );
  return rows.map(mapSession);
};

// ─────────────────────────────────────────────────────────────────
// Record operations
// ─────────────────────────────────────────────────────────────────

export const upsertOfflineRecord = async (
  record: Omit<OfflineAttendanceRecord, "id">
): Promise<OfflineAttendanceRecord> => {
  const db = getDb();
  const full: OfflineAttendanceRecord = { id: uuidv4(), ...record };

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_attendance_records
       (id, session_id, student_id, roll_number, student_name, status,
        confidence, crop_image_path, embedding_vector, captured_at, is_manual_override)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      full.id,
      full.sessionId,
      full.studentId,
      full.rollNumber,
      full.studentName,
      full.status,
      full.confidence,
      full.cropImagePath ?? null,
      full.embeddingVector ? JSON.stringify(full.embeddingVector) : null,
      full.capturedAt,
      full.isManualOverride ? 1 : 0,
    ]
  );

  return full;
};

export const getSessionRecords = async (
  sessionId: string
): Promise<OfflineAttendanceRecord[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_attendance_records
     WHERE session_id = ?
     ORDER BY roll_number ASC`,
    [sessionId]
  );
  return rows.map(mapRecord);
};

export const updateRecordStatus = async (
  id: string,
  status: AttendanceStatus
): Promise<void> => {
  const db = getDb();
  await db.runAsync(
    `UPDATE offline_attendance_records
     SET status = ?, is_manual_override = 1
     WHERE id = ?`,
    [status, id]
  );
};

export const reassignRecordToStudent = async (
  sourceRecordId: string,
  sessionId: string,
  targetStudentId: string,
  targetRollNumber: number,
  targetStudentName: string
): Promise<void> => {
  const db = getDb();
  
  // 1. Delete the existing ABSENT record for the target student (if any)
  // We use executeAsync or runAsync multiple times safely
  await db.runAsync(
    `DELETE FROM offline_attendance_records 
     WHERE session_id = ? AND student_id = ? AND id != ?`,
    [sessionId, targetStudentId, sourceRecordId]
  );

  // 2. Update the source record to point to the new student and mark PRESENT
  await db.runAsync(
    `UPDATE offline_attendance_records
     SET student_id = ?, roll_number = ?, student_name = ?, status = 'PRESENT', is_manual_override = 1
     WHERE id = ?`,
    [targetStudentId, targetRollNumber, targetStudentName, sourceRecordId]
  );
};

export const updateRecordWithNewPhoto = async (
  recordId: string,
  cropImagePath: string,
  embeddingVector: number[]
): Promise<void> => {
  const db = getDb();
  await db.runAsync(
    `UPDATE offline_attendance_records
     SET crop_image_path = ?, embedding_vector = ?, status = 'PRESENT', is_manual_override = 1, confidence = 1.0
     WHERE id = ?`,
    [cropImagePath, JSON.stringify(embeddingVector), recordId]
  );
};

// ─────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────

const mapSession = (row: any): OfflineAttendanceSession => ({
  id: row.id,
  sectionId: row.section_id,
  date: row.date,
  status: row.status as SyncStatus,
  backboneVersion: row.backbone_version,
  classifierVersion: row.classifier_version,
  deviceId: row.device_id,
  createdAt: row.created_at,
  syncedAt: row.synced_at ?? undefined,
  serverSessionId: row.server_session_id ?? undefined,
});

const mapRecord = (row: any): OfflineAttendanceRecord => ({
  id: row.id,
  sessionId: row.session_id,
  studentId: row.student_id,
  rollNumber: row.roll_number,
  studentName: row.student_name,
  status: row.status as AttendanceStatus,
  confidence: row.confidence,
  cropImagePath: row.crop_image_path ?? undefined,
  embeddingVector: row.embedding_vector
    ? JSON.parse(row.embedding_vector)
    : undefined,
  capturedAt: row.captured_at,
  isManualOverride: row.is_manual_override === 1,
});
