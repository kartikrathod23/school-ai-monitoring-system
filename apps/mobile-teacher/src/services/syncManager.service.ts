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

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.82:5000/api";

export const syncOfflineAttendance = async (token: string): Promise<void> => {
  console.log("[SyncManager] Starting sync check...");

  const pendingSessions = await getPendingSyncSessions();
  if (pendingSessions.length === 0) {
    console.log("[SyncManager] No pending sessions to sync.");
    return;
  }

  console.log(`[SyncManager] Found ${pendingSessions.length} sessions to sync.`);

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
        `${API_BASE}/attendance/offline-sync`,
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
      const detail = err.response?.data?.message || err.message;
      console.error(`[SyncManager] Failed to sync session ${session.id}:`, detail);

      if (detail === "Section not assigned to this teacher") {
        console.warn(`[SyncManager] Skipping session ${session.id} as the section is no longer assigned.`);
        await updateSessionStatus(session.id, "SYNC_FAILED");
        // We do not throw, allowing the loop to continue syncing other valid sessions
      } else {
        await updateSessionStatus(session.id, "SYNC_FAILED");
      }
    }
  }
};
