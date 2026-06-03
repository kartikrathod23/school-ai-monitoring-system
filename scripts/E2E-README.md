# E2E flow test

## Per-photo attendance (recommended for group_photos/)

Tests **each** `group_photos/*.jpeg` separately with present/absent per photo (like offline `step2_attendance.py`).

```bash
./scripts/run-per-photo-test.sh
```

Or:

```bash
./scripts/restart-backend-local.sh
USE_LOCAL_UPLOAD=true node scripts/e2e-per-photo-test.mjs
```

Output:
- `scripts/per-photo-attendance.log` — present/absent for every photo
- `scripts/per-photo-attendance-results.json` — structured results

Phase 1 runs full API onboarding (`students/student_01` … `09`).  
Phase 2 calls Python `/attendance` once per group photo using DB embeddings.

---

## Combined attendance (single session)

Complete automated test for: **Admin setup → Face onboarding → ML embeddings → Attendance → Finalize**

Uses images from:
- `apps/face_attendance/students/student_01` … `student_09` (5 photos each)
- `apps/face_attendance/group_photos/` (up to 10 photos per API limit)

## One command

```bash
chmod +x scripts/run-e2e-test.sh
./scripts/run-e2e-test.sh
```

## Manual steps

```bash
./scripts/run-e2e-services.sh
./scripts/restart-backend-local.sh
USE_LOCAL_UPLOAD=true node scripts/e2e-full-flow.mjs
```

## Output files (on success)

| File | Description |
|------|-------------|
| `scripts/e2e-test-results.json` | Structured pass/fail + all IDs and records |
| `scripts/e2e-test-results.txt` | Human-readable summary |
| `scripts/e2e-run.log` | Full console log |
| `scripts/.e2e-state.json` | Reusable school/section/student IDs |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `USE_LOCAL_UPLOAD` | — | **Required locally.** Backend serves images at `/uploads` |
| `E2E_MAX_STUDENTS` | 9 | Number of students to create/enroll |
| `E2E_MAX_GROUP_PHOTOS` | 0 (all, max 10) | Limit group photos |
| `E2E_SKIP_SETUP` | — | Skip admin + onboarding; run attendance only |
| `E2E_RUN_TAG` | timestamp | Unique mobiles per run |

## Expected success

```
✓ E2E TEST PASSED — ALL CHECKS OK
```

Assertions:
1. All students `faceStatus = ADDED`
2. Attendance session `PROCESSED`
3. One record per student
4. All students `PRESENT` (for this test dataset)

## Troubleshooting

- **RESCAN / onboarding timeout**: Backend not using `USE_LOCAL_UPLOAD` → run `restart-backend-local.sh`
- **S3 403 in Python logs**: Same fix — ML cannot read private S3 URLs
- **Attendance 500 with 11 photos**: API max is 10 images; test auto-limits to 10
- **Second run same day**: Attendance reuses today's session for that section
