import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from './modules/admin/admin.routes';
import teacherRoutes from './modules/teachers/teacher.routes'
import { errorHandler } from './common/middlewares/error.middleware';
import path from "path";
import faceOnboardingRoutes from "./modules/face-onboarding/faceOnboarding.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import mealRoutes from "./modules/meal/meal.routes";

dotenv.config();

const app=express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use('/api/admin',adminRoutes);
app.use("/api/teacher",teacherRoutes)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/face-onboarding",faceOnboardingRoutes);
app.use("/api/attendance",attendanceRoutes);
app.use("/api/meal",mealRoutes);

app.use(errorHandler);


app.get('/',(req,res)=>{
    res.send("API is Running! ");
})

const PORT = Number(process.env.PORT) || 5000

app.listen(PORT,"0.0.0.0",()=>{
    console.log(`Server running on port ${PORT}`);
})
