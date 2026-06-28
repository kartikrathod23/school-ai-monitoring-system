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

import { getSectionCache, SectionCache } from "@/src/lib/sectionCache";
import { checkCurrentLocation } from "@/src/services/location.service";

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
  const [sectionData, setSectionData] = useState<SectionCache | null>(null);
  
  const { token } = useAuthStore();

  useEffect(() => {
    requestPermission();
    loadSection();
  }, []);

  const loadSection = async () => {
    try {
      const data = await getSectionCache();
      if (data) {
        setSectionData(data);
      } else {
        Alert.alert(
          "Setup Required",
          "Please return to the dashboard while online to sync your section data."
        );
      }
    } catch (error) {
      console.log("Failed to load section data from cache", error);
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
    if (!sectionData) {
      Alert.alert("Error", "No section data. Please sync while online.");
      return;
    }

    try {
      setProcessing(true);

      // Geo-fence verification
      setProgressText("Verifying location...");
      const locationCheck = await checkCurrentLocation(
        sectionData.schoolLatitude,
        sectionData.schoolLongitude,
        sectionData.geoRadius
      );

      if (!locationCheck.isInside) {
        Alert.alert(
          "Geo-Fence Verification Failed",
          `You must be on school premises to take attendance.\nYou are currently ${Math.round(locationCheck.distance)} meters away.`
        );
        return;
      }
      
      // 1. Start session in SQLite
      setProgressText("Starting offline session...");
      const session = await startOfflineSession(sectionData.sectionId);

      setProgressText("Initializing ML models...");
      const { faceDetector } = require("@/src/ml/faceDetector");
      if (!faceDetector.ready) {
        await faceDetector.initialize();
      }

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
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      {/* Header Section */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#0F172A]">Attendance</Text>

        <View className="h-10 w-10 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-white items-center justify-center">
          <Image
            source={require("../../assets/images/uitb-logo.jpg")}
            className="h-8 w-8"
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <View className="pt-4" />
        {/* Camera View */}
        <View className="px-5">
          <View className="overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-200">
            <CameraView
              ref={cameraRef}
              style={{ height: 400 }}
              facing={"back" as CameraType}
            />
          </View>
        </View>

        {/* Captured Photos Section */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-[#0F172A]">
              Captured Photos
            </Text>
            <View className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              <Text className="text-indigo-700 font-bold text-xs">{images.length} / 10</Text>
            </View>
          </View>

          {images.length === 0 ? (
            <View className="h-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
              <Ionicons name="images-outline" size={24} color="#9CA3AF" />
              <Text className="mt-2 text-sm text-gray-400 font-medium">No photos captured yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
              {images.map((img, index) => (
                <View key={index} className="mr-4 relative">
                  <Image source={{ uri: img.uri }} className="h-24 w-24 rounded-2xl border border-gray-200" />
                  <TouchableOpacity
                    onPress={() => deletePhoto(index)}
                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-red-500 border-2 border-white items-center justify-center shadow-sm"
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Action Buttons: Camera Style */}
          <View className="mt-8 flex-row items-center justify-between px-6 pb-6">
            <View className="w-16 h-16" />
            
            {/* Round Shutter Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={capturePhoto}
              className="h-20 w-20 items-center justify-center rounded-full bg-white border-[6px] border-gray-200 shadow-md"
            >
              <View className="h-[68px] w-[68px] rounded-full bg-white border border-gray-100 shadow-sm" />
            </TouchableOpacity>

            {/* Process Tick Mark Button */}
            <View className="w-16 items-end">
              {images.length > 0 && (
                <TouchableOpacity
                  disabled={processing}
                  activeOpacity={0.7}
                  onPress={runLocalInference}
                  className="h-16 w-16 items-center justify-center rounded-full bg-[#10B981] shadow-lg"
                >
                  {processing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="checkmark-sharp" size={32} color="white" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {processing && progressText && (
             <Text className="text-center text-sm font-semibold text-[#64748B] mt-2 mb-4">
               {progressText}
             </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}