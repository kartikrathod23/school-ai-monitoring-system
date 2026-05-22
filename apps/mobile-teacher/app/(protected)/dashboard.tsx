import { useEffect, useState } from "react";

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
} from "lucide-react-native";

import { getTeacherProfile } from "@/src/services/teacher.service";
import { startLocationTracking } from "@/src/services/location.service";
export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<any>(null);

  useEffect(() => {
    let subscription: any;

    const initialize = async () => {
      const teacherData =await fetchDashboard();
      const school =teacherData?.sections?.[0]?.section?.standard?.school;

      if (!school) return;
      subscription = await startLocationTracking(school.latitude,school.longitude,school.geoRadius,(locationData) => {setLocationStatus(locationData);});
    };

    initialize();

    return () => {
      if(subscription){
        subscription.remove();
      }
    };
  }, []);

  const fetchDashboard = async () => {
    try {
      const response =await getTeacherProfile();
      setTeacher(response);
      return response;
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
        <View className="bg-[#2563EB] px-5 pb-6 pt-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xl font-bold text-white">
                Teacher Dashboard
              </Text>

              <Text className="mt-1 text-base text-blue-100">
                {teacher?.user?.firstName}{" "}
                {teacher?.user?.lastName}
              </Text>
            </View>

            <View className="h-11 w-11 overflow-hidden rounded-full bg-white items-center justify-center">
              <Image
                source={require("../../assets/images/uitb-logo.jpg")}
                className="h-10 w-10"
                resizeMode="contain"
              />
            </View>
          </View>

          <View className="mt-5 rounded-2xl bg-[#1D4ED8] p-4">
            <Text className="text-center text-base text-blue-100">
              Today
            </Text>

            <View className="mt-2 flex-row items-center justify-center">
              <CalendarDays size={16} color="white" />

              <Text className="ml-2 text-base text-white">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 pb-10 pt-4">
          <Text className="mb-3 text-base font-semibold text-[#475569]">
            Assigned Class (Read-Only)
          </Text>

          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-base text-gray-500">
                  School
                </Text>

                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  {assignedSection?.section?.standard ?.school?.name}
                </Text>
              </View>

              <View>
                <Text className="text-base text-gray-500">
                  Standard
                </Text>

                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  Standard{" "}
                  {assignedSection?.section?.standard?.value}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row justify-between">
              <View>
                <Text className="text-base text-gray-500">
                  Section
                </Text>

                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  Section{" "}{assignedSection?.section?.name}
                </Text>
              </View>

              <View>
                <Text className="text-base text-gray-500">
                  Total Students
                </Text>

                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  42 Students
                </Text>
              </View>
            </View>

            <Text className="mt-4 text-base text-gray-400">
              * Contact admin to modify class assignment
            </Text>
          </View>

          <Text className="mb-3 mt-6 text-base font-semibold text-[#475569]">
            Location Verification
          </Text>

          <View
            className={`rounded-2xl border p-4 ${locationStatus?.isInside
              ? "border-[#D1FAE5] bg-[#ECFDF5]"
              : "border-[#FECACA] bg-[#FEF2F2]"
              }`}
          >
            <View className="flex-row items-center">
              <CircleCheckBig
                size={22}
                color={
                  locationStatus?.isInside
                    ? "#059669"
                    : "#DC2626"
                }
              />

              <View className="ml-3">
                <Text
                  className={`font-semibold ${locationStatus?.isInside
                    ? "text-[#065F46]"
                    : "text-[#991B1B]"
                    }`}
                >
                  {locationStatus?.isInside
                    ? "Verified"
                    : "Not Verified"}
                </Text>

                <Text
                  className={`mt-1 text-base ${locationStatus?.isInside
                    ? "text-[#047857]"
                    : "text-[#B91C1C]"
                    }`}
                >
                  {locationStatus?.isInside
                    ? "You are inside school premises"
                    : `You are ${locationStatus?.distance >= 1000
                      ? `${(locationStatus.distance / 1000).toFixed(2)} km`
                      : `${Math.round(locationStatus.distance)} m`
                    } away from school`}
                </Text>
              </View>
            </View>

            <Text className="mt-3 text-base text-[#6B7280]">
              Geofence verification is required to mark
              attendance
            </Text>
          </View>

          <Text className="mb-3 mt-6 text-base font-semibold text-[#475569]">
            Daily Operations
          </Text>

          <View className="gap-y-4">
            <View className="rounded-2xl bg-[#2563EB] p-4">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Camera
                    size={22}
                    color="white"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold text-white">
                    Start Attendance
                  </Text>

                  <Text className="mt-1 text-base text-blue-100">
                    Capture classroom photos for AI
                    scanning
                  </Text>
                </View>
              </View>
            </View>

            <View className="rounded-2xl bg-[#10B981] p-4">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <UtensilsCrossed
                    size={22}
                    color="white"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold text-white">
                    Start Mid-Day Meal Count
                  </Text>

                  <Text className="mt-1 text-base text-green-100">
                    Capture photos for student meal
                    count
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text className="mb-3 mt-6 text-base font-semibold text-[#475569]">
            Student Management
          </Text>

          <View className="rounded-2xl border border-[#E9D5FF] bg-[#FAF5FF] p-4">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E9D5FF]">
                <Users
                  size={22}
                  color="#9333EA"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-base font-semibold text-[#581C87]">
                  Face Onboarding
                </Text>

                <Text className="mt-1 text-base text-[#7E22CE]">
                  Attach face data to students
                  (One-time process)
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row justify-between">
              <View className="rounded-lg bg-green-100 px-3 py-2">
                <Text className="text-base font-medium text-green-700">
                  35 Added
                </Text>
              </View>

              <View className="rounded-lg bg-yellow-100 px-3 py-2">
                <Text className="text-base font-medium text-yellow-700">
                  5 Pending
                </Text>
              </View>

              <View className="rounded-lg bg-red-100 px-3 py-2">
                <Text className="text-base font-medium text-red-700">
                  2 Re-scan
                </Text>
              </View>
            </View>
          </View>

          <Text className="mb-3 mt-6 text-base font-semibold text-[#475569]">
            View Reports (Read-Only)
          </Text>

          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <ChartNoAxesColumn
                  size={20}
                  color="#2563EB"
                />
              </View>

              <View className="ml-3">
                <Text className="font-semibold text-[#0F172A]">
                  View Previous Attendance
                </Text>

                <Text className="mt-1 text-base text-gray-500">
                  Read-only access
                </Text>
              </View>
            </View>
          </View>

          <Text className="mb-3 mt-6 text-base font-semibold text-[#475569]">
            Today’s Summary
          </Text>

          <View className="flex-row flex-wrap justify-between gap-y-4">
            <View className="w-[48%] rounded-2xl bg-[#EEF2FF] p-4">
              <Text className="text-center text-3xl font-bold text-[#4338CA]">
                38
              </Text>

              <Text className="mt-2 text-center text-base text-[#6366F1]">
                Present
              </Text>
            </View>

            <View className="w-[48%] rounded-2xl bg-[#FEF2F2] p-4">
              <Text className="text-center text-3xl font-bold text-[#DC2626]">
                4
              </Text>

              <Text className="mt-2 text-center text-base text-[#EF4444]">
                Absent
              </Text>
            </View>

            <View className="w-[48%] rounded-2xl bg-[#ECFDF5] p-4">
              <Text className="text-center text-3xl font-bold text-[#059669]">
                36
              </Text>

              <Text className="mt-2 text-center text-base text-[#10B981]">
                Meals Served
              </Text>
            </View>

            <View className="w-[48%] rounded-2xl bg-[#FFFBEB] p-4">
              <Text className="text-center text-3xl font-bold text-[#D97706]">
                90%
              </Text>

              <Text className="mt-2 text-center text-base text-[#F59E0B]">
                Attendance
              </Text>
            </View>
          </View>

          <View className="mt-6 rounded-xl border border-[#FDE68A] bg-[#FEFCE8] p-4">
            <Text className="text-base leading-5 text-[#92400E]">
              Note: You cannot add students, modify
              sections, or access analytics. Contact
              admin for system changes.
            </Text>
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