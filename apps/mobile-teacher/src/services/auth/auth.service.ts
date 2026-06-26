import { api } from "../../lib/api";

export const loginUser = async (identifier: string,password: string) => {
  try {
    const response = await api.post("/auth/login",{identifier, password,});
    return response.data;
  } catch (error: any) {

    console.log("FULL LOGIN ERROR:", error);

    if(error.response){
      throw new Error(error.response.data?.message || "Login failed");
    }

    if(error.request){
      throw new Error("Cannot connect to server. Please check your internet connection.");
    }

    throw new Error("Unexpected error occurred");
  }
};