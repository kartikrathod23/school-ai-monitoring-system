import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect,useState } from "react";
import { router } from "expo-router";

import {
  ArrowLeft,
  Calendar,
  ChevronRight,
} from "lucide-react-native";

import {getAttendanceHistory,} from "@/src/services/attendance.service";

export default function AttendanceHistoryScreen() {
  const [loading,setLoading] =useState(true);
  const [sessions,setSessions] =useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response =await getAttendanceHistory();
      setSessions(response.data.data || []);

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {

    return (
      <SafeAreaView
        className="flex-1 bg-[#F5F7FB] justify-center items-center"
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">

      <View className="bg-[#2563EB] px-5 pt-4 pb-5">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.back()}
          >
            <ArrowLeft
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4">
            Attendance History
          </Text>
        </View>

      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >

        {
          sessions.map((session) => (

            <TouchableOpacity
              key={session.id}

              onPress={() =>
                router.push(
                  `/attendance-review?sessionId=${session.id}`
                )
              }

              className="bg-white rounded-3xl p-5 mb-4 border border-gray-100"
            >

              <View className="flex-row justify-between items-start">

                <View className="flex-1">

                  <View className="flex-row items-center">

                    <Calendar
                      size={18}
                      color="#2563EB"
                    />

                    <Text className="ml-2 text-lg font-bold text-gray-900">
                      {
                        new Date(
                          session.date
                        ).toDateString()
                      }
                    </Text>
                  </View>

                  <View className="flex-row mt-4">

                    <View className="bg-[#EEF2FF] rounded-2xl px-4 py-3 mr-3 flex-1">

                      <Text className="text-[#4F46E5] text-2xl font-bold text-center">
                        {session.present}
                      </Text>

                      <Text className="text-[#4F46E5] text-center mt-1">
                        Present
                      </Text>
                    </View>

                    <View className="bg-[#FEF2F2] rounded-2xl px-4 py-3 flex-1">

                      <Text className="text-[#DC2626] text-2xl font-bold text-center">
                        {session.absent}
                      </Text>

                      <Text className="text-[#DC2626] text-center mt-1">
                        Absent
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row justify-between items-center">

                    <Text className="text-gray-500">
                      Attendance
                    </Text>

                    <Text className="text-[#D97706] text-lg font-bold">
                      {
                        session.attendancePercentage
                      }%
                    </Text>
                  </View>

                  <View className="mt-2">

                    <Text
                      className={`
                        text-sm font-semibold

                        ${
                          session.status === "FINALIZED"
                            ? "text-green-600"
                            : "text-orange-500"
                        }
                      `}
                    >
                      {session.status}
                    </Text>

                  </View>

                </View>

                <ChevronRight
                  size={24}
                  color="#9CA3AF"
                />

              </View>

            </TouchableOpacity>
          ))
        }

        {
          sessions.length === 0 && (

            <View className="items-center mt-20">

              <Text className="text-gray-400 text-lg">
                No attendance history found
              </Text>

            </View>
          )
        }

      </ScrollView>

    </SafeAreaView>
  );
}