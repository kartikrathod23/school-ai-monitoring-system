import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, Calendar, ChevronRight, CloudUpload } from "lucide-react-native";
import { getAllMealSessions, OfflineMealSession } from "@/src/db/offlineMeal";
import { syncOfflineMeals } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";

export default function MealHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sessions, setSessions] = useState<OfflineMealSession[]>([]);
  const { token } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      const response = await getAllMealSessions();
      setSessions(response);
    } catch (error) {
      console.log("Error fetching meal history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await syncOfflineMeals(token);
      Alert.alert("Sync Completed", "All pending meal records have been successfully synchronized to the server.");
      await fetchHistory();
    } catch (error) {
      console.log("Sync failed:", error);
      Alert.alert("Sync Failed", "An error occurred while syncing meals. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const pendingCount = sessions.filter(s => s.status !== 'SYNCED').length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="flex-row items-center justify-between bg-white px-5 py-4 shadow-sm z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-[#1E293B]">Mid-Day Meal History</Text>
        <View className="w-10" />
      </View>

      {pendingCount > 0 && (
        <View className="bg-amber-50 px-5 py-4 border-b border-amber-200 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-amber-800 font-bold mb-1">Pending Sync ({pendingCount})</Text>
            <Text className="text-amber-700 text-xs">
              You have offline meal counts that need to be synced.
            </Text>
          </View>
          <TouchableOpacity
            disabled={syncing}
            onPress={handleSyncAll}
            className={`flex-row items-center px-4 py-2 rounded-xl ${syncing ? 'bg-amber-300' : 'bg-amber-600'}`}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            ) : (
              <CloudUpload size={16} color="white" className="mr-2" />
            )}
            <Text className="text-white font-bold text-sm">
              {syncing ? 'Syncing...' : 'Sync All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {sessions.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="h-20 w-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Calendar size={32} color="#94A3B8" />
            </View>
            <Text className="text-[18px] font-bold text-gray-800 text-center">No Meal Records</Text>
            <Text className="text-gray-500 text-center mt-2 px-8">
              You haven't recorded any mid-day meals on this device yet.
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => router.push(`/(protected)/meal-review?sessionId=${session.id}&fromHistory=true`)}
              className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center justify-between border-b border-gray-50 pb-3 mb-3">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-full bg-green-50 items-center justify-center mr-3">
                    <Calendar size={18} color="#16A34A" />
                  </View>
                  <View>
                    <Text className="font-bold text-[#1E293B] text-[16px]">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {session.status === 'SYNCED' ? 'Synced' : 'Not Synced'}
                    </Text>
                  </View>
                </View>
                <View className={`px-3 py-1.5 rounded-full ${session.status === 'SYNCED' ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <Text className={`text-xs font-bold ${session.status === 'SYNCED' ? 'text-green-700' : 'text-amber-700'}`}>
                    {session.status}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row gap-x-6">
                  <View>
                    <Text className="text-gray-500 text-xs mb-1">Total Detected</Text>
                    <Text className="font-bold text-[#1E293B] text-[18px]">{session.totalDetected}</Text>
                  </View>
                </View>
                
                <View className="h-8 w-8 rounded-full bg-gray-50 items-center justify-center">
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
