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
import {CameraView,useCameraPermissions,} from "expo-camera";

import {
  ArrowLeft,
  Camera,
  CircleCheckBig,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react-native";

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

      Alert.alert("Success","Face onboarding completed");
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
    <SafeAreaView className="flex-1 bg-[#081120]">
      {/* HEADER */}
      <View className="h-16 flex-row items-center justify-between bg-[#111827] px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft
            size={20}
            color="white"
          />

          <Text className="ml-2 text-base text-white">
            Back
          </Text>
        </TouchableOpacity>

        <Text className="text-lg font-bold text-white">
          Student Face Capture
        </Text>

            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
                <Image
                    source={require("../../../assets/images/uitb-logo.jpg")}
                    className="h-10 w-10"
                    resizeMode="contain"
                />
            </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {/* TOP */}
        <LinearGradient
          colors={["#C026D3", "#2563EB"]}
          className="px-4 pb-5 pt-4"
        >
          <Text className="text-2xl font-bold text-white">
            {studentName}
          </Text>

          <Text className="mt-1 text-sm text-purple-100">
            Face Onboarding - One Student at a Time
          </Text>

          <View className="mt-4 rounded-xl bg-[#A21CAF] px-4 py-3">
            <Text className="text-center text-white">
              {images.length}/10 images captured
            </Text>
          </View>
        </LinearGradient>

        {/* GUIDELINES */}
        <View className="bg-[#2563EB] px-4 py-5">
          <View className="flex-row items-center">
            <Info
              size={18}
              color="white"
            />

            <Text className="ml-2 text-lg font-bold text-white">
              Face Capture Guidelines
            </Text>
          </View>

          <Text className="mt-4 text-sm leading-7 text-white">
            • Click at least 5 clear face images{"\n"}
            • Student should look at camera{"\n"}
            • Different angles recommended{"\n"}
            • Remove masks if possible{"\n"}
            • Use good lighting{"\n"}
            • In-app camera only
          </Text>
        </View>

        {/* CAMERA */}
        <View className="px-4 py-5">
          <View className="overflow-hidden rounded-[28px] border border-[#334155]">
            <CameraView
              ref={cameraRef}
              style={{
                height: 430,
              }}

              facing="back"
            />
          </View>

          <View className="mt-4 items-center">
            <Text className="text-lg font-semibold text-white">
              {images.length === 0
                ? "No images captured yet"
                : `${images.length} images captured`}
            </Text>
          </View>
        </View>

        {/* IMAGE LIST */}
        {images.length > 0 && (
          <View className="px-4">
            <Text className="mb-4 text-base font-semibold text-white">
              Captured Images
            </Text>

            <ScrollView horizontal>
              {images.map((uri, index) => (
                <View
                  key={index}
                  className="mr-3"
                >
                  <Image
                    source={{ uri }}
                    className="h-24 w-24 rounded-2xl"
                  />

                  <TouchableOpacity
                    onPress={() =>
                      removeImage(index)
                    }
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-red-500"
                  >
                    <Trash2
                      size={15}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BUTTONS */}
        <View className="px-4 pb-8 pt-6">
          <View className="flex-row gap-x-3">
            <TouchableOpacity
              onPress={() => setImages([])}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#374151] py-4"
            >
              <RotateCcw
                size={18}
                color="white"
              />

              <Text className="ml-2 font-semibold text-white">
                Retake
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={
                images.length < 5 || uploading
              }

              onPress={submitImages}

              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#16A34A] py-4"
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CircleCheckBig
                    size={18}
                    color="white"
                  />

                  <Text className="ml-2 font-semibold text-white">
                    Submit
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={captureImage}
            className="mt-4 flex-row items-center justify-center rounded-2xl bg-[#C026D3] py-5"
          >
            <Camera
              size={20}
              color="white"
            />

            <Text className="ml-2 text-lg font-semibold text-white">
              Capture Face Image
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View className="mb-6 flex-row items-center justify-center">
          <Text className="mr-2 text-sm text-[#94A3B8]">
            Powered by
          </Text>

          <Image
            source={require("../../../assets/images/iiitv-logo.png")}
            className="h-6 w-6"
          />

          <Text className="ml-2 text-sm text-[#CBD5E1]">
            IIIT Vadodara
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}