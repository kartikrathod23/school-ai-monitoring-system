/**
 * services/syncManager.service.ts
 * Background/foreground sync coordinator. Uploads PENDING_SYNC sessions to the server.
 *
 * Reads crop images from the local filesystem (saved during offline attendance)
 * and sends them as base64 to the backend along with the 512-dim embedding vectors.
 */

import axios from "axios";
import { getPendingSyncSessions, getSessionRecords, updateSessionStatus } from "../db/offlineAttendance";
import { OfflineSyncPayload } from "../types/attendance.types";
import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "../lib/api";
import { getPendingMealSyncSessions, updateMealSessionStatus } from "../db/offlineMeal";

export const syncOfflineMeals = async (token: string): Promise<void> => {
  console.log("[SyncManager] Starting meal sync check...");

  const pendingSessions = await getPendingMealSyncSessions();
  if (pendingSessions.length === 0) {
    console.log("[SyncManager] No pending meal sessions to sync.");
    return;
  }

  console.log(`[SyncManager] Found ${pendingSessions.length} meal sessions to sync.`);

  let hasErrors = false;
  let lastError: any = null;

  for (const session of pendingSessions) {
    try {
      await updateMealSessionStatus(session.id, "SYNCING");

      const payload = {
        sectionId: session.sectionId,
        date: session.date,
        deviceId: session.deviceId,
        detectorVersion: session.detectorVersion,
        totalDetected: session.totalDetected,
      };

      const response = await axios.post(
        `${API_URL}/meal/offline-sync`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await updateMealSessionStatus(session.id, "SYNCED", response.data.data.sessionId);
        console.log(`[SyncManager] Meal Session ${session.id} synced successfully.`);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err: any) {
      hasErrors = true;
      lastError = err;
      const detail = err.response?.data?.message || err.message;
      console.warn(`[SyncManager] Failed to sync meal session ${session.id}:`, detail);
      await updateMealSessionStatus(session.id, "SYNC_FAILED");
    }
  }

  if (hasErrors) {
    throw lastError;
  }
};

export const syncOfflineAttendance = async (token: string): Promise<void> => {
  console.log("[SyncManager] Starting sync check...");

  const pendingSessions = await getPendingSyncSessions();
  if (pendingSessions.length === 0) {
    console.log("[SyncManager] No pending sessions to sync.");
    return;
  }

  console.log(`[SyncManager] Found ${pendingSessions.length} sessions to sync.`);

  let hasErrors = false;
  let lastError: any = null;

  for (const session of pendingSessions) {
    try {
      await updateSessionStatus(session.id, "SYNCING");

      const records = await getSessionRecords(session.id);

      // Build the payload — read each crop from the local filesystem
      const syncRecords = await Promise.all(
        records.map(async (r) => {
          let cropBase64: string | undefined;

          if (r.cropImagePath) {
            try {
              // expo-file-system/legacy accepts the string "base64" as encoding
              cropBase64 = await FileSystem.readAsStringAsync(r.cropImagePath, {
                encoding: "base64" as any,
              });
            } catch {
              console.warn(`[SyncManager] Could not read crop ${r.cropImagePath}`);
            }
          }

          return {
            studentId: r.studentId,
            rollNumber: r.rollNumber,
            status: r.status,
            confidence: r.confidence,
            cropImageBase64: cropBase64,
            embeddingVector: r.embeddingVector, // 512-dim — stored for NN retraining
            capturedAt: r.capturedAt,
          };
        })
      );

      const payload: OfflineSyncPayload = {
        sectionId: session.sectionId,
        date: session.date,
        deviceId: session.deviceId,
        backboneVersion: session.backboneVersion,
        classifierVersion: session.classifierVersion,
        records: syncRecords,
      };

      const response = await axios.post(
        `${API_URL}/attendance/offline-sync`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await updateSessionStatus(session.id, "SYNCED", {
          syncedAt: new Date().toISOString(),
          serverSessionId: response.data.data.sessionId,
        });
        console.log(`[SyncManager] Session ${session.id} synced successfully.`);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err: any) {
      hasErrors = true;
      lastError = err;
      const detail = err.response?.data?.message || err.message;
      console.warn(`[SyncManager] Failed to sync session ${session.id}:`, detail);

      if (detail === "Section not assigned to this teacher") {
        console.warn(`[SyncManager] Skipping session ${session.id} as the section is no longer assigned.`);
        await updateSessionStatus(session.id, "SYNC_FAILED");
      } else {
        await updateSessionStatus(session.id, "SYNC_FAILED");
      }
    }
  }

  if (hasErrors) {
    throw lastError;
  }
};
