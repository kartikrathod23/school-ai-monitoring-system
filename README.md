# AI-Based Attendance & Mid-Day Meal Monitoring System

## Project Overview

This system is designed to automate student attendance and mid-day meal estimation in government schools using AI-based image processing.

The system replaces manual attendance and meal counting with a scalable, digital, and auditable solution.

## Key Features

* Face recognition-based attendance
* AI-based student headcount for meal estimation
* Role-based dashboards (Admin, Teacher, Student, Principal)
* Geofencing for location validation
* Manual override for reliability
* Scalable backend architecture

## Project Structure

```
school-ai-monitoring-system/
│
├── apps/                     # All runnable applications
│   ├── backend/              # Main API server
│   ├── ml-service/           # AI services (Python)
│   ├── web-dasboard/         # Admin + Principal dashboard
│   ├── mobile-teacher/       # Teacher app
│   └── mobile-student/       # Student app
│
├── packages/                 # Shared reusable code
│   ├── types/                # Shared TS types
│   ├── utils/                # Common utilities
│   ├── config/               # Shared configs (env, constants)
│   └── ui/                   # Shared UI components (if needed)
│
├── infra/                    # DevOps & deployment
│   ├── docker/               # Dockerfiles
│   ├── k8s/                  # Kubernetes configs (future)
│   ├── nginx/                # Reverse proxy config
│   └── terraform/            # Cloud infra (future)
│
├── scripts/                  # Automation scripts
│
├── .env.example
├── docker-compose.yml
├── package.json              # root workspace
├── README.md
└── .gitignore
```

## Tech Stack

* Backend: Node.js (Express)
* ML Services: Python (FastAPI)
* Database: PostgreSQL
* Cache/Queue: Redis
* Storage: S3 / MinIO
* Frontend: Next.js / Mobile Apps

## Status

Initial project setup in progress.

## Notes

* Designed for real-world deployment in government schools.
* Focus on scalability, reliability, and performance.
