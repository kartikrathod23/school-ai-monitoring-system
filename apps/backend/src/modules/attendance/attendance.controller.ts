import { Request, Response }from "express";
import {
  createAttendanceService,
  getAttendanceSessionService,
  finalizeAttendanceService,
  updateAttendanceRecordService,
  getAttendanceHistoryService
} from "./attendance.service";
import { offlineSyncService, OfflineSyncPayload } from "./offlineSync.service";


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


export const getAttendanceHistory =
  async (req:any,res:Response) => {

    try {

      const data =
        await getAttendanceHistoryService(
          req.user.userId
        );

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

// POST /attendance/offline-sync
// Receives an offline attendance batch from the teacher mobile app.
// Creates the AttendanceSession + records + stores crop images & 512-dim embeddings.
export const offlineSync = async (req: any, res: Response) => {
  try {
    const payload: OfflineSyncPayload = req.body;

    if (!payload.sectionId || !payload.date || !payload.records?.length) {
      return res.status(400).json({
        success: false,
        message: "sectionId, date, and records are required",
      });
    }

    const data = await offlineSyncService(req.user.userId, payload);

    return res.status(201).json({
      success: true,
      message: "Offline attendance synced successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /attendance/sync-status/:sessionId
// Lets the app confirm a previously synced session was accepted.
export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const data = await getAttendanceSessionService(sessionId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: data.id,
        status: data.status,
        isOfflineSync: (data as any).isOfflineSync,
        recordCount: data.records.length,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};