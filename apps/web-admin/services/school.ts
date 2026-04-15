import api from "./api";

export const createSchool = async (data: any) => {
  const res = await api.post("/admin/schools", data);
  return res.data;
};

export const getSchools = async () => {
  const res = await api.get("/admin/schools");
  return res.data.data;
};

export const deleteSchoolApi = async (id: string) => {
  const res = await api.delete(`/admin/schools/${id}`);
  return res.data;
};


export const updateSchoolApi = async (id: string, data: any) => {
  const res = await api.put(`/admin/schools/${id}`, data);
  return res.data;
};