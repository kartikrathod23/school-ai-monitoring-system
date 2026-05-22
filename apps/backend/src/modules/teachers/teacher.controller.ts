import { Request, Response } from "express";

import { getTeacherMeService, getTeacherSectionsService,getSectionStudentsService,verifyTeacherLocationService} from "./teacher.service";

export const getTeacherMe = async (req: any, res: Response) => {
  try {
    const data = await getTeacherMeService(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Teacher profile fetched",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTeacherSections = async (req: any, res: Response) => {
  try {
    const data = await getTeacherSectionsService(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Teacher sections fetched",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSectionStudents = async (req: any, res: Response) => {
  try {
    const { sectionId } = req.params;

    const data = await getSectionStudentsService(
      req.user.userId,
      sectionId
    );

    return res.status(200).json({
      success: true,
      message: "Students fetched",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const verifyTeacherLocation = async (
  req: any,
  res: Response
) => {
  try {
    const { latitude, longitude } = req.body;

    const data =
      await verifyTeacherLocationService(
        req.user.userId,
        latitude,
        longitude
      );

    return res.status(200).json({
      success: true,
      message: "Location verified",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};