import { useEffect,useRef,useState } from "react";
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
import {
  CameraView,
  useCameraPermissions,
  CameraType,
} from "expo-camera";

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { api } from "@/src/lib/api";

export default function AttendanceCaptureScreen() {

  const [permission,requestPermission] =useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [images,setImages] =useState<string[]>([]);
  const [uploading,setUploading] =useState(false);
  const [sectionId,setSectionId] =useState("");
  
  useEffect(() => {
    requestPermission();
    loadSection();
  }, []);

  const loadSection = async () => {
    try {
      const response = await api.get("/teacher/sections");
      setSectionId(
        response.data.data[0]?.sectionId
      );

    } catch (error) {
      console.log(error);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    if (images.length >= 10) {
      Alert.alert( "Limit reached", "Maximum 10 photos allowed");
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({quality: 0.7,});

    setImages((prev) => [
      ...prev,
      photo.uri,
    ]);
  };

  const deletePhoto = (index: number) => {
    setImages((prev) =>
      prev.filter((_,i) => i !== index)
    );
  };

  const submitAttendance = async () => {
    try {
      if (images.length < 6) {
        Alert.alert("Minimum photos required","Capture at least 6 photos");
        return;
      }

      setUploading(true);
      const location = await Location.getCurrentPositionAsync({});
      const formData = new FormData();
      formData.append("sectionId",sectionId);

      formData.append("latitude",String(location.coords.latitude));

      formData.append(
        "longitude",
        String(location.coords.longitude)
      );

      images.forEach((uri,index) => {
        formData.append("images",
          {
            uri,
            name: `attendance-${index}.jpg`,
            type: "image/jpeg",
          } as any
        );
      });

      const response =await api.post("/attendance",formData,
          {
            headers: {"Content-Type":"multipart/form-data",},
          }
        );

      router.push({ 
        pathname: "/(protected)/attendance-review",
        params: {
          sessionId:
            response.data.data.id,
        },
      });

    } catch (error: any) {

      Alert.alert( "Upload failed", error?.response?.data?.message || "Something went wrong");

    } finally {
      setUploading(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">
          Camera permission required
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B1220]">
      <View className="flex-row items-center justify-between bg-[#172033] px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="white"
          />

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

      <ScrollView contentContainerStyle={{ paddingBottom: 40, }}
      >
        <View className="bg-[#2563EB] px-4 py-4">
          <View className="flex-row items-center">
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="white"
            />

            <Text className="ml-2 text-base font-semibold text-white"> Face Scanning for Attendance</Text>
          </View>

          <Text className="mt-3 text-sm text-white">Click at least 6 classroom photos</Text>
          <Text className="mt-1 text-sm text-white">• Ensure all students are visible</Text>
          <Text className="mt-1 text-sm text-white"> • Use good lighting</Text>
          <Text className="mt-1 text-sm text-white"> • Hold camera steady</Text>
          <Text className="mt-1 text-sm text-white">• No gallery upload - camera only</Text>
        </View>

        <View className="bg-[#1E293B] px-4 py-3">
          <View className="flex-row items-center">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#CBD5E1"
            />

            <Text className="ml-2 text-sm text-[#CBD5E1]">AI will match student faces for attendance marking </Text>
          </View>
        </View>

        <View className="px-4 pt-5">
          <View className="overflow-hidden rounded-3xl border border-[#334155] bg-[#1E293B]">
            <CameraView
              ref={cameraRef}
              style={{
                height: 380,
              }}

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

              <Text className="mt-5 text-sm font-semibold text-white">
                Captured Photos:
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
              >

                {images.map((uri,index) => (

                  <View
                    key={index}
                    className="mr-3"
                  >

                    <Image
                      source={{ uri }}
                      className="h-20 w-20 rounded-xl"
                    />

                    <TouchableOpacity
                      onPress={() =>
                        deletePhoto(index)
                      }

                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1"
                    >
                      <Ionicons
                        name="close"
                        size={12}
                        color="white"
                      />
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

            <Ionicons
              name="camera-outline"
              size={22}
              color="white"
            />

            <Text className="ml-2 text-base font-semibold text-white">
              Capture Photo
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            disabled={
              images.length < 6 ||
              uploading
            }

            onPress={submitAttendance}

            className={`mt-4 h-14 items-center justify-center rounded-2xl ${
              images.length >= 6
                ? "bg-[#2563EB]"
                : "bg-gray-600"
            }`}
          >

            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Submit for Processing ({images.length} images)
              </Text>
            )}

          </TouchableOpacity>

        </View>

      </ScrollView>

      <View className="border-t border-[#1E293B] bg-[#111827] py-3">

        <View className="flex-row items-center justify-center">

          <Text className="text-xs text-gray-300">
            Powered by
          </Text>

          <Image
            source={require("@/assets/images/iiitv-logo.png")}
            className="mx-2 h-5 w-5 rounded-full"
          />

          <Text className="text-xs text-gray-300">
            IIIT Vadodara
          </Text>

        </View>

      </View>

    </SafeAreaView>
  );
}