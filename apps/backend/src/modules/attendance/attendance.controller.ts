import { Request, Response }from "express";
import {
  createAttendanceService,
  getAttendanceSessionService,
  finalizeAttendanceService,
  updateAttendanceRecordService,
} from "./attendance.service";

export const createAttendance =async (req: any,res: Response) => {
    try {
      const data = await createAttendanceService(req.user.userId,req.body,req.files as Express.Multer.File[]);
      return res.status(201).json({
        success: true,
        message:
          "Attendance started",
        data,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
};

export const getAttendanceSession =async (req: Request,res: Response) => {
    try {
        const sessionId=req.params.sessionId as string
      const data = await getAttendanceSessionService(sessionId);

      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
};

export const finalizeAttendance =async (req: Request,res: Response) => {
    try {
        const sessionId=req.params.sessionId as string
      const data = await finalizeAttendanceService(sessionId);
      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
};

export const updateAttendanceRecord =async (req: Request,res: Response) => {
    try {
        const recordId=req.params.recordId as string
        const data =await updateAttendanceRecordService(recordId,req.body);
        
      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
};