import { useEffect, useState } from "react";

import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    ScrollView,
    Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOfflineMealSessionById, updateMealSessionStatus } from "@/src/db/offlineMeal";
import { syncOfflineMeals } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";



export default function MealReviewScreen() {
    const { sessionId, fromHistory } = useLocalSearchParams();
    const { token } = useAuthStore();
    const [meal, setMeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (sessionId) {
            loadMeal();
        }
    }, [sessionId]);

    const loadMeal = async () => {
        try {
            const session = await getOfflineMealSessionById(sessionId as string);
            setMeal(session);
        } catch (error) {
            console.error("Failed to load local meal session:", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmMeal = async () => {
        try {
            // Already saved locally. Just return to dashboard.
            Alert.alert("Success", "Meal count saved locally.");
            router.dismissAll();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Something went wrong");
        }
    };

    const handleManualSync = async () => {
        if (!token) {
            Alert.alert("Error", "You must be online and logged in to sync.");
            return;
        }

        try {
            setSyncing(true);
            await updateMealSessionStatus(sessionId as string, "SYNCING");
            await syncOfflineMeals(token);
            await loadMeal(); // Refresh status
            Alert.alert("Success", "Meal session synced successfully!");
        } catch (err: any) {
            console.error("Manual sync failed:", err);
            await loadMeal();
            Alert.alert("Sync Failed", err.message || "Check your internet connection.");
        } finally {
            setSyncing(false);
        }
    };

    if (loading || !meal) {
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
                <TouchableOpacity onPress={() => router.dismissAll()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                    <Ionicons name="home" size={18} color="#0F172A" />
                </TouchableOpacity>

                <Text className="text-lg font-bold text-[#0F172A]">Review Meal Count</Text>

                <View className="h-10 w-10 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-white items-center justify-center">
                    <Image
                        source={require("../../assets/images/uitb-logo.jpg")}
                        className="h-8 w-8"
                        resizeMode="contain"
                    />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
                {/* Progress / Status Header */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between bg-[#4338CA] px-5 py-4 rounded-3xl shadow-md">
                    <View>
                      <Text className="text-white font-bold text-base">Local Inference Result</Text>
                      <Text className="text-indigo-200 text-xs mt-1">Review AI counting results</Text>
                    </View>
                    <View className={`px-3 py-1.5 rounded-full ${meal.status === "SYNCED" ? "bg-green-500/20 border border-green-400" : meal.status === "SYNCING" ? "bg-yellow-500/20 border border-yellow-400" : "bg-white/20 border border-white/30"}`}>
                      <Text className="text-white font-bold text-[10px]">
                        {meal.status === "SYNCED" ? "SYNCED" : "OFFLINE"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Main Stats Card */}
                <View className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                    <View className="items-center">
                        <Text className="text-[#64748B] font-bold text-sm uppercase tracking-wider">
                            Total Students Detected
                        </Text>
                        <Text className="mt-3 text-[72px] font-black text-[#10B981]">
                            {meal.totalDetected}
                        </Text>
                        <Text className="text-[#94A3B8] font-medium mt-1">
                            students counted for meals
                        </Text>
                    </View>

                    <View className="mt-8 border-t border-gray-100 pt-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center">
                                <Ionicons name="analytics-outline" size={18} color="#64748B" />
                                <Text className="text-[#475569] font-semibold ml-2">
                                    AI Confidence
                                </Text>
                            </View>
                            <Text className="font-bold text-[#F59E0B] bg-amber-50 px-3 py-1 rounded-lg">
                                88%
                            </Text>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center">
                                <Ionicons name="cloud-done-outline" size={18} color="#64748B" />
                                <Text className="text-[#475569] font-semibold ml-2">
                                    Sync Status
                                </Text>
                            </View>
                            <Text className={`font-bold px-3 py-1 rounded-lg ${meal.status === 'SYNCED' ? 'text-[#10B981] bg-green-50' : 'text-orange-500 bg-orange-50'}`}>
                                {meal.status}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                    <Text className="mb-4 text-base font-bold text-[#334155] flex-row items-center">
                        <Ionicons name="pie-chart" size={18} color="#4338CA" />
                        <Text className="ml-2"> Meal Summary</Text>
                    </Text>

                    <View className="flex-row gap-x-4">
                        <View className="flex-1 items-center rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-4 shadow-sm">
                            <Text className="text-3xl font-black text-[#16A34A]">
                                {meal.totalDetected}
                            </Text>
                            <Text className="text-[#16A34A] font-semibold text-xs mt-1 text-center">
                                Meals to Prepare
                            </Text>
                        </View>

                        <View className="flex-1 items-center rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] p-4 shadow-sm">
                            <Text className="text-3xl font-black text-[#4338CA]">
                                95%
                            </Text>
                            <Text className="text-[#4338CA] font-semibold text-xs mt-1 text-center">
                                Of Present
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mt-8 mb-4 flex-row gap-x-4">
                    {!fromHistory ? (
                        <>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                activeOpacity={0.8}
                                className="flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-white py-5 shadow-sm"
                            >
                                <Text className="font-bold text-lg text-[#0F172A]">Retake</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={confirmMeal}
                                activeOpacity={0.8}
                                className="flex-1 items-center justify-center rounded-3xl bg-[#4338CA] py-5 shadow-md"
                            >
                                <Text className="font-bold text-lg text-white">Confirm</Text>
                            </TouchableOpacity>
                        </>
                    ) : meal.status !== "SYNCED" ? (
                        <>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                activeOpacity={0.8}
                                className="flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-white py-5 shadow-sm"
                            >
                                <Text className="font-bold text-lg text-[#0F172A]">Close</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                disabled={syncing}
                                onPress={handleManualSync}
                                activeOpacity={0.8}
                                className="flex-1 items-center justify-center rounded-3xl bg-[#10B981] py-5 shadow-sm"
                            >
                                {syncing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="font-bold text-lg text-white">Sync Now</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                            className="flex-1 items-center justify-center rounded-3xl bg-[#4338CA] py-5 shadow-md"
                        >
                            <Text className="font-bold text-lg text-white">Back to Dashboard</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View className="mt-8 flex-row items-center justify-center">
                    <Text className="text-[13px] text-[#64748B]">
                        Powered by
                    </Text>

                    <Image
                        source={require("@/assets/images/iiitv-logo.png")}
                        className="mx-2 h-6 w-6 rounded-full"
                    />

                    <Text className="text-[13px] text-[#64748B]">
                        IIIT Vadodara
                    </Text>
                </View>

            </ScrollView>

        </SafeAreaView>
    );
}