# MediTrack — Product Requirements Document

**Version:** 1.1  
**Date:** April 2026  
**Author:** Luma Chrisparr Ngalle Jomia / Ayamba Ebob Precious   
**Status:** Draft  
**Changelog:** v1.1 — Backend replaced with Supabase (database, auth, storage, realtime)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Tech Stack](#5-tech-stack)
6. [Features & Requirements](#6-features--requirements)
7. [Data Models](#7-data-models)
8. [Pages & Components](#8-pages--components)
9. [Offline & Sync Strategy](#9-offline--sync-strategy)
10. [Outbreak Detection Logic](#10-outbreak-detection-logic)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Out of Scope (v1)](#12-out-of-scope-v1)
13. [Milestones](#13-milestones)

---

## 1. Overview

**ECO~MEDIK** is a React-based web application designed for hospitals and health centres in Cameroon. It digitises patient records, streamlines lab result delivery, and provides automated early-warning detection for disease outbreaks in local communities.

The application is built offline-first — data is stored locally on the device and automatically synced to a cloud server whenever an internet connection is available, making it suitable for use in areas with unreliable network connectivity.

---

## 2. Problem Statement

Hospitals in Cameroon — particularly in rural and semi-urban areas — currently face three critical operational problems:

| # | Problem | Impact |
|---|---------|--------|
| 1 | Patient data is recorded manually on paper | Records are lost, illegible, or destroyed. Returning patients have no retrievable history, delaying diagnosis. |
| 2 | Lab results are communicated verbally or via paper | Delays in notifying the responsible doctor slow down treatment decisions. |
| 3 | Disease outbreaks are detected too late | By the time a cluster is noticed manually, the disease has already spread within the community. |

---

## 3. Goals & Success Metrics

### Primary Goals

- Eliminate paper-based patient record keeping
- Enable instant doctor notification when a lab result is ready
- Automatically detect and alert staff to potential disease outbreaks
- Work reliably without a stable internet connection

### Success Metrics (by end of v1)

| Metric | Target |
|--------|--------|
| Patient record retrieval time | < 10 seconds |
| Lab result notification delay | < 1 minute after upload |
| Outbreak detection speed | Automatic — no manual review required |
| Offline data availability | 100% of core features usable without internet |
| Data loss incidents | 0 after go-live |

---

## 4. Target Users

### 4.1 Receptionist / Admission Officer
Registers new patients, enters demographic and symptom data on arrival.

### 4.2 Doctor / Physician
Views patient history, prescribes treatment, receives lab result notifications, responds to outbreak alerts.

### 4.3 Lab Technician
Uploads lab results tied to a specific patient ID. Triggers automatic doctor notification.

### 4.4 Hospital Administrator
Monitors system-wide statistics, manages outbreak alerts, configures settings such as outbreak threshold and sync frequency.

### 4.5 Public Health Officer *(future)*
Receives aggregated outbreak data for regional response planning.

---

## 5. Tech Stack

### Frontend
| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React 18 | Component-based UI, large ecosystem |
| Build Tool | Vite | Fast dev server, simple config |
| Routing | React Router v6 | Page navigation |
| State Management | Zustand | Lightweight, simple global state |
| Styling | Tailwind CSS | Utility-first, responsive by default |
| Charts | Recharts | Symptom trend visualisation |
| Icons | Lucide React | Clean, consistent icon set |

### Offline & Storage
| Layer | Technology | Reason |
|-------|-----------|--------|
| Local Storage | IndexedDB (via Dexie.js) | Stores full patient records offline |
| Background Sync | Service Worker + Workbox | Syncs queued data when back online |
| PWA Support | vite-plugin-pwa | Installable on mobile devices |

### Backend — Supabase (all-in-one, free tier)

> **No custom server required for v1.** Supabase replaces Express, PostgreSQL, Prisma, bcrypt, S3, and Socket.io in a single free platform.

| Layer | Supabase Feature | Reason |
|-------|-----------------|--------|
| Database | Supabase PostgreSQL | Fully managed, relational, reliable for medical records |
| Auth | Supabase Auth | Built-in login, JWT sessions, role metadata — no bcrypt to manage |
| File Storage | Supabase Storage | Lab result PDFs and images, organised in buckets |
| Real-time Notifications | Supabase Realtime | Instant lab-ready alerts via database change subscriptions |
| API | Supabase Auto REST API | Auto-generated from your DB schema — no Express needed |
| DB Queries (optional) | Supabase JS Client (`@supabase/supabase-js`) | Type-safe queries directly from React |

### Supabase Free Tier Limits
| Resource | Free Allowance |
|----------|---------------|
| Database | 500 MB |
| File Storage | 1 GB |
| Auth users | Unlimited |
| Realtime connections | 200 concurrent |
| API requests | 500K per month |
| Projects | 2 |

> These limits are sufficient for a v1 hospital pilot. Upgrade to Supabase Pro ($25/month) when the system scales.

### Hosting
| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Vercel | Free |
| Backend + DB + Auth + Storage | Supabase | Free |
| Custom Domain (optional) | Namecheap / Freenom | ~$1–$10/year |

---

## 6. Features & Requirements

### 6.1 Patient Registration

**Description:** Staff can register a new patient with full demographic and clinical intake information.

**Requirements:**
- Form fields: First name, last name, date of birth, gender, phone number, address (region/village), primary symptoms, known allergies, blood group, next of kin
- System auto-generates a unique Patient ID (e.g. `MT-00123`)
- Submitted records are saved to IndexedDB immediately (offline-safe)
- Record is queued for server sync when internet is available
- Duplicate detection: warn if phone number already exists in the system

**Acceptance Criteria:**
- A patient can be registered with no internet connection
- The generated Patient ID is unique and sequential
- After sync, the record is retrievable on any device logged into the same facility

---

### 6.2 Patient Record Retrieval

**Description:** Any authorised staff member can search for and view a patient's full history.

**Requirements:**
- Search by: Patient ID, full name, phone number
- Display: registration date, all past visits, symptoms per visit, diagnoses, medications, lab results
- Patient history must be available even after 5+ years
- Results load within 10 seconds even on a slow connection (cached locally)

**Acceptance Criteria:**
- Search returns correct results for partial name matches
- Full visit history is displayed in reverse chronological order
- A returning patient's previous records are visible to the treating doctor

---

### 6.3 Lab Result Upload & Notification

**Description:** Lab technicians upload results for a patient and the system immediately notifies the assigned doctor.

**Requirements:**
- Lab technician selects Patient ID and test type from a dropdown
- Supports file upload: PDF, JPG, PNG (max 10 MB)
- Optional text summary field for quick reading
- On upload confirmation, a real-time notification is pushed to the assigned doctor
- Notification includes: patient name, Patient ID, test type, timestamp
- If doctor is offline, notification is queued and delivered on next login
- Lab result is stored linked to the patient's record permanently

**Test Types (initial list):**
- Malaria RDT
- Full Blood Count (CBC)
- Typhoid Test (Widal)
- HIV Screening
- Urinalysis
- Liver Function Test
- X-Ray / Imaging Report

**Acceptance Criteria:**
- Doctor receives an in-app notification within 60 seconds of technician upload
- Uploaded file is accessible from the patient's profile
- Upload fails gracefully with an error message if the file exceeds size limits

---

### 6.4 Outbreak Detection & Alerting

**Description:** The system automatically monitors symptom data across all registered patients and fires an alert when a disease cluster is detected.

**Requirements:**
- Configurable threshold (default: 20 patients)
- Configurable detection window (default: 14 days)
- Alert fires when: `count(patients with symptom X in facility Y in last N days) >= threshold`
- Alert is shown as a prominent banner on the Dashboard for all logged-in staff
- Administrator can trigger a one-click notification to regional health authorities
- All alerts are logged with timestamp, disease, case count, and facility name
- Alert is automatically dismissed when case count drops below threshold

**Acceptance Criteria:**
- Alert appears within 1 minute of the threshold being crossed
- Alert includes the disease name, case count, facility, and date range
- Triggering the "Notify Authorities" action logs the event with the user who triggered it

---

### 6.5 Dashboard

**Description:** The main landing page giving an at-a-glance summary of the facility's current state.

**Widgets:**
- Total registered patients
- Pending lab results count
- Active outbreak alerts count
- Data sync percentage
- Recent patients table (last 20, searchable)
- Symptom frequency bar chart (last 30 days)
- Lab result notification feed

---

### 6.6 Offline Mode

**Description:** The full application must be usable without an active internet connection.

**Requirements:**
- All patient registration, viewing, and search works offline
- Lab result uploads are queued locally when offline and sent automatically when reconnected
- A persistent connectivity indicator is shown in the sidebar (Offline / Online + last sync time)
- On reconnection, sync happens automatically in the background without user action
- Conflict resolution: server record wins for older data; newer timestamp wins for concurrent edits

---

### 6.7 Two-Portal Authentication System

**Description:** Two distinct entry points for users: a Self-Service Patient Portal and a Staff Portal.

**Requirements:**
- **Patient Self-Registration:** Patients can self-register independently using their name, phone, date of birth, and password. Their role is automatically set to `patient` upon sign up.
- **Staff Accounts:** Staff (Doctor, Lab Technician, Receptionist/Nurse, Admin) cannot self-register. Their accounts must be created by an Admin from inside the app. Staff log in with credentials provided by the Admin.
- Authentication handled entirely by **Supabase Auth**.
- Session managed automatically by the Supabase JS client.

### 6.8 Role-Based Access & Routing

**Description:** Secure role-specific permissions, routing, and data access.

**Roles & Routing:**
Each role redirects to a specific page after login:
- **Patient:** `patient` → `/my-records`
- **Receptionist:** `receptionist` → `/patients`
- **Lab Technician:** `lab_tech` → `/lab`
- **Doctor:** `doctor` → `/dashboard`
- **Administrator:** `admin` → `/dashboard`

**Requirements:**
- Role is stored as a custom field in Supabase `user_metadata` (e.g. `{ role: "doctor" }`).
- Row Level Security (RLS) policies on Supabase tables enforce role-based data access.
- Logout clears the Supabase session; offline cached data remains in IndexedDB.

### 6.9 Patient Portal

**Description:** A private view for patients to access their own health information.

**Requirements:**
- Patients can only see their own records, visit history, and lab results after log in.
- Patients **cannot** see any other patient's data.
- Strict Supabase RLS policies enforce `auth.uid() = patients.auth_user_id`.

### 6.10 Admin User Management Panel

**Description:** In-app tools for Administrators to manage staff accounts directly.

**Requirements:**
- Admin can create, deactivate, and reset passwords for staff accounts natively inside the app without touching the Supabase dashboard.
- When creating a staff account, Admin sets the staff member's name, email, role, and assigned facility.

### 6.11 First-Run Setup / Admin Bootstrapping

**Description:** A one-time setup initialization for the first hospital administrator.

**Requirements:**
- On the very first launch, if no `admin` exists in the database, show a one-time setup screen to create the first Admin account (hospital name, admin name, email, password).
- After setup is complete and the first admin is created, this screen is permanently locked out.
- For development/testing purposes, the first admin can also be optionally created manually via the Supabase dashboard.

---

## 7. Data Models

All tables are created in Supabase's PostgreSQL database. Row Level Security (RLS) is enabled on every table.

### patients
```sql
CREATE TABLE patients (
  id           TEXT PRIMARY KEY,         -- e.g. MT-00123
  auth_user_id UUID REFERENCES auth.users(id),  -- Links to Supabase user if self-registered
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender       TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  phone        TEXT UNIQUE,
  region       TEXT,
  village      TEXT,
  blood_group  TEXT,
  allergies    TEXT,
  next_of_kin  TEXT,
  facility_id  UUID REFERENCES facilities(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

### visits
```sql
CREATE TABLE visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  date             TIMESTAMPTZ DEFAULT now(),
  symptoms         TEXT[],                -- e.g. ARRAY['Malaria', 'Fever']
  diagnosis        TEXT,
  prescription     TEXT,
  notes            TEXT,
  attending_doctor UUID REFERENCES auth.users(id),
  facility_id      UUID REFERENCES facilities(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

### lab_results
```sql
CREATE TABLE lab_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      UUID REFERENCES visits(id),
  patient_id    TEXT REFERENCES patients(id),
  test_type     TEXT NOT NULL,
  file_url      TEXT,                    -- Supabase Storage URL
  summary       TEXT,
  uploaded_by   UUID REFERENCES auth.users(id),
  uploaded_at   TIMESTAMPTZ DEFAULT now(),
  notified_at   TIMESTAMPTZ
);
```

### outbreak_alerts
```sql
CREATE TABLE outbreak_alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom              TEXT NOT NULL,
  facility_id          UUID REFERENCES facilities(id),
  case_count           INT NOT NULL,
  window_days          INT DEFAULT 14,
  triggered_at         TIMESTAMPTZ DEFAULT now(),
  resolved_at          TIMESTAMPTZ,
  authority_notified   BOOLEAN DEFAULT false,
  notified_by          UUID REFERENCES auth.users(id),
  notified_at          TIMESTAMPTZ
);
```

### facilities
```sql
CREATE TABLE facilities (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  region   TEXT,
  location TEXT
);
```

> **Note:** The `auth.users` table is managed automatically by Supabase Auth. User roles are stored in `raw_user_meta_data` as `{ "role": "doctor" }` and set by an admin at account creation.

---

## 8. Pages & Components

### Pages

| Route | Component | Access |
|-------|-----------|--------|
| `/setup` | FirstRunSetupPage | Public (only if no admin exists) |
| `/login` | LoginPage | Public |
| `/register` | PatientRegisterPage | Public |
| `/dashboard` | DashboardPage | Doctor, Admin |
| `/my-records` | PatientPortalPage | Patient |
| `/patients` | PatientListPage | Receptionist, Doctor, Admin |
| `/patients/new` | PatientRegistrationPage | Receptionist, Admin |
| `/patients/:id` | PatientProfilePage | Doctor, Admin |
| `/lab` | LabResultsPage | LabTech, Doctor, Admin |
| `/lab/upload` | LabUploadPage | LabTech, Admin |
| `/outbreak` | OutbreakMonitorPage | Doctor, Admin |
| `/settings` | SettingsPage | Admin |
| `/admin/users` | AdminUserManagementPage | Admin |

### Key Reusable Components

```
components/
├── layout/
│   ├── Sidebar.jsx
│   ├── Topbar.jsx
│   └── ProtectedRoute.jsx
├── ui/
│   ├── Button.jsx
│   ├── Modal.jsx
│   ├── Toast.jsx
│   ├── Badge.jsx
│   ├── SearchBar.jsx
│   └── ConnectivityBadge.jsx
├── patients/
│   ├── PatientTable.jsx
│   ├── PatientCard.jsx
│   └── PatientForm.jsx
├── lab/
│   ├── LabResultList.jsx
│   ├── LabUploadForm.jsx
│   └── LabNotificationFeed.jsx
├── dashboard/
│   ├── StatCard.jsx
│   ├── SymptomChart.jsx
│   └── OutbreakBanner.jsx
└── outbreak/
    ├── OutbreakCard.jsx
    └── OutbreakMeter.jsx
```

---

## 9. Offline & Sync Strategy

```
User Action
    │
    ▼
Save to IndexedDB via Dexie.js (instant, always — works offline)
    │
    ├── Online? ──Yes──► supabase.from('patients').insert(record)
    │                         │
    │                    Success? ──Yes──► Mark record as synced in IndexedDB
    │                         │
    │                    Error?   ──Yes──► Add to retry queue
    │
    └── Offline? ──────► Add to sync queue in IndexedDB
                              │
                        (Service Worker listens for 'online' event)
                              │
                        Network restored?
                              │
                         Yes ─►  Process sync queue in order
                                 Call supabase.from(...).upsert() for each item
                                 Retry failed items up to 3 times
                                 Mark records as synced
```

**Key Supabase methods used for sync:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Insert a patient record
await supabase.from('patients').insert(patientData)

// Upsert (insert or update) during sync
await supabase.from('patients').upsert(localRecord, { onConflict: 'id' })

// Subscribe to lab result changes (real-time notification)
supabase
  .channel('lab-results')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_results' }, 
    payload => notifyDoctor(payload.new))
  .subscribe()
```

**Libraries:** Dexie.js (IndexedDB wrapper), Workbox (Service Worker), `@supabase/supabase-js`, `navigator.onLine` + `online`/`offline` events

---

## 10. Outbreak Detection Logic

Runs on every new patient visit registration and on a 30-minute interval via `setInterval`.

```javascript
import { supabase } from './supabaseClient'

async function checkForOutbreak(facilityId, config = { threshold: 20, windowDays: 14 }) {
  const { threshold, windowDays } = config
  const since = new Date(Date.now() - windowDays * 86400000).toISOString()

  // Fetch recent visits for this facility from Supabase
  const { data: visits, error } = await supabase
    .from('visits')
    .select('symptoms')
    .eq('facility_id', facilityId)
    .gte('date', since)

  if (error || !visits) return

  // Count occurrences of each symptom
  const symptomCounts = {}
  visits.forEach(v => {
    v.symptoms.forEach(symptom => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
    })
  })

  // Fire alert if threshold crossed
  for (const [symptom, count] of Object.entries(symptomCounts)) {
    if (count >= threshold) {
      await supabase.from('outbreak_alerts').upsert({
        symptom,
        facility_id: facilityId,
        case_count: count,
        window_days: windowDays,
        triggered_at: new Date().toISOString(),
      }, { onConflict: 'symptom,facility_id' })
    }
  }
}
```

---

## 11. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Page load < 2 seconds on a 3G connection |
| Availability | 99% uptime for the backend API |
| Security | Supabase Auth handles JWT; RLS policies enforce data access per role; HTTPS enforced by Supabase and Vercel |
| Privacy | Patient data encrypted at rest in the database |
| Scalability | System must support up to 50 concurrent users per facility |
| Accessibility | WCAG 2.1 AA compliant; readable on low-resolution screens |
| Browser Support | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |
| Language | Interface in English (French localisation planned for v2) |

---

## 12. Out of Scope (v1)

- Native mobile app (Android / iOS)
- Billing and insurance processing
- Appointment scheduling
- Prescription printing
- Multi-facility dashboard for regional health authorities
- Telemedicine / video consultation
- French / local language localisation
- SMS outbreak alerts to patients

---

## 13. Milestones

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| M1 — Setup | Vite + React scaffolded, React Router, Tailwind, Supabase project created, `.env` configured, sidebar layout | Week 1 |
| M2 — Auth & Setup | First-run setup, Supabase Auth login/register, role metadata, Two-Portal entry, RLS policies | Week 2 |
| M3 — Patients | Patient self-registration, staff registration form, patient table, Patient Portal (/my-records) | Week 3 |
| M4 — Offline | Dexie.js IndexedDB setup, sync queue, Workbox service worker, connectivity badge | Week 4 |
| M5 — Lab Results | Upload form, Supabase Storage for files, Supabase Realtime subscription for doctor notification | Week 5 |
| M6 — Outbreak | Detection logic querying Supabase, alert banner, outbreak monitor page | Week 6 |
| M7 — Dashboard | Stat cards, symptom chart (Recharts), notification feed | Week 7 |
| M8 — Polish & Admin | Admin User Management Panel, responsive design, error handling, empty states, settings page | Week 8 |
| M9 — Testing | Unit tests (Vitest), integration tests, UAT with hospital staff | Week 9 |
| **v1 Launch** | **Deployed — frontend on Vercel, backend on Supabase** | **Week 10** |

---

*This document is a living specification. Update it as requirements evolve during development.*
