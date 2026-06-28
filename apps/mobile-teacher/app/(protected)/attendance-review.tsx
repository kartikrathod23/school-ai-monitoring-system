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
      <View className="flex-row items-center justify-between bg-[#2563EB] px-4 py-3">
        <TouchableOpacity onPress={() => router.dismissAll()} className="flex-row items-center">
          <Ionicons name="home" size={18} color="white" />
          <Text className="ml-1 text-white"> Home</Text>
        </TouchableOpacity>

        <Text className="text-lg font-bold text-white">Review Attendance</Text>

        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image source={require("../../assets/images/uitb-logo.jpg")} className="h-10 w-10" resizeMode="contain" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-3xl bg-[#2563EB] p-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-white">Local Inference Result</Text>
            <View className={`px-2 py-1 rounded-full ${session.status === "SYNCED" ? "bg-green-400" : session.status === "SYNCING" ? "bg-yellow-400" : "bg-red-400"}`}>
              <Text className="text-xs font-bold text-white">
                {session.status === "SYNCED" ? "Synced" : "Offline"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row justify-between">
            <View className="w-[31%] rounded-2xl bg-[#4F7EFF] py-4">
              <Text className="text-center text-2xl font-bold text-white">{enrolledRecords.length}</Text>
              <Text className="text-center text-white">Total</Text>
            </View>

            <View className="w-[31%] rounded-2xl bg-[#10B981] py-4">
              <Text className="text-center text-2xl font-bold text-white">{present.length}</Text>
              <Text className="text-center text-white">Present</Text>
            </View>

            <View className="w-[31%] rounded-2xl bg-[#F59E0B] py-4">
              <Text className="text-center text-2xl font-bold text-white">{absent.length}</Text>
              <Text className="text-center text-white">Absent</Text>
            </View>
          </View>
        </View>

        <Text className="mt-5 text-lg font-semibold text-[#111827]">Students Review</Text>
        <Text className="mb-2 text-sm text-gray-500">Tap a name to correct mapping. Tap a blank photo to take a picture.</Text>

        {sortedRecords.map((record) => {
          const isPresentOrManual = record.status === "PRESENT" || record.status === "MANUAL";
          const isAbsent = record.status === "ABSENT";
          const isUnknown = record.rollNumber === -1;

          return (
            <View
              key={record.id}
              className={`mt-4 flex-row items-center rounded-2xl border p-4 ${
                isUnknown ? "border-[#FCA5A5] bg-[#FEF2F2]" :
                isPresentOrManual ? "border-[#BBF7D0] bg-[#F0FDF4]" : 
                "border-[#E5E7EB] bg-white"
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
                className="mr-4"
              >
                {record.cropImagePath ? (
                  <Image 
                    source={{ uri: record.cropImagePath }} 
                    className="w-16 h-16 rounded-xl border border-gray-300" 
                  />
                ) : (
                  <View className="w-16 h-16 rounded-xl border border-dashed border-gray-400 bg-gray-50 items-center justify-center">
                    <Ionicons name="camera" size={24} color="#9CA3AF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* RIGHT: DETAILS & DROPDOWN/EDIT */}
              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className={`font-bold ${isUnknown ? "text-red-600" : "text-[#111827]"} text-base`} numberOfLines={1}>
                      {record.studentName}
                    </Text>
                    {!isUnknown && (
                      <Text className="mt-0.5 text-xs text-gray-500">
                        Roll: {record.rollNumber}
                      </Text>
                    )}
                  </View>
                  
                  <View className={`rounded-full px-2 py-1 ml-2 ${isPresentOrManual ? "bg-[#DCFCE7]" : isAbsent ? "bg-[#F3F4F6]" : isUnknown ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"}`}>
                    <Text className={`text-[10px] font-bold ${isPresentOrManual ? "text-[#15803D]" : isAbsent ? "text-[#6B7280]" : isUnknown ? "text-[#DC2626]" : "text-[#B45309]"}`}>
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
                  className="mt-2 flex-row items-center"
                >
                    <Ionicons name="pencil" size={14} color="#3B82F6" />
                    <Text className="ml-1 text-sm font-semibold text-[#3B82F6]">
                      {isUnknown ? "Assign Student" : "Edit"}
                    </Text>
                  </TouchableOpacity>

                {isAbsent && (
                  <Text className="mt-2 text-xs text-gray-400">
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
              className="flex-1 items-center justify-center rounded-2xl bg-[#2563EB] py-4 shadow-sm"
            >
              <Text className="font-bold text-lg text-white">Confirm Attendance</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-1 items-center justify-center rounded-2xl border border-gray-300 bg-white py-4 shadow-sm"
              >
                <Text className="font-bold text-lg text-gray-700">Close</Text>
              </TouchableOpacity>

              {session?.status !== "SYNCED" && (
                <TouchableOpacity
                  disabled={syncing}
                  onPress={handleManualSync}
                  className="flex-1 items-center justify-center rounded-2xl bg-orange-500 py-4 shadow-sm"
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