/**
 * db/localDb.ts
 * SQLite database initialization for offline attendance storage.
 *
 * Uses expo-sqlite (already in package.json as a transitive dep via expo).
 * Initializes all tables required for offline-first attendance:
 *   - offline_attendance_sessions
 *   - offline_attendance_records  (includes 512-dim embedding vector)
 *   - model_assets               (downloaded model metadata)
 *   - section_student_cache      (reference embeddings for inference)
 *
 * Call initLocalDb() once at app startup before any DB operations.
 */

import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error("DB not initialized. Call initLocalDb() first.");
  return db;
};

export const initLocalDb = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync("attendance_offline.db");

  // Enable WAL mode for better concurrent read performance
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.execAsync(`
    -- ─────────────────────────────────────────────────────────────
    -- Offline attendance sessions
    -- One row per attendance session captured while offline.
    -- ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS offline_attendance_sessions (
      id                  TEXT PRIMARY KEY,
      section_id          TEXT    NOT NULL,
      date                TEXT    NOT NULL,  -- "YYYY-MM-DD"
      status              TEXT    NOT NULL DEFAULT 'PENDING_SYNC',
        -- 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'SYNC_FAILED'
      backbone_version    TEXT    NOT NULL,
      classifier_version  TEXT    NOT NULL,
      device_id           TEXT    NOT NULL,
      created_at          TEXT    NOT NULL,
      synced_at           TEXT,              -- set when SYNCED
      server_session_id   TEXT               -- server's AttendanceSession.id
    );

    -- ─────────────────────────────────────────────────────────────
    -- Offline attendance records
    -- One row per student per session.
    -- embedding_vector: JSON string of 512-dim MobileFaceNet output.
    --   This is stored so the crop + embedding can be uploaded for
    --   NN retraining. The 40-dim classifier output is NOT stored.
    -- ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS offline_attendance_records (
      id                  TEXT PRIMARY KEY,
      session_id          TEXT    NOT NULL,
      student_id          TEXT    NOT NULL,
      roll_number         INTEGER NOT NULL,
      student_name        TEXT    NOT NULL,
      status              TEXT    NOT NULL,  -- 'PRESENT' | 'ABSENT' | 'MANUAL'
      confidence          REAL    NOT NULL DEFAULT 0,
      crop_image_path     TEXT,              -- local file path to face crop JPEG
      embedding_vector    TEXT,              -- JSON of 512-dim float array (for retraining)
      captured_at         TEXT    NOT NULL,
      is_manual_override  INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES offline_attendance_sessions(id) ON DELETE CASCADE
    );

    -- ─────────────────────────────────────────────────────────────
    -- Downloaded model assets
    -- Tracks which backbone + classifier are cached on device.
    -- ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS model_assets (
      id                  TEXT PRIMARY KEY,
      backbone_version    TEXT    NOT NULL,
      classifier_version  TEXT    NOT NULL,
      section_id          TEXT    NOT NULL,
      backbone_path       TEXT    NOT NULL,  -- local file path
      classifier_path     TEXT    NOT NULL,  -- local file path
      is_active           INTEGER NOT NULL DEFAULT 0,
      downloaded_at       TEXT    NOT NULL
    );

    -- ─────────────────────────────────────────────────────────────
    -- Section student cache
    -- All students in a section with their reference embeddings.
    -- Synced from GET /model-sync/embeddings/:sectionId.
    -- Used by the NN classifier for offline inference.
    -- embedding_vectors: JSON of array of 512-dim arrays.
    -- ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS section_student_cache (
      student_id          TEXT PRIMARY KEY,
      section_id          TEXT    NOT NULL,
      roll_number         INTEGER NOT NULL,
      first_name          TEXT    NOT NULL,
      last_name           TEXT    NOT NULL,
      face_status         TEXT    NOT NULL,
      embedding_vectors   TEXT    NOT NULL,  -- JSON array of 512-dim arrays
      cached_at           TEXT    NOT NULL
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_records_session_id
      ON offline_attendance_records(session_id);
    CREATE INDEX IF NOT EXISTS idx_records_student_id
      ON offline_attendance_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status
      ON offline_attendance_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_student_cache_section
      ON section_student_cache(section_id);
  `);

  console.log("[LocalDB] Initialized successfully.");
};
