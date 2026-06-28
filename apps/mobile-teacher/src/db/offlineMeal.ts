import { getDb } from "./localDb";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { Platform } from "react-native";

export interface OfflineMealSession {
  id: string;
  sectionId: string;
  date: string;
  status: "PENDING_SYNC" | "SYNCING" | "SYNCED" | "SYNC_FAILED";
  totalDetected: number;
  detectorVersion?: string;
  deviceId: string;
  createdAt: string;
  syncedAt?: string;
  serverSessionId?: string;
}

const mapSession = (row: any): OfflineMealSession => ({
  id: row.id,
  sectionId: row.section_id,
  date: row.date,
  status: row.status,
  totalDetected: row.total_detected,
  detectorVersion: row.detector_version,
  deviceId: row.device_id,
  createdAt: row.created_at,
  syncedAt: row.synced_at,
  serverSessionId: row.server_session_id,
});

export const createOfflineMealSession = async (
  sectionId: string,
  totalDetected: number,
  detectorVersion?: string
): Promise<string> => {
  const db = getDb();
  const id = uuidv4();
  const date = new Date().toISOString().split("T")[0];
  const createdAt = new Date().toISOString();
  const deviceId = Platform.OS + "-" + "device";

  await db.runAsync(
    `INSERT INTO offline_meal_sessions 
      (id, section_id, date, status, total_detected, detector_version, device_id, created_at)
     VALUES (?, ?, ?, 'PENDING_SYNC', ?, ?, ?, ?)`,
    [id, sectionId, date, totalDetected, detectorVersion || null, deviceId, createdAt]
  );

  return id;
};

export const getOfflineMealSessionById = async (
  id: string
): Promise<OfflineMealSession | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM offline_meal_sessions WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return mapSession(row);
};

export const getPendingMealSyncSessions = async (): Promise<OfflineMealSession[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_meal_sessions
     WHERE status IN ('PENDING_SYNC', 'SYNC_FAILED', 'SYNCING')
     ORDER BY created_at ASC`
  );
  return rows.map(mapSession);
};

export const updateMealSessionStatus = async (
  sessionId: string,
  status: "PENDING_SYNC" | "SYNCING" | "SYNCED" | "SYNC_FAILED",
  serverSessionId?: string
): Promise<void> => {
  const db = getDb();
  const now = new Date().toISOString();

  if (status === "SYNCED") {
    await db.runAsync(
      `UPDATE offline_meal_sessions
       SET status = ?, synced_at = ?, server_session_id = ?
       WHERE id = ?`,
      [status, now, serverSessionId || null, sessionId]
    );
  } else {
    await db.runAsync(
      `UPDATE offline_meal_sessions
       SET status = ?
       WHERE id = ?`,
      [status, sessionId]
    );
  }
};

export const getAllMealSessions = async (): Promise<OfflineMealSession[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_meal_sessions ORDER BY created_at DESC`
  );
  return rows.map(mapSession);
};
