/**
 * lib/sectionCache.ts
 *
 * AsyncStorage helpers that persist the teacher's assigned section info
 * and school geo-fence data locally. This allows attendance-capture.tsx
 * to work fully offline (no API call needed to get sectionId / school coords).
 *
 * Data is written once during dashboard load (when online) and read
 * offline from storage on subsequent sessions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const SECTION_CACHE_KEY = "teacher_section_cache";

export interface SectionCache {
  sectionId: string;
  schoolLatitude: number;
  schoolLongitude: number;
  geoRadius: number;        // in metres
  cachedAt: string;         // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────

export const saveSectionCache = async (data: Omit<SectionCache, "cachedAt">): Promise<void> => {
  const payload: SectionCache = {
    ...data,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SECTION_CACHE_KEY, JSON.stringify(payload));
  console.log("[SectionCache] Saved:", payload);
};

// ─────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────

export const getSectionCache = async (): Promise<SectionCache | null> => {
  try {
    const raw = await AsyncStorage.getItem(SECTION_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SectionCache;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────
// Clear (on logout)
// ─────────────────────────────────────────────────────────────────

export const clearSectionCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(SECTION_CACHE_KEY);
};
