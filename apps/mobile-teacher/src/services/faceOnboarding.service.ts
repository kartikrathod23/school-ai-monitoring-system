import { api } from "@/src/lib/api";

export const uploadFaceImages = async (formData: FormData) => {
  const response = await api.post("/face-onboarding",formData,{
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};