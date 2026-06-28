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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO AREA */}
          <View className="items-center mb-10 mt-4">
            <View className="h-28 w-28 overflow-hidden rounded-[2rem] border-4 border-white shadow-lg bg-white items-center justify-center">
              <Image
                source={require("../../assets/images/uitb-logo.jpg")}
                className="h-24 w-24"
                resizeMode="contain"
              />
            </View>
            <Text className="mt-6 text-[32px] font-extrabold text-[#0F172A]">
              Welcome Back
            </Text>
            <Text className="mt-2 text-base font-medium text-[#64748B]">
              Sign in to manage your classroom
            </Text>
          </View>

          {/* CARD */}
          <View className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            {/* ID */}
            <View className="mb-5">
              <Text className="mb-2 text-sm font-bold text-[#475569]">
                Teacher ID / Mobile
              </Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Enter your ID or mobile"
                placeholderTextColor="#94A3B8"
                className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-[#0F172A]"
                autoCapitalize="none"
              />
            </View>

            {/* PASSWORD */}
            <View className="mb-2">
              <Text className="mb-2 text-sm font-bold text-[#475569]">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-[#0F172A]"
              />
            </View>

            {/* FORGOT */}
            <View className="flex-row justify-end mb-6">
              <TouchableOpacity>
                <Text className="text-sm font-bold text-[#4338CA]">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleLogin}
              activeOpacity={0.8}
              className="h-14 flex-row items-center justify-center rounded-2xl bg-[#4338CA] shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-bold text-white">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View className="mt-12 mb-6 flex-row items-center justify-center">
            <Text className="mr-2 text-sm font-medium text-[#94A3B8]">
              Powered by
            </Text>
            <Image
              source={require("../../assets/images/iiitv-logo.png")}
              className="h-6 w-6 opacity-80"
              resizeMode="contain"
            />
            <Text className="ml-2 text-sm font-bold text-[#64748B]">
              IIIT Vadodara
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}