import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CircleCheckBig,
  CircleAlert,
  UserRound,
  Funnel,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "@/src/lib/api";
import { Ionicons } from "@expo/vector-icons";

import { Alert, ToastAndroid, Platform } from "react-native";

export default function FaceOnboardingScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  const loadStudents = async () => {
    try {
      const sectionsResponse = await api.get("/teacher/sections");
      const section = sectionsResponse.data.data[0];
      setSectionId(section.sectionId);
      const studentsResponse =await api.get(`/teacher/sections/${section.sectionId}/students`);
      setStudents(studentsResponse.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async () => {
    if (!sectionId) return;
    setIsTraining(true);
    try {
      await api.post(`/model-sync/train/${sectionId}`);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Training started! The model will download when ready.", ToastAndroid.LONG);
      } else {
        Alert.alert("Success", "Training started! The model will download when ready.");
      }
    } catch (error: any) {
      Alert.alert("Training Failed", error.response?.data?.message || error.message);
    } finally {
      setIsTraining(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();

      const interval = setInterval(() => {
        setStudents((currentStudents) => {
          const hasPendingStudents = currentStudents.some(
            (student) => student.faceStatus === "PENDING"
          );

          if (hasPendingStudents) {
            loadStudents();
          }
          return currentStudents;
        });
      }, 5000);

      return () => clearInterval(interval);
    }, [])
  );

  const addedCount = useMemo(() => {
    return students.filter(
      (s) => s.faceStatus === "ADDED"
    ).length;
  }, [students]);

  const pendingCount = useMemo(() => {
    return students.filter(
      (s) => s.faceStatus === "PENDING"
    ).length;
  }, [students]);

  const rescanCount = useMemo(() => {
    return students.filter(
      (s) => s.faceStatus === "RESCAN"
    ).length;
  }, [students]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F4F7FB]">
        <ActivityIndicator
          size="large"
          color="#9333EA"
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}

        contentContainerStyle={{
          paddingBottom: 30,
        }}

        ListHeaderComponent={
          <>
            <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                  <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <Text className="text-lg font-bold text-[#0F172A]">Face Onboarding</Text>

              <View className="h-10 w-10 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-white items-center justify-center">
                  <Image
                      source={require("../../assets/images/uitb-logo.jpg")}
                      className="h-8 w-8"
                      resizeMode="contain"
                  />
              </View>
            </View>
            
            {/* Stats Row */}
            <View className="px-5 mt-2 flex-row justify-between">
                <View className="w-[31%] items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#BBF7D0] shadow-sm">
                        <Text className="text-xl font-bold text-[#16A34A]">{addedCount}</Text>
                    </View>
                    <Text className="mt-2 text-center text-xs font-semibold text-[#16A34A]">Added</Text>
                </View>

                <View className="w-[31%] items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFFBEB] border border-[#FDE68A] shadow-sm">
                        <Text className="text-xl font-bold text-[#D97706]">{pendingCount}</Text>
                    </View>
                    <Text className="mt-2 text-center text-xs font-semibold text-[#D97706]">Pending</Text>
                </View>

                <View className="w-[31%] items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2] border border-[#FECACA] shadow-sm">
                        <Text className="text-xl font-bold text-[#DC2626]">{rescanCount}</Text>
                    </View>
                    <Text className="mt-2 text-center text-xs font-semibold text-[#DC2626]">Re-scan</Text>
                </View>
            </View>

            {/* Premium Instruction Card */}
            <View className="px-5 mt-8">
              <View className="rounded-3xl bg-[#4338CA] p-6 shadow-lg relative overflow-hidden">
                <View className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
                <View className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-black/10" />
                
                <Text className="text-white font-bold text-lg mb-2">One-Time Setup</Text>
                <Text className="text-indigo-100 font-medium text-sm leading-6">
                  • Capture at least 5 face images{"\n"}
                  • Ensure student looks at the camera{"\n"}
                  • Different face angles preferred
                </Text>
              </View>
            </View>

            <View className="px-5 mt-8 mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#0F172A]">
                Student List ({students.length})
              </Text>
              <View className="flex-row items-center rounded-full bg-white px-3 py-1.5 shadow-sm border border-gray-100">
                <Funnel size={14} color="#64748B" />
                <Text className="ml-2 text-xs font-bold text-[#475569]">All Students</Text>
              </View>
            </View>
          </>
        }

        renderItem={({ item }) => {
          const isAdded = item.faceStatus === "ADDED";
          const isPending =item.faceStatus === "PENDING";
          const isRescan = item.faceStatus === "RESCAN";
          const isNotAdded = item.faceStatus === "NOT_ADDED";

          return (
            <TouchableOpacity
              activeOpacity={0.8}

              onPress={() =>
                router.push({
                  pathname:"/(protected)/face-capture/[studentId]",
                  params: {
                    studentId: item.id,
                    studentName: item.user.firstName +" " + item.user.lastName,
                  },
                })
              }

              className={`mx-4 mt-4 rounded-2xl border p-4 ${
                isAdded
                  ? "border-[#BBF7D0] bg-[#F0FDF4]"
                  : isPending
                  ? "border-[#FDE68A] bg-[#FFFBEB]"
                  : isRescan
                  ? "border-[#FECACA] bg-[#FEF2F2]"
                  : "border-[#E2E8F0] bg-white"
              }`}
            >
              <View className="flex-row items-center">
                <View
                  className={`h-12 w-12 items-center justify-center rounded-full ${
                    isAdded
                      ? "bg-[#DCFCE7]"
                      : isPending
                      ? "bg-[#FEF3C7]"
                      : isRescan
                      ? "bg-[#FEE2E2]"
                      : "bg-[#E2E8F0]"
                  }`}
                >
                  {isAdded ? (
                    <CircleCheckBig
                      size={22}
                      color="#16A34A"
                    />
                  ) : (
                    <UserRound
                      size={22}
                      color={
                        isPending
                          ? "#D97706"
                          : isRescan
                          ? "#DC2626"
                          : "#475569"
                      }
                    />
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-lg font-semibold text-[#0F172A]">
                    {item.user.firstName}{" "}
                    {item.user.lastName}
                  </Text>

                  <Text className="mt-1 text-sm text-[#64748B]">
                    Roll No: {item.rollNumber}
                  </Text>

                  <Text className="mt-1 text-sm text-[#64748B]">
                    ID: {item.user.userCode}
                  </Text>
                </View>

                <View
                  className={`rounded-full px-3 py-2 ${
                    isAdded
                      ? "bg-[#DCFCE7]"
                      : isPending
                      ? "bg-[#FEF3C7]"
                      : isRescan
                      ? "bg-[#FEE2E2]"
                      : "bg-[#E2E8F0]"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isAdded
                        ? "text-[#15803D]"
                        : isPending
                        ? "text-[#B45309]"
                        : isRescan
                        ? "text-[#B91C1C]"
                        : "text-[#475569]"
                    }`}
                  >
                    {isAdded
                      ? "Face Added"
                      : isPending
                      ? "Onboarding Pending"
                      : isRescan
                      ? "Re-scan Required"
                      : "Face Not Added"}
                  </Text>
                </View>
              </View>

              {(isNotAdded || isRescan) && (
                <View className="mt-4 flex-row items-center">
                  <CircleAlert
                    size={15}
                    color="#DC2626"
                  />

                  <Text className="ml-2 text-sm text-[#DC2626]">
                    {isRescan
                      ? "Face verification failed. Please capture again"
                      : "Tap to capture face images"}
                  </Text>
                </View>
              )}

              {isPending && (
                <View className="mt-4 flex-row items-center">
                  <Text className="text-sm text-[#B45309]">
                    Onboarding is pending
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}

        ListFooterComponent={
          (addedCount >= 2 || pendingCount > 0) ? (
            <View className="px-5 mt-8 mb-8">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTrainModel}
                disabled={isTraining}
                className={`rounded-2xl py-4 flex-row justify-center items-center shadow-md ${
                  isTraining ? "bg-[#818CF8]" : "bg-[#4338CA]"
                }`}
              >
                {isTraining ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text className="ml-3 text-white font-bold text-base">Training Model...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="hardware-chip" size={20} color="white" />
                    <Text className="ml-2 text-white font-bold text-base">
                      OnBoard Faces & Train Model
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-center text-xs text-[#64748B] mt-4">
                Run this once after capturing faces for all students.
              </Text>
            </View>
          ) : null
        }
      />
          <View className="mt-8 flex-row items-center justify-center">
            <Text className="mr-2 text-sm text-[#64748B]">
              Powered by
            </Text>

            <Image
              source={require("../../assets/images/iiitv-logo.png")}
              className="h-6 w-6"
              resizeMode="contain"
            />

            <Text className="ml-2 text-sm font-medium text-[#475569]">
              IIIT Vadodara
            </Text>
          </View>

    </SafeAreaView>
  );
}