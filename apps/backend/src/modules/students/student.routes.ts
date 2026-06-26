import { Router } from "express";

import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";

import {
  getStudentMe,
  getTodayAttendance,
  getMonthlySummary,
  getMonthlyAttendance,
  getRecentAttendance,
  getAttendanceStatistics,
} from "./student.controller";

const router = Router();

router.use(
  authenticate,
  authorise(["STUDENT"])
);

router.get(
  "/me",
  getStudentMe
);

router.get(
  "/today-attendance",
  getTodayAttendance
);

router.get(
  "/monthly-summary",
  getMonthlySummary
);

router.get(
  "/monthly-attendance",
  getMonthlyAttendance
);

router.get(
  "/recent-attendance",
  getRecentAttendance
);

router.get(
  "/statistics",
  getAttendanceStatistics
);

export default router;