import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export interface StudentListItem {
  studentId: string;
  rollNumber: number;
  firstName: string;
  lastName: string;
}

interface StudentSelectModalProps {
  visible: boolean;
  students: StudentListItem[];
  onSelect: (student: StudentListItem) => void;
  onClose: () => void;
}

export function StudentSelectModal({
  visible,
  students,
  onSelect,
  onClose,
}: StudentSelectModalProps) {
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || s.rollNumber.toString().includes(search);
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-3/4 rounded-t-3xl bg-white p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Select Student</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-gray-100 p-2">
              <Ionicons name="close" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <View className="mb-4 flex-row items-center rounded-xl bg-gray-100 px-3 py-2">
            <Ionicons name="search" size={20} color="gray" />
            <TextInput
              placeholder="Search by name or roll number"
              value={search}
              onChangeText={setSearch}
              className="ml-2 flex-1 text-base text-gray-800"
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredStudents.map((student) => (
              <TouchableOpacity
                key={student.studentId}
                onPress={() => {
                  setSearch("");
                  onSelect(student);
                }}
                className="mb-3 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    {student.firstName} {student.lastName}
                  </Text>
                  <Text className="text-sm text-gray-500">Roll: {student.rollNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}

            {filteredStudents.length === 0 && (
              <Text className="mt-10 text-center text-gray-500">No students found.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
