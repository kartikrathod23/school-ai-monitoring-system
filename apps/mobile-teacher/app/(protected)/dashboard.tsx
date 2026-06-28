import { useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CalendarDays,
  CircleCheckBig,
  Camera,
  UtensilsCrossed,
  Users,
  ChartNoAxesColumn,
  Wifi,
  WifiOff,
} from "lucide-react-native";

import { getTeacherProfile, getDashboardSummary } from "@/src/services/teacher.service";
import { startLocationTracking, checkCurrentLocation } from "@/src/services/location.service";
import { syncModelAssets, syncStudentEmbeddings } from "@/src/services/modelSync.service";
import { getActiveModelAsset } from "@/src/db/modelAsset";
import { saveSectionCache } from "@/src/lib/sectionCache";
import { useAuthStore } from "@/src/store/auth.store";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { removeToken } from "@/src/lib/storage";
import { loadModelsIntoMemory } from "@/src/services/modelSync.service";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null); // null = checking
  const { token } = useAuthStore();

  useEffect(() => {
    let subscription: any;

    const initialize = async () => {
      const teacherData = await fetchDashboard();
      const school = teacherData?.sections?.[0]?.section?.standard?.school;
      const sectionId = teacherData?.sections?.[0]?.sectionId;

      if (school && sectionId) {
        // Cache geo-fence data locally — used by attendance-capture.tsx offline
        await saveSectionCache({
          sectionId,
          schoolLatitude: school.latitude,
          schoolLongitude: school.longitude,
          geoRadius: school.geoRadius,
        });

        // Start live location tracking for the dashboard indicator
        subscription = await startLocationTracking(
          school.latitude,
          school.longitude,
          school.geoRadius,
          (locationData) => setLocationStatus(locationData)
        );

        // Do an immediate location check so the UI doesn't show
        // "Checking location..." for 60 seconds waiting for the watcher
        try {
          const initial = await checkCurrentLocation(
            school.latitude,
            school.longitude,
            school.geoRadius
          );
          setLocationStatus({
            isInside: initial.isInside,
            distance: initial.distance,
            currentLatitude: 0,
            currentLongitude: 0,
          });
        } catch (locationErr) {
          console.warn("[Dashboard] Initial location check failed:", locationErr);
        }

        // Sync model assets + student embeddings in the background
        if (token) {

          Promise.all([
            syncModelAssets(sectionId, token),
            syncStudentEmbeddings(sectionId, token),
          ])
            .then(async () => {
              const localAsset = await getActiveModelAsset(sectionId);
              setModelReady(!!localAsset);
            })
            .catch((err) => {
              console.warn("[Dashboard] Model sync failed (offline?):", err.message);
              // Still check if we have a locally cached model
              getActiveModelAsset(sectionId)
                .then(async (a) => {
                  if (a) await loadModelsIntoMemory(a.backbonePath, a.classifierPath, a.classifierVersion);
                  setModelReady(!!a);
                })
                .catch(() => setModelReady(false));
            });
        } else {
          // No token (shouldn't happen on dashboard) — check local cache
          getActiveModelAsset(sectionId)
            .then(async (a) => {
              if (a) await loadModelsIntoMemory(a.backbonePath, a.classifierPath, a.classifierVersion);
              setModelReady(!!a);
            })
            .catch(() => setModelReady(false));
        }
      }
    };

    initialize();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const handleLogout = async () => {
    await removeToken();
    useAuthStore.getState().logout();
    router.replace("/(auth)/login");
  };

  const fetchDashboard = async () => {
    try {
      const response = await getTeacherProfile();
      setTeacher(response);
      try {
        const summaryResponse = await getDashboardSummary();
        setSummary(summaryResponse.data.data);
      } catch (summaryErr: any) {
        // Summary can fail if teacher has no attendance yet — non-fatal
        console.log("[Dashboard] Summary not available yet:", summaryErr?.message);
      }
      return response;
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F4F7FB]">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const assignedSection = teacher?.sections?.[0];

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* Header Section */}
        <View className="px-5 pt-8 pb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="h-14 w-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white items-center justify-center">
                <Image
                  source={require("../../assets/images/uitb-logo.jpg")}
                  className="h-12 w-12"
                  resizeMode="contain"
                />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-sm font-medium text-gray-500">
                  Welcome back,
                </Text>
                <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                  {teacher?.user?.firstName} {teacher?.user?.lastName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} className="h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100 ml-2">
              <LogOut size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View className="mt-5 flex-row items-center px-1">
            <CalendarDays size={16} color="#64748B" />
            <Text className="ml-2 text-sm font-medium text-[#64748B]">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Assigned Class Premium Card */}
        <View className="px-4 pb-2">
          <View className="rounded-3xl bg-[#4338CA] p-6 shadow-lg relative overflow-hidden">
            {/* Decorative background shapes */}
            <View className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
            <View className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-black/10" />
            
            <Text className="text-indigo-200 font-medium text-sm tracking-wider uppercase">Assigned Class</Text>
            
            <View className="mt-4 flex-row items-end justify-between">
              <View>
                <Text className="text-4xl font-bold text-white">
                  Std {assignedSection?.section?.standard?.value}
                </Text>
                <Text className="text-xl font-medium text-indigo-50 mt-1">
                  Section {assignedSection?.section?.name}
                </Text>
              </View>
              <View className="items-end">
                <View className="bg-white/20 px-4 py-2 rounded-full mb-2 border border-white/10">
                  <Text className="text-white font-bold text-sm">{summary?.totalStudents || 0} Students</Text>
                </View>
                <Text className="text-xs text-indigo-200 font-medium max-w-[120px] text-right" numberOfLines={2}>
                  {assignedSection?.section?.standard?.school?.name}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 pb-10">
          <Text className="mb-4 mt-6 text-base font-semibold text-[#475569]">
            System Status
          </Text>

          <View className="flex-row justify-around">
            <View className="w-[45%] items-center">
              <View className={`h-16 w-16 items-center justify-center rounded-full border ${locationStatus?.isInside ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#FEF2F2] border-[#FECACA]'}`}>
                <CircleCheckBig size={26} color={locationStatus?.isInside ? '#059669' : '#DC2626'} />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">Location</Text>
              <Text className={`mt-1 text-center text-xs font-semibold ${locationStatus?.isInside ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                {locationStatus?.isInside ? 'Verified' : 'Unverified'}
              </Text>
            </View>

            <View className="w-[45%] items-center">
              <View className={`h-16 w-16 items-center justify-center rounded-full border ${modelReady === true ? 'bg-[#ECFDF5] border-[#D1FAE5]' : modelReady === false ? 'bg-[#FEF9C3] border-[#FEF08A]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                {modelReady === true ? <Wifi size={26} color="#059669" /> : modelReady === false ? <WifiOff size={26} color="#B45309" /> : <ActivityIndicator size="small" color="#64748B" />}
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">Offline AI</Text>
              <Text className={`mt-1 text-center text-xs font-semibold ${modelReady === true ? 'text-[#059669]' : modelReady === false ? 'text-[#B45309]' : 'text-[#64748B]'}`}>
                {modelReady === true ? 'Ready' : modelReady === false ? 'Missing' : 'Checking'}
              </Text>
            </View>
          </View>

          <Text className="mb-4 mt-6 text-base font-semibold text-[#475569]">
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap gap-y-6">
            {/* Start Attendance */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push("/(protected)/attendance-capture")} 
              className="w-[33%] items-center"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] border border-[#BFDBFE]">
                <Camera size={26} color="#2563EB" />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">
                Attendance
              </Text>
            </TouchableOpacity>

            {/* Meal Count */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push("/(protected)/meal-count")} 
              className="w-[33%] items-center"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
                <UtensilsCrossed size={26} color="#10B981" />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">
                Meal Count
              </Text>
            </TouchableOpacity>

            {/* Face Onboarding */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push("/(protected)/face-onboarding")} 
              className="w-[33%] items-center"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FAF5FF] border border-[#E9D5FF] relative">
                <Users size={26} color="#9333EA" />
                {/* Show a red dot if there are students requiring rescan or pending */}
                {((summary?.onboarding?.rescan || 0) > 0 || (summary?.onboarding?.pending || 0) > 0) && (
                  <View className="absolute right-0 top-0 h-4 w-4 rounded-full bg-red-500 border-2 border-white" />
                )}
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">
                Onboarding
              </Text>
            </TouchableOpacity>

            {/* View Attendance History */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push("/(protected)/attendance-history")} 
              className="w-[33%] items-center"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                <ChartNoAxesColumn size={26} color="#475569" />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">
                View Attendace
              </Text>
            </TouchableOpacity>

            {/* View Meal History */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push("/(protected)/meal-history")} 
              className="w-[33%] items-center"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                <UtensilsCrossed size={26} color="#475569" />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-[#475569]">
                View Meals
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="mb-4 mt-6 text-base font-semibold text-[#475569]">
            Today’s Summary
          </Text>

          <View className="flex-row justify-between">
            <View className="w-[23%] items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EEF2FF] border border-[#C7D2FE]">
                <Text className="text-xl font-bold text-[#4338CA]">
                  {summary?.attendance?.presentStudents || 0}
                </Text>
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-[#6366F1]">
                Present
              </Text>
            </View>

            <View className="w-[23%] items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2] border border-[#FECACA]">
                <Text className="text-xl font-bold text-[#DC2626]">
                  {summary?.attendance?.absentStudents || 0}
                </Text>
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-[#EF4444]">
                Absent
              </Text>
            </View>

            <View className="w-[23%] items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
                <Text className="text-xl font-bold text-[#059669]">
                  {summary?.meals?.mealsServed || 0}
                </Text>
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-[#10B981]">
                Meals
              </Text>
            </View>

            <View className="w-[23%] items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFFBEB] border border-[#FDE68A]">
                <Text className="text-lg font-bold text-[#D97706]">
                  {summary?.attendance?.attendancePercentage || 0}%
                </Text>
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-[#F59E0B]">
                Attendance
              </Text>
            </View>
          </View>

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="mr-2 text-base text-[#64748B]">
              Powered by
            </Text>

            <Image
              source={require("../../assets/images/iiitv-logo.png")}
              className="h-6 w-6"
              resizeMode="contain"
            />

            <Text className="ml-2 text-base font-medium text-[#475569]">
              IIIT Vadodara
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView >
  );
}