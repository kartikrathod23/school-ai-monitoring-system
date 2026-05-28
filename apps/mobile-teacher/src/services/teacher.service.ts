import { api } from "@/src/lib/api";

export const getTeacherProfile = async () => {
  const response = await api.get("/teacher/me");
  return response.data.data;
};

export const getDashboardSummary =async () => {
    return api.get("/teacher/dashboard-summary");
};