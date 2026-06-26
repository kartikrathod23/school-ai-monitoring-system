import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/src/store/auth.store";

export default function StudentLayout() {
  const user = useAuthStore((state) => state.user);

  if(!user){
    return <Redirect href="/login" />;
  }

  if(user.role !== "STUDENT"){
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