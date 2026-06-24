/**
 * services/syncManager.service.ts
 * Background/foreground sync coordinator. Uploads PENDING_SYNC sessions to the server.
 */

import axios from "axios";
import { getPendingSyncSessions, getSessionRecords, updateSessionStatus } from "../db/offlineAttendance";
import { OfflineSyncPayload, OfflineAttendanceRecord } from "../types/attendance.types";
import * as FileSystem from "expo-file-system/legacy";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.100:5000/api";

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
      
      // Prepare payload
      const payload: OfflineSyncPayload = {
        sectionId: session.sectionId,
        date: session.date,
        deviceId: session.deviceId,
        backboneVersion: session.backboneVersion,
        classifierVersion: session.classifierVersion,
        records: await Promise.all(records.map(async (r) => {
          let cropBase64: string | undefined;
          if (r.cropImagePath) {
            try {
              cropBase64 = await FileSystem.readAsStringAsync(r.cropImagePath, { encoding: FileSystem.EncodingType.Base64 });
            } catch (err) {
              console.warn(`[SyncManager] Failed to read crop image ${r.cropImagePath}`);
            }
          }
          
          return {
            studentId: r.studentId,
            rollNumber: r.rollNumber,
            status: r.status,
            confidence: r.confidence,
            cropImageBase64: cropBase64,
            embeddingVector: r.embeddingVector, // 512-dim
            capturedAt: r.capturedAt,
          };
        }))
      };

      // Upload to server
      const response = await axios.post(`${API_BASE}/attendance/offline-sync`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      console.error(`[SyncManager] Failed to sync session ${session.id}:`, err.message);
      await updateSessionStatus(session.id, "SYNC_FAILED");
    }
  }
};
