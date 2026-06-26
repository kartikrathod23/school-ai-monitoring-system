import "../global.css";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/src/store/auth.store";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <Toast />
    </SafeAreaProvider>
  );
}