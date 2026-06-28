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
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F4F6FA]">

            <View className="flex-row items-center justify-between bg-[#00A86B] px-4 py-4">

                <TouchableOpacity
                    onPress={() => router.back()}
                >

                    <Text className="text-white text-[16px]">
                        ← Back
                    </Text>

                </TouchableOpacity>

                <Text className="text-[19px] font-bold text-white">
                    Mid-Day Meal Count
                </Text>

                <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
                    <Image
                        source={require("../../assets/images/uitb-logo.jpg")}
                        className="h-10 w-10"
                        resizeMode="contain"
                    />
                </View>

            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 40,
                }}
            >

                <View className="mx-4 mt-5 rounded-3xl bg-white p-6">

                    <View className="items-center">

                        <Text className="text-[#64748B]">
                            Total Student Count Detected
                        </Text>

                        <Text className="mt-3 text-[60px] font-bold text-[#00A86B]">
                            {meal.totalDetected}
                        </Text>

                        <Text className="text-[#64748B]">
                            students for meal calculation
                        </Text>

                    </View>

                    <View className="mt-8">

                        <View className="flex-row justify-between">

                            <Text className="text-[#475569]">
                                Confidence Level
                            </Text>

                            <Text className="font-bold text-[#F59E0B]">
                                88%
                            </Text>

                        </View>

                        <View className="mt-3 h-3 rounded-full bg-[#E2E8F0]">

                            <View className="h-3 w-[88%] rounded-full bg-[#F59E0B]" />

                        </View>

                    </View>

                </View>

                {/* <View className="mx-4 mt-5 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-5">

                    <Text className="font-bold text-[#2563EB]">
                        AI Head Count Explanation:
                    </Text>

                    <View className="mt-4 gap-y-2">

                        <Text className="text-[#475569]">
                            • AI counted total students in classroom
                        </Text>

                        <Text className="text-[#475569]">
                            • No identity matching performed
                        </Text>

                        <Text className="text-[#475569]">
                            • Used for meal calculation only
                        </Text>

                        <Text className="text-[#475569]">
                            • Different from attendance (which uses face scanning)
                        </Text>

                    </View>

                </View> */}

                <View className="mx-4 mt-5 rounded-2xl bg-white p-5">

                    <Text className="mb-4 text-[16px] font-bold text-[#334155]">
                        Quick Reference
                    </Text>

                    <View className="flex-row justify-between py-2">

                        <Text className="text-[#64748B]">
                            Meal Count Detected
                        </Text>

                        <Text className="font-semibold text-[#111827]">
                            {meal.totalDetected}
                        </Text>

                    </View>

                    <View className="flex-row justify-between py-2">

                        <Text className="text-[#64748B]">
                            AI Confidence
                        </Text>

                        <Text className="font-semibold text-[#111827]">
                            88%
                        </Text>

                    </View>

                    <View className="flex-row justify-between py-2">

                        <Text className="text-[#64748B]">
                            Status
                        </Text>

                        <Text className="font-semibold text-[#16A34A]">
                            {meal.status}
                        </Text>

                    </View>

                </View>

                <View className="mx-4 mt-5 rounded-2xl bg-white p-5">

                    <Text className="mb-4 text-[16px] font-bold text-[#334155]">
                        Meal Summary
                    </Text>

                    <View className="flex-row gap-x-4">

                        <View className="flex-1 items-center rounded-2xl bg-[#DCFCE7] p-4">

                            <Text className="text-[28px] font-bold text-[#16A34A]">
                                {meal.totalDetected}
                            </Text>

                            <Text className="text-[#64748B]">
                                Meals to Prepare
                            </Text>

                        </View>

                        <View className="flex-1 items-center rounded-2xl bg-[#DBEAFE] p-4">

                            <Text className="text-[28px] font-bold text-[#2563EB]">
                                95%
                            </Text>

                            <Text className="text-[#64748B]">
                                Of Present Students
                            </Text>

                        </View>

                    </View>

                </View>

                <View className="mt-8 flex-row gap-x-4 px-4">

                    {!fromHistory ? (
                        <>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="flex-1 rounded-2xl border border-[#CBD5E1] bg-white py-4"
                            >
                                <Text className="text-center font-bold text-[#475569]">
                                    Retake Photos
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={confirmMeal}
                                className="flex-1 rounded-2xl bg-[#16A34A] py-4"
                            >
                                <Text className="text-center font-bold text-white">
                                    Confirm Meal Count
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : meal.status !== "SYNCED" ? (
                        <TouchableOpacity
                            disabled={syncing}
                            onPress={handleManualSync}
                            className="flex-1 rounded-2xl bg-[#00A86B] py-4 shadow-sm"
                        >
                            <Text className="text-center font-bold text-white text-[16px]">
                                {syncing ? "Syncing..." : "Sync Now"}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="flex-1 rounded-2xl border border-[#CBD5E1] bg-white py-4"
                        >
                            <Text className="text-center font-bold text-[#475569]">
                                Close
                            </Text>
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