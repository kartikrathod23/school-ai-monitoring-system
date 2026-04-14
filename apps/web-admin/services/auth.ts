import api from "./api";

export const loginApi = async (data: {
  identifier: string;
  password: string;
}) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};