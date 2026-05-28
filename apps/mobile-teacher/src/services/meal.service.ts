import { api } from "@/src/lib/api";

export const startMealSession = async (formData: FormData) => {
    return api.post(
        "/meal",
        formData,
        {
            headers: {
                "Content-Type":
                    "multipart/form-data",
            },
        }
    );
};

export const getMealSession = async (sessionId: string) => {

    return api.get(
        `/meal/${sessionId}`
    );
};

export const finalizeMealSession = async (sessionId: string) => {
    return api.patch(
        `/meal/${sessionId}/finalize`
    );
};