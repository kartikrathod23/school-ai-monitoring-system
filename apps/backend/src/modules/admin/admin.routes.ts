import { Router } from "express";
import { createSchool,createStandard ,createSection,getSchools,getStandards,createStudent,createTeacher, getTeacher, getTeachers, getStudent, getStudents,updateStudent, updateTeacher, deleteStudent, deleteTeacher, getAllSchools,getSectionsByStandard, getDashboardStats, updateFaceStatus} from "./admin.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { authorise } from "../../common/middlewares/role.guard";
import { validate } from "../../common/middlewares/validate.middleware";
import { createTeacherSchema, createStudentSchema, createSchoolSchema } from "./admin.validation";

const router=Router();

router.post('/schools',authenticate,authorise(["ADMIN"]),validate(createSchoolSchema),createSchool);
router.get("/schools-list",authenticate,authorise(["ADMIN"]),getAllSchools);
router.post('/standards', authenticate,authorise(["ADMIN"]),createStandard);
router.get("/standards/:standardId/sections",authenticate,authorise(["ADMIN"]),getSectionsByStandard);
router.post("/sections", authenticate, authorise(["ADMIN"]), createSection);
router.get("/schools", authenticate, authorise(["ADMIN"]), getSchools);
router.get("/schools/:schoolId/standards",authenticate,authorise(["ADMIN"]),getStandards);

router.post("/teachers", authenticate, authorise(["ADMIN"]),validate(createTeacherSchema),createTeacher);
router.post("/students",authenticate, authorise(["ADMIN"]),validate(createStudentSchema),createStudent);

router.get("/teachers",authenticate,authorise(["ADMIN"]),getTeachers);
router.get("/students", authenticate, authorise(["ADMIN"]), getStudents);
router.get("/teachers/:id", authenticate, authorise(["ADMIN"]), getTeacher);
router.get("/students/:id", authenticate, authorise(["ADMIN"]),getStudent);


router.put("/students/:id",authenticate,authorise(["ADMIN"]),updateStudent);
router.put("/teachers/:id",authenticate,authorise(["ADMIN"]),updateTeacher);

// DELETE
router.delete("/students/:id",authenticate,authorise(["ADMIN"]),deleteStudent);
router.delete("/teachers/:id",authenticate,authorise(["ADMIN"]),deleteTeacher);

// dashboard stats
router.get("/dashboard",authenticate,authorise(["ADMIN"]),getDashboardStats);

// update face statsu
router.patch("/students/:id/face-status",authenticate,authorise(["ADMIN"]),updateFaceStatus);

export default router;