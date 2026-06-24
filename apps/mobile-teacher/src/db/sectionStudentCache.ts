/**
 * db/sectionStudentCache.ts
 * CRUD for the section student cache (reference embeddings for offline inference).
 *
 * When synced from the server, each student entry contains their
 * stored 512-dim MobileFaceNet embeddings from onboarding.
 * These are used as reference vectors by the NN classifier / cosine
 * similarity fallback during offline attendance.
 */

import { getDb } from "./localDb";
import { CachedStudent } from "../types/model.types";

// ─────────────────────────────────────────────────────────────────
// Write / replace all students for a section
// ─────────────────────────────────────────────────────────────────

export const cacheSectionStudents = async (
  students: CachedStudent[]
): Promise<void> => {
  const db = getDb();

  for (const s of students) {
    await db.runAsync(
      `INSERT OR REPLACE INTO section_student_cache
         (student_id, section_id, roll_number, first_name, last_name,
          face_status, embedding_vectors, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.studentId,
        s.sectionId,
        s.rollNumber,
        s.firstName,
        s.lastName,
        s.faceStatus,
        JSON.stringify(s.embeddingVectors),
        s.cachedAt,
      ]
    );
  }

  console.log(`[StudentCache] Cached ${students.length} students for section ${students[0]?.sectionId}`);
};

// ─────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────

export const getCachedStudents = async (
  sectionId: string
): Promise<CachedStudent[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM section_student_cache
     WHERE section_id = ?
     ORDER BY roll_number ASC`,
    [sectionId]
  );
  return rows.map(mapStudent);
};

export const getCachedStudent = async (
  studentId: string
): Promise<CachedStudent | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM section_student_cache WHERE student_id = ?`,
    [studentId]
  );
  return row ? mapStudent(row) : null;
};

export const getSectionCacheTimestamp = async (
  sectionId: string
): Promise<string | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT cached_at FROM section_student_cache
     WHERE section_id = ?
     ORDER BY cached_at DESC LIMIT 1`,
    [sectionId]
  );
  return row?.cached_at ?? null;
};

// ─────────────────────────────────────────────────────────────────
// Row mapper
// ─────────────────────────────────────────────────────────────────

const mapStudent = (row: any): CachedStudent => ({
  studentId: row.student_id,
  sectionId: row.section_id,
  rollNumber: row.roll_number,
  firstName: row.first_name,
  lastName: row.last_name,
  faceStatus: row.face_status,
  embeddingVectors: JSON.parse(row.embedding_vectors),
  cachedAt: row.cached_at,
});
