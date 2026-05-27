import { api } from "@/src/lib/api";

export const updateAttendanceRecord =
  async (
    recordId: string,
    status: string
  ) => {

    const response =
      await api.patch(

        `/attendance/records/${recordId}`,

        {
          status,
        }
      );

    return response.data;
  };

export const finalizeAttendance =
  async (sessionId: string) => {

    const response =
      await api.patch(
        `/attendance/${sessionId}/finalize`
      );

    return response.data;
  };