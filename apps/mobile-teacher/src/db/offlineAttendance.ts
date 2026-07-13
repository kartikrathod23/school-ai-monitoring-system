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
     WHERE status IN ('PENDING_SYNC', 'SYNC_FAILED', 'SYNCING')
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

export const getAllSessionsWithStats = async (): Promise<(OfflineAttendanceSession & { presentCount: number; absentCount: number; attendancePercentage: number })[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT s.*, 
            SUM(CASE WHEN r.student_id NOT LIKE 'UNKNOWN_%' THEN 1 ELSE 0 END) as total_students,
            SUM(CASE WHEN (r.status = 'PRESENT' OR r.status = 'MANUAL') AND r.student_id NOT LIKE 'UNKNOWN_%' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN r.status = 'ABSENT' AND r.student_id NOT LIKE 'UNKNOWN_%' THEN 1 ELSE 0 END) as absent_count
     FROM offline_attendance_sessions s
     LEFT JOIN offline_attendance_records r ON s.id = r.session_id
     GROUP BY s.id
     ORDER BY s.date DESC`
  );
  
  return rows.map((row) => {
    const session = mapSession(row);
    const presentCount = row.present_count || 0;
    const totalStudents = row.total_students || 0;
    const attendancePercentage = totalStudents > 0 
      ? Math.round((presentCount / totalStudents) * 100) 
      : 0;

    return {
      ...session,
      presentCount,
      absentCount: row.absent_count || 0,
      attendancePercentage
    };
  });
};

// ─────────────────────────────────────────────────────────────────
// Record operations
// ─────────────────────────────────────────────────────────────────

export const upsertOfflineRecord = async (
  record: Omit<OfflineAttendanceRecord, "id"> & { id?: string }
): Promise<OfflineAttendanceRecord> => {
  const db = getDb();
  const full: OfflineAttendanceRecord = { ...record, id: record.id || uuidv4() };

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
  
  // 1. Fetch the source record before we modify it so we don't lose the original student
  const sourceRecord = await db.getFirstAsync<any>(
    `SELECT student_id, roll_number, student_name FROM offline_attendance_records WHERE id = ?`,
    [sourceRecordId]
  );
  
  // 2. Delete the existing ABSENT record for the target student (if any)
  if (targetRollNumber !== -1) {
    await db.runAsync(
      `DELETE FROM offline_attendance_records 
       WHERE session_id = ? AND student_id = ? AND id != ?`,
      [sessionId, targetStudentId, sourceRecordId]
    );
  }

  // 3. Update the source record to point to the new student
  const status = targetRollNumber === -1 ? 'MANUAL' : 'PRESENT';
  const finalStudentId = targetRollNumber === -1 ? `UNKNOWN_${uuidv4()}` : targetStudentId;
  
  await db.runAsync(
    `UPDATE offline_attendance_records
     SET student_id = ?, roll_number = ?, student_name = ?, status = ?, is_manual_override = 1
     WHERE id = ?`,
    [finalStudentId, targetRollNumber, targetStudentName, status, sourceRecordId]
  );
  
  // 4. Create a fallback ABSENT record for the original student (if they weren't unknown)
  if (sourceRecord && sourceRecord.roll_number !== -1) {
    const remaining = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM offline_attendance_records WHERE session_id = ? AND student_id = ?`,
      [sessionId, sourceRecord.student_id]
    );
    
    if (remaining && remaining.count === 0) {
      await db.runAsync(
        `INSERT INTO offline_attendance_records (
          id, session_id, student_id, roll_number, student_name, status, confidence, captured_at, is_manual_override
        ) VALUES (?, ?, ?, ?, ?, 'ABSENT', 0, ?, 0)`,
        [uuidv4(), sessionId, sourceRecord.student_id, sourceRecord.roll_number, sourceRecord.student_name, new Date().toISOString()]
      );
    }
  }
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
