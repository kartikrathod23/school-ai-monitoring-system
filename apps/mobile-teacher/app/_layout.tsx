import "../global.css";

import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

import { initLocalDb } from "@/src/db/localDb";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";

export default function RootLayout() {
  const wasOfflineRef = useRef(false);
  const { token } = useAuthStore();

  // ── Initialize local SQLite database on first launch ────────────
  useEffect(() => {
    initLocalDb().catch((err) => {
      console.error("[Layout] Failed to initialize local DB:", err);
    });
  }, []);

  // ── Auto-sync when network reconnects ───────────────────────────
  // Only fires when the device transitions from offline → online.
  // This ensures offline attendance sessions get uploaded as soon
  // as connectivity is restored without any teacher action.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      if (!isConnected) {
        wasOfflineRef.current = true;
        return;
      }

      // Network just came back after being offline — trigger sync
      if (wasOfflineRef.current && token) {
        wasOfflineRef.current = false;
        console.log("[Layout] Network restored — triggering offline sync...");
        syncOfflineAttendance(token).catch((err) => {
          console.warn("[Layout] Auto-sync failed:", err.message);
        });
      }
    });

    return () => unsubscribe();
  }, [token]);

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