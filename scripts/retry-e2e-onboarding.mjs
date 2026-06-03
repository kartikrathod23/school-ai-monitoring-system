#!/usr/bin/env node
/**
 * Re-enqueue face onboarding for students stuck in RESCAN/PENDING after S3 presign fix.
 * Uses scripts/.e2e-state.json from a prior e2e-full-flow run.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const state = JSON.parse(
  fs.readFileSync(path.join(__dirname, ".e2e-state.json"), "utf8")
);

const API = process.env.API_BASE || "http://127.0.0.1:5000";
const FACE_DIR = path.resolve(__dirname, "../apps/face_attendance/students");
const LAT = Number(process.env.E2E_SCHOOL_LAT || 28.6139);
const LNG = Number(process.env.E2E_SCHOOL_LNG || 77.209);

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: state.teacherMobile,
      password: process.env.E2E_TEACHER_PASSWORD || "teacher123",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.token;
}

function buildForm(studentId, folder) {
  const form = new FormData();
  form.append("studentId", studentId);
  form.append("latitude", String(LAT));
  form.append("longitude", String(LNG));
  const dir = path.join(FACE_DIR, folder);
  for (const name of fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
    const buf = fs.readFileSync(path.join(dir, name));
    form.append("images", new Blob([buf]), name);
  }
  return form;
}

const token = await login();
for (const s of state.students) {
  const res = await fetch(`${API}/api/face-onboarding/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: buildForm(s.id, s.folder),
  });
  const data = await res.json();
  console.log(s.folder, res.ok ? "queued" : data.message);
}
