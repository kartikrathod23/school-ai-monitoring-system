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
import { Ionicons } from "@expo/vector-icons";
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

        <Text className="text-lg font-bold text-[#0F172A]">Meal History</Text>

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
        {sessions.length === 0 ? (
          <View className="items-center mt-20">
            <View className="h-20 w-20 rounded-full bg-gray-200 items-center justify-center mb-4">
              <Ionicons name="fast-food-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-[#94A3B8] font-bold text-lg">No history found</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => router.push(`/(protected)/meal-review?sessionId=${session.id}&fromHistory=true`)}
                activeOpacity={0.8}
                className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 w-[48%]"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className={`px-2 py-1 rounded-full border ${session.status === 'SYNCED' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <Text className={`text-[9px] font-bold ${session.status === 'SYNCED' ? 'text-green-700' : 'text-orange-700'}`}>
                      {session.status === 'SYNCED' ? 'SYNCED' : 'PENDING'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>

                <View className="items-center mb-3">
                  <View className="bg-[#FFFBEB] border border-[#FDE68A] rounded-full h-16 w-16 items-center justify-center shadow-sm">
                    <Text className="text-[#D97706] text-2xl font-black">
                      {session.totalDetected}
                    </Text>
                  </View>
                  <Text className="text-[#D97706] text-[10px] font-bold mt-2 uppercase tracking-wider">Meals</Text>
                </View>

                <View className="flex-row items-center justify-center bg-gray-50 py-2 rounded-2xl border border-gray-100">
                  <Ionicons name="calendar" size={12} color="#64748B" />
                  <Text className="text-[10px] font-bold text-[#475569] ml-1">
                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
