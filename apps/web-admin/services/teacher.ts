import api from "./api";

export const getSchools = async () => {
  const res = await api.get("/admin/schools-list");
  return res.data.data;
};

export const getStandards = async (schoolId: string) => {
  const res = await api.get(`/admin/schools/${schoolId}/standards`);
  return res.data.data;
};

export const getSections = async (standardId: string) => {
  const res = await api.get(`/admin/standards/${standardId}/sections`);
  return res.data.data;
};

export const createTeacher = async (data: any) => {
  const res = await api.post("/admin/teachers", data);
  return res.data;
};

export const getTeachers = async (params: any) => {
  const res = await api.get("/admin/teachers", { params });
  return res.data.data;
};

export const deleteTeacher = async (id: string) => {
  const res = await api.delete(`/admin/teachers/${id}`);
  return res.data;
};

export const updateTeacher = async (id: string, data: any) => {
  const res = await api.put(`/admin/teachers/${id}`, data);
  return res.data;
};