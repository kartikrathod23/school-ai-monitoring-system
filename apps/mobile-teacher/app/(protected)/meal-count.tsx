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
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
        <SafeAreaView className="flex-1 bg-[#F4F7FB]">
            {/* Header Section */}
            <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <Text className="text-lg font-bold text-[#0F172A]">Meal Count</Text>

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
                            {images.map((uri, index) => (
                                <View key={index} className="mr-4 relative">
                                    <Image source={{ uri: "data:image/jpeg;base64," + uri }} className="h-24 w-24 rounded-2xl border border-gray-200" />
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
                                    disabled={uploading}
                                    activeOpacity={0.7}
                                    onPress={submitMeal}
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

                    {uploading && progressText && (
                         <Text className="text-center text-sm font-semibold text-[#64748B] mt-2 mb-4">
                             {progressText}
                         </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}