import { Router } from "express";
import {
  createMealSession,
  getMealSession,
  finalizeMealSession,
} from "./meal.controller";

import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";
import {uploadMealImages,} from "../../common/middlewares/uploadFace.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorise(["TEACHER"]),
  uploadMealImages.array("images",10),
  createMealSession
);

router.get(
  "/:sessionId",
  authenticate,
  authorise(["TEACHER"]),
  getMealSession
);

router.patch(
  "/:sessionId/finalize",
  authenticate,
  authorise(["TEACHER"]),
  finalizeMealSession
);

export default router;