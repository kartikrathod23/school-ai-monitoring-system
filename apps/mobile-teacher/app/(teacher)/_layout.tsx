import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/src/store/auth.store";

export default function TeacherLayout() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== "TEACHER") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}