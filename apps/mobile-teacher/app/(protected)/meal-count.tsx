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
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";

import { createOfflineMealSession } from "@/src/db/offlineMeal";
import { faceDetector } from "@/src/ml/faceDetector";
import { api } from "@/src/lib/api";

export default function MealCountScreen() {

    const [permission, requestPermission] =useCameraPermissions();
    const cameraRef = useRef<any>(null);
    const [images, setImages] =useState<string[]>([]);
    const [uploading, setUploading] =useState(false);
    const [progressText, setProgressText] = useState("");
    const [sectionId, setSectionId] =useState("");

    useEffect(() => {

        requestPermission();
        loadSection();

    }, []);

    const loadSection = async () => {
        try {
            const response =await api.get("/teacher/sections");
            setSectionId(response.data.data[0]?.sectionId);
        } catch (error) {
            console.log(error);
        }
    };

    const capturePhoto = async () => {
        if (!cameraRef.current) {
            return;
        }

        if (images.length >= 10) {
            Alert.alert("Limit reached","Maximum 10 photos allowed");
            return;
        }

        const photo =await cameraRef.current.takePictureAsync({quality: 0.7, base64: true});

        setImages((prev) => [...prev, photo.base64,]);
    };

    const removeImage = (index: number) => {
        setImages((prev) =>
            prev.filter((_, i) => i !== index)
        );
    };

    const submitMeal = async () => {
        try {
            setUploading(true);

            let totalDetected = 0;

            if (!faceDetector.ready) {
                setProgressText("Initializing face detector...");
                await faceDetector.initialize();
            }

            setProgressText("Processing photos...");
            // Run on-device face detection for each image
            for (const base64 of images) {
                const faces = await faceDetector.detectFaces(base64);
                totalDetected += faces.length;
            }

            // Create offline session
            const detectorVersion = faceDetector.ready ? "Det_Retina_Net" : "unknown";
            const sessionId = await createOfflineMealSession(sectionId, totalDetected, detectorVersion);

            setUploading(false);
            
            router.push({
                pathname: "/(protected)/meal-review",
                params: { sessionId },
            });

        } catch (error: any) {
            console.error("Local meal processing error:", error);
            Alert.alert(
                "Error",
                error.message || "Meal processing failed"
            );
            setUploading(false);
        }
    };

    if (!permission?.granted) {
        return (
            <View className="flex-1 items-center justify-center bg-[#091222]">
                <ActivityIndicator color="white" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#091222]">
            <View className="flex-row items-center justify-between bg-[#091222] px-4 py-4">

                <TouchableOpacity
                    onPress={() => router.back()}
                >

                    <Text className="text-white text-[17px]">
                        ← Back
                    </Text>

                </TouchableOpacity>

                <Text className="text-[20px] font-bold text-white">
                    Meal Count Capture
                </Text>

                <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
                    <Image
                        source={require("../../assets/images/uitb-logo.jpg")}
                        className="h-10 w-10"
                        resizeMode="contain"
                    />
                </View>

            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 40,
                }}
            >

                <View className="bg-[#00A86B] px-5 py-5">

                    <Text className="text-[18px] font-bold text-white">
                        Head Count for Meal Calculation
                    </Text>

                    <View className="mt-4 gap-y-2">

                        <Text className="text-white">
                            • Click at least one classroom photos
                        </Text>

                        <Text className="text-white">
                            • You can click multiple pictures, but ensure one student appears in at most one picture
                        </Text>

                        <Text className="text-white">
                            • Ensure all students are visible
                        </Text>

                        <Text className="text-white">
                            • Use good lighting
                        </Text>

                        <Text className="text-white">
                            • Hold camera steady
                        </Text>


                    </View>
                </View>

                {/* <View className="bg-[#1B2740] px-4 py-3">

                    <Text className="text-[#D1D5DB] text-[14px]">
                        AI will count total students for meal calculation (no identity)
                    </Text>

                </View> */}

                <View className="mx-4 mt-5 overflow-hidden rounded-3xl border border-[#475569]">

                    <CameraView
                        ref={cameraRef}
                        style={{
                            height: 380,
                        }}
                        facing="back"
                    />

                </View>

                <Text className="mt-5 text-center text-[20px] font-bold text-white">

                    {images.length === 0
                        ? "No images captured yet"
                        : `${images.length} images captured`}

                </Text>

                {images.length > 0 && (

                    <View className="mt-5">

                        <Text className="mb-3 px-4 text-base font-semibold text-white">
                            Captured Photos:
                        </Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="px-4"
                        >

                            {images.map((uri, index) => (

                                <View
                                    key={index}
                                    className="mr-3"
                                >

                                    <Image
                                        source={{ uri: "data:image/jpeg;base64," + uri }}
                                        className="h-28 w-24 rounded-2xl"
                                    />

                                    <TouchableOpacity
                                        onPress={() =>
                                            removeImage(index)
                                        }
                                        className="mt-2 rounded-xl bg-red-500 py-2"
                                    >

                                        <Text className="text-center text-xs font-semibold text-white">
                                            Delete
                                        </Text>

                                    </TouchableOpacity>

                                </View>
                            ))}

                        </ScrollView>

                    </View>
                )}

                <View className="mt-6 px-4">

                    <TouchableOpacity
                        onPress={capturePhoto}
                        className="rounded-2xl bg-[#00A86B] py-4"
                    >

                        <Text className="text-center text-[16px] font-bold text-white">
                            Capture Photo
                        </Text>

                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={
                            images.length < 1 ||
                            uploading
                        }
                        onPress={submitMeal}
                        className={`mt-4 rounded-2xl py-4 ${images.length < 1
                                ? "bg-gray-600"
                                : "bg-[#16A34A]"
                            }`}
                    >

                        <Text className="text-center text-[16px] font-bold text-white">

                            {uploading
                                ? progressText || "AI Processing Meal Count..."
                                : `Submit for Processing (${images.length} images)`}

                        </Text>

                    </TouchableOpacity>

                </View>

                <View className="mt-8 flex-row items-center justify-center">

                    <Text className="text-[13px] text-[#CBD5E1]">
                        Powered by
                    </Text>

                    <Image
                        source={require("@/assets/images/iiitv-logo.png")}
                        className="mx-2 h-6 w-6 rounded-full"
                    />

                    <Text className="text-[13px] text-[#CBD5E1]">
                        IIIT Vadodara
                    </Text>

                </View>

            </ScrollView>

        </SafeAreaView>
    );
}