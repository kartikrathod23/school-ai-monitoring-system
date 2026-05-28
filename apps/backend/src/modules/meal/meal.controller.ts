import { Request, Response } from "express";
import {
  createMealSessionService,
  getMealSessionService,
  finalizeMealSessionService,
} from "./meal.service";

export const createMealSession = async (
  req:any,
  res:Response
) => {
  try {
    const data = await createMealSessionService(req.user.userId,req.body,req.files as Express.Multer.File[]);
    return res.status(201).json({
      success:true,
      message:"Meal session started",
      data,
    });

  } catch (error:any) {
    return res.status(400).json({
      success:false,
      message:error.message,
    });
  }
};

export const getMealSession = async (
  req:Request,
  res:Response
) => {
  try {
    const sessionId =req.params.sessionId as string;
    const data =await getMealSessionService(sessionId);
    return res.status(200).json({
      success:true,
      data,
    });

  } catch (error:any) {
    return res.status(400).json({
      success:false,
      message:error.message,
    });
  }
};

export const finalizeMealSession = async (
  req:Request,
  res:Response
) => {
  try {
    const sessionId = req.params.sessionId as string;
    const data =await finalizeMealSessionService(sessionId);
    return res.status(200).json({
      success:true,
      data,
    });

  } catch (error:any) {
    return res.status(400).json({
      success:false,
      message:error.message,
    });
  }
};