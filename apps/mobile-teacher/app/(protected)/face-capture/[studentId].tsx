import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import * as Location from "expo-location";
import { uploadFaceImages } from "@/src/services/faceOnboarding.service";

export default function FaceCaptureScreen() {
  const { studentId, studentName } =useLocalSearchParams();
  const [permission, requestPermission] =useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const captureImage = async () => {
    if (!cameraRef.current) {
      return;
    }

    if (images.length >= 10) {
      Alert.alert( "Limit reached", "Maximum 10 images allowed");
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({quality: 0.7,});
    setImages((prev) => [...prev, photo.uri]);
  };

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const submitImages = async () => {
    try {
      setUploading(true);
      const location = await Location.getCurrentPositionAsync({});
      const formData = new FormData();
      formData.append("studentId",studentId as string);
      formData.append( "latitude",String(location.coords.latitude));
      formData.append("longitude",String(location.coords.longitude));

      images.forEach((uri, index) => {
        formData.append("images", {
          uri,
          name: `face-${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      await uploadFaceImages(formData);

      Alert.alert("Success", "Photos saved successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Upload failed", error?.response?.data?.message ||"Something went wrong");
    } finally {
      setUploading(false); 
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No camera permission</Text>
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

                <Text className="text-lg font-bold text-[#0F172A]">{studentName}</Text>

                <View className="h-10 w-10 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-white items-center justify-center">
                    <Image
                        source={require("../../../assets/images/uitb-logo.jpg")}
                        className="h-8 w-8"
                        resizeMode="contain"
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                
                {/* Progress / Status Header */}
                <View className="px-5 mt-2 mb-4">
                  <View className="flex-row items-center justify-between bg-[#4338CA] px-5 py-4 rounded-2xl shadow-sm">
                    <View>
                      <Text className="text-white font-bold text-base">Face Onboarding</Text>
                      <Text className="text-indigo-200 text-xs mt-1">Capture at least 5 clear images</Text>
                    </View>
                    <View className="bg-white/20 px-3 py-1.5 rounded-full">
                      <Text className="text-white font-bold text-sm">{images.length}/10</Text>
                    </View>
                  </View>
                </View>

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
                            {images.map((uri, index) => (
                                <View key={index} className="mr-4 relative">
                                    <Image source={{ uri }} className="h-24 w-24 rounded-2xl border border-gray-200" />
                                    <TouchableOpacity
                                        onPress={() => removeImage(index)}
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
                        {/* Reset / Retake Button */}
                        <View className="w-16">
                            {images.length > 0 && (
                              <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => setImages([])}
                                  className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 border border-gray-200"
                              >
                                  <Ionicons name="refresh-outline" size={20} color="#475569" />
                              </TouchableOpacity>
                            )}
                        </View>
                        
                        {/* Round Shutter Button */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={captureImage}
                            className="h-20 w-20 items-center justify-center rounded-full bg-white border-[6px] border-gray-200 shadow-md"
                        >
                            <View className="h-[68px] w-[68px] rounded-full bg-white border border-gray-100 shadow-sm" />
                        </TouchableOpacity>

                        {/* Process Tick Mark Button */}
                        <View className="w-16 items-end">
                            {images.length >= 5 && (
                                <TouchableOpacity
                                    disabled={uploading}
                                    activeOpacity={0.7}
                                    onPress={submitImages}
                                    className="h-16 w-16 items-center justify-center rounded-full bg-[#10B981] shadow-lg"
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Ionicons name="checkmark-sharp" size={32} color="white" />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
  );
}