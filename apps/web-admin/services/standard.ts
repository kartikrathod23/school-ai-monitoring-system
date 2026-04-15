import api from "./api";

export const getSchoolsListApi = async () => {
  const res = await api.get("/admin/schools-list");
  return res.data;
};

export const getStandardsBySchoolApi = async (schoolId: string) => {
  const res = await api.get(`/admin/schools/${schoolId}/standards`);
  return res.data;
};

export const getSectionsByStandardApi = async (standardId: string) => {
  const res = await api.get(`/admin/standards/${standardId}/sections`);
  return res.data;
};

export const createStandardApi = async (data: {
  name: string;
  schoolId: string;
}) => {
  const res = await api.post("/admin/standards", data);
  return res.data;
};

export const createSectionApi = async (data: {
  name: string;
  standardId: string;
}) => {
  const res = await api.post("/admin/sections", data);
  return res.data;
};


export const updateStandardApi = (id: string, name: string) =>
  api.put(`/admin/standards/${id}`, { name });

export const deleteStandardApi = (id: string) =>
  api.delete(`/admin/standards/${id}`);

export const updateSectionApi = (id: string, name: string) =>
  api.put(`/admin/sections/${id}`, { name });

export const deleteSectionApi = (id: string) =>
  api.delete(`/admin/sections/${id}`);