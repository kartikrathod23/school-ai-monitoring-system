import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ArrowLeft, Calendar, ChevronRight, CloudUpload } from "lucide-react-native";
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
      <SafeAreaView className="flex-1 bg-[#F5F7FB] justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">
      <View className="bg-[#2563EB] px-5 pt-4 pb-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4">
              View Attendance
            </Text>
          </View>
          {pendingCount > 0 && (
            <TouchableOpacity 
              onPress={handleSyncAll}
              disabled={syncing}
              className="bg-white/20 px-3 py-2 rounded-xl flex-row items-center"
            >
              {syncing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <CloudUpload size={18} color="white" />
                  <Text className="text-white font-semibold ml-2">Sync ({pendingCount})</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            onPress={() => router.push(`/(protected)/attendance-review?sessionId=${session.id}&fromHistory=true`)}
            className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="flex-row items-center justify-between pr-4">
                  <View className="flex-row items-center">
                    <Calendar size={18} color="#2563EB" />
                    <Text className="ml-2 text-lg font-bold text-gray-900">
                      {new Date(session.date).toDateString()}
                    </Text>
                  </View>
                  <View className={`px-2 py-1 rounded-md ${session.status === 'SYNCED' ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <Text className={`text-xs font-bold ${session.status === 'SYNCED' ? 'text-green-700' : 'text-orange-700'}`}>
                      {session.status === 'SYNCED' ? 'Synced' : 'Not Synced'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row mt-4">
                  <View className="bg-[#EEF2FF] rounded-2xl px-4 py-3 mr-3 flex-1">
                    <Text className="text-[#4F46E5] text-2xl font-bold text-center">
                      {session.presentCount}
                    </Text>
                    <Text className="text-[#4F46E5] text-center mt-1">Present</Text>
                  </View>

                  <View className="bg-[#FEF2F2] rounded-2xl px-4 py-3 flex-1">
                    <Text className="text-[#DC2626] text-2xl font-bold text-center">
                      {session.absentCount}
                    </Text>
                    <Text className="text-[#DC2626] text-center mt-1">Absent</Text>
                  </View>
                </View>

                <View className="mt-4 flex-row justify-between items-center pr-4">
                  <Text className="text-gray-500">Attendance</Text>
                  <Text className="text-[#D97706] text-lg font-bold">
                    {session.attendancePercentage}%
                  </Text>
                </View>
              </View>

              <View className="pt-2">
                <ChevronRight size={24} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {sessions.length === 0 && (
          <View className="items-center mt-20">
            <Text className="text-gray-400 text-lg">No attendance history found</Text>
          </View>
        )}
        
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}