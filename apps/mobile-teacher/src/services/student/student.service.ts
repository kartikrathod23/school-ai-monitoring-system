import { api } from "@/src/lib/api";

export const getStudentProfile = async () => {
  return api.get("/student/me");
};

export const getTodayAttendance = async () => {
  return api.get("/student/today-attendance");
};

export const getMonthlySummary = async (
  month: number,
  year: number
) => {
  return api.get(
    `/student/monthly-summary?month=${month}&year=${year}`
  );
};

export const getMonthlyAttendance = async (
  month: number,
  year: number
) => {
  return api.get(
    `/student/monthly-attendance?month=${month}&year=${year}`
  );
};

export const getRecentAttendance = async () => {
  return api.get("/student/recent-attendance");
};

export const getAttendanceStatistics = async () => {
  return api.get("/student/statistics");
};