import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from './modules/admin/admin.routes';
import teacherRoutes from './modules/teachers/teacher.routes';
import { errorHandler } from './common/middlewares/error.middleware';
import path from "path";
import faceOnboardingRoutes from "./modules/face-onboarding/faceOnboarding.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import mealRoutes from "./modules/meal/meal.routes";
import modelSyncRoutes from "./modules/model-sync/modelSync.routes";

dotenv.config();

import fs from "fs";

// Initialize base models for local development/first-time setup
const initBaseModels = () => {
  if (process.env.USE_LOCAL_UPLOAD !== "true") return;

  const uploadsModelsDir = path.join(__dirname, "../uploads/models");
  if (!fs.existsSync(uploadsModelsDir)) {
    fs.mkdirSync(uploadsModelsDir, { recursive: true });
  }

  const baseModels = ["Det_Retina_Net.onnx", "Rec_Mobile_Net.onnx"];
  const sourceDir = path.join(__dirname, "../../models");

  baseModels.forEach((modelName) => {
    const sourcePath = path.join(sourceDir, modelName);
    const destPath = path.join(uploadsModelsDir, modelName);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      console.log(`[Init] Copying base model ${modelName} to uploads folder...`);
      fs.copyFileSync(sourcePath, destPath);
    }
  });
};

initBaseModels();

const app = express();

app.use(cors());
// Increase JSON limit to 50mb — offline sync sends base64 crop images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/auth", authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/face-onboarding", faceOnboardingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/meal", mealRoutes);
app.use("/api/model-sync", modelSyncRoutes);

app.use(errorHandler);

app.get('/', (req, res) => {
  res.send("API is Running!");
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

