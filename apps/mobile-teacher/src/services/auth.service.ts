import { api } from "../lib/api";

export const loginTeacher = async (identifier: string,password: string) => {
  try {
    const response = await api.post("/auth/login", {
      identifier,
      password,
    });

    console.log("LOGIN RESPONSE:", response.data);

    return response.data;
  } catch (error: any) {
    console.log(
      "LOGIN ERROR:",
      error?.response?.data || error.message
    );

    throw error;
  }
};