/**
 * types/attendance.types.ts
 * Shared TypeScript types for the offline attendance system.
 */

// ─────────────────────────────────────────────────────────────────
// Core attendance types
// ─────────────────────────────────────────────────────────────────

export type AttendanceStatus = "PRESENT" | "ABSENT" | "MANUAL";

export type SyncStatus =
  | "PENDING_SYNC"  // session captured offline, not yet uploaded
  | "SYNCING"       // currently uploading
  | "SYNCED"        // successfully uploaded to server
  | "SYNC_FAILED";  // upload failed (will retry)

// ─────────────────────────────────────────────────────────────────
// Offline attendance session stored in local SQLite
// ─────────────────────────────────────────────────────────────────

export interface OfflineAttendanceSession {
  id: string;                     // local UUID
  sectionId: string;
  date: string;                   // "YYYY-MM-DD"
  status: SyncStatus;
  backboneVersion: string;        // MobileFaceNet version used
  classifierVersion: string;      // NN classifier version used
  deviceId: string;
  createdAt: string;              // ISO timestamp
  syncedAt?: string;              // set when status = SYNCED
  serverSessionId?: string;       // set after successful sync
}

// ─────────────────────────────────────────────────────────────────
// One attendance record per student in an offline session
// ─────────────────────────────────────────────────────────────────

export interface OfflineAttendanceRecord {
  id: string;                     // local UUID
  sessionId: string;              // FK → OfflineAttendanceSession.id
  studentId: string;
  rollNumber: number;
  studentName: string;            // "FirstName LastName" for display
  status: AttendanceStatus;
  confidence: number;             // 0-1 from softmax
  cropImagePath?: string;         // local file path to the face crop
  // 512-dim MobileFaceNet embedding — stored for NN retraining
  // NOT the 40-dim classifier output (that is never stored)
  embeddingVector?: number[];
  capturedAt: string;             // ISO timestamp
  isManualOverride: boolean;      // teacher changed the AI decision
}

// ─────────────────────────────────────────────────────────────────
// Payload sent to POST /attendance/offline-sync
// ─────────────────────────────────────────────────────────────────

export interface OfflineSyncPayload {
  sectionId: string;
  date: string;
  deviceId: string;
  backboneVersion: string;
  classifierVersion: string;
  records: {
    studentId: string;
    rollNumber: number;
    status: AttendanceStatus;
    confidence: number;
    cropImageBase64?: string;   // base64-encoded face crop (for retraining)
    embeddingVector?: number[]; // 512-dim vector (for retraining)
    capturedAt: string;
  }[];
}

export interface OfflineSyncResponse {
  sessionId: string;
  totalRecords: number;
  present: number;
  absent: number;
  manual: number;
  cropsStored: number;
}
