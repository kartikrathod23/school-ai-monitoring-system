import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";
import { uploadFaceImages } from "../../common/middlewares/uploadFace.middleware";
import { createFaceOnboarding } from "./faceOnboarding.controller";

const router = Router();

router.post("/",authenticate, authorise(["TEACHER"]),uploadFaceImages.array("images", 10),createFaceOnboarding);

export default router;