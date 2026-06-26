import { useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import { api } from "@/src/lib/api";

export default function FaceOnboardingScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    try {
      const sectionsResponse = await api.get("/teacher/sections");
      const section =sectionsResponse.data.data[0];
      const studentsResponse =await api.get(`/teacher/sections/${section.sectionId}/students`);
      setStudents(studentsResponse.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();

    const interval = setInterval(() => {
      const hasPendingStudents =
        students.some(
          (student) =>
            student.faceStatus === "PENDING"
        );

      if (hasPendingStudents) {
        loadStudents();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [students]);

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
            <View className="bg-[#9333EA] px-4 pb-5 pt-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-white">
                    Face Onboarding
                  </Text>

                  <Text className="mt-1 text-base text-purple-100">
                    Standard 5 - Section A
                  </Text>
                </View>

                <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
                  <Image
                    source={require("../../assets/images/uitb-logo.jpg")}
                    className="h-10 w-10"
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View className="mt-5 flex-row justify-between">
                <View className="w-[31%] rounded-2xl bg-[#22C55E] py-3">
                  <Text className="text-center text-2xl font-bold text-white">
                    {addedCount}
                  </Text>

                  <Text className="mt-1 text-center text-sm text-white">
                    Added
                  </Text>
                </View>

                <View className="w-[31%] rounded-2xl bg-[#F59E0B] py-3">
                  <Text className="text-center text-2xl font-bold text-white">
                    {pendingCount}
                  </Text>

                  <Text className="mt-1 text-center text-sm text-white">
                    Pending
                  </Text>
                </View>

                <View className="w-[31%] rounded-2xl bg-[#EF4444] py-3">
                  <Text className="text-center text-2xl font-bold text-white">
                    {rescanCount}
                  </Text>

                  <Text className="mt-1 text-center text-sm text-white">
                    Re-scan
                  </Text>
                </View>
              </View>
            </View>

            <View className="mx-4 mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <Text className="text-base font-semibold text-[#0F172A]">
                One-Time Setup
              </Text>

              <Text className="mt-2 text-sm leading-6 text-[#64748B]">
                • Capture at least 5 face images{"\n"}
                • Student should look at camera{"\n"}
                • Good lighting required{"\n"}
                • Different face angles preferred{"\n"}
                • Remove masks if possible
              </Text>
            </View>

            <View className="mx-4 mt-5 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-[#334155]">
                Student List ({students.length})
              </Text>

              <View className="flex-row items-center rounded-xl border border-[#CBD5E1] bg-white px-3 py-2">
                <Funnel
                  size={15}
                  color="#64748B"
                />

                <Text className="ml-2 text-sm text-[#475569]">
                  All Students
                </Text>
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
                  pathname:"/(teacher)/face-capture/[studentId]",
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
                      ? "Verification Pending"
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
                  <ActivityIndicator
                    size="small"
                    color="#D97706"
                  />

                  <Text className="ml-2 text-sm text-[#B45309]">
                    AI verification in progress
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}

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