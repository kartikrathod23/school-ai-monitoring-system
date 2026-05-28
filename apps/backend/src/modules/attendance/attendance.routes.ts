import { Router } from "express";
import {
  createAttendance,
  getAttendanceSession,
  finalizeAttendance,
  updateAttendanceRecord,
  getAttendanceHistory
}from "./attendance.controller";

import { authenticate }from "../../common/middlewares/auth.middleware";
import { authorise }from "../../common/middlewares/role.guard";
import { uploadAttendanceImages }from "../../common/middlewares/uploadFace.middleware";

const router = Router();

router.post("/",authenticate,authorise(["TEACHER"]),uploadAttendanceImages.array("images",10),createAttendance);

router.get(
  "/history",
  authenticate,
  authorise(["TEACHER"]),
  getAttendanceHistory
);

router.get("/:sessionId",authenticate,authorise(["TEACHER"]),getAttendanceSession);

router.patch("/:sessionId/finalize",authenticate,authorise(["TEACHER"]),finalizeAttendance);

router.patch("/records/:recordId",authenticate,authorise(["TEACHER"]),updateAttendanceRecord);


export default router;