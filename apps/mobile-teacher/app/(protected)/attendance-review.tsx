import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";

import {
  getOfflineSessionById,
  getSessionRecords,
  updateRecordStatus,
} from "@/src/db/offlineAttendance";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";
import { OfflineAttendanceSession, OfflineAttendanceRecord } from "@/src/types/attendance.types";

export default function AttendanceReviewScreen() {
  const { sessionId } = useLocalSearchParams();
  const { token } = useAuthStore();
  
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [session, setSession] = useState<OfflineAttendanceSession | null>(null);
  const [records, setRecords] = useState<OfflineAttendanceRecord[]>([]);

  const loadData = async () => {
    try {
      if (!sessionId) return;
      const sess = await getOfflineSessionById(sessionId as string);
      const recs = await getSessionRecords(sessionId as string);
      setSession(sess);
      setRecords(recs);
    } catch (error) {
      console.log("Error loading session from SQLite:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh periodically in case background sync updates the session status
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleStatusChange = async (recordId: string, status: "PRESENT" | "ABSENT") => {
    try {
      await updateRecordStatus(recordId, status);
      await loadData();
    } catch (error) {
      console.log(error);
    }
  };

  const handleManualSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await syncOfflineAttendance(token);
      await loadData();
    } catch (err) {
      console.log(err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !session) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  const present = records.filter((r) => r.status === "PRESENT");
  const review = records.filter((r) => r.status === "MANUAL");

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <View className="flex-row items-center justify-between bg-[#2563EB] px-4 py-3">
        <TouchableOpacity onPress={() => router.navigate("/(protected)/dashboard")} className="flex-row items-center">
          <Ionicons name="home" size={18} color="white" />
          <Text className="ml-1 text-white"> Home</Text>
        </TouchableOpacity>

        <Text className="text-lg font-bold text-white">Review Attendance</Text>

        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            source={require("../../assets/images/uitb-logo.jpg")}
            className="h-10 w-10"
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-3xl bg-[#2563EB] p-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-white">Local Inference Result</Text>
            <View className={`px-2 py-1 rounded-full ${session.status === "SYNCED" ? "bg-green-400" : session.status === "SYNCING" ? "bg-yellow-400" : "bg-red-400"}`}>
              <Text className="text-xs font-bold text-white">
                {session.status === "SYNCED" ? "Synced" : "Offline"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row justify-between">
            <View className="w-[31%] rounded-2xl bg-[#4F7EFF] py-4">
              <Text className="text-center text-2xl font-bold text-white">{records.length}</Text>
              <Text className="text-center text-white">Total</Text>
            </View>

            <View className="w-[31%] rounded-2xl bg-[#10B981] py-4">
              <Text className="text-center text-2xl font-bold text-white">{present.length}</Text>
              <Text className="text-center text-white">Present</Text>
            </View>

            <View className="w-[31%] rounded-2xl bg-[#F59E0B] py-4">
              <Text className="text-center text-2xl font-bold text-white">{review.length}</Text>
              <Text className="text-center text-white">Review</Text>
            </View>
          </View>
        </View>

        {review.length > 0 && (
          <View className="mt-4 rounded-2xl border border-[#FCD34D] bg-[#FEF3C7] p-4">
            <Text className="font-semibold text-[#92400E]">Human Verification Required</Text>
            <Text className="mt-1 text-sm text-[#92400E]">Review students with low confidence</Text>
          </View>
        )}

        <Text className="mt-5 text-lg font-semibold text-[#111827]">Students</Text>

        {records.map((record, index) => {
          const isPresent = record.status === "PRESENT";
          const isAbsent = record.status === "ABSENT";
          const isManual = record.status === "MANUAL";

          return (
            <View
              key={index}
              className={`mt-4 rounded-2xl border p-4 ${
                isPresent ? "border-[#BBF7D0] bg-[#F0FDF4]" : 
                isAbsent ? "border-[#FECACA] bg-[#FEF2F2]" : 
                "border-[#FCD34D] bg-[#FFFBEB]"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {record.cropImagePath && (
                    <Image 
                      source={{ uri: record.cropImagePath }} 
                      className="w-12 h-12 rounded-full mr-3 border border-gray-300" 
                    />
                  )}
                  <View>
                    <Text className="text-base font-semibold text-[#111827]">
                      {record.studentName}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      Roll No: {record.rollNumber}
                    </Text>
                  </View>
                </View>

                <View className={`rounded-full px-3 py-1 ${isPresent ? "bg-[#DCFCE7]" : isAbsent ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"}`}>
                  <Text className={`text-sm font-semibold ${isPresent ? "text-[#15803D]" : isAbsent ? "text-[#DC2626]" : "text-[#B45309]"}`}>
                    {record.status}
                  </Text>
                </View>
              </View>

              <Text className={`mt-3 text-right text-sm font-semibold ${isPresent ? "text-[#16A34A]" : isAbsent ? "text-[#DC2626]" : "text-[#D97706]"}`}>
                {Math.round((record.confidence || 0) * 100)}% confidence
              </Text>

              <View className="mt-4">
                {editingRecordId === record.id ? (
                  <View className="flex-row gap-x-3">
                    <TouchableOpacity
                      onPress={() => {
                        handleStatusChange(record.id, "PRESENT");
                        setEditingRecordId(null);
                      }}
                      className={`flex-1 rounded-xl py-3 ${isPresent ? "bg-[#16A34A]" : "bg-[#DCFCE7]"}`}
                    >
                      <Text className={`text-center font-semibold ${isPresent ? "text-white" : "text-[#166534]"}`}>Present</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        handleStatusChange(record.id, "ABSENT");
                        setEditingRecordId(null);
                      }}
                      className={`flex-1 rounded-xl py-3 ${isAbsent ? "bg-[#DC2626]" : "bg-[#FEE2E2]"}`}
                    >
                      <Text className={`text-center font-semibold ${isAbsent ? "text-white" : "text-[#991B1B]"}`}>Absent</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setEditingRecordId(record.id)}
                    className="flex-row items-center justify-center rounded-xl border border-[#D1D5DB] bg-white py-3"
                  >
                    <Ionicons name="pencil" size={16} color="#374151" />
                    <Text className="ml-2 font-semibold text-[#374151]">Edit Attendance</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isManual && (
                <View className="mt-3 rounded-xl bg-[#FEF3C7] p-3">
                  <Text className="text-sm font-medium text-[#92400E]">
                    AI confidence is low. Manual verification required.
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View className="mt-8 flex-row gap-x-4">
          <TouchableOpacity
            onPress={() => router.navigate("/(protected)/dashboard")}
            className="flex-1 items-center justify-center rounded-2xl border border-gray-300 bg-white py-4"
          >
            <Text className="font-semibold text-gray-700">Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={syncing || session.status === "SYNCED"}
            onPress={handleManualSync}
            className={`flex-1 items-center justify-center rounded-2xl py-4 ${session.status === "SYNCED" ? "bg-green-500" : "bg-[#2563EB]"}`}
          >
            {syncing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-semibold text-white">
                {session.status === "SYNCED" ? "Synced" : "Sync Now"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-white py-3">
        <View className="flex-row items-center justify-center">
          <Text className="text-base text-gray-500">Powered by</Text>
          <Image source={require("@/assets/images/iiitv-logo.png")} className="mx-2 h-6 w-6 rounded-full" />
          <Text className="text-base text-gray-500">IIIT Vadodara</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}