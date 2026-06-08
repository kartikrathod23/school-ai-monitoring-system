import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import Toast from "react-native-toast-message";

import { loginTeacher } from "../../src/services/auth.service";
import { saveToken } from "../../src/lib/storage";
import { useAuthStore } from "../../src/store/auth.store";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please enter credentials",
      });

      return;
    }

    try {
      setLoading(true);

      const response = await loginTeacher(
        identifier,
        password
      );

      await saveToken(response.token);

      setAuth(response.token, response.user);

      Toast.show({
        type: "success",
        text1: "Login Successful",
      });

      router.replace("/(protected)/dashboard");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2:error.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* HEADER */}
        <View className="h-16 flex-row items-center justify-end bg-[#2563EB] px-4">
          <View className="h-11 w-11 overflow-hidden rounded-full bg-white items-center justify-center">
            <Image
              source={require("../../assets/images/uitb-logo.jpg")}
              className="h-10 w-10"
              resizeMode="contain"
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CARD */}
          <View className="rounded-[28px] bg-white p-6 shadow-sm">
            {/* ICON */}
            <View className="items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-[#2563EB]">
                <Text className="text-[34px] text-white">
                  👨‍🏫
                </Text>
              </View>

              <Text className="mt-5 text-[30px] font-bold text-[#1E293B]">
                Teacher Login
              </Text>

              <Text className="mt-2 text-center text-[15px] text-[#64748B]">
                Daily Attendance & Meal Recording
              </Text>
            </View>

            {/* ID */}
            <View className="mt-8">
              <Text className="mb-2 text-sm font-medium text-[#475569]">
                Teacher ID / Mobile
              </Text>

              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Enter your ID or mobile number"
                placeholderTextColor="#94A3B8"
                className="h-14 rounded-xl border border-[#D7DFEA] bg-[#F8FAFC] px-4 text-base text-black"
              />
            </View>

            {/* PASSWORD */}
            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-[#475569]">
                Password
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                className="h-14 rounded-xl border border-[#D7DFEA] bg-[#F8FAFC] px-4 text-base text-black"
              />
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleLogin}
              className="mt-7 h-14 items-center justify-center rounded-xl bg-[#2563EB]"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-semibold text-white">
                  Login
                </Text>
              )}
            </TouchableOpacity>

            {/* FORGOT */}
            <TouchableOpacity className="mt-5 items-center">
              <Text className="text-sm text-[#2563EB]">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View className="my-6 h-px bg-[#E2E8F0]" />

            {/* INFO */}
            <View className="rounded-2xl bg-[#EEF4FF] p-4">
              <Text className="text-sm font-bold text-[#1D4ED8]">
                Role: Teacher
              </Text>

              <Text className="mt-1 text-sm leading-5 text-[#2563EB]">
                You can mark attendance and record meal counts
                for your assigned classes only.
              </Text>
            </View>
          </View>

          {/* FOOTER */}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}