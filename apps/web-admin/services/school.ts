import api from "./api";

export const createSchool = async (data: any) => {
  const res = await api.post("/admin/schools", data);
  return res.data;
};

export const getSchools = async () => {
  const res = await api.get("/admin/schools");
  return res.data.data;
};