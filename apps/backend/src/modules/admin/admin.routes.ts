import { Router } from "express";
import { createSchool,createStandard ,createSection,getSchools,getStandards,createStudent,createTeacher} from "./admin.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";

const router=Router();

router.post('/schools',authenticate,authorise(["ADMIN"]),createSchool);
router.post('/standards', authenticate,authorise(["ADMIN"]),createStandard);
router.post("/sections", authenticate, authorise(["ADMIN"]), createSection);
router.get("/schools", authenticate, authorise(["ADMIN"]), getSchools);
router.get("/schools/:schoolId/standards",authenticate,authorise(["ADMIN"]),getStandards);

router.post("/teachers", authenticate, authorise(["ADMIN"]),createTeacher);
router.post("/students",authenticate, authorise(["ADMIN"]),createStudent);

export default router;