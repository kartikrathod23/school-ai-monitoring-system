import { Response } from "express";

import {
  getStudentMeService,
  getTodayAttendanceService,
  getMonthlySummaryService,
  getMonthlyAttendanceService,
  getRecentAttendanceService,
  getAttendanceStatisticsService,
} from "./student.service";

export const getStudentMe = async (
  req: any,
  res: Response
) => {
  try {

    const data =
      await getStudentMeService(
        req.user.userId
      );

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

export const getTodayAttendance =
  async (
    req: any,
    res: Response
  ) => {
    try {

      const data =
        await getTodayAttendanceService(
          req.user.userId
        );

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

export const getMonthlySummary =
  async (
    req: any,
    res: Response
  ) => {
    try {

      const {
        month,
        year,
      } = req.query;

      const data =
        await getMonthlySummaryService(
          req.user.userId,
          Number(month),
          Number(year)
        );

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

export const getMonthlyAttendance =
  async (
    req: any,
    res: Response
  ) => {
    try {

      const {
        month,
        year,
      } = req.query;

      const data =
        await getMonthlyAttendanceService(
          req.user.userId,
          Number(month),
          Number(year)
        );

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

export const getRecentAttendance =
  async (
    req: any,
    res: Response
  ) => {
    try {

      const data =
        await getRecentAttendanceService(
          req.user.userId
        );

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

export const getAttendanceStatistics =
  async (
    req: any,
    res: Response
  ) => {
    try {

      const data =
        await getAttendanceStatisticsService(
          req.user.userId
        );

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