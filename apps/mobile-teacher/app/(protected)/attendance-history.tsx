import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAllSessionsWithStats } from "@/src/db/offlineAttendance";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";
import { OfflineAttendanceSession } from "@/src/types/attendance.types";

type SessionWithStats = OfflineAttendanceSession & {
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
};

export default function AttendanceHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const { token } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      const response = await getAllSessionsWithStats();
      setSessions(response);
    } catch (error) {
      console.log("Error fetching offline history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await syncOfflineAttendance(token);
      Alert.alert("Sync Completed", "All pending attendance records have been successfully synchronized to the server.");
      await fetchHistory();
    } catch (error) {
      console.log("Sync failed:", error);
      Alert.alert("Sync Failed", "An error occurred while syncing attendance. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const pendingCount = sessions.filter(s => s.status !== "SYNCED").length;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F7FB] justify-center items-center">
        <ActivityIndicator size="large" color="#4338CA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      {/* Header Section */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#0F172A]">History</Text>

        {pendingCount > 0 ? (
          <TouchableOpacity
            onPress={handleSyncAll}
            disabled={syncing}
            className="h-10 px-3 items-center justify-center rounded-full bg-[#10B981] shadow-sm flex-row"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color="white" />
                <Text className="ml-1 text-white font-bold text-xs">{pendingCount}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            onPress={() => router.push(`/(protected)/attendance-review?sessionId=${session.id}&fromHistory=true`)}
            activeOpacity={0.8}
            className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <View className="flex-row items-center justify-between pr-4">
                  <View className="flex-row items-center">
                    <View className="bg-indigo-50 p-1.5 rounded-full mr-2">
                      <Ionicons name="calendar" size={14} color="#4338CA" />
                    </View>
                    <Text className="text-sm font-bold text-[#0F172A]">
                      {new Date(session.date).toDateString()}
                    </Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded-full border ${session.status === 'SYNCED' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <Text className={`text-[9px] font-bold ${session.status === 'SYNCED' ? 'text-green-700' : 'text-orange-700'}`}>
                      {session.status === 'SYNCED' ? 'SYNCED' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mt-3">
                  <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-2 py-2 mr-2 flex-1 items-center shadow-sm">
                    <Text className="text-[#16A34A] text-lg font-bold">
                      {session.presentCount}
                    </Text>
                    <Text className="text-[#16A34A] text-[10px] font-semibold mt-0.5">Present</Text>
                  </View>

                  <View className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-2 py-2 mr-2 flex-1 items-center shadow-sm">
                    <Text className="text-[#DC2626] text-lg font-bold">
                      {session.absentCount}
                    </Text>
                    <Text className="text-[#DC2626] text-[10px] font-semibold mt-0.5">Absent</Text>
                  </View>

                  <View className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-2 py-2 flex-1 items-center shadow-sm">
                    <Text className="text-[#4338CA] text-lg font-bold">
                      {session.attendancePercentage}%
                    </Text>
                    <Text className="text-[#4338CA] text-[10px] font-semibold mt-0.5">Rate</Text>
                  </View>
                </View>
              </View>

              <View className="justify-center">
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {sessions.length === 0 && (
          <View className="items-center mt-20">
            <View className="h-20 w-20 rounded-full bg-gray-200 items-center justify-center mb-4">
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-[#94A3B8] font-bold text-lg">No history found</Text>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}