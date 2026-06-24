import { create } from "zustand";
import {
  OfflineAttendanceSession,
  OfflineAttendanceRecord,
} from "../types/attendance.types";
import { LocalModelAsset, CachedStudent } from "../types/model.types";

interface AttendanceState {
  // Current active offline session
  currentSession: OfflineAttendanceSession | null;
  currentRecords: Record<string, OfflineAttendanceRecord>; // keyed by studentId
  
  // Model state
  activeModel: LocalModelAsset | null;
  sectionStudents: CachedStudent[];
  
  // Actions
  setCurrentSession: (session: OfflineAttendanceSession | null) => void;
  setRecord: (record: OfflineAttendanceRecord) => void;
  setActiveModel: (model: LocalModelAsset | null) => void;
  setSectionStudents: (students: CachedStudent[]) => void;
  clearSession: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  currentSession: null,
  currentRecords: {},
  activeModel: null,
  sectionStudents: [],

  setCurrentSession: (session) => set({ currentSession: session }),
  
  setRecord: (record) =>
    set((state) => ({
      currentRecords: {
        ...state.currentRecords,
        [record.studentId]: record,
      },
    })),
    
  setActiveModel: (model) => set({ activeModel: model }),
  
  setSectionStudents: (students) => set({ sectionStudents: students }),
  
  clearSession: () => set({ currentSession: null, currentRecords: {} }),
}));
