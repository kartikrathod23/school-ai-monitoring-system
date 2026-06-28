import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";

import {
  getOfflineSessionById,
  getSessionRecords,
  updateRecordStatus,
  reassignRecordToStudent,
} from "@/src/db/offlineAttendance";
import { getCachedStudents } from "@/src/db/sectionStudentCache";
import { syncOfflineAttendance } from "@/src/services/syncManager.service";
import { captureSingleStudentPhoto } from "@/src/services/offlineAttendance.service";
import { useAuthStore } from "@/src/store/auth.store";
import { OfflineAttendanceSession, OfflineAttendanceRecord } from "@/src/types/attendance.types";
import { StudentSelectModal, StudentListItem } from "@/src/components/StudentSelectModal";

export default function AttendanceReviewScreen() {
  const { sessionId, fromHistory } = useLocalSearchParams();
  const { token } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [session, setSession] = useState<OfflineAttendanceSession | null>(null);
  const [records, setRecords] = useState<OfflineAttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);

  const handleManualSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await syncOfflineAttendance(token);
      Alert.alert("Sync Completed", "Attendance has been successfully synchronized to the server.");
      await loadData();
    } catch (err) {
      console.log(err);
      Alert.alert("Sync Failed", "An error occurred while syncing attendance.");
    } finally {
      setSyncing(false);
    }
  };

  // Modals state
  const [studentSelectVisible, setStudentSelectVisible] = useState(false);
  const [recordToReassign, setRecordToReassign] = useState<OfflineAttendanceRecord | null>(null);

  const [cameraVisible, setCameraVisible] = useState(false);
  const [absentRecordToCapture, setAbsentRecordToCapture] = useState<OfflineAttendanceRecord | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  const loadData = async () => {
    try {
      if (!sessionId) return;
      const sess = await getOfflineSessionById(sessionId as string);
      const recs = await getSessionRecords(sessionId as string);
      
      setSession(sess);
      setRecords(recs);

      if (sess && students.length === 0) {
        const cached = await getCachedStudents(sess.sectionId);
        setStudents(cached);
      }
    } catch (error) {
      console.log("Error loading session from SQLite:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    
    // Initialize face detector for manual captures
    const { faceDetector } = require("@/src/ml/faceDetector");
    if (!faceDetector.ready) {
      faceDetector.initialize().catch(console.error);
    }
    
    return () => clearInterval(interval);
  }, [sessionId]);



  // Re-assign a record to a selected student
  const onStudentSelected = async (student: StudentListItem) => {
    setStudentSelectVisible(false);
    if (!recordToReassign || !session) return;

    try {
      setLoading(true);
      await reassignRecordToStudent(
        recordToReassign.id,
        session.id,
        student.studentId,
        student.rollNumber,
        `${student.firstName} ${student.lastName}`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert("Error", "Could not reassign student.");
      console.error(err);
    }
  };

  // Capture photo for an absent student
  const handleCapturePhoto = async () => {
    if (!cameraRef.current || !absentRecordToCapture || !session) return;
    
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo.base64) throw new Error("Could not capture image base64.");

      await captureSingleStudentPhoto(
        photo.base64,
        absentRecordToCapture.id,
        session.id,
        absentRecordToCapture.rollNumber
      );
      
      setCameraVisible(false);
      setAbsentRecordToCapture(null);
      await loadData();
      Alert.alert("Success", `${absentRecordToCapture.studentName} marked as present.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to capture photo.");
      console.error(err);
    } finally {
      setCapturing(false);
    }
  };

  if (loading && records.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F4F7FB]">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!session) return <View className="flex-1 bg-[#F4F7FB]" />;

  const enrolledRecords = records.filter(r => r.rollNumber !== -1);
  const present = enrolledRecords.filter((r) => r.status === "PRESENT" || r.status === "MANUAL");
  const absent = enrolledRecords.filter((r) => r.status === "ABSENT");
  
  // Sort records: Unknowns first (rollNumber = -1), then Present/Manual, then Absent
  const sortedRecords = [...records].sort((a, b) => {
    if (a.rollNumber === -1 && b.rollNumber !== -1) return -1;
    if (b.rollNumber === -1 && a.rollNumber !== -1) return 1;
    
    const aStatusWeight = a.status === "PRESENT" || a.status === "MANUAL" ? 0 : 1;
    const bStatusWeight = b.status === "PRESENT" || b.status === "MANUAL" ? 0 : 1;
    
    if (aStatusWeight !== bStatusWeight) return aStatusWeight - bStatusWeight;
    return a.rollNumber - b.rollNumber;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      {/* Header Section */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.dismissAll()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
              <Ionicons name="home" size={18} color="#0F172A" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-[#0F172A]">Review Attendance</Text>

          <View className="h-10 w-10 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-white items-center justify-center">
              <Image
                  source={require("../../assets/images/uitb-logo.jpg")}
                  className="h-8 w-8"
                  resizeMode="contain"
              />
          </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Progress / Status Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between bg-[#4338CA] px-5 py-4 rounded-3xl shadow-md">
            <View>
              <Text className="text-white font-bold text-base">Local Inference Result</Text>
              <Text className="text-indigo-200 text-xs mt-1">Review the AI processing results</Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${session.status === "SYNCED" ? "bg-green-500/20 border border-green-400" : session.status === "SYNCING" ? "bg-yellow-500/20 border border-yellow-400" : "bg-white/20 border border-white/30"}`}>
              <Text className="text-white font-bold text-[10px]">
                {session.status === "SYNCED" ? "SYNCED" : "OFFLINE"}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row justify-between px-2">
            <View className="w-[30%] aspect-square rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm">
              <Text className="text-3xl font-black text-[#4338CA]">{enrolledRecords.length}</Text>
              <Text className="text-[#64748B] text-xs font-semibold mt-1">Total</Text>
            </View>

            <View className="w-[30%] aspect-square rounded-full bg-[#F0FDF4] border border-[#BBF7D0] items-center justify-center shadow-sm">
              <Text className="text-3xl font-black text-[#16A34A]">{present.length}</Text>
              <Text className="text-[#16A34A] text-xs font-semibold mt-1">Present</Text>
            </View>

            <View className="w-[30%] aspect-square rounded-full bg-[#FEF2F2] border border-[#FECACA] items-center justify-center shadow-sm">
              <Text className="text-3xl font-black text-[#DC2626]">{absent.length}</Text>
              <Text className="text-[#DC2626] text-xs font-semibold mt-1">Absent</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center mt-5 mb-4 px-2">
          <Ionicons name="people" size={20} color="#4338CA" />
          <Text className="text-lg font-bold text-[#0F172A] ml-2">Students Review</Text>
        </View>
        <Text className="mb-4 text-xs font-medium text-[#64748B] px-2">Tap a name to correct mapping. Tap a blank photo to take a picture.</Text>

        {sortedRecords.map((record) => {
          const isPresentOrManual = record.status === "PRESENT" || record.status === "MANUAL";
          const isAbsent = record.status === "ABSENT";
          const isUnknown = record.rollNumber === -1;

          return (
            <View
              key={record.id}
              className={`mb-4 flex-row items-center rounded-3xl border p-4 shadow-sm ${
                isUnknown ? "border-red-200 bg-red-50" :
                isPresentOrManual ? "border-green-200 bg-[#F0FDF4]" : 
                "border-gray-200 bg-white"
              }`}
            >
              {/* LEFT: PHOTO */}
              <TouchableOpacity
                onPress={() => {
                  if (isAbsent) {
                    if (!permission?.granted) {
                      requestPermission();
                    } else {
                      setAbsentRecordToCapture(record);
                      setCameraVisible(true);
                    }
                  }
                }}
                activeOpacity={isAbsent ? 0.7 : 1}
                className="mr-4 shadow-sm"
              >
                {record.cropImagePath ? (
                  <Image 
                    source={{ uri: record.cropImagePath }} 
                    className="w-16 h-16 rounded-2xl border border-gray-200" 
                  />
                ) : (
                  <View className="w-16 h-16 rounded-2xl border border-dashed border-gray-300 bg-gray-100 items-center justify-center">
                    <Ionicons name="camera" size={24} color="#9CA3AF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* RIGHT: DETAILS & DROPDOWN/EDIT */}
              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className={`font-bold ${isUnknown ? "text-red-600" : "text-[#0F172A]"} text-base`} numberOfLines={1}>
                      {record.studentName}
                    </Text>
                    {!isUnknown && (
                      <Text className="mt-0.5 text-xs font-medium text-[#64748B]">
                        Roll: {record.rollNumber}
                      </Text>
                    )}
                  </View>
                  
                  <View className={`rounded-full px-2.5 py-1 ml-2 border ${isPresentOrManual ? "bg-green-100 border-green-200" : isAbsent ? "bg-gray-100 border-gray-200" : isUnknown ? "bg-red-100 border-red-200" : "bg-orange-100 border-orange-200"}`}>
                    <Text className={`text-[9px] font-bold tracking-wider ${isPresentOrManual ? "text-green-700" : isAbsent ? "text-gray-600" : isUnknown ? "text-red-600" : "text-orange-700"}`}>
                      {isUnknown ? "UNKNOWN" : (isPresentOrManual ? "PRESENT" : record.status)}
                    </Text>
                  </View>
                </View>

                {/* Edit Mapping Button */}
                <TouchableOpacity
                  onPress={() => {
                    setRecordToReassign(record);
                    setStudentSelectVisible(true);
                  }}
                  activeOpacity={0.7}
                  className="mt-3 flex-row items-center bg-white self-start px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
                >
                    <Ionicons name="pencil" size={12} color="#4338CA" />
                    <Text className="ml-1.5 text-xs font-bold text-[#4338CA]">
                      {isUnknown ? "Assign Student" : "Edit"}
                    </Text>
                </TouchableOpacity>

                {isAbsent && (
                  <Text className="mt-3 text-xs font-semibold text-[#94A3B8]">
                    Tap photo icon to capture
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View className="mt-8 mb-4 flex-row gap-x-4">
          {!fromHistory ? (
            <TouchableOpacity
              onPress={() => router.dismissAll()}
              activeOpacity={0.8}
              className="flex-1 items-center justify-center rounded-3xl bg-[#4338CA] py-5 shadow-md"
            >
              <Text className="font-bold text-lg text-white">Confirm & Save</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.8}
                className="flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-white py-5 shadow-sm"
              >
                <Text className="font-bold text-lg text-[#0F172A]">Close</Text>
              </TouchableOpacity>

              {session?.status !== "SYNCED" && (
                <TouchableOpacity
                  disabled={syncing}
                  onPress={handleManualSync}
                  activeOpacity={0.8}
                  className="flex-1 items-center justify-center rounded-3xl bg-[#10B981] py-5 shadow-sm"
                >
                  {syncing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-bold text-lg text-white">Sync Now</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* MODALS */}
      <StudentSelectModal
        visible={studentSelectVisible}
        students={students}
        onSelect={onStudentSelected}
        onClose={() => {
          setStudentSelectVisible(false);
          setRecordToReassign(null);
        }}
      />

      {/* CAMERA MODAL FOR ABSENT STUDENTS */}
      <Modal visible={cameraVisible} animationType="slide">
        <View className="flex-1 bg-black">
          <View className="absolute top-0 w-full z-10 flex-row items-center justify-between p-6 pt-12 bg-black/40">
            <TouchableOpacity onPress={() => setCameraVisible(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-semibold">
              Capture {absentRecordToCapture?.studentName}
            </Text>
            <View style={{ width: 28 }} />
          </View>
          
          <CameraView 
            ref={cameraRef}
            style={{ flex: 1 }} 
            facing={"back" as CameraType} 
          />
          
          <View className="absolute bottom-0 w-full p-8 items-center bg-black/40 pb-12">
            <TouchableOpacity
              onPress={handleCapturePhoto}
              disabled={capturing}
              className="h-20 w-20 rounded-full border-4 border-white items-center justify-center bg-white/20"
            >
              {capturing ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <View className="h-16 w-16 rounded-full bg-white" />
              )}
            </TouchableOpacity>
            <Text className="text-white mt-4 font-semibold">
              {capturing ? "Processing face..." : "Tap to capture"}
            </Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}