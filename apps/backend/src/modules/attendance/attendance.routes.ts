import { Router } from "express";
import {
  createAttendance,
  getAttendanceSession,
  finalizeAttendance,
  updateAttendanceRecord,
  getAttendanceHistory,
  offlineSync,
  getSyncStatus,
} from "./attendance.controller";

import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";
import { uploadAttendanceImages } from "../../common/middlewares/uploadFace.middleware";

const router = Router();

// ── Online attendance (existing) ──────────────────────────────────
router.post(
  "/",
  authenticate,
  authorise(["TEACHER"]),
  uploadAttendanceImages.array("images", 10),
  createAttendance
);

router.get("/history", authenticate, authorise(["TEACHER"]), getAttendanceHistory);

router.get("/:sessionId", authenticate, authorise(["TEACHER"]), getAttendanceSession);

router.patch("/:sessionId/finalize", authenticate, authorise(["TEACHER"]), finalizeAttendance);

router.patch("/records/:recordId", authenticate, authorise(["TEACHER"]), updateAttendanceRecord);

// ── Offline attendance sync (new) ─────────────────────────────────
// POST  /attendance/offline-sync      — submit offline batch from mobile
// GET   /attendance/sync-status/:id   — check if a session was accepted
router.post(
  "/offline-sync",
  authenticate,
  authorise(["TEACHER"]),
  offlineSync
);

router.get(
  "/sync-status/:sessionId",
  authenticate,
  authorise(["TEACHER"]),
  getSyncStatus
);

export default router;