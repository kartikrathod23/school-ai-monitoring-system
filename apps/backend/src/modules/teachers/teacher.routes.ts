import { Router } from "express";
import { getTeacherMe,getTeacherSections, getSectionStudents,verifyTeacherLocation} from "./teacher.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";
import { validate } from "../../common/middlewares/validate.middleware";

const router = Router();

router.get("/me",authenticate,authorise(["TEACHER"]),getTeacherMe);
router.get("/sections", authenticate,authorise(["TEACHER"]), getTeacherSections);
router.get("/sections/:sectionId/students",authenticate,authorise(["TEACHER"]),getSectionStudents);
router.post("/verify-location",authenticate,authorise(["TEACHER"]),verifyTeacherLocation);

export default router;