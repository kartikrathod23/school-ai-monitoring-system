import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "@/src/lib/api";

import {
  startOfflineSession,
  processAttendancePhoto,
  finalizeOfflineSession,
} from "@/src/services/offlineAttendance.service";
import { useAttendanceStore } from "@/src/store/attendance.store";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";
import { useAuthStore } from "@/src/store/auth.store";

export default function AttendanceCaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  
  const [images, setImages] = useState<{ uri: string; base64: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [sectionId, setSectionId] = useState("");
  
  const { token } = useAuthStore();

  useEffect(() => {
    requestPermission();
    loadSection();
  }, []);

  const loadSection = async () => {
    try {
      // In a fully offline app, this should also load from local SQLite.
      // For now, we assume the teacher selected a section beforehand.
      const response = await api.get("/teacher/sections");
      setSectionId(response.data.data[0]?.sectionId);
    } catch (error) {
      console.log("Failed to load sections from API", error);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    if (images.length >= 10) {
      Alert.alert("Limit reached", "You can click only up to 10 photos.");
      return;
    }

    // Must request base64 for local inference
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: true,
    });

    if (photo.base64) {
      setImages((prev) => [
        ...prev,
        { uri: photo.uri, base64: photo.base64! },
      ]);
    }
  };

  const deletePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const runLocalInference = async () => {
    if (images.length < 1) {
      Alert.alert("Minimum photos required", "Capture at least 1 photo");
      return;
    }
    if (!sectionId) {
      Alert.alert("Error", "No section selected");
      return;
    }

    try {
      setProcessing(true);
      
      // 1. Start session in SQLite
      setProgressText("Starting offline session...");
      const session = await startOfflineSession(sectionId);

      // 2. Process each photo locally (Detection -> Backbone -> Classifier -> Save Record)
      for (let i = 0; i < images.length; i++) {
        setProgressText(`Analyzing photo ${i + 1} of ${images.length}...`);
        await processAttendancePhoto(images[i].base64, (msg) => {
          setProgressText(msg);
        });
      }

      // 3. Mark remaining students as absent and finalize
      setProgressText("Finalizing results...");
      await finalizeOfflineSession();

      // 4. Try to trigger a background sync if online (fire and forget)
      if (token) {
        syncOfflineAttendance(token).catch(console.error);
      }

      // 5. Navigate to review screen
      router.push({
        pathname: "/(protected)/attendance-review",
        params: {
          sessionId: session.id,
        },
      });

    } catch (error: any) {
      console.error(error);
      Alert.alert("Processing failed", error.message || "Something went wrong during local inference");
    } finally {
      setProcessing(false);
      setProgressText("");
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Camera permission required</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B1220]">
      <View className="flex-row items-center justify-between bg-[#172033] px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back" size={18} color="white" />
          <Text className="ml-1 text-white"> Back</Text>
        </TouchableOpacity>

        <Text className="text-lg font-bold text-white"> Attendance Capture</Text>

        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            source={require("../../assets/images/uitb-logo.jpg")}
            className="h-10 w-10"
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-[#2563EB] px-4 py-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle-outline" size={18} color="white" />
            <Text className="ml-2 text-base font-semibold text-white"> On-Device Face Scanning</Text>
          </View>
          <Text className="mt-3 text-sm text-white">Capture group photos for offline processing.</Text>
          <Text className="mt-1 text-sm text-white">• Photos are processed locally on your phone</Text>
          <Text className="mt-1 text-sm text-white">• No internet required</Text>
        </View>

        <View className="px-4 pt-5">
          <View className="overflow-hidden rounded-3xl border border-[#334155] bg-[#1E293B]">
            <CameraView
              ref={cameraRef}
              style={{ height: 380 }}
              facing={"back" as CameraType}
            />
          </View>

          <Text className="mt-5 text-center text-xl font-semibold text-white">
            {images.length === 0
              ? "No images captured yet"
              : `${images.length} images captured`}
          </Text>

          {images.length > 0 && (
            <>
              <Text className="mt-5 text-sm font-semibold text-white">Captured Photos:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {images.map((img, index) => (
                  <View key={index} className="mr-3">
                    <Image source={{ uri: img.uri }} className="h-20 w-20 rounded-xl" />
                    <TouchableOpacity
                      onPress={() => deletePhoto(index)}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1"
                    >
                      <Ionicons name="close" size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            onPress={capturePhoto}
            className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-[#2563EB]"
          >
            <Ionicons name="camera-outline" size={22} color="white" />
            <Text className="ml-2 text-base font-semibold text-white">Capture Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={images.length < 1 || processing}
            onPress={runLocalInference}
            className={`mt-4 h-14 items-center justify-center rounded-2xl ${
              images.length >= 1 ? "bg-[#16A34A]" : "bg-gray-600"
            }`}
          >
            {processing ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" />
                <Text className="ml-2 text-base font-semibold text-white">{progressText || "Processing locally..."}</Text>
              </View>
            ) : (
              <Text className="text-base font-semibold text-white">
                Process Attendance Locally ({images.length} images)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}