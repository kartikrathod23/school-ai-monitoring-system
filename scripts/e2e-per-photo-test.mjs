#!/usr/bin/env node
/**
 * Integration test:
 *   Phase 1 — Full API onboarding for each student (apps/face_attendance/students)
 *   Phase 2 — Per group photo attendance (apps/face_attendance/group_photos)
 *             One photo at a time → present / absent log (like offline step2_attendance.py)
 *
 * Prerequisites: same stack as e2e-full-flow (Postgres, Redis, backend+local upload, ml-worker, Python :8000)
 *
 * Usage:
 *   ./scripts/restart-backend-local.sh
 *   USE_LOCAL_UPLOAD=true node scripts/e2e-per-photo-test.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { startLocalImageServer, stopServer } from "./lib/local-image-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKEND_ROOT = path.join(ROOT, "apps/backend");

const require = createRequire(path.join(BACKEND_ROOT, "package.json"));
require("dotenv").config({ path: path.join(BACKEND_ROOT, ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CONFIG = {
  API_BASE: process.env.API_BASE || "http://127.0.0.1:5000",
  ML_URL: process.env.MODEL_URL || "http://127.0.0.1:8000",
  IMAGE_SERVER_PORT: Number(process.env.E2E_IMAGE_PORT || 9090),
  STUDENTS_DIR: path.join(ROOT, "apps/face_attendance/students"),
  GROUP_PHOTOS_DIR: path.join(ROOT, "apps/face_attendance/group_photos"),
  LOG_FILE: path.join(ROOT, "scripts/per-photo-attendance.log"),
  JSON_FILE: path.join(ROOT, "scripts/per-photo-attendance-results.json"),
  SCHOOL_LAT: Number(process.env.E2E_SCHOOL_LAT || 28.6139),
  SCHOOL_LNG: Number(process.env.E2E_SCHOOL_LNG || 77.209),
  GEO_RADIUS: Number(process.env.E2E_GEO_RADIUS || 500),
  ADMIN_CODE: process.env.E2E_ADMIN_CODE || "ADM_001",
  ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD || "admin123",
  TEACHER_PASSWORD: process.env.E2E_TEACHER_PASSWORD || "teacher123",
  POLL_MS: 2000,
  ONBOARDING_TIMEOUT_MS: Number(process.env.E2E_ONBOARDING_TIMEOUT_MS || 600000),
  RUN_TAG: process.env.E2E_RUN_TAG || String(Date.now()).slice(-6),
  MAX_STUDENTS: Number(process.env.E2E_MAX_STUDENTS || 9),
};

const STUDENT_FOLDERS = Array.from({ length: 9 }, (_, i) =>
  `student_${String(i + 1).padStart(2, "0")}`
);

const logLines = [];

function log(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  logLines.push(line);
}

function fail(msg) {
  log(`FAIL: ${msg}`);
  flushLog();
  process.exit(1);
}

function flushLog() {
  fs.writeFileSync(CONFIG.LOG_FILE, logLines.join("\n") + "\n");
}

let state = {
  adminToken: null,
  teacherToken: null,
  sectionId: null,
  teacherMobile: null,
  students: [],
};

async function api(method, urlPath, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers["Content-Type"] = "application/json";
  const res = await fetch(`${CONFIG.API_BASE}${urlPath}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} → ${res.status}: ${data.message || text}`);
  }
  return data;
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
}

function buildMultipart(fields, files) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  for (const { filepath, filename } of files) {
    form.append("images", new Blob([fs.readFileSync(filepath)]), filename);
  }
  return form;
}

async function healthChecks() {
  if (!(await fetch(`${CONFIG.API_BASE}/`)).ok) {
    fail("Backend not running on " + CONFIG.API_BASE);
  }
  if (!(await fetch(`${CONFIG.ML_URL}/health`)).ok) {
    fail("Python ML not running on " + CONFIG.ML_URL);
  }
  log("Health OK — backend + Python ML");
}

// ─── Phase 1: Admin setup + API onboarding ───────────────────────

async function phase1SetupAndOnboard() {
  log("=".repeat(70));
  log("PHASE 1: API INTEGRATION — ONBOARDING EACH STUDENT");
  log("=".repeat(70));

  const tag = CONFIG.RUN_TAG;
  const admin = await api("POST", "/api/auth/login", {
    body: { identifier: CONFIG.ADMIN_CODE, password: CONFIG.ADMIN_PASSWORD },
  });
  state.adminToken = admin.token;
  log(`Admin logged in (${admin.user?.userCode})`);

  const school = await api("POST", "/api/admin/schools", {
    token: state.adminToken,
    body: {
      name: `PerPhoto E2E ${tag}`,
      address: "E2E Delhi",
      latitude: CONFIG.SCHOOL_LAT,
      longitude: CONFIG.SCHOOL_LNG,
      geoRadius: CONFIG.GEO_RADIUS,
    },
  });
  const schoolId = school.data.id;

  const standard = await api("POST", "/api/admin/standards", {
    token: state.adminToken,
    body: { name: "10", schoolId },
  });
  const standardId = standard.data.id;

  const section = await api("POST", "/api/admin/sections", {
    token: state.adminToken,
    body: { name: "A", standardId },
  });
  state.sectionId = section.data.id;

  state.teacherMobile = `9${String(tag).replace(/\D/g, "").padStart(9, "0")}`.slice(0, 10);
  await api("POST", "/api/admin/teachers", {
    token: state.adminToken,
    body: {
      firstName: "PerPhoto",
      lastName: "Teacher",
      mobileNumber: state.teacherMobile,
      password: CONFIG.TEACHER_PASSWORD,
      sectionIds: [state.sectionId],
    },
  });
  log(`Created school/section; teacher ${state.teacherMobile}`);

  const count = Math.min(CONFIG.MAX_STUDENTS, STUDENT_FOLDERS.length);
  state.students = [];
  for (let i = 0; i < count; i++) {
    const folder = STUDENT_FOLDERS[i];
    const mobile = `8${tag}${String(i + 1).padStart(7, "0")}`.slice(0, 10);
    const st = await api("POST", "/api/admin/students", {
      token: state.adminToken,
      body: {
        firstName: folder,
        lastName: "Test",
        mobileNumber: mobile,
        password: "student123",
        sectionId: state.sectionId,
        rollNumber: i + 1,
        dateOfBirth: "2010-01-15",
      },
    });
    state.students.push({
      id: st.data.id,
      folder,
      rollNumber: i + 1,
    });
  }
  log(`Created ${state.students.length} students in DB`);

  const teacher = await api("POST", "/api/auth/login", {
    body: { identifier: state.teacherMobile, password: CONFIG.TEACHER_PASSWORD },
  });
  state.teacherToken = teacher.token;

  for (const student of state.students) {
    const dir = path.join(CONFIG.STUDENTS_DIR, student.folder);
    const imgs = listImages(dir);
    if (!imgs.length) fail(`No photos in ${dir}`);
    const files = imgs.map((name) => ({
      filepath: path.join(dir, name),
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
    await api("POST", "/api/face-onboarding/", {
      token: state.teacherToken,
      formData: form,
    });
    log(`  ${student.folder}: queued ${imgs.length} photos → BullMQ → ML embeddings`);
  }

  const deadline = Date.now() + CONFIG.ONBOARDING_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const list = await api(
      "GET",
      `/api/teacher/sections/${state.sectionId}/students`,
      { token: state.teacherToken }
    );
    const rows = list.data || list;
    const byId = Object.fromEntries(rows.map((s) => [s.id, s]));
    const added = state.students.filter((s) => byId[s.id]?.faceStatus === "ADDED").length;
    const rescan = state.students.filter((s) => byId[s.id]?.faceStatus === "RESCAN");
    log(`  Onboarding progress: ADDED ${added}/${state.students.length}`);
    if (rescan.length) {
      fail(`RESCAN for: ${rescan.map((s) => s.folder).join(", ")} — check USE_LOCAL_UPLOAD on backend`);
    }
    if (added === state.students.length) {
      log("PHASE 1 PASSED — all students faceStatus=ADDED (full pipeline OK)");
      return;
    }
    await sleep(CONFIG.POLL_MS);
  }
  fail("Onboarding timed out");
}

// ─── Phase 2: Per-photo attendance via ML (DB embeddings) ─────────

async function loadEmbeddingsFromDb() {
  const dbStudents = await prisma.student.findMany({
    where: { sectionId: state.sectionId },
    include: { faceEmbeddings: true },
  });

  const folderById = Object.fromEntries(state.students.map((s) => [s.id, s.folder]));
  const studentEmbeddings = [];

  for (const s of dbStudents) {
    if (!s.faceEmbeddings.length) {
      fail(`No embeddings in DB for ${folderById[s.id] || s.id}`);
    }
    for (const emb of s.faceEmbeddings) {
      studentEmbeddings.push({
        studentId: s.id,
        embedding: emb.embedding,
      });
    }
  }

  log(`Loaded ${studentEmbeddings.length} embedding rows for ${dbStudents.length} students from PostgreSQL`);
  return { studentEmbeddings, folderById };
}

async function runAttendanceForPhoto(photoName, imageUrl, studentEmbeddings) {
  const res = await fetch(`${CONFIG.ML_URL}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attendanceSessionId: `per-photo-${photoName}`,
      sectionId: state.sectionId,
      imageUrls: [imageUrl],
      studentEmbeddings,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ML /attendance failed for ${photoName}: ${t}`);
  }
  return res.json();
}

async function phase2PerPhotoAttendance(imageBaseUrl) {
  log("");
  log("=".repeat(70));
  log("PHASE 2: PER-PHOTO ATTENDANCE (one group photo at a time)");
  log("=".repeat(70));

  const { studentEmbeddings, folderById } = await loadEmbeddingsFromDb();
  const photos = listImages(CONFIG.GROUP_PHOTOS_DIR);
  if (!photos.length) fail(`No photos in ${CONFIG.GROUP_PHOTOS_DIR}`);

  const allResults = [];

  for (const photo of photos) {
    const url = `${imageBaseUrl}/${encodeURIComponent(photo)}`;
    log("");
    log("-".repeat(70));
    log(`PHOTO: ${photo}`);
    log("-".repeat(70));

    const result = await runAttendanceForPhoto(photo, url, studentEmbeddings);

    const present = [];
    const absent = [];
    const manual = [];

    for (const rec of result.results) {
      const name = folderById[rec.studentId] || rec.studentId;
      const conf = rec.confidence ?? 0;
      if (rec.status === "PRESENT") {
        present.push(name);
        log(`  PRESENT  ${name}  (confidence ${conf})`);
      } else if (rec.status === "MANUAL") {
        manual.push(name);
        log(`  MANUAL   ${name}  (confidence ${conf})`);
      } else {
        absent.push(name);
        log(`  ABSENT   ${name}`);
      }
    }

    log(`  Heads detected in photo : ${result.totalHeads}`);
    log(`  Present (${present.length}) : ${present.sort().join(", ") || "(none)"}`);
    log(`  Absent  (${absent.length})  : ${absent.sort().join(", ") || "(none)"}`);
    if (manual.length) {
      log(`  Manual  (${manual.length})  : ${manual.sort().join(", ")}`);
    }
    log(`  Avg confidence (matched): ${result.avgConfidence}`);

    allResults.push({
      photo,
      totalHeads: result.totalHeads,
      presentCount: present.length,
      absentCount: absent.length,
      manualCount: manual.length,
      present: present.sort(),
      absent: absent.sort(),
      manual: manual.sort(),
      avgConfidence: result.avgConfidence,
    });
  }

  return allResults;
}

function writeSummary(allResults) {
  log("");
  log("=".repeat(70));
  log("SUMMARY — ALL GROUP PHOTOS");
  log("=".repeat(70));
  log(
    `${"Photo".padEnd(42)} ${"Heads".padStart(5)} ${"Present".padStart(8)} ${"Absent".padStart(8)}`
  );
  log("-".repeat(70));
  for (const r of allResults) {
    log(
      `${r.photo.padEnd(42)} ${String(r.totalHeads).padStart(5)} ${String(r.presentCount).padStart(8)} ${String(r.absentCount).padStart(8)}`
    );
  }
  log("=".repeat(70));

  const summary = {
    passed: true,
    completedAt: new Date().toISOString(),
    runTag: CONFIG.RUN_TAG,
    sectionId: state.sectionId,
    students: state.students,
    perPhoto: allResults,
  };
  fs.writeFileSync(CONFIG.JSON_FILE, JSON.stringify(summary, null, 2));
  log(`JSON results → ${CONFIG.JSON_FILE}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  logLines.length = 0;
  log("PER-PHOTO E2E TEST — School AI Monitoring");
  log(`Students dir : ${CONFIG.STUDENTS_DIR}`);
  log(`Group photos : ${CONFIG.GROUP_PHOTOS_DIR}`);
  log(`Log file     : ${CONFIG.LOG_FILE}`);
  log("");

  if (process.env.USE_LOCAL_UPLOAD !== "true") {
    log("WARN: Set USE_LOCAL_UPLOAD=true on backend before onboarding");
  }

  let imageServer;
  try {
    await healthChecks();
    await phase1SetupAndOnboard();

    imageServer = await startLocalImageServer(
      CONFIG.GROUP_PHOTOS_DIR,
      CONFIG.IMAGE_SERVER_PORT
    );
    log(`Image server for group photos: ${imageServer.baseUrl}`);

    const allResults = await phase2PerPhotoAttendance(imageServer.baseUrl);
    writeSummary(allResults);

    log("");
    log("✓ PER-PHOTO E2E TEST PASSED");
    flushLog();
  } catch (err) {
    log(`ERROR: ${err.message}`);
    console.error(err);
    flushLog();
    process.exit(1);
  } finally {
    if (imageServer?.server) await stopServer(imageServer.server);
    await prisma.$disconnect();
  }
}

main();
