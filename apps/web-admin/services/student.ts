import api from "./api";

// CREATE
export const createStudent = async (data: any) => {
  const res = await api.post("/admin/students", data);
  return res.data;
};

// GET (with filters, pagination)
export const getStudents = async (params: any) => {
  const res = await api.get("/admin/students", { params });
  return res.data.data;
};

// GET SINGLE (optional, for future)
export const getStudent = async (id: string) => {
  const res = await api.get(`/admin/students/${id}`);
  return res.data.data;
};

// UPDATE
export const updateStudent = async (id: string, data: any) => {
  const res = await api.put(`/admin/students/${id}`, data);
  return res.data;
};

// DELETE
export const deleteStudent = async (id: string) => {
  const res = await api.delete(`/admin/students/${id}`);
  return res.data;
};