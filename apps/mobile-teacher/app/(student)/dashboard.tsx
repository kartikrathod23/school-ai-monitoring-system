import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle,
  XCircle,
  Clock3,
} from "lucide-react-native";

import { useEffect, useState } from "react";

import {
  getStudentProfile,
  getTodayAttendance,
  getMonthlySummary,
  getMonthlyAttendance,
  getRecentAttendance,
  getAttendanceStatistics,
} from "@/src/services/student/student.service";

export default function StudentDashboard() {

  const [loading,setLoading] =
    useState(true);

  const [profile,setProfile] =
    useState<any>(null);

  const [today,setToday] =
    useState<any>(null);

  const [summary,setSummary] =
    useState<any>(null);

  const [calendar,setCalendar] =
    useState<any[]>([]);

  const [recent,setRecent] =
    useState<any[]>([]);

  const [stats,setStats] =
    useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {

    try {

      const now = new Date();

      const month =
        now.getMonth() + 1;

      const year =
        now.getFullYear();

      const [
        profileRes,
        todayRes,
        summaryRes,
        calendarRes,
        recentRes,
        statsRes,
      ] = await Promise.all([
        getStudentProfile(),
        getTodayAttendance(),
        getMonthlySummary(month,year),
        getMonthlyAttendance(month,year),
        getRecentAttendance(),
        getAttendanceStatistics(),
      ]);

      setProfile(
        profileRes.data.data
      );

      setToday(
        todayRes.data.data
      );

      setSummary(
        summaryRes.data.data
      );

      setCalendar(
        calendarRes.data.data
      );

      console.log(recentRes.data.data)

      setRecent(
        recentRes.data.data
      );

      setStats(
        statsRes.data.data
      );

    } catch(error) {

      console.log(error);

    } finally {

      setLoading(false);
    }
  };

  if(loading){

    return(
      <SafeAreaView
        className="flex-1 justify-center items-center bg-[#F4F6FA]"
      >
        <ActivityIndicator
          size="large"
          color="#10B981"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6FA]">

      <ScrollView
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}

        <View className="bg-[#10B981] px-5 pt-5 pb-6">

          <View className="flex-row justify-between items-center">

            <View>

              <Text className="text-white text-lg font-bold">
                Student Dashboard
              </Text>

              <Text className="text-white/90 mt-1">
                {profile.firstName}
                {" "}
                {profile.lastName}
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

          <View className="mt-4 flex-row">

            <View className="flex-1 rounded-xl bg-white/15 p-3 mr-2">

              <Text className="text-white/80 text-xs">
                Roll No
              </Text>

              <Text className="text-white font-bold mt-1">
                {profile.rollNumber}
              </Text>

            </View>

            <View className="flex-1 rounded-xl bg-white/15 p-3">

              <Text className="text-white/80 text-xs">
                Class
              </Text>

              <Text className="text-white font-bold mt-1">
                {profile.standard}
                {" - "}
                {profile.section}
              </Text>

            </View>

          </View>

        </View>

        {/* INFO CARD */}

        {/* <View className="mx-4 mt-4 rounded-2xl border border-[#D6E4FF] bg-[#F0F7FF] p-4">

          <Text className="text-[#2563EB] text-sm">

            Read Only Access:
            You can view your attendance records but cannot modify them.

          </Text>

        </View> */}

        {/* TODAY ATTENDANCE */}

        <View className="mx-4 mt-4 rounded-2xl bg-white p-5">

        <Text className="font-semibold text-gray-700">
            Today's Attendance
        </Text>

        <View className="mt-4 items-center">

            <View className="mt-4 items-center">

            {today.status === "PRESENT" && (
                <CheckCircle
                size={70}
                color="#16A34A"
                />
            )}

            {today.status === "ABSENT" && (
                <XCircle
                size={70}
                color="#DC2626"
                />
            )}

            {today.status === "NOT_MARKED" && (
                <Clock3
                size={70}
                color="#F59E0B"
                />
            )}

            <Text className="mt-4 text-2xl font-bold">

                {today.status === "PRESENT" &&
                "Present"}

                {today.status === "ABSENT" &&
                "Absent"}

                {today.status === "NOT_MARKED" &&
                "Attendance Pending"}

            </Text>

            {
                today.status === "NOT_MARKED" && (
                <Text className="mt-2 text-gray-500">
                    Attendance has not been taken yet
                </Text>
                )
            }

            {
                today.status === "PRESENT" &&
                today.markedAt && (
                <Text className="mt-2 text-gray-500">
                    Marked at{" "}
                    {new Date(
                    today.markedAt
                    ).toLocaleTimeString()}
                </Text>
                )
            }

            {
                today.status === "ABSENT" &&
                today.markedAt && (
                <Text className="mt-2 text-gray-500">
                    Marked at{" "}
                    {new Date(
                    today.markedAt
                    ).toLocaleTimeString()}
                </Text>
                )
            }

            </View>

        </View>

        </View>

        {/* MONTHLY SUMMARY */}

        <View className="mx-4 mt-4 rounded-2xl bg-white p-5">

          <Text className="font-semibold text-gray-700">
            Monthly Summary
          </Text>

          <View className="flex-row mt-4">

            <View className="flex-1 rounded-xl bg-green-50 p-4 mr-2">

              <Text className="text-center text-2xl font-bold text-green-600">
                {summary.present}
              </Text>

              <Text className="text-center text-green-700 mt-1">
                Present
              </Text>

            </View>

            <View className="flex-1 rounded-xl bg-red-50 p-4 mr-2">

              <Text className="text-center text-2xl font-bold text-red-600">
                {summary.absent}
              </Text>

              <Text className="text-center text-red-700 mt-1">
                Absent
              </Text>

            </View>

            <View className="flex-1 rounded-xl bg-blue-50 p-4">

              <Text className="text-center text-2xl font-bold text-blue-600">
                {summary.attendancePercentage}%
              </Text>

              <Text className="text-center text-blue-700 mt-1">
                Rate
              </Text>

            </View>

          </View>

        </View>

        {/* RECENT ATTENDANCE */}

        <View className="mx-4 mt-4 rounded-2xl bg-white p-5">

          <Text className="font-semibold text-gray-700">
            Last 7 Days
          </Text>

          {
            recent.map((item:any,index:number) => (

                <View
                key={index}
                className="flex-row justify-between py-3 border-b border-gray-100"
                >

                <Text>
                    {
                    new Date(
                        item.date
                    ).toDateString()
                    }
                </Text>

                <Text
                    className={
                    item.status === "PRESENT"
                        ? "text-green-600"
                        : "text-red-500"
                    }
                >
                    {item.status}
                </Text>

                </View>

            ))
            }

        </View>

        {/* STATISTICS */}

        <View className="mx-4 mt-4 mb-8 rounded-2xl bg-white p-5">

          <Text className="font-semibold text-gray-700">
            Overall Statistics
          </Text>

          <View className="mt-4">

            <View className="flex-row justify-between py-2">

              <Text>Total School Days</Text>

              <Text>
                {stats.totalSchoolDays}
              </Text>

            </View>

            <View className="flex-row justify-between py-2">

              <Text>Present Days</Text>

              <Text className="text-green-600">
                {stats.presentDays}
              </Text>

            </View>

            <View className="flex-row justify-between py-2">

              <Text>Absent Days</Text>

              <Text className="text-red-600">
                {stats.absentDays}
              </Text>

            </View>

            <View className="flex-row justify-between py-2">

              <Text>Attendance Rate</Text>

              <Text className="font-bold text-blue-600">
                {stats.attendancePercentage}%
              </Text>

            </View>

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

      </ScrollView>

    </SafeAreaView>
  );
}