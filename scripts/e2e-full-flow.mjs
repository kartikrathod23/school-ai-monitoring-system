#!/usr/bin/env node
/**
 * End-to-end flow test: Admin setup → Face onboarding (students/) → Attendance (group_photos/)
 *
 * Prerequisites (start via scripts/run-e2e-services.sh or manually):
 *   - PostgreSQL (docker-compose postgres on 5433)
 *   - Redis
 *   - Backend API (apps/backend)
 *   - ML worker (apps/ml-worker)
 *   - Python ML service (apps/ml-worker/src/ml/python_service on :8000)
 *
 * Usage:
 *   node scripts/e2e-full-flow.mjs
 *   E2E_SKIP_SETUP=1 node scripts/e2e-full-flow.mjs   # reuse existing E2E data
 *   E2E_MAX_GROUP_PHOTOS=3 node scripts/e2e-full-flow.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CONFIG = {
  API_BASE: process.env.API_BASE || "http://127.0.0.1:5000",
  ML_HEALTH_URL: process.env.MODEL_URL || "http://127.0.0.1:8000",
  FACE_DIR: path.join(ROOT, "apps/face_attendance"),
  STUDENTS_DIR: path.join(ROOT, "apps/face_attendance/students"),
  GROUP_PHOTOS_DIR: path.join(ROOT, "apps/face_attendance/group_photos"),
  SCHOOL_LAT: Number(process.env.E2E_SCHOOL_LAT || 28.6139),
  SCHOOL_LNG: Number(process.env.E2E_SCHOOL_LNG || 77.209),
  GEO_RADIUS: Number(process.env.E2E_GEO_RADIUS || 500),
  ADMIN_CODE: process.env.E2E_ADMIN_CODE || "ADM_001",
  ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD || "admin123",
  TEACHER_PASSWORD: process.env.E2E_TEACHER_PASSWORD || "teacher123",
  POLL_MS: 2000,
  ONBOARDING_TIMEOUT_MS: Number(process.env.E2E_ONBOARDING_TIMEOUT_MS || 600000),
  ATTENDANCE_TIMEOUT_MS: Number(process.env.E2E_ATTENDANCE_TIMEOUT_MS || 300000),
  MAX_GROUP_PHOTOS: Number(process.env.E2E_MAX_GROUP_PHOTOS || 0),
  MAX_STUDENTS: Number(process.env.E2E_MAX_STUDENTS || 9),
  SKIP_SETUP: process.env.E2E_SKIP_SETUP === "1",
  RUN_TAG: process.env.E2E_RUN_TAG || String(Date.now()).slice(-6),
  USE_LOCAL_UPLOAD: process.env.USE_LOCAL_UPLOAD === "true",
};

if (!CONFIG.USE_LOCAL_UPLOAD) {
  console.warn(
    "\n  Tip: set USE_LOCAL_UPLOAD=true on the backend for local E2E (avoids private S3 403).\n"
  );
}

const STUDENT_FOLDER_NAMES = Array.from({ length: 9 }, (_, i) =>
  `student_${String(i + 1).padStart(2, "0")}`
);

let state = {
  adminToken: null,
  teacherToken: null,
  schoolId: null,
  sectionId: null,
  teacherMobile: null,
  students: [],
};

function log(section, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${section}] ${msg}`);
}

function fail(msg) {
  console.error(`\n✗ FAIL: ${msg}\n`);
  process.exit(1);
}

async function request(method, urlPath, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${CONFIG.API_BASE}${urlPath}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      `${method} ${urlPath} → ${res.status}: ${data.message || data.error || text}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function healthChecks() {
  log("health", `Backend ${CONFIG.API_BASE}`);
  const apiRes = await fetch(`${CONFIG.API_BASE}/`);
  if (!apiRes.ok) fail("Backend not reachable. Start: cd apps/backend && npm run dev");

  log("health", `Python ML ${CONFIG.ML_HEALTH_URL}/health`);
  const mlRes = await fetch(`${CONFIG.ML_HEALTH_URL}/health`);
  if (!mlRes.ok) {
    fail(
      "Python ML service not reachable. Start uvicorn in apps/ml-worker/src/ml/python_service"
    );
  }
  const ml = await mlRes.json();
  log("health", `ML status: ${ml.status || "ok"}`);
}

async function adminLogin() {
  const data = await request("POST", "/api/auth/login", {
    body: { identifier: CONFIG.ADMIN_CODE, password: CONFIG.ADMIN_PASSWORD },
  });
  state.adminToken = data.token;
  log("auth", `Admin logged in (${data.user?.userCode})`);
}

async function setupTestData() {
  const tag = CONFIG.RUN_TAG;
  const schoolBody = {
    name: `E2E Test School ${tag}`,
    address: "E2E Test Address, Delhi",
    district: "Central",
    state: "Delhi",
    pinCode: "110001",
    contactNumber: "9876543210",
    latitude: CONFIG.SCHOOL_LAT,
    longitude: CONFIG.SCHOOL_LNG,
    geoRadius: CONFIG.GEO_RADIUS,
  };

  const schoolRes = await request("POST", "/api/admin/schools", {
    token: state.adminToken,
    body: schoolBody,
  });
  state.schoolId = schoolRes.data?.id || schoolRes.school?.id || schoolRes.id;
  if (!state.schoolId) fail("Could not read school id from create response");

  const standardRes = await request("POST", "/api/admin/standards", {
    token: state.adminToken,
    body: { name: "10", schoolId: state.schoolId },
  });
  const standardId =
    standardRes.data?.id || standardRes.standard?.id || standardRes.id;

  const sectionRes = await request("POST", "/api/admin/sections", {
    token: state.adminToken,
    body: { name: "A", standardId },
  });
  state.sectionId =
    sectionRes.data?.id || sectionRes.section?.id || sectionRes.id;

  state.teacherMobile = `9${String(tag).replace(/\D/g, "").padStart(9, "0")}`.slice(0, 10);
  const teacherRes = await request("POST", "/api/admin/teachers", {
    token: state.adminToken,
    body: {
      firstName: "E2E",
      lastName: "Teacher",
      mobileNumber: state.teacherMobile,
      password: CONFIG.TEACHER_PASSWORD,
      sectionIds: [state.sectionId],
    },
  });
  log("setup", `School ${state.schoolId}, section ${state.sectionId}, teacher ${state.teacherMobile}`);

  state.students = [];
  const enrollCount = Math.min(CONFIG.MAX_STUDENTS, STUDENT_FOLDER_NAMES.length);
  for (let i = 0; i < enrollCount; i++) {
    const roll = i + 1;
    const mobile = `8${tag}${String(roll).padStart(7, "0")}`.slice(0, 10);
    const folder = STUDENT_FOLDER_NAMES[i];
    const studentRes = await request("POST", "/api/admin/students", {
      token: state.adminToken,
      body: {
        firstName: folder,
        lastName: "Test",
        mobileNumber: mobile,
        password: "student123",
        sectionId: state.sectionId,
        rollNumber: roll,
        dateOfBirth: "2010-01-15",
      },
    });
    const student = studentRes.data || studentRes.student || studentRes;
    state.students.push({
      id: student.id,
      rollNumber: roll,
      folder,
      userCode: student.user?.userCode,
    });
  }
  log("setup", `Created ${state.students.length} students`);
}

async function teacherLogin() {
  const data = await request("POST", "/api/auth/login", {
    body: {
      identifier: state.teacherMobile,
      password: CONFIG.TEACHER_PASSWORD,
    },
  });
  state.teacherToken = data.token;
  log("auth", `Teacher logged in`);
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort();
}

function buildMultipart(fields, files) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  for (const { field, filepath, filename } of files) {
    const buf = fs.readFileSync(filepath);
    const blob = new Blob([buf], { type: "image/jpeg" });
    form.append(field, blob, filename || path.basename(filepath));
  }
  return form;
}

async function enrollStudent(student) {
  const folderPath = path.join(CONFIG.STUDENTS_DIR, student.folder);
  const images = listImages(folderPath);
  if (images.length === 0) {
    fail(`No images in ${folderPath}`);
  }

  const files = images.map((name) => ({
    field: "images",
    filepath: path.join(folderPath, name),
    filename: name,
  }));

  const form = buildMultipart(
    {
      studentId: student.id,
      latitude: CONFIG.SCHOOL_LAT,
      longitude: CONFIG.SCHOOL_LNG,
    },
    files
  );

  const res = await request("POST", "/api/face-onboarding/", {
    token: state.teacherToken,
    formData: form,
  });
  log("onboard", `${student.folder}: uploaded ${images.length} images → session ${res.data?.id || "ok"}`);
  return res.data;
}

async function waitForEnrollment() {
  const deadline = Date.now() + CONFIG.ONBOARDING_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const list = await request(
      "GET",
      `/api/teacher/sections/${state.sectionId}/students`,
      { token: state.teacherToken }
    );
    const students = list.data || list.students || list;
    const byId = Object.fromEntries(students.map((s) => [s.id, s]));

    const statuses = state.students.map((s) => ({
      folder: s.folder,
      faceStatus: byId[s.id]?.faceStatus || "UNKNOWN",
    }));

    const added = statuses.filter((x) => x.faceStatus === "ADDED").length;
    const pending = statuses.filter((x) => x.faceStatus === "PENDING").length;
    const rescan = statuses.filter((x) => x.faceStatus === "RESCAN").length;

    log(
      "poll",
      `Enrollment: ADDED=${added}/${state.students.length} PENDING=${pending} RESCAN=${rescan}`
    );

    if (added === state.students.length) return statuses;
    if (rescan > 0) {
      const bad = statuses.filter((x) => x.faceStatus === "RESCAN");
      fail(`Onboarding failed for: ${bad.map((b) => b.folder).join(", ")}`);
    }

    await sleep(CONFIG.POLL_MS);
  }
  fail("Onboarding timed out");
}

async function findTodayAttendanceSession() {
  try {
    const hist = await request("GET", "/api/attendance/history", {
      token: state.teacherToken,
    });
    const sessions = hist.data || hist.sessions || hist;
    const today = new Date().toISOString().slice(0, 10);
    const todaySession = sessions.find((s) => {
      const d = new Date(s.date).toISOString().slice(0, 10);
      return d === today;
    });
    return todaySession || null;
  } catch {
    return null;
  }
}

async function runAttendance() {
  const existing = await findTodayAttendanceSession();
  if (existing?.id) {
    log(
      "attendance",
      `Reusing today's session ${existing.id} (one session per section per day)`
    );
    return {
      id: existing.id,
      status: existing.status,
      _photosUploaded: 0,
      _reused: true,
    };
  }

  let photos = listImages(CONFIG.GROUP_PHOTOS_DIR);
  if (CONFIG.MAX_GROUP_PHOTOS > 0) {
    photos = photos.slice(0, CONFIG.MAX_GROUP_PHOTOS);
  }
  // API allows max 10 images per attendance request
  photos = photos.slice(0, 10);
  if (photos.length === 0) fail(`No group photos in ${CONFIG.GROUP_PHOTOS_DIR}`);

  const files = photos.map((name) => ({
    field: "images",
    filepath: path.join(CONFIG.GROUP_PHOTOS_DIR, name),
    filename: name,
  }));

  const form = buildMultipart(
    {
      sectionId: state.sectionId,
      latitude: CONFIG.SCHOOL_LAT,
      longitude: CONFIG.SCHOOL_LNG,
    },
    files
  );

  const res = await request("POST", "/api/attendance/", {
    token: state.teacherToken,
    formData: form,
  });
  const session = res.data;
  log("attendance", `Uploaded ${photos.length} group photos → session ${session.id}`);
  return { ...session, _photosUploaded: photos.length };
}

async function waitForAttendance(sessionId) {
  const deadline = Date.now() + CONFIG.ATTENDANCE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await request("GET", `/api/attendance/${sessionId}`, {
      token: state.teacherToken,
    });
    const session = res.data;
    const records = session?.records || [];
    if (records.length >= state.students.length) {
      return session;
    }
    log(
      "poll",
      `Attendance session ${session?.status}: ${records.length}/${state.students.length} records`
    );
    await sleep(CONFIG.POLL_MS);
  }
  fail("Attendance processing timed out");
}

function mapRecordsToReport(session) {
  const folderByStudentId = Object.fromEntries(
    state.students.map((s) => [s.id, s.folder])
  );

  const present = [];
  const absent = [];
  const manual = [];

  for (const rec of session.records) {
    const name = folderByStudentId[rec.studentId] || rec.studentId;
    if (rec.status === "PRESENT") present.push(name);
    else if (rec.status === "MANUAL") manual.push(name);
    else absent.push(name);
  }

  return { present, absent, manual, records: session.records };
}

function loadBaselineCsv() {
  const csvPath = path.join(CONFIG.FACE_DIR, "results.csv");
  if (!fs.existsSync(csvPath)) return null;
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const parts = line.split(",");
    const row = {};
    header.forEach((h, i) => {
      row[h] = parts[i];
    });
    return row;
  });
}

function printReport(session) {
  const { present, absent, manual, records } = mapRecordsToReport(session);

  console.log("\n" + "=".repeat(60));
  console.log("  E2E ATTENDANCE RESULT (API + ML pipeline)");
  console.log("=".repeat(60));
  console.log(`  Session ID     : ${session.id}`);
  console.log(`  Status         : ${session.status}`);
  console.log(`  Confidence     : ${session.confidenceScore ?? "n/a"}`);
  console.log(`  Present (${present.length}) : ${present.sort().join(", ")}`);
  console.log(`  Absent  (${absent.length})  : ${absent.sort().join(", ")}`);
  if (manual.length) {
    console.log(`  Manual  (${manual.length})  : ${manual.sort().join(", ")}`);
  }
  console.log("=".repeat(60));

  const baseline = loadBaselineCsv();
  if (baseline?.length) {
    console.log("\n  Offline baseline (face_attendance/results.csv — first photo):");
    const first = baseline[0];
    console.log(`    Photo: ${first.photo}`);
    console.log(`    Present: ${first.present_students}`);
    console.log(`    Absent:  ${first.absent_students}`);
    console.log(
      "\n  Note: API attendance merges ALL group photos in one session;"
    );
    console.log(
      "  offline script runs per-photo. Counts may differ by design.\n"
    );
  }

  return { present, absent, manual, records };
}

function writeSuccessResults(summary) {
  const outDir = path.join(ROOT, "scripts");
  const jsonPath = path.join(outDir, "e2e-test-results.json");
  const txtPath = path.join(outDir, "e2e-test-results.txt");

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const lines = [
    "SCHOOL AI MONITORING — E2E TEST RESULTS",
    "========================================",
    `Status: ${summary.passed ? "PASSED" : "FAILED"}`,
    `Completed at: ${summary.completedAt}`,
    "",
    "SERVICES",
    `  Backend: ${summary.services.backend}`,
    `  Python ML: ${summary.services.pythonMl}`,
    "",
    "SETUP",
    `  School ID: ${summary.setup.schoolId}`,
    `  Section ID: ${summary.setup.sectionId}`,
    `  Teacher mobile: ${summary.setup.teacherMobile}`,
    `  Students created: ${summary.setup.studentCount}`,
    "",
    "FACE ONBOARDING",
    `  Students enrolled: ${summary.onboarding.enrolled}/${summary.onboarding.total}`,
    `  Face status: ADDED`,
    "",
    "ATTENDANCE",
    `  Session ID: ${summary.attendance.sessionId}`,
    `  Group photos uploaded: ${summary.attendance.groupPhotosUploaded}`,
    `  Session status: ${summary.attendance.status}`,
    `  Confidence score: ${summary.attendance.confidenceScore}`,
    `  Present: ${summary.attendance.present.join(", ")}`,
    `  Absent: ${summary.attendance.absent.length ? summary.attendance.absent.join(", ") : "(none)"}`,
    `  Finalized: ${summary.attendance.finalized}`,
    "",
    "ASSERTIONS",
    ...summary.assertions.map((a) => `  [${a.ok ? "OK" : "FAIL"}] ${a.name}`),
    "",
  ];
  fs.writeFileSync(txtPath, lines.join("\n"));
  log("results", `Written ${jsonPath}`);
  log("results", `Written ${txtPath}`);
}

async function loadExistingState() {
  const envPath = path.join(ROOT, "scripts/.e2e-state.json");
  if (!fs.existsSync(envPath)) {
    fail("E2E_SKIP_SETUP=1 but scripts/.e2e-state.json not found. Run full test first.");
  }
  const saved = JSON.parse(fs.readFileSync(envPath, "utf8"));
  state = { ...state, ...saved };
  log("setup", `Loaded state from .e2e-state.json`);
}

function saveState() {
  const envPath = path.join(ROOT, "scripts/.e2e-state.json");
  fs.writeFileSync(
    envPath,
    JSON.stringify(
      {
        schoolId: state.schoolId,
        sectionId: state.sectionId,
        teacherMobile: state.teacherMobile,
        students: state.students,
      },
      null,
      2
    )
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const startedAt = new Date().toISOString();
  const groupPhotoCount = Math.min(
    CONFIG.MAX_GROUP_PHOTOS > 0
      ? CONFIG.MAX_GROUP_PHOTOS
      : listImages(CONFIG.GROUP_PHOTOS_DIR).length,
    10
  );

  console.log("\n" + "=".repeat(60));
  console.log("  School AI — Full E2E Flow Test");
  console.log("=".repeat(60));
  console.log(`  Images: ${CONFIG.STUDENTS_DIR}`);
  console.log(`          ${CONFIG.GROUP_PHOTOS_DIR}`);
  console.log(`  Students: ${CONFIG.MAX_STUDENTS} | Group photos: ${groupPhotoCount}`);
  if (CONFIG.USE_LOCAL_UPLOAD) {
    console.log("  Backend uploads: USE_LOCAL_UPLOAD=true\n");
  } else {
    console.log("");
  }

  await healthChecks();
  await adminLogin();

  if (CONFIG.SKIP_SETUP) {
    await loadExistingState();
  } else {
    await setupTestData();
    saveState();
  }

  await teacherLogin();

  let enrollmentStatuses = [];
  if (!CONFIG.SKIP_SETUP) {
    for (const student of state.students) {
      await enrollStudent(student);
    }
    enrollmentStatuses = await waitForEnrollment();
    log(
      "onboard",
      `All ${state.students.length} students enrolled (faceStatus=ADDED)`
    );
  } else {
    log("onboard", "Skipped enrollment (E2E_SKIP_SETUP)");
    const list = await request(
      "GET",
      `/api/teacher/sections/${state.sectionId}/students`,
      { token: state.teacherToken }
    );
    const students = list.data || list.students || list;
    const byId = Object.fromEntries(students.map((s) => [s.id, s]));
    enrollmentStatuses = state.students.map((s) => ({
      folder: s.folder,
      faceStatus: byId[s.id]?.faceStatus || "UNKNOWN",
    }));
  }

  const session = await runAttendance();
  const processed = await waitForAttendance(session.id);
  const { present, absent, manual } = printReport(processed);

  await request("PATCH", `/api/attendance/${session.id}/finalize`, {
    token: state.teacherToken,
    body: {},
  });

  const enrolledAdded = enrollmentStatuses.filter(
    (s) => s.faceStatus === "ADDED"
  ).length;

  const assertions = [
    {
      name: "All students faceStatus ADDED",
      ok: enrolledAdded === state.students.length,
    },
    {
      name: "Attendance session PROCESSED",
      ok: processed.status === "PROCESSED",
    },
    {
      name: "Attendance records for every student",
      ok: (processed.records?.length || 0) >= state.students.length,
    },
    {
      name: "No unexpected ABSENT (full dataset expects all present)",
      ok: absent.length === 0,
    },
  ];

  const passed = assertions.every((a) => a.ok);

  const summary = {
    passed,
    completedAt: new Date().toISOString(),
    startedAt,
    runTag: CONFIG.RUN_TAG,
    services: {
      backend: CONFIG.API_BASE,
      pythonMl: CONFIG.ML_HEALTH_URL,
    },
    setup: {
      schoolId: state.schoolId,
      sectionId: state.sectionId,
      teacherMobile: state.teacherMobile,
      studentCount: state.students.length,
      students: state.students,
    },
    onboarding: {
      total: state.students.length,
      enrolled: enrolledAdded,
      statuses: enrollmentStatuses,
    },
    attendance: {
      sessionId: processed.id,
      groupPhotosUploaded: session._photosUploaded ?? groupPhotoCount,
      sessionReused: Boolean(session._reused),
      status: processed.status,
      confidenceScore: processed.confidenceScore,
      present: present.sort(),
      absent: absent.sort(),
      manual: manual.sort(),
      finalized: true,
      records: processed.records?.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        confidenceScore: r.confidenceScore,
      })),
    },
    assertions,
  };

  writeSuccessResults(summary);

  if (!passed) {
    fail(
      `Assertions failed: ${assertions.filter((a) => !a.ok).map((a) => a.name).join(", ")}`
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("  ✓ E2E TEST PASSED — ALL CHECKS OK");
  console.log("=".repeat(60) + "\n");
  log("done", "Session finalized. Full flow completed successfully.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
