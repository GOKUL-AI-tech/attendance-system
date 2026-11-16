# WorkTrack — Employee Attendance & Work Monitoring System

A simple, internship-level, full-stack Employee Attendance & Work Monitoring
System for company use, covering login → attendance → tasks → work reports →
leave → dashboards, with role-based access for Admin, Manager and Employee.

## Tech Stack

- **Frontend:** React.js (Vite) + React Router + Axios + Recharts + react-hot-toast
- **Backend:** Node.js + Express
- **Database:** MySQL
- **AI/ML:** Python + Flask + scikit-learn (separate microservice)
- **Charts:** Recharts

## Project Structure

```
attendance-system/
├── backend/                 Node.js + Express REST API
│   ├── src/
│   │   ├── config/          DB connection + schema.sql
│   │   ├── middleware/      JWT auth + role-based access
│   │   ├── routes/          auth, employees, attendance, tasks,
│   │   │                    work-reports, leave, dashboard, ai
│   │   └── seed/            seed.js — built-in demo dataset
│   ├── .env.example
│   └── package.json
├── ai-service/               Python Flask + scikit-learn microservice
│   ├── app.py                 TF-IDF work summary + productivity indicator
│   └── requirements.txt
└── frontend/                 React (Vite) app
    └── src/
        ├── api/               axios client + endpoint wrappers
        ├── context/           AuthContext (JWT session)
        ├── components/        Layout/sidebar, StatCard, Badge, ProtectedRoute
        └── pages/             Login, Admin/Manager/Employee dashboards,
                                Employee Mgmt, Attendance, Tasks,
                                Work Reports, Leave
```

## 1. Prerequisites

- Node.js 18+ and npm
- MySQL 8 (or MariaDB 10.6+) server running locally
- Python 3.9+ with `venv`

## 2. Database Setup

Create the schema (this also creates the `attendance_system` database):

```bash
mysql -u root < backend/src/config/schema.sql
```

Create an application DB user (or edit `backend/.env` to use your own):

```sql
CREATE USER 'attendance_user'@'localhost' IDENTIFIED BY 'attendance_pass';
GRANT ALL PRIVILEGES ON attendance_system.* TO 'attendance_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env       # adjust DB credentials / JWT secret if needed
npm run seed                # populates the built-in demo dataset
npm run dev                  # starts the API on http://localhost:5000
```

`npm run seed` populates:
- 4 departments (IT, HR, Finance, Marketing)
- 20 employees (4 team managers + 16 employees), each with a login account
- 30 days of attendance history (weekends treated as holidays)
- 50 tasks, 50 daily work reports, 20 leave requests
- All data is generated to be logically consistent (check-out always after
  check-in, employees on approved leave are never marked Present, completed
  tasks carry a completion date, etc.)

## 4. AI Service Setup (Work Summary + Productivity Indicator)

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                 # starts on http://localhost:6060
```

The backend calls this service for `GET /api/ai/work-summary/:employeeId`.
If the AI service is not running, the backend automatically falls back to a
lightweight built-in calculation so the rest of the app keeps working.

## 5. Frontend Setup

```bash
cd frontend
npm install
# .env already points VITE_API_URL to http://localhost:5000/api
npm run dev                   # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## 6. Demo Accounts

All seeded users share the same password: **`Password123!`**

| Role     | Email                 |
|----------|------------------------|
| Admin    | admin@company.com      |
| Manager  | manager@company.com    |
| Employee | employee@company.com   |

(The login screen also lets you click any demo account to auto-fill it.)
Any of the other 19 seeded employee/manager emails — e.g.
`rohit.sharma@company.com` — also work with the same password.

## 7. Feature Overview

- **Login & Roles:** JWT-based auth with Admin / Manager / Employee roles
  and route-level + API-level role guards.
- **Employee Management (Admin):** add, edit, deactivate and search
  employees; assign department, designation, reporting manager and role.
- **Attendance:** employees check in / check out; the system auto-computes
  working hours and marks Present / Late (after 09:30) / Absent / Leave.
  Admin and Manager can view filtered attendance logs.
- **Work Monitoring:** employees submit a daily work report (work completed,
  hours, task status, remarks); managers view their team's reports.
- **Task Management:** managers create tasks (title, description, assignee,
  priority, due date); employees update their own task status.
- **Leave Management:** employees apply for leave; managers approve/reject.
  Approving a leave automatically marks the employee's attendance as
  "Leave" for each working day in range.
- **Dashboards:** role-specific stat cards and charts (attendance overview,
  department-wise headcount, team/task summaries, personal attendance %).
- **AI Feature:** `GET /api/ai/work-summary/:employeeId` generates a short
  natural-language summary of an employee's recent work (via TF-IDF keyword
  extraction over their work reports) plus a 0–100 **Productivity
  Indicator** combining attendance rate, task completion rate and average
  hours worked. It is explicitly labeled as an informational metric, not an
  automated performance judgment.

## 8. API Overview

All endpoints (except `/api/auth/login`) require `Authorization: Bearer <token>`.

| Method | Endpoint                              | Access               |
|--------|----------------------------------------|-----------------------|
| POST   | /api/auth/login                        | Public                |
| GET    | /api/employees                         | Admin, Manager        |
| POST   | /api/employees                         | Admin                 |
| PUT    | /api/employees/:id                     | Admin                 |
| DELETE | /api/employees/:id                     | Admin                 |
| POST   | /api/attendance/checkin                | Employee/Manager/Admin|
| POST   | /api/attendance/checkout               | Employee/Manager/Admin|
| GET    | /api/attendance/me                     | Self                  |
| GET    | /api/attendance                        | Admin, Manager        |
| GET    | /api/tasks                              | Role-aware             |
| POST   | /api/tasks                              | Manager, Admin         |
| PUT    | /api/tasks/:id/status                  | Assignee               |
| GET    | /api/work-reports                      | Role-aware             |
| POST   | /api/work-reports                      | Employee                |
| GET    | /api/leave                              | Role-aware             |
| POST   | /api/leave                              | Employee                |
| PUT    | /api/leave/:id/decision                | Manager, Admin          |
| GET    | /api/dashboard/admin \| manager \| employee | matching role     |
| GET    | /api/ai/work-summary/:employeeId       | Self / own manager / Admin |

## 9. Notes

- Passwords are hashed with bcrypt; tokens are signed JWTs (8h expiry by default).
- The database schema defines proper primary keys, foreign keys and unique
  constraints (e.g. one attendance record per employee per day).
- Weekends are treated as holidays and excluded from generated attendance data.
