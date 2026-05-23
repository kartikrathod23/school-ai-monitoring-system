import { Request, Response } from "express";

import { createFaceOnboardingService }
from "./faceOnboarding.service";

export const createFaceOnboarding = async (
  req: any,
  res: Response
) => {
  try {
    const data =await createFaceOnboardingService(req.user.userId,req.body,req.files as Express.Multer.File[]);
    
    return res.status(201).json({
      success: true,
      message: "Face onboarding completed",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};