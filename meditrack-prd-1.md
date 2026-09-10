# MediTrack — Product Requirements Document

**Version:** 1.4  
**Date:** April 2026  
**Author:** [Your Name]  
**Status:** Draft  
**Changelog:**
- v1.1 — Backend replaced with Supabase
- v1.2 — AI Diagnostics module added
- v1.3 — Full Nursing module added
- v1.4 — Doctor module, Clinical Data Flow & Staff Interconnection, Hardware Integration catalogue added

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Tech Stack](#5-tech-stack)
6. [Features & Requirements](#6-features--requirements)
7. [AI Diagnostics Module](#7-ai-diagnostics-module)
8. [Nursing Module](#8-nursing-module)
9. [Doctor Module](#9-doctor-module)
10. [Clinical Data Flow & Staff Interconnection](#10-clinical-data-flow--staff-interconnection)
11. [Hardware Integration](#11-hardware-integration)
12. [Data Models](#12-data-models)
13. [Pages & Components](#13-pages--components)
14. [Offline & Sync Strategy](#14-offline--sync-strategy)
15. [Outbreak Detection Logic](#15-outbreak-detection-logic)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Out of Scope (v1)](#17-out-of-scope-v1)
18. [Milestones](#18-milestones)

---

## 1. Overview

**ECO~MEDIK (MediTrack)** is a React-based web and mobile application designed for hospitals and health centres in Cameroon. It digitises patient records, streamlines lab result delivery, provides automated early-warning detection for disease outbreaks, delivers AI-powered diagnostic analysis at the point of care, and provides a comprehensive digital nursing module covering every clinical observation a nurse performs from triage through discharge.

The application is built offline-first — data is stored locally on the device and automatically synced to a cloud server whenever an internet connection is available, making it suitable for use in areas with unreliable network connectivity.

The AI Diagnostics module transforms ECO~MEDIK from a records management tool into a **portable AI diagnostic laboratory**. The Nursing module makes ECO~MEDIK the **real-time clinical backbone of the ward** — capturing every vital sign, every drug administered, every fluid balance entry, and alerting doctors the moment a patient deteriorates.

---

## 2. Problem Statement

Hospitals in Cameroon — particularly in rural and semi-urban areas — currently face three critical operational problems:

| # | Problem | Impact |
|---|---------|--------|
| 1 | Patient data is recorded manually on paper | Records are lost, illegible, or destroyed. Returning patients have no retrievable history, delaying diagnosis. |
| 2 | Lab results are communicated verbally or via paper | Delays in notifying the responsible doctor slow down treatment decisions. |
| 3 | Disease outbreaks are detected too late | By the time a cluster is noticed manually, the disease has already spread within the community. |
| 4 | Specialist diagnostic skills are unavailable in rural areas | No radiologists, cardiologists, or pathologists outside major cities. Lab reading is manual and error-prone. |
| 5 | Nursing observations are recorded on paper charts | Vital sign trends, fluid balance, and drug administration records are lost, incomplete, or unreadable — delaying the doctor's ability to detect patient deterioration. |

---

## 3. Goals & Success Metrics

### Primary Goals

- Eliminate paper-based patient record keeping
- Enable instant doctor notification when a lab result is ready
- Automatically detect and alert staff to potential disease outbreaks
- Work reliably without a stable internet connection
- Deliver AI-powered diagnostic analysis at the point of care with no specialist required

### Success Metrics (by end of v1)

| Metric | Target |
|--------|--------|
| Patient record retrieval time | < 10 seconds |
| Lab result notification delay | < 1 minute after upload |
| Outbreak detection speed | Automatic — no manual review required |
| Offline data availability | 100% of core features usable without internet |
| Data loss incidents | 0 after go-live |
| AI RDT strip reading accuracy | ≥ 95% vs manual reading |
| AI chest X-ray TB flag accuracy | ≥ 90% sensitivity |
| AI result turnaround time | < 10 seconds per analysis |

---

## 4. Target Users

### 4.1 Receptionist / Admission Officer
Registers new patients, enters demographic and symptom data on arrival.

### 4.2 Nurse / Triage Nurse
First clinical contact for every patient. Records triage vitals, chief complaint, pain score, and assigns urgency classification. Ward nurses perform ongoing rounds — recording observation charts, fluid balance, medication administration, wound assessments, and escalating deteriorating patients to doctors via the app.

### 4.3 Doctor / Physician
Views patient history, prescribes treatment, receives lab result notifications, reviews AI diagnostic results, monitors nursing observation charts and vital sign trends, responds to outbreak and deterioration alerts.

### 4.4 Lab Technician
Runs physical tests, uses AI diagnostics to read and analyse results, uploads findings to the patient's record, triggers automatic doctor notifications.

### 4.5 Hospital Administrator
Monitors system-wide statistics, manages outbreak alerts, configures settings, creates and manages all staff accounts.

### 4.6 Patient
Self-registers. Views their own records, visit history, lab results, active prescriptions, and receives lab result notifications.

### 4.7 Public Health Officer *(future)*
Receives aggregated outbreak and symptom data for regional response planning.

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

### AI & Machine Learning Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| On-device inference | TensorFlow.js | Run AI models in the browser offline — no internet needed for analysis |
| Model training | Python + TensorFlow / PyTorch | Train and fine-tune custom diagnostic models |
| Image classification | EfficientNet / ResNet (fine-tuned) | RDT strip reading, skin lesion, wound analysis |
| Object detection | YOLOv8 (fine-tuned) | Parasite detection in microscope slides |
| Audio classification | OpenAI Whisper (fine-tuned) | Cough pattern analysis for TB screening |
| ECG analysis | Custom CNN | Arrhythmia and cardiac event detection |
| Chest X-ray | Qure.ai API / custom model | TB, pneumonia, COVID-19 detection |
| Model hosting | Supabase Storage + CDN | Serve `.tflite` / `.onnx` model files to the app |
| Training data platform | Roboflow | Annotate and version medical image datasets |
| Existing model APIs | Google Cloud Vision, Qure.ai, Eyenuk | Fallback for tests not yet covered by custom models |

### Supported Hardware (Bluetooth & USB)

| Device | Connection | Tests enabled |
|--------|-----------|---------------|
| Phone camera (built-in) | Native | RDT strips, skin, wounds, stool, X-ray upload, retinal |
| Clip-on microscope lens ($20–50) | Physical | Blood smears, parasite slides, urinalysis |
| USB digital microscope ($40–80) | USB-C | High-resolution slide analysis |
| AliveCor KardiaMobile ECG ($99) | Bluetooth | Arrhythmia, atrial fibrillation, cardiac screening |
| Bluetooth pulse oximeter ($20–40) | Bluetooth | SpO2, heart rate, respiratory distress |
| Bluetooth glucometer ($30–60) | Bluetooth | Blood glucose, diabetes monitoring |
| HemoCue Hb 301 ($400) | Manual entry + AI interpretation | Haemoglobin, anaemia severity |
| Portable ultrasound / Butterfly iQ | USB-C / WiFi | Foetal, organ, cardiac ultrasound |
| Bluetooth BP cuff | Bluetooth | Hypertension staging, trend analysis |

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

### 6.7 Authentication & Role-Based Access

**Description:** Secure login with role-specific permissions.

**Roles:**

| Role | Permissions |
|------|-------------|
| Receptionist | Register patients, search records |
| Lab Technician | Upload lab results, view patient IDs |
| Doctor | View full patient records, receive notifications, view outbreak alerts |
| Administrator | All of the above + manage users, configure settings, trigger authority notifications |

**Requirements:**
- Authentication handled entirely by **Supabase Auth** (email + password)
- Role stored as a custom field in Supabase `user_metadata` (e.g. `{ role: "doctor" }`)
- Session managed automatically by the Supabase JS client (no manual JWT handling)
- Row Level Security (RLS) policies on Supabase tables enforce role-based data access
- Role is assigned at account creation by an administrator via the Supabase dashboard or admin panel
- Logout clears the Supabase session; offline cached data remains in IndexedDB

**Supabase RLS Policy Example:**
```sql
-- Only doctors and admins can view full patient records
CREATE POLICY "Doctors and admins can view patients"
ON patients FOR SELECT
USING (auth.jwt() ->> 'role' IN ('doctor', 'admin'));
```

---

## 7. AI Diagnostics Module

### 7.1 Overview

The AI Diagnostics module enables ECO~MEDIK to analyse medical images, test strips, microscope slides, and sensor data using machine learning models — returning a result, confidence score, and clinical flag in under 10 seconds. All analysis runs on-device via TensorFlow.js where possible, making it fully functional offline.

Every AI result is stored in the patient's record alongside the captured image, the model version used, the confidence score, and whether it was reviewed by a human. A doctor must confirm or override every AI result before it becomes part of the official medical record.

---

### 7.2 Analysis Categories & Supported Tests

#### A. Rapid Test Strip Reading
*Hardware required: Phone camera only*

The lab tech runs the physical strip as normal, then opens the ECO~MEDIK camera mode, positions the strip inside the on-screen frame guide, and the AI reads the result in 3 seconds — eliminating human reading error and documenting the strip image automatically.

| Test | Detects | AI output |
|------|---------|-----------|
| Malaria RDT | P. falciparum / P. vivax | Positive / Negative / Invalid + line intensity |
| HIV 1 & 2 | HIV antibodies | Positive / Negative / Invalid |
| Hepatitis B & C | HBsAg, HCV antibodies | Positive / Negative |
| COVID-19 antigen | SARS-CoV-2 antigen | Positive / Negative / Invalid |
| Pregnancy (HCG) | Human chorionic gonadotropin | Positive / Negative |
| Typhoid (Widal) | Salmonella antibodies | Titre level estimation |
| Syphilis (RPR) | Treponema antibodies | Positive / Negative |
| Dengue fever | NS1 antigen | Positive / Negative |

**Acceptance criteria:**
- AI reads strip result in < 5 seconds
- Confidence score shown on every result
- Invalid strips flagged for repeat testing
- Strip image saved to patient record permanently

---

#### B. Microscopy Analysis
*Hardware required: Clip-on phone lens ($20–50) or USB digital microscope*

| Test | AI detects | Clinical value |
|------|-----------|----------------|
| Malaria blood smear | P. falciparum parasites, parasite density per µL | Replaces manual microscopy reading |
| TB sputum smear (AFB) | Acid-fast bacilli in sputum | TB confirmation |
| Intestinal parasites (stool) | Eggs — roundworm, hookworm, tapeworm, giardia | Identifies specific parasite species |
| Anaemia / CBC morphology | RBC shape, size, colour, WBC count | Sickle cell, iron deficiency, infection |
| Urinalysis | Crystals, casts, bacteria in urine sediment | UTI, kidney disease |
| Trypanosomiasis | Trypanosome parasites in blood | Sleeping sickness diagnosis |

**Acceptance criteria:**
- Parasite detection sensitivity ≥ 95% for P. falciparum on good-quality slides
- Parasite density reported in parasites/µL
- Model trained specifically on African Plasmodium strains

---

#### C. Medical Imaging Analysis
*Hardware required: Existing hospital equipment + phone camera for upload*

| Modality | AI analyses | Conditions flagged |
|----------|------------|-------------------|
| Chest X-ray (CXR) | Lung field opacity, infiltrates, effusion | TB, pneumonia, COVID-19, lung cancer |
| Ultrasound | Organ size, echogenicity, foetal measurements | Pregnancy dating, placenta position, organ disease |
| Retinal fundus photo | Blood vessel patterns, optic disc | Diabetic retinopathy, glaucoma |
| Skin / dermatology | Lesion colour, border, texture | Fungal infection, melanoma, malaria rash |
| Wound photo | Infection markers, healing stage | Wound severity grading |
| Eye conjunctiva | Pallor level | Anaemia screening (non-invasive) |
| Sclera | Yellowing (icterus) | Jaundice screening |
| Newborn skin | Bilirubin-related yellowing | Neonatal jaundice |

**Acceptance criteria:**
- Chest X-ray TB sensitivity ≥ 90%
- Images stored in Supabase Storage in original resolution
- DICOM format supported for X-ray upload where available

---

#### D. Cardiovascular & Vital Signs
*Hardware required: Bluetooth ECG device, pulse oximeter, BP cuff*

| Test | Hardware | AI analyses |
|------|---------|-------------|
| 12-lead equivalent ECG | AliveCor KardiaMobile | Atrial fibrillation, arrhythmia, ST elevation (heart attack), bradycardia |
| SpO2 / pulse oximetry | Bluetooth oximeter | Respiratory distress, anaemia, shock |
| Blood pressure | Bluetooth BP cuff | Hypertension stage 1/2, hypotension, MAP calculation |
| Heart rate variability | ECG device | Autonomic nervous system, stress index |
| Blood glucose | Bluetooth glucometer | Diabetes staging, hypoglycaemia alert |

**Acceptance criteria:**
- ECG arrhythmia detection sensitivity ≥ 93%
- Critical values (e.g. SpO2 < 90%, glucose < 3.0 mmol/L) trigger immediate red alert to doctor
- All vital signs trended over time on patient profile

---

#### E. Respiratory
*Hardware required: Phone microphone (built-in) + optional Bluetooth spirometer*

| Test | Hardware | AI analyses |
|------|---------|-------------|
| Cough audio analysis | Phone microphone | TB cough vs normal cough pattern — trained on Cameroonian audio samples |
| Respiratory rate | Phone camera (chest movement detection) | Pneumonia screening in children |
| Spirometry | Bluetooth spirometer | FEV1/FVC ratio — asthma, COPD, TB lung damage |

---

#### F. Stool & GI Tests
*Hardware required: Phone macro camera or clip-on lens*

| Test | AI analyses |
|------|------------|
| Stool photo | Bristol Stool Scale classification, blood detection |
| Faecal occult blood strip | Strip line reading — colorectal bleeding |
| H. pylori rapid strip | Positive / Negative |
| Rotavirus antigen strip | Positive / Negative |
| Cholera rapid strip | Positive / Negative |
| Microscopy (stool sediment) | Parasite egg identification |

---

#### G. Maternal & Child Health
*Hardware required: Portable ultrasound + phone camera*

| Test | AI analyses |
|------|------------|
| Obstetric ultrasound | Gestational age, foetal position, placenta praevia, amniotic fluid index |
| MUAC from photo | Mid-upper arm circumference — malnutrition screening in children |
| Neonatal jaundice | Skin colour bilirubin estimation |
| Foetal heart rate | Doppler device reading classification |

---

#### H. Ophthalmology & ENT
*Hardware required: Clip-on ophthalmoscope or otoscope lens (~$50)*

| Test | AI analyses |
|------|------------|
| Retinal scan | Diabetic retinopathy grading (none / mild / moderate / severe / PDR) |
| Ear canal (otoscope) | Otitis media — fluid, perforation, infection |
| Throat photo | Strep throat, tonsillitis, oral thrush |
| Oral cavity | Ulcers, oral cancer screening |

---

### 7.3 AI Model Strategy

Models are built in three tiers to balance speed, cost, and accuracy:

```
Tier 1 — Use existing APIs (fastest to deploy)
    ├── Qure.ai API        → Chest X-ray (TB, pneumonia)
    ├── Google Vision API  → General image classification fallback
    └── Eyenuk API         → Diabetic retinopathy

Tier 2 — Fine-tune open-source models on African data (best accuracy)
    ├── YOLOv8             → Parasite detection (malaria, TB smears)
    ├── EfficientNet-B3    → RDT strip reading, skin lesion classification
    ├── ResNet-50          → Chest X-ray analysis (fine-tuned on African CXRs)
    └── Whisper (small)    → Cough audio TB screening

Tier 3 — On-device TensorFlow.js models (fully offline)
    ├── TFLite RDT model   → Strip reading with no internet
    ├── TFLite malaria     → Blood smear analysis offline
    └── TFLite ECG         → Basic arrhythmia detection offline
```

**Training data sources:**
- Malaria: NIH Malaria Cell Image Dataset + locally collected Cameroonian samples
- TB X-ray: Montgomery County CXR Dataset + Shenzhen CXR Dataset
- RDT strips: Fio Corporation open dataset + internally captured strips
- Cough: COUGHVID dataset + locally recorded samples

**Data annotation platform:** Roboflow (free tier for non-commercial / research use)

---

### 7.4 AI Result Workflow

```
Lab tech / health worker opens AI Diagnostics tab
    │
    ▼
Selects test type (RDT strip / microscope / X-ray / ECG / etc.)
    │
    ▼
Captures image / connects Bluetooth device / uploads file
    │
    ▼
TensorFlow.js runs model on-device (offline capable)
    │         OR
    ▼
API call to Qure.ai / Google Vision (if online + test requires it)
    │
    ▼
AI returns:
    ├── Result (Positive / Negative / Value / Classification)
    ├── Confidence score (e.g. 94.2%)
    ├── Clinical flag (Normal / Borderline / Critical)
    └── Suggested action (e.g. "Confirm with repeat test", "Notify doctor immediately")
    │
    ▼
Result displayed to lab tech with captured image
    │
    ▼
Lab tech submits → saved to ai_results table in Supabase
    │
    ▼
Doctor receives notification → Reviews AI result + image
    │
    ├── Confirms result → Enters official medical record
    └── Overrides result → Logs reason → Enters corrected record
```

---

### 7.5 Critical Value Alerts

When an AI result falls outside a safe threshold, the system escalates automatically:

| Condition | Threshold | Alert level |
|-----------|-----------|-------------|
| Malaria parasite density | > 5,000 parasites/µL | 🔴 Critical — notify doctor immediately |
| SpO2 | < 90% | 🔴 Critical — respiratory emergency |
| Blood glucose | < 3.0 or > 20.0 mmol/L | 🔴 Critical |
| ECG — ST elevation | > 1mm in 2+ leads | 🔴 Critical — possible heart attack |
| Haemoglobin | < 7 g/dL | 🔴 Critical — severe anaemia |
| HIV result | Positive | 🟡 Sensitive — doctor notified, privacy protocol triggered |
| TB smear | AFB positive | 🟡 Urgent — isolation protocol recommended |

---

### 7.6 AI Data Model

```sql
CREATE TABLE ai_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  facility_id      UUID REFERENCES facilities(id),
  performed_by     UUID REFERENCES auth.users(id),   -- lab tech
  reviewed_by      UUID REFERENCES auth.users(id),   -- doctor
  test_category    TEXT NOT NULL,    -- 'rdt_strip' | 'microscopy' | 'imaging' | 'ecg' | 'vitals' | 'cough'
  test_name        TEXT NOT NULL,    -- 'Malaria RDT' | 'Chest X-ray' | etc.
  input_image_url  TEXT,             -- Supabase Storage URL of captured image
  ai_result        TEXT NOT NULL,    -- 'Positive' | 'Negative' | numeric value
  confidence_score NUMERIC(5,2),     -- e.g. 94.20
  clinical_flag    TEXT,             -- 'Normal' | 'Borderline' | 'Critical'
  model_version    TEXT,             -- e.g. 'malaria-yolov8-v2.1'
  raw_output       JSONB,            -- full model output for audit
  doctor_confirmed BOOLEAN DEFAULT false,
  doctor_override  TEXT,             -- if doctor changed the result, their correction
  override_reason  TEXT,
  performed_at     TIMESTAMPTZ DEFAULT now(),
  confirmed_at     TIMESTAMPTZ
);
```

---

### 7.7 New Pages & Components for AI Module

**New routes:**

| Route | Component | Access |
|-------|-----------|--------|
| `/ai-diagnostics` | AIDiagnosticsPage | LabTech, Doctor |
| `/ai-diagnostics/scan` | ScannerPage | LabTech |
| `/ai-diagnostics/results/:id` | AIResultDetailPage | LabTech, Doctor |
| `/ai-diagnostics/history` | AIResultsHistoryPage | Doctor, Admin |

**New components:**
```
components/ai/
├── CameraCapture.jsx          ← Full-screen camera with frame guide overlay
├── StripFrameGuide.jsx        ← RDT strip alignment overlay
├── MicroscopeCapture.jsx      ← Microscope image capture mode
├── AIResultCard.jsx           ← Shows result + confidence + flag
├── CriticalAlert.jsx          ← Full-screen red alert for critical values
├── BluetoothDeviceManager.jsx ← Pair / connect Bluetooth hardware
├── ECGViewer.jsx              ← Renders ECG waveform from device data
├── DoctorConfirmPanel.jsx     ← Doctor review and confirm / override UI
└── ModelStatusBadge.jsx       ← Shows which model version was used
```

---

---

## 8. Nursing Module

### 8.1 Overview

The Nursing module is the real-time clinical backbone of the ward. It digitises every observation a nurse performs from the moment a patient arrives to the moment they are discharged. All entries are timestamped, attributed to the specific nurse, visible to the doctor in real time, and trigger automatic alerts when values cross dangerous thresholds.

Every nursing form works offline — data is saved locally first and synced to Supabase when connectivity is restored.

---

### 8.2 Triage Assessment

**Who uses it:** Triage nurse at the point of arrival.
**When:** Every new patient, every visit.
**Time to complete:** 3–5 minutes.

**Fields captured:**

| Field | Type | Notes |
|-------|------|-------|
| Temperature | Numeric (°C) | Alert if > 38.5°C or < 35.5°C |
| Blood pressure (systolic / diastolic) | Numeric (mmHg) | Alert if systolic < 90 or > 180 |
| Heart rate | Numeric (bpm) | Alert if < 50 or > 120 |
| Respiratory rate | Numeric (breaths/min) | Alert if < 10 or > 25 |
| SpO2 | Numeric (%) | Alert if < 92% |
| Weight | Numeric (kg) | Used for drug dosing |
| Temperature route | Select | Oral / Axillary / Rectal / Tympanic |
| Chief complaint | Free text | Patient's own words verbatim |
| Pain score | 0–10 slider | Wong-Baker faces scale displayed for children |
| Arrival mode | Select | Walked in / Brought by family / Ambulance / Referral / Found unconscious |
| Triage colour | Auto-assigned + nurse override | 🔴 Red / 🟡 Yellow / 🟢 Green |
| Triage nurse | Auto (logged-in user) | |
| Triage time | Auto (timestamp) | |

**Triage auto-classification logic:**
```javascript
function classifyTriage(vitals) {
  const { spo2, bp_systolic, hr, rr, consciousness } = vitals

  if (spo2 < 85 || bp_systolic < 70 || consciousness === 'U' || hr > 150 || rr > 30)
    return 'red'   // Life threatening — see immediately

  if (spo2 < 92 || bp_systolic < 90 || hr > 120 || rr > 25 || temp > 39.5)
    return 'yellow' // Urgent — see within 30 minutes

  return 'green'   // Non-urgent — see within 2 hours
}
```

**Acceptance criteria:**
- Triage form completable in under 5 minutes
- Triage colour auto-assigned but nurse can override with a reason
- Red triage triggers immediate notification to the assigned doctor
- Vitals feed directly into the patient's observation chart

---

### 8.3 Observation Chart (Obs Chart)

**Who uses it:** Ward nurse every 1–4 hours for admitted patients.
**Purpose:** Running log of every vital sign — the most important document in a ward.

**Fields per entry:**

| Field | Type | Critical threshold |
|-------|------|--------------------|
| Temperature | Numeric (°C) | > 39.0°C or < 36.0°C |
| Blood pressure | Numeric (systolic/diastolic) | Systolic < 90 or > 180 |
| Heart rate | Numeric (bpm) | < 50 or > 130 |
| Respiratory rate | Numeric (breaths/min) | < 10 or > 25 |
| SpO2 | Numeric (%) | < 92% |
| AVPU consciousness | Select | V, P, U trigger alert |
| Pain score | 0–10 | |
| Urine output | Numeric (ml) | < 30 ml/hr triggers alert |
| Nurse name | Auto | Logged-in user |
| Time | Auto | Timestamp |
| Notes | Free text | Any notable observation |

**AVPU Scale options:**
- **A** — Alert
- **V** — Responds to voice
- **P** — Responds to pain only
- **U** — Unresponsive

**NEWS2 Score (auto-calculated):**
The National Early Warning Score is calculated automatically from the vitals entered and displayed as a colour-coded risk level:

| Score | Risk | Action |
|-------|------|--------|
| 0–4 | Low | Routine monitoring |
| 5–6 | Medium | Nurse informs doctor within 30 min |
| 7+ | High | Doctor notified immediately — urgent review |

**Doctor view — Trend chart:**
Instead of a table of numbers, the doctor sees a mini sparkline chart for each vital sign showing the last 24 hours at a glance on the patient profile. A downward trend in SpO2 alongside rising heart rate is immediately visible.

**Acceptance criteria:**
- Any single critical value triggers an in-app notification to the assigned doctor within 30 seconds
- If AVPU drops from A to V or below, notification is sent immediately regardless of other values
- Nurse cannot submit an obs chart entry with all fields blank
- Doctor sees trend chart on patient profile without navigating away

---

### 8.4 Fluid Balance Chart

**Who uses it:** Ward nurse, tracked per shift (8-hour or 12-hour shifts).
**Purpose:** Tracks everything going into and out of the patient's body.

**Input fields:**

| Source | Fields |
|--------|--------|
| IV fluids | Type (Normal Saline / Ringer's Lactate / Dextrose 5% / Blood / etc.), Rate (ml/hr), Volume infused |
| Oral intake | Volume (ml) — water, juice, soup |
| Medications via IV | Volume of flush and drug diluent |
| Nasogastric feeds | Volume (ml) |

**Output fields:**

| Source | Fields |
|--------|--------|
| Urine | Volume (ml), colour (clear / yellow / dark / blood-stained) |
| Vomiting | Estimated volume (ml), character (bile / blood / food) |
| Diarrhoea | Number of episodes, estimated volume |
| Wound drainage | Volume from drain (ml), character |
| Nasogastric drainage | Volume (ml) |
| Blood loss | Estimated volume (ml) |

**Auto-calculated fields:**
- Total input for shift
- Total output for shift
- **Balance** (input minus output) — shown prominently
- Cumulative 24-hour balance

**Alert logic:**
```
Urine output < 30 ml/hr for 2+ consecutive hours → 🔴 Alert doctor (oliguria — possible kidney failure)
24-hour balance > +2000 ml → 🟡 Warning (fluid overload)
24-hour balance < -1000 ml → 🟡 Warning (dehydration)
```

**Acceptance criteria:**
- Balance calculated automatically — nurse never has to do maths
- Running total visible at the top of the form at all times
- Shift totals auto-reset at shift change but cumulative 24-hour total persists

---

### 8.5 Medication Administration Record (MAR)

**Who uses it:** Ward nurse for every drug administered.
**Purpose:** Legal and clinical record of every dose given, refused, or missed.

**How it works:**
1. Doctor prescribes medication inside the app (linked to the patient's visit)
2. Prescription appears in the nurse's MAR queue at the scheduled administration times
3. Nurse administers the drug and marks it as given in the app
4. If the patient refuses or cannot take the drug, nurse marks reason

**Fields per administration entry:**

| Field | Type |
|-------|------|
| Drug name | Auto (from prescription) |
| Dose | Auto (from prescription) |
| Route | Auto (Oral / IV / IM / SC / Topical / Inhaled) |
| Scheduled time | Auto (from prescription frequency) |
| Actual time given | Timestamp (when nurse marks as given) |
| Administered by | Auto (logged-in nurse) |
| Status | Select — Given / Refused / Held / Not available |
| Reason if not given | Free text |
| Patient reaction | Free text (optional — e.g. "mild nausea after dose") |

**Drug safety checks (auto):**
- If nurse tries to mark a drug as given before the minimum interval since last dose — system warns "Last dose given 3 hours ago. Minimum interval is 6 hours. Confirm override?"
- Known allergy conflict — if the patient has a recorded allergy and a drug in that family is prescribed, a red warning appears on the MAR

**Acceptance criteria:**
- Nurse cannot accidentally double-dose without an explicit warning and override
- All administration events are immutable — once saved, entries cannot be deleted (only annotated)
- Doctor sees MAR compliance rate on patient profile (e.g. "3 of 4 doses given today")

---

### 8.6 Wound Assessment

**Who uses it:** Ward nurse during dressing changes.

**Fields:**

| Field | Type |
|-------|------|
| Wound location | Body map selector or free text |
| Wound size | Length × width (cm) |
| Wound depth | Superficial / Partial thickness / Full thickness |
| Wound bed | Select — Clean / Sloughy / Necrotic / Granulating / Epithelialising |
| Exudate amount | None / Minimal / Moderate / Heavy |
| Exudate type | Serous / Serosanguineous / Purulent / Haemoserous |
| Odour | None / Mild / Moderate / Strong |
| Surrounding skin | Normal / Erythematous / Macerated / Oedematous |
| Signs of infection | Yes / No — if yes, notify doctor |
| Dressing type applied | Free text |
| Dressing changed by | Auto (logged-in nurse) |
| Next dressing due | Date/time |
| Photo | Camera capture (stored in Supabase Storage) |

**Acceptance criteria:**
- Photo of wound attached to every assessment for objective comparison over time
- Doctor can view wound photo timeline on patient profile to track healing objectively
- "Signs of infection" = Yes triggers doctor notification

---

### 8.7 IV Line Care Log

**Fields per entry:**

| Field | Type |
|-------|------|
| IV site location | Select (Right hand dorsum / Left AC / Right AC / etc.) |
| Cannula size | Select (18G / 20G / 22G / 24G) |
| Date inserted | Date |
| Site assessment | Patent / Infiltrated / Phlebitis / Blocked |
| Phlebitis score | 0–4 (VIP score — Visual Infusion Phlebitis) |
| Action taken | Continue / Re-site / Remove |
| Re-site location | If re-sited |
| Checked by | Auto (logged-in nurse) |

**Alert:** If cannula has been in place > 96 hours, system reminds nurse to reassess and consider re-siting.

---

### 8.8 Antenatal Nursing Chart

**Who uses it:** Antenatal / maternal health nurse.
**When:** Every antenatal visit.

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Gravida | Numeric | Total number of pregnancies |
| Para | Numeric | Number of deliveries |
| Last menstrual period (LMP) | Date | Used to auto-calculate gestational age and EDD |
| Estimated due date (EDD) | Auto-calculated | |
| Gestational age (weeks) | Auto-calculated | |
| Fundal height | Numeric (cm) | Should approximate gestational age in weeks |
| Foetal heart rate | Numeric (bpm) | Alert if < 110 or > 160 |
| Foetal lie | Select | Longitudinal / Transverse / Oblique |
| Foetal presentation | Select | Cephalic / Breech / Shoulder |
| Engagement | Select | Free / Engaged / 2/5 / 3/5 / 4/5 palpable |
| Oedema | Select | None / Ankles / Legs / Face / Generalised |
| Urine dipstick — Protein | Select | None / Trace / 1+ / 2+ / 3+ |
| Urine dipstick — Glucose | Select | None / Trace / 1+ / 2+ |
| Blood pressure | Numeric | Alert if > 140/90 in pregnancy |
| Weight | Numeric (kg) | Track gestational weight gain |
| Symphysis-fundal height (SFH) | Numeric (cm) | Plotted on growth chart |
| Foetal movements felt | Yes / No / Reduced | Reduced = alert doctor |
| Previous complications | Free text | |
| Tetanus toxoid given | Yes / No | |
| Iron / folate supplements given | Yes / No | |

**Pre-eclampsia auto-alert:**
```
If BP > 140/90 AND urine protein >= 2+ → 🔴 Alert: Possible pre-eclampsia — notify doctor immediately
```

---

### 8.9 Paediatric Assessment (IMCI)

**Who uses it:** Paediatric nurse for children under 5.

**Danger signs checklist (any = automatic red alert):**
- Unable to drink or breastfeed
- Vomits everything
- Convulsions in this illness
- Lethargic or unconscious
- Stridor when calm
- Severe respiratory distress
- Severe dehydration

**Additional paediatric fields:**

| Field | Type |
|-------|------|
| MUAC (mid-upper arm circumference) | Numeric (mm) — < 115mm = severe acute malnutrition |
| Weight for age | Plotted on WHO growth chart |
| Height for age | Plotted on WHO growth chart |
| Fontanelle status | Normal / Sunken / Bulging |
| Skin turgor | Normal / Reduced (slow recoil > 2 sec) |
| Cry | Normal / Weak / High-pitched |
| Feeding status | Breastfeeding / Bottle / Refusing |
| Immunisation status | Up to date / Incomplete / Unknown |
| Dehydration classification | None / Some / Severe |

---

### 8.10 Pre-Operative Checklist

**Who uses it:** Theatre / pre-op nurse before any surgical procedure.

| Item | Status |
|------|--------|
| Consent form signed | Yes / No — cannot proceed if No |
| Allergies confirmed | Yes / No |
| Nil by mouth since | Time (must be ≥ 6 hours for food, ≥ 2 hours for clear fluids) |
| Pre-op medications given | Yes / No / N/A |
| Jewellery and prosthetics removed | Yes / No |
| Surgical site marked | Yes / No / N/A |
| Blood group confirmed | Yes / No |
| Cross-match sent | Yes / No / N/A |
| Baseline vitals recorded | Auto-linked to obs chart |
| Patient identity verified | Yes / No |
| Procedure and site confirmed with patient | Yes / No |
| Pre-op checklist completed by | Auto (logged-in nurse) |

**Hard block:** System prevents the patient from being marked as "ready for theatre" if consent form = No.

---

### 8.11 Post-Operative Recovery Chart

**Who uses it:** Recovery / post-op nurse.

**Fields:**

| Field | Type |
|-------|------|
| Time arrived in recovery | Timestamp |
| Anaesthesia type | General / Spinal / Epidural / Local / Regional |
| Airway | Patent spontaneous / Oral airway / LMA / Intubated |
| Vitals | BP, HR, RR, SpO2, Temp — every 15 min until stable |
| Pain score | 0–10 every 15 min |
| Nausea / vomiting | Yes / No |
| First urine output post-op | Volume (ml) and time |
| Return of sensation | Legs — spinal anaesthesia recovery |
| Aldrete score | Auto-calculated 0–10 — score ≥ 9 required to discharge to ward |
| Analgesics given in recovery | Drug, dose, time, route |
| Patient discharged to ward at | Timestamp |

**Aldrete Score (auto-calculated):**
```
Activity      0-2   (moves limbs on command)
Respiration   0-2   (breathes adequately)
Circulation   0-2   (BP within 20% of pre-op)
Consciousness 0-2   (fully awake)
Colour / SpO2 0-2   (SpO2 > 92% on room air)
Total: 0–10   — Must reach 9 before leaving recovery
```

---

### 8.12 Discharge Assessment

**Who uses it:** Discharging nurse when patient is leaving.

**Fields:**

| Field | Type |
|-------|------|
| Discharge vitals | BP, HR, Temp, RR, SpO2 — must be stable |
| Discharge medications explained to patient | Yes / No |
| Written prescription given | Yes / No |
| Follow-up appointment booked | Yes / No — if Yes, date recorded |
| Patient education given | Checklist — Diet / Activity restrictions / Wound care / Warning signs |
| Referral letter prepared | Yes / No / N/A |
| Mode of discharge | Medically fit / Self-discharge AMA / Transferred / Deceased |
| If AMA (against medical advice) | Reason + patient signature noted |
| Discharge completed by | Auto (logged-in nurse) |

---

### 8.13 Shift Handover Summary

**Who uses it:** Outgoing nurse at end of shift (auto-generated).

The app automatically generates a handover summary for each patient pulling from the last 8–12 hours of nursing entries:

```
Patient: Amara Oumarou — MT-00102
Admitted: March 30, 2026 — Malaria (P. falciparum)
Triage: 🔴 Red on arrival

Last vitals (16:00): Temp 38.8°C | BP 110/70 | HR 102 | RR 20 | SpO2 95%
Trend: SpO2 improving (was 91% at 08:00). HR slightly elevated.
AVPU: Alert throughout shift.

Fluid balance (this shift): In 850ml / Out 420ml / Balance +430ml
Urine last 4 hours: 180ml — adequate

Medications this shift:
  ✓ Artemether-Lumefantrine 80/480mg — 08:00 (given)
  ✓ Paracetamol 1g IV — 12:00 (given)
  ⚠ Paracetamol 1g IV — 16:00 (due — not yet given)

Outstanding: Awaiting malaria parasite density result from lab.
Doctor aware: Yes — Dr. Mbarga reviewed at 14:00.
```

**Acceptance criteria:**
- Handover summary generated in one tap
- Can be printed or shared as PDF
- Incoming nurse marks handover as received (creates audit trail)

---

### 8.14 Automatic Alert Rules

All nursing alerts are delivered as push notifications to the assigned doctor and as a banner on the nursing station dashboard.

| Trigger | Threshold | Alert level |
|---------|-----------|-------------|
| SpO2 drop | < 92% | 🔴 Critical |
| SpO2 sustained drop | < 88% for 5 min | 🔴 Emergency |
| Blood pressure — hypotension | Systolic < 90 mmHg | 🔴 Critical |
| Blood pressure — hypertensive crisis | Systolic > 180 mmHg | 🔴 Critical |
| Heart rate | < 50 or > 130 bpm | 🔴 Critical |
| Respiratory rate | < 10 or > 25 breaths/min | 🔴 Critical |
| Temperature | > 39.5°C or < 35.5°C | 🟡 Urgent |
| AVPU drop | A → V, P, or U | 🔴 Critical |
| Urine output | < 30 ml/hr for 2+ hours | 🔴 Critical |
| NEWS2 score | ≥ 7 | 🔴 Critical |
| Pre-eclampsia pattern | BP > 140/90 + protein ≥ 2+ | 🔴 Critical |
| Foetal heart rate | < 110 or > 160 bpm | 🔴 Critical |
| IMCI danger sign | Any single danger sign | 🔴 Critical |
| Wound infection | Nurse marks "signs of infection" | 🟡 Urgent |
| IV cannula age | > 96 hours | 🟡 Reminder |

---

### 8.15 Nursing Data Models

```sql
-- Triage assessments
CREATE TABLE triage_assessments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  facility_id      UUID REFERENCES facilities(id),
  nurse_id         UUID REFERENCES auth.users(id),
  temperature      NUMERIC(4,1),
  bp_systolic      INT,
  bp_diastolic     INT,
  heart_rate       INT,
  respiratory_rate INT,
  spo2             NUMERIC(4,1),
  weight_kg        NUMERIC(5,1),
  pain_score       INT CHECK (pain_score BETWEEN 0 AND 10),
  avpu             TEXT CHECK (avpu IN ('A','V','P','U')),
  chief_complaint  TEXT NOT NULL,
  arrival_mode     TEXT,
  triage_colour    TEXT CHECK (triage_colour IN ('red','yellow','green')),
  news2_score      INT,
  assessed_at      TIMESTAMPTZ DEFAULT now()
);

-- Observation chart entries (one row per round)
CREATE TABLE obs_chart_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  nurse_id         UUID REFERENCES auth.users(id),
  temperature      NUMERIC(4,1),
  bp_systolic      INT,
  bp_diastolic     INT,
  heart_rate       INT,
  respiratory_rate INT,
  spo2             NUMERIC(4,1),
  avpu             TEXT CHECK (avpu IN ('A','V','P','U')),
  pain_score       INT,
  urine_output_ml  INT,
  news2_score      INT,
  notes            TEXT,
  recorded_at      TIMESTAMPTZ DEFAULT now()
);

-- Fluid balance entries
CREATE TABLE fluid_balance_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      TEXT REFERENCES patients(id),
  visit_id        UUID REFERENCES visits(id),
  nurse_id        UUID REFERENCES auth.users(id),
  entry_type      TEXT CHECK (entry_type IN ('input','output')),
  source          TEXT,       -- 'IV fluid' | 'oral' | 'urine' | 'vomit' | etc.
  volume_ml       INT NOT NULL,
  fluid_detail    TEXT,       -- type of IV fluid, urine colour, etc.
  shift           TEXT,       -- 'morning' | 'afternoon' | 'night'
  recorded_at     TIMESTAMPTZ DEFAULT now()
);

-- Medication administration record
CREATE TABLE mar_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  prescription_id  UUID,       -- links to doctor's prescription
  nurse_id         UUID REFERENCES auth.users(id),
  drug_name        TEXT NOT NULL,
  dose             TEXT NOT NULL,
  route            TEXT,
  scheduled_at     TIMESTAMPTZ,
  administered_at  TIMESTAMPTZ,
  status           TEXT CHECK (status IN ('given','refused','held','not_available')),
  reason_if_not_given TEXT,
  patient_reaction TEXT
);

-- Wound assessments
CREATE TABLE wound_assessments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  nurse_id         UUID REFERENCES auth.users(id),
  wound_location   TEXT,
  wound_bed        TEXT,
  exudate_amount   TEXT,
  exudate_type     TEXT,
  odour            TEXT,
  surrounding_skin TEXT,
  signs_infection  BOOLEAN DEFAULT false,
  dressing_applied TEXT,
  photo_url        TEXT,       -- Supabase Storage URL
  next_dressing_due TIMESTAMPTZ,
  assessed_at      TIMESTAMPTZ DEFAULT now()
);

-- Antenatal chart
CREATE TABLE antenatal_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  nurse_id         UUID REFERENCES auth.users(id),
  gravida          INT,
  para             INT,
  lmp              DATE,
  edd              DATE,       -- auto-calculated
  gestational_weeks INT,       -- auto-calculated
  fundal_height_cm NUMERIC(4,1),
  foetal_hr        INT,
  foetal_lie       TEXT,
  presentation     TEXT,
  oedema           TEXT,
  urine_protein    TEXT,
  urine_glucose    TEXT,
  bp_systolic      INT,
  bp_diastolic     INT,
  weight_kg        NUMERIC(5,1),
  foetal_movements TEXT,
  assessed_at      TIMESTAMPTZ DEFAULT now()
);

-- Nursing alert log
CREATE TABLE nursing_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  triggered_by     UUID REFERENCES auth.users(id),  -- nurse
  notified_doctor  UUID REFERENCES auth.users(id),
  alert_type       TEXT NOT NULL,   -- 'spo2_critical' | 'avpu_drop' | 'oliguria' | etc.
  alert_level      TEXT CHECK (alert_level IN ('critical','urgent','reminder')),
  trigger_value    TEXT,            -- e.g. 'SpO2: 88%'
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID REFERENCES auth.users(id),
  triggered_at     TIMESTAMPTZ DEFAULT now()
);
```

---

### 8.16 New Pages & Components for Nursing Module

**New routes:**

| Route | Component | Access |
|-------|-----------|--------|
| `/nursing` | NursingDashboardPage | Nurse, Doctor |
| `/nursing/triage/:patientId` | TriageFormPage | Nurse |
| `/nursing/obs/:patientId` | ObsChartPage | Nurse, Doctor |
| `/nursing/fluids/:patientId` | FluidBalancePage | Nurse, Doctor |
| `/nursing/mar/:patientId` | MARPage | Nurse, Doctor |
| `/nursing/wound/:patientId` | WoundAssessmentPage | Nurse |
| `/nursing/antenatal/:patientId` | AntenatalChartPage | Nurse, Doctor |
| `/nursing/paediatric/:patientId` | PaediatricAssessmentPage | Nurse, Doctor |
| `/nursing/pre-op/:patientId` | PreOpChecklistPage | Nurse |
| `/nursing/post-op/:patientId` | PostOpRecoveryPage | Nurse |
| `/nursing/discharge/:patientId` | DischargeAssessmentPage | Nurse |
| `/nursing/handover` | ShiftHandoverPage | Nurse |

**New components:**
```
components/nursing/
├── TriageForm.jsx              ← Vitals entry + auto triage classification
├── TriageColourBadge.jsx       ← Red / Yellow / Green display
├── ObsChartForm.jsx            ← Single obs entry form
├── ObsChartTimeline.jsx        ← Visual timeline of all obs entries
├── VitalsTrendChart.jsx        ← Sparkline charts per vital sign (Recharts)
├── NEWS2ScoreBadge.jsx         ← Auto-calculated score + colour
├── FluidBalanceForm.jsx        ← Input / output entry form
├── FluidBalanceSummary.jsx     ← Running totals + balance display
├── MARTable.jsx                ← Scheduled drugs with status buttons
├── MAREntry.jsx                ← Single drug administration entry
├── WoundForm.jsx               ← Assessment form + camera capture
├── WoundPhotoTimeline.jsx      ← Photo comparison over time
├── AntenatalForm.jsx           ← Full antenatal chart
├── PreEclampsiaAlert.jsx       ← Triggered by BP + protein pattern
├── PaediatricIMCI.jsx          ← Danger signs checklist
├── MUACIndicator.jsx           ← Colour-coded malnutrition status
├── PreOpChecklist.jsx          ← Surgical safety checklist
├── AldretteScore.jsx           ← Post-op recovery scoring
├── HandoverSummary.jsx         ← Auto-generated handover card
├── NursingAlertBanner.jsx      ← Critical alert display
└── PainScaleSlider.jsx         ← Wong-Baker faces scale for children
```

---

## 9. Doctor Module

### 9.1 Overview

The Doctor module transforms the doctor from a passive notification receiver into an active clinical decision-maker fully supported by the app. Every action — history taking, examination recording, diagnosis coding, prescribing, ordering investigations, writing referrals and discharge summaries — happens inside ECO~MEDIK, with AI assistance at every step.

---

### 9.2 Patient Cockpit

**The single most important screen in the entire application.**

When a doctor opens any patient during a ward round, they see one unified screen that answers every ward round question in under 2 minutes without navigating anywhere.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Amara Oumarou — MT-00102                    🔴 Critical      │
│ Admitted: March 30 · Day 3 · Malaria P. falciparum          │
│ ⚠️ ALLERGY: Penicillin (anaphylaxis)                         │
├───────────────────────┬─────────────────────────────────────┤
│ VITALS — LAST 24H     │ TODAY'S MEDICATION PLAN             │
│ Temp  38.1°C  ↓ ✓    │ ✓ Artemether 80mg — 08:00 (given)  │
│ BP    118/76   → ✓   │ ✓ Paracetamol 1g — 12:00 (given)   │
│ HR    88 bpm   ↓ ✓   │ ⏳ Paracetamol 1g — 16:00 (due now) │
│ SpO2  97%      ↑ ✓   │                                     │
│ Urine 240ml/shift ✓  │ INVESTIGATIONS                      │
│ [View full obs chart] │ ✓ Malaria RDT — Positive (AI read) │
├───────────────────────┤ ✓ Chest X-ray — No infiltrates     │
│ FLUID BALANCE TODAY   │ ⏳ CBC — Pending (ordered 08:00)    │
│ In: 1,200ml           │                                     │
│ Out: 980ml            │ LAST NURSE NOTE — 16:00             │
│ Balance: +220ml ✓     │ "Nausea after last dose. Tolerating │
├───────────────────────┤  oral fluids. Urine output good."   │
│ NEWS2: 2 — Low risk  │                                     │
└───────────────────────┴─────────────────────────────────────┘
  [Write Progress Note]  [Update Plan]  [Prescribe]  [Discharge]  [Refer]
```

**All data on this screen is pulled automatically** from:
- Nursing obs chart entries
- Nursing MAR
- Nursing fluid balance
- Lab results (manual + AI)
- Triage assessment
- Previous progress notes

**Acceptance criteria:**
- Cockpit loads in < 2 seconds
- All sections update in real time as nurses and lab techs enter new data
- Allergy banner always visible at the top — cannot be dismissed
- Vitals show direction arrows (↑↓→) and colour coding vs previous entry

---

### 9.3 Structured History Taking

**Fields (organised by section, collapsible):**

**History of Presenting Complaint:**
- Onset — when did it start? (date picker)
- Character — how did it start? (Sudden / Gradual / Progressive)
- Site — body region selector (body map)
- Radiation — does it spread anywhere?
- Severity — 0–10 scale
- Duration — how long has it been going on?
- Exacerbating factors — what makes it worse? (free text)
- Relieving factors — what makes it better?
- Associated symptoms — multi-select checklist

**Past Medical History:**
- Chronic conditions — multi-select: Diabetes / Hypertension / HIV / TB / Sickle cell / Epilepsy / Asthma / Heart disease / Other
- Previous surgeries — free text with dates
- Previous hospitalisations — linked to ECO~MEDIK visit history if applicable
- Obstetric history (if female) — G/P/A (gravida/para/abortus)

**Drug History:**
- Current medications — each as a separate entry: drug name, dose, who prescribed
- Traditional medicine use — Yes / No / Details
- Allergies — drug name, reaction type (Rash / Anaphylaxis / Intolerance / Unknown)

**Family History:**
- Conditions in immediate family — multi-select

**Social History:**
- Occupation
- Smoking — Never / Ex / Current (pack-years)
- Alcohol — Never / Occasional / Regular / Dependent
- Substance use
- Living conditions — Rural / Urban / Access to clean water Yes/No

**Systems Review:**
- Rapid checklist per body system — any positive findings flagged

---

### 9.4 Physical Examination Templates

Structured examination templates per body system. Doctor taps findings from a smart checklist — no typing required for standard findings.

**General appearance:**
- Looks well / Looks unwell / In distress / Unconscious
- Pallor — None / Mild / Moderate / Severe
- Jaundice — None / Scleral / Frank
- Cyanosis — None / Central / Peripheral
- Hydration — Well-hydrated / Mildly dehydrated / Severely dehydrated
- Nutritional status — Well-nourished / Wasted / Oedematous

**Cardiovascular:**
- Heart rate, rhythm, character (linked from vitals)
- Heart sounds — Normal S1 S2 / Murmur (grade + location) / Added sounds
- Peripheral pulses — Present bilaterally / Weak / Absent
- Capillary refill — < 2 sec / > 2 sec
- Oedema — None / 1+ / 2+ / 3+ / 4+ (location)
- JVP — Not raised / Raised (cm)

**Respiratory:**
- Chest expansion — Equal / Reduced left / Reduced right
- Percussion — Resonant / Dull / Stony dull / Hyper-resonant (per zone)
- Breath sounds — Clear / Wheeze / Crackles / Absent / Bronchial (per zone)
- Accessory muscles — Not in use / In use

**Abdominal:**
- Inspection — Flat / Distended / Scaphoid
- Tenderness — body region selector with 9-zone abdominal map
- Guarding — None / Voluntary / Involuntary (rigidity)
- Liver — Not enlarged / Enlarged (cm below RCM)
- Spleen — Not enlarged / Enlarged (cm below LCM)
- Kidneys — Not ballotable / Ballotable (side)
- Bowel sounds — Present / Absent / Hyperactive
- Ascites — None / Present (shifting dullness / fluid thrill)

**Neurological:**
- GCS — Eye (1–4) / Verbal (1–5) / Motor (1–6) — total auto-calculated
- Pupils — Equal and reactive / Unequal / Fixed and dilated
- Neck stiffness — None / Present
- Kernig's sign — Negative / Positive
- Focal deficit — None / Left arm / Right arm / Left leg / Right leg / Facial

**Free text for any finding not in the template.**

---

### 9.5 Differential Diagnosis Assistant

After history and examination are entered, the AI suggests a ranked differential based on:
- Presenting symptoms
- Abnormal examination findings
- Vitals pattern
- AI diagnostic results already in the record
- Patient demographics (age, sex, region)
- Local disease prevalence (Cameroon-specific weighting — malaria weighted higher)

**Display:**
```
Suggested differentials — Amara Oumarou

1. ●●●●● Malaria — P. falciparum (92% match)
   Supporting: Fever 3 days, positive RDT, headache, thrombocytopenia on CBC
   Against: No impaired consciousness, no hyperparasitaemia

2. ●●●○○ Typhoid fever (38% match)
   Supporting: Fever > 3 days, headache, Cameroon prevalence
   Against: No relative bradycardia, no rose spots, RDT positive for malaria

3. ●●○○○ Bacterial meningitis (22% match)
   Supporting: Severe headache, fever
   Against: No neck stiffness, no photophobia, GCS 15
   ⚠️ Cannot exclude — consider LP if no improvement in 24h

[Accept differential]  [Add my own]  [Request investigation]
```

**Acceptance criteria:**
- Differential generated in < 5 seconds
- Doctor can accept, modify, or completely override AI suggestions
- AI reasoning shown transparently — not a black box
- Local disease prevalence weighting configurable per region

---

### 9.6 ICD-10 Diagnosis Coding

Every diagnosis is coded using the International Classification of Diseases (ICD-10).

**How it works:**
1. Doctor types the diagnosis in plain language — "falciparum malaria uncomplicated"
2. App searches ICD-10 database and shows matching codes
3. Doctor selects the correct code
4. AI pre-selects the most likely code based on the differential and can be confirmed in one tap

**Why this matters:**
- Enables insurance billing
- Powers meaningful outbreak statistics (malaria cases per region vs generic "fever")
- Required for MOH reporting in Cameroon
- Enables cross-facility disease burden analytics

**Primary and secondary diagnosis:** Doctor can record multiple diagnoses per visit (e.g. primary: malaria, secondary: anaemia, comorbidity: sickle cell trait).

---

### 9.7 Investigation Ordering

Doctor creates a test request directly in the app. Lab tech sees it in their queue instantly.

**Order form fields:**
- Test type — searchable list of all available tests
- Priority — Routine / Urgent / Emergency (Emergency flags lab queue with red)
- Clinical indication — brief reason (free text)
- Specimen type — Blood / Urine / Stool / Sputum / CSF / Swab / Other
- Special instructions — e.g. "fasting sample" / "repeat in 48h" / "compare with previous"

**The full investigation loop:**
```
Doctor orders test in app
    │
    ▼
Lab tech sees new order in their queue (real-time notification)
    │
    ▼
Lab tech marks "Sample collected" with timestamp
    │
    ▼
Doctor sees "Sample collected — awaiting result" on cockpit
    │
    ▼
Lab tech runs test (with AI assistance if applicable)
    │
    ▼
Lab tech uploads result → Doctor notified immediately
    │
    ▼
Result appears on patient cockpit and investigation history
```

---

### 9.8 E-Prescribing with Safety Checks

The most critical doctor feature. Every prescription is digital, goes directly to the nurse's MAR, and is checked automatically for safety.

**Prescription form:**

| Field | Type | Notes |
|-------|------|-------|
| Drug name | Searchable | Generic name only — no brand names |
| Dose | Numeric + unit | mg / g / ml / units |
| Weight-based dose | Auto-calculated | If patient weight is recorded: mg/kg × weight = dose |
| Route | Select | Oral / IV / IM / SC / Topical / Inhaled / Rectal |
| Frequency | Select | Once daily / BD / TDS / QDS / Every 8h / Every 6h / PRN / Stat |
| Duration | Numeric + unit | Days / Weeks / Until review |
| Start date/time | DateTime | Defaults to now |
| Special instructions | Free text | "Take with food" / "Avoid sunlight" / "Complete full course" |
| Indication | Free text | Brief clinical reason |

**Automatic safety checks fired before prescription is confirmed:**

```
1. ALLERGY CHECK
   If drug family matches recorded allergy:
   🔴 "Patient is allergic to Penicillin.
       Amoxicillin is a Penicillin-class drug.
       This prescription is blocked. Select an alternative."

2. DRUG INTERACTION CHECK
   If patient is already prescribed a drug that interacts:
   🟡 "Artemether + Halofantrine: Risk of QT prolongation.
       Consider alternative or monitor ECG closely."

3. DOSE RANGE CHECK
   If dose is outside safe range for age/weight:
   🟡 "Paracetamol 2g: Maximum adult dose is 1g per dose (4g/day).
       Confirm override?"

4. RENAL DOSE ADJUSTMENT
   If creatinine/eGFR is recorded and drug requires renal dosing:
   🟡 "Metformin should be dose-reduced in eGFR < 45.
       Patient eGFR: 38. Recommend 500mg BD instead of 1g BD."

5. PREGNANCY SAFETY
   If patient is pregnant (recorded in antenatal chart):
   🔴 "Doxycycline is contraindicated in pregnancy (Category D).
       Use Azithromycin instead for this indication."

6. DUPLICATE CHECK
   If same drug already prescribed and active:
   🟡 "Paracetamol 1g TDS already active on this patient's MAR.
       Adding a second paracetamol prescription. Confirm?"
```

**Prescription → MAR pipeline:**
Once confirmed, the prescription automatically appears in the nurse's MAR at the correct scheduled times. The nurse does not have to transcribe anything.

---

### 9.9 SOAP Progress Notes

Every ward round visit documented as a structured SOAP note.

**S — Subjective (patient's report today):**
- New complaints since last review
- Changes in symptoms
- How the patient feels overall

**O — Objective (what the doctor observes today):**
- Key vitals (auto-populated from latest obs chart)
- Relevant examination findings today
- New investigation results

**A — Assessment (clinical thinking):**
- How is the patient progressing?
- Is the diagnosis confirmed, evolving, or changing?
- Any new concerns?

**P — Plan (what happens next):**
- Continue / modify / stop medications
- New investigations ordered
- Activity and diet orders
- Monitoring instructions for nurses ("obs every 2h", "strict fluid balance")
- Review timing — "Review in 24h" / "Discharge tomorrow if afebrile"

**Template shortcuts:** Frequently used plan items are available as one-tap shortcuts. "Continue current plan" / "For discharge tomorrow" / "Escalate to senior" saves typing time.

---

### 9.10 Critical Patient Watch List

A real-time live dashboard showing only the doctor's highest-risk patients — updated automatically as nurses enter observations.

**Displays per patient:**
- Patient name and ID
- Current triage colour
- NEWS2 score (colour-coded)
- Last 3 vital sign readings with trend arrows
- Time since last nurse entry (red if > 2 hours for a critical patient)
- Outstanding investigations
- Any unacknowledged nursing alerts

**Sort options:** By NEWS2 score (most critical first) / By time since last obs / By ward

**Acceptance criteria:**
- Updates in real time without page refresh (Supabase Realtime)
- Critical patients (NEWS2 ≥ 7) shown first always
- If a critical patient has had no obs chart entry in > 2 hours, a yellow warning appears next to their name

---

### 9.11 Auto-Generated Referral Letter

One tap generates a complete referral letter from the patient's record.

**Auto-populated fields:**
- Date and referring facility
- Referring doctor name and role
- Patient demographics (name, age, sex, patient ID)
- Reason for referral
- History summary (pulled from structured history)
- Key examination findings
- Investigations done + results
- Current medications (from MAR)
- Working diagnosis (ICD-10 coded)
- Urgency level
- Contact details for follow-up queries

**Doctor reviews, edits if needed, then:**
- Prints as PDF
- Shares digitally to receiving facility (if on ECO~MEDIK)
- Saves to patient record permanently

---

### 9.12 Auto-Generated Discharge Summary

One tap generates a complete discharge summary.

**Auto-populated fields:**
- Admission and discharge dates (length of stay auto-calculated)
- Admitting and discharging doctor
- Admission diagnosis vs final discharge diagnosis (ICD-10)
- Summary of hospital course (pulled from SOAP notes)
- Procedures performed
- Investigations and results
- Discharge medications (dose, frequency, duration, instructions)
- Follow-up appointment
- Patient education points
- Return precautions (warning signs to come back)

**Discharge medication list** is pulled directly from the active prescriptions and reformatted into plain language the patient can understand.

---

### 9.13 Doctor Data Models

```sql
-- Structured clinical history
CREATE TABLE clinical_histories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  doctor_id         UUID REFERENCES auth.users(id),
  hpc               JSONB,   -- history of presenting complaint (structured)
  pmh               JSONB,   -- past medical history
  drug_history      JSONB,   -- current medications + allergies
  family_history    TEXT,
  social_history    JSONB,
  systems_review    JSONB,
  recorded_at       TIMESTAMPTZ DEFAULT now()
);

-- Physical examination findings
CREATE TABLE examinations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  doctor_id         UUID REFERENCES auth.users(id),
  general           JSONB,
  cardiovascular    JSONB,
  respiratory       JSONB,
  abdominal         JSONB,
  neurological      JSONB,
  gcs_score         INT,     -- auto-calculated from eye+verbal+motor
  other_systems     JSONB,
  free_text         TEXT,
  examined_at       TIMESTAMPTZ DEFAULT now()
);

-- Diagnoses (ICD-10 coded)
CREATE TABLE diagnoses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  doctor_id         UUID REFERENCES auth.users(id),
  icd10_code        TEXT NOT NULL,     -- e.g. 'B50.0'
  icd10_description TEXT NOT NULL,     -- e.g. 'Plasmodium falciparum malaria'
  diagnosis_type    TEXT CHECK (diagnosis_type IN ('primary','secondary','comorbidity')),
  status            TEXT CHECK (status IN ('working','confirmed','ruled_out')),
  diagnosed_at      TIMESTAMPTZ DEFAULT now()
);

-- Investigation orders
CREATE TABLE investigation_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  ordered_by        UUID REFERENCES auth.users(id),   -- doctor
  test_name         TEXT NOT NULL,
  test_category     TEXT,
  priority          TEXT CHECK (priority IN ('routine','urgent','emergency')),
  specimen_type     TEXT,
  indication        TEXT,
  special_instructions TEXT,
  status            TEXT CHECK (status IN ('ordered','sample_collected','processing','completed','cancelled')),
  sample_collected_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  ordered_at        TIMESTAMPTZ DEFAULT now()
);

-- Prescriptions
CREATE TABLE prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  prescribed_by     UUID REFERENCES auth.users(id),
  drug_name         TEXT NOT NULL,
  dose              TEXT NOT NULL,
  route             TEXT NOT NULL,
  frequency         TEXT NOT NULL,
  duration_days     INT,
  start_at          TIMESTAMPTZ DEFAULT now(),
  end_at            TIMESTAMPTZ,
  indication        TEXT,
  special_instructions TEXT,
  status            TEXT CHECK (status IN ('active','completed','stopped','on_hold')),
  stopped_reason    TEXT,
  safety_overrides  JSONB   -- log of any safety warnings the doctor overrode
);

-- SOAP progress notes
CREATE TABLE progress_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  doctor_id         UUID REFERENCES auth.users(id),
  subjective        TEXT,
  objective         JSONB,   -- key findings + vitals snapshot
  assessment        TEXT,
  plan              JSONB,   -- structured plan items
  monitoring_instructions TEXT,   -- instructions for nurses
  review_in         TEXT,    -- "24 hours" / "48 hours" / "discharge tomorrow"
  written_at        TIMESTAMPTZ DEFAULT now()
);

-- Referral letters
CREATE TABLE referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  referring_doctor  UUID REFERENCES auth.users(id),
  referring_facility UUID REFERENCES facilities(id),
  receiving_facility TEXT,
  receiving_specialist TEXT,
  reason            TEXT NOT NULL,
  urgency           TEXT CHECK (urgency IN ('routine','urgent','emergency')),
  summary           TEXT,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Discharge summaries
CREATE TABLE discharge_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        TEXT REFERENCES patients(id),
  visit_id          UUID REFERENCES visits(id),
  doctor_id         UUID REFERENCES auth.users(id),
  admission_date    TIMESTAMPTZ,
  discharge_date    TIMESTAMPTZ,
  length_of_stay_days INT,
  admission_diagnosis TEXT,
  discharge_diagnosis TEXT,
  icd10_codes       TEXT[],
  hospital_course   TEXT,
  procedures        TEXT,
  discharge_medications JSONB,
  follow_up_date    TIMESTAMPTZ,
  follow_up_instructions TEXT,
  return_precautions TEXT,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Clinical Data Flow & Staff Interconnection

### 10.1 The Problem This Solves

In a paper-based hospital, information lives in silos. The nurse's obs chart never reaches the doctor until they walk to the ward. The lab result sits in a folder until someone carries it. The receptionist's triage note is separate from the doctor's examination. Everyone works in parallel with incomplete information.

ECO~MEDIK eliminates every one of these silos. Every action by every staff member is immediately visible to every other staff member who needs it — automatically, in real time, with no manual handoff.

---

### 10.2 The Central Patient Record

Every action in the system writes to a single patient record. There is no separate "nurse system" or "lab system" — it is all one record.

```
                    ┌─────────────────────┐
                    │   PATIENT RECORD    │
                    │   (Single source    │
                    │    of truth)        │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RECEPTIONIST│    │     NURSE       │    │    LAB TECH     │
│               │    │                 │    │                 │
│ Registers     │    │ Triage vitals   │    │ Test orders     │
│ patient       │    │ Obs chart       │    │ AI diagnostics  │
│               │    │ Fluid balance   │    │ Result upload   │
│ Assigns visit │    │ MAR entries     │    │                 │
│ number        │    │ Wound notes     │    │                 │
└───────┬───────┘    └────────┬────────┘    └────────┬────────┘
        │                     │                      │
        └──────────────────── ┼ ─────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     DOCTOR      │
                    │                 │
                    │ Sees everything │
                    │ above in the    │
                    │ patient cockpit │
                    │                 │
                    │ Writes history  │
                    │ Records exam    │
                    │ Orders tests    │
                    │ Prescribes      │
                    │ Writes plan     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  NURSE   │   │ LAB TECH │   │ PATIENT  │
       │  sees    │   │  sees    │   │  sees    │
       │  MAR +   │   │  test    │   │  results │
       │  plan    │   │  orders  │   │  + notes │
       └──────────┘   └──────────┘   └──────────┘
```

---

### 10.3 Automatic Data Sharing — Every Trigger

This is the full map of every automatic event in the system:

#### Receptionist actions → triggers

| Receptionist does | Automatically notifies / updates |
|-------------------|----------------------------------|
| Registers new patient | Triage nurse sees new arrival in queue |
| Marks patient as arrived for follow-up | Assigned doctor's patient list updates |
| Records chief complaint at desk | Pre-populates triage nurse's form |

#### Triage nurse actions → triggers

| Nurse does | Automatically notifies / updates |
|------------|----------------------------------|
| Completes triage vitals | Doctor sees vitals on patient cockpit immediately |
| Assigns red triage | Doctor receives immediate push notification |
| Records chief complaint | Doctor's history form pre-populated with presenting complaint |
| Enters SpO2 < 92% | Critical alert sent to doctor + displayed on nursing dashboard |
| Enters AVPU = V, P, or U | Critical alert sent to doctor immediately |
| NEWS2 score reaches 7+ | Doctor notified urgently regardless of time |

#### Ward nurse actions → triggers

| Nurse does | Automatically notifies / updates |
|------------|----------------------------------|
| Enters obs chart reading | Doctor's patient cockpit vitals section updates in real time |
| Enters critical vital | Doctor receives push notification within 30 seconds |
| Marks medication as "refused" | Doctor sees MAR compliance flag on cockpit |
| Marks medication as "not available" | Admin receives pharmacy stock alert |
| Records wound infection signs | Doctor notified to review |
| Enters urine output < 30ml/hr | Doctor notified — oliguria alert |
| Completes antenatal entry | Doctor sees updated antenatal chart |
| Pre-eclampsia pattern detected | Doctor receives emergency alert |
| Generates shift handover | Incoming nurse receives it; doctor sees handover summary |

#### Lab technician actions → triggers

| Lab tech does | Automatically notifies / updates |
|---------------|----------------------------------|
| Receives test order | Queue updates — appears in lab tech's worklist |
| Marks "Sample collected" | Doctor sees "Sample collected — awaiting result" on cockpit |
| Uploads result | Doctor receives push notification |
| AI reads critical value | Doctor receives red alert regardless of result upload status |
| Uploads positive HIV result | Privacy protocol triggered — result visible to doctor only, not patient portal until counselling confirmed |
| Result matches outbreak symptom | Outbreak detection engine re-runs automatically |

#### Doctor actions → triggers

| Doctor does | Automatically notifies / updates |
|-------------|----------------------------------|
| Creates prescription | Nurse's MAR updates immediately with scheduled dose times |
| Orders investigation | Lab tech sees order in their queue in real time |
| Writes monitoring instruction ("obs every 2h") | Nurse's obs chart shows frequency reminder |
| Updates plan | Nurse sees updated plan on their ward view |
| Marks patient for discharge | Nurse receives discharge checklist notification |
| Generates referral letter | Receiving facility notified (if on ECO~MEDIK) |
| Confirms AI diagnostic result | Result becomes part of official record |
| Overrides AI result | Override logged with reason for audit |

#### AI Diagnostics actions → triggers

| AI does | Automatically notifies / updates |
|---------|----------------------------------|
| Reads RDT strip — Positive malaria | Added to outbreak detection counter |
| Detects critical value in any result | Doctor red alert regardless of who ran the test |
| Reads chest X-ray — TB suspected | Doctor notified + infection control flag on patient record |
| Reads ECG — ST elevation | Doctor receives emergency cardiac alert immediately |

#### Patient actions → triggers

| Patient does | Automatically notifies / updates |
|--------------|----------------------------------|
| Self-registers | Receptionist sees new patient in system |
| Logs new symptom in patient portal | Nurse and doctor see it flagged on next visit |
| Views lab result (patient portal) | Logged — doctor can see patient has viewed their result |

---

### 10.4 Notification Priority Levels

All notifications are categorised so staff are not overwhelmed:

| Level | Colour | Delivery | Examples |
|-------|--------|---------|---------|
| Emergency | 🔴 Red | Full-screen alert + sound | SpO2 < 88%, ECG ST elevation, AVPU = U |
| Critical | 🔴 Red | Banner + push notification | SpO2 < 92%, systolic BP < 90, NEWS2 ≥ 7 |
| Urgent | 🟡 Yellow | Push notification | Lab result ready, wound infection, NEWS2 5–6 |
| Routine | 🟢 Green | In-app badge | Scheduled medication due, follow-up reminder |
| Info | ⚪ Grey | In-app only | Patient arrived, sample collected |

**Do not disturb rules:** Routine and Info notifications are batched and delivered at shift start. Emergency and Critical notifications always go through immediately — 24/7.

---

### 10.5 Role-Based Visibility Rules

Not everyone sees everything. Data is shared automatically but only to those who need it:

| Data | Receptionist | Nurse | Lab Tech | Doctor | Admin | Patient |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Patient demographics | ✓ | ✓ | ID only | ✓ | ✓ | Own only |
| Triage vitals | View | ✓ | — | ✓ | ✓ | — |
| Obs chart | — | ✓ | — | ✓ | ✓ | — |
| Fluid balance | — | ✓ | — | ✓ | ✓ | — |
| MAR | — | ✓ | — | ✓ | ✓ | Own meds |
| Lab orders | — | — | ✓ | ✓ | ✓ | — |
| Lab results | — | — | ✓ | ✓ | ✓ | Own (filtered) |
| HIV result | — | — | — | ✓ | — | After counselling |
| Clinical history | — | — | — | ✓ | ✓ | Own |
| Examination findings | — | — | — | ✓ | ✓ | — |
| Prescriptions | — | ✓ (MAR) | — | ✓ | ✓ | Own |
| Progress notes | — | — | — | ✓ | ✓ | Summary only |
| AI results | — | — | ✓ | ✓ | ✓ | Own (filtered) |
| Discharge summary | — | ✓ | — | ✓ | ✓ | ✓ |
| Referral letter | — | — | — | ✓ | ✓ | ✓ |
| Outbreak alerts | — | ✓ | — | ✓ | ✓ | — |

---

## 11. Hardware Integration

### 11.1 Overview

ECO~MEDIK supports hardware devices across three connection types:
- **Bluetooth Low Energy (BLE)** — most common for portable medical devices
- **USB-C / USB** — microscopes, some analysers
- **Camera** — built-in phone camera for strip reading, wound photos, microscopy

All devices are detected automatically using the **Web Bluetooth API** (BLE) or **WebUSB API** (USB). Once paired, the device is remembered for that facility. Readings stream directly into the relevant form — the nurse or lab tech never manually types a number from a device screen.

---

### 11.2 Complete Hardware Device Catalogue

#### CATEGORY A — Vitals Monitoring
*Used by: Nurses (triage + obs chart)*

---

**A1. Bluetooth Pulse Oximeter**
- **Examples:** Wellue O2Ring, Jumper JPD-500E, ChoiceMMed MD300W
- **Estimated cost:** $15–$40 USD
- **Measures:** SpO2 (%), Heart rate (bpm)
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** Triage form SpO2 + HR fields, Obs chart
- **Integration:**
```javascript
// Web Bluetooth API
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate', 'pulse_oximeter'] }]
})
const server = await device.gatt.connect()
const service = await server.getPrimaryService('pulse_oximeter')
const char = await service.getCharacteristic('plx_continuous_measurement')
char.addEventListener('characteristicvaluechanged', (e) => {
  const spo2 = e.target.value.getUint8(1)
  const hr   = e.target.value.getUint8(3)
  store.setVitals({ spo2, heart_rate: hr })
})
await char.startNotifications()
```
- **Auto-identification:** Device advertises `pulse_oximeter` GATT service UUID `0x1822`
- **Alert integration:** If SpO2 < 92% when reading streams in, critical alert fires automatically

---

**A2. Bluetooth Blood Pressure Monitor**
- **Examples:** Omron M7 Intelli IT, FORA P30 Plus, iHealth Feel
- **Estimated cost:** $40–$90 USD
- **Measures:** Systolic BP, Diastolic BP, Heart rate, Irregular heartbeat flag
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** Triage BP fields, Obs chart BP
- **Integration:**
```javascript
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['blood_pressure'] }]
})
// Blood Pressure GATT service UUID: 0x1810
// Characteristic: blood_pressure_measurement 0x2A35
// Returns: systolic, diastolic, MAP, pulse rate
```
- **Auto-identification:** GATT service `0x1810`
- **Alert integration:** Systolic < 90 or > 180 fires critical alert on read

---

**A3. Infrared / Digital Thermometer**
- **Examples:** Beurer FT 95 (BLE), iProven DMT-489
- **Estimated cost:** $20–$50 USD
- **Measures:** Body temperature (°C)
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** Triage temp, Obs chart temp
- **GATT service:** Health Thermometer `0x1809`

---

**A4. Bluetooth Glucometer**
- **Examples:** Contour Next One, Accu-Chek Guide Me, OneTouch Verio Reflect
- **Estimated cost:** $25–$60 USD
- **Measures:** Blood glucose (mmol/L or mg/dL)
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** AI vitals panel, patient chronic disease tracker
- **GATT service:** Glucose `0x1808`
- **Alert integration:** Glucose < 3.0 or > 20.0 mmol/L fires critical alert

---

**A5. Digital Weight Scale**
- **Examples:** Beurer BF 700, Withings Body+, any BLE scale
- **Estimated cost:** $30–$80 USD
- **Measures:** Weight (kg)
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** Triage weight, antenatal weight, paediatric growth chart
- **Drug dosing integration:** Weight automatically used in mg/kg dose calculator on prescription form

---

#### CATEGORY B — Cardiac Monitoring
*Used by: Nurses (obs chart) + Lab tech (AI diagnostics)*

---

**B1. Single-Lead ECG — AliveCor KardiaMobile**
- **Examples:** AliveCor KardiaMobile 6L
- **Estimated cost:** $99–$149 USD
- **Measures:** Single or 6-lead ECG trace, heart rhythm, AF detection
- **Connection:** Ultrasonic audio to phone (no Bluetooth needed)
- **Auto-feeds into:** AI Diagnostics ECG analysis module
- **Integration:** AliveCor SDK — records 30-second strip, exports PDF + raw data
- **AI analysis:** Custom CNN detects AF, arrhythmia, ST elevation, bradycardia, tachycardia
- **Alert integration:** ST elevation or VF pattern fires emergency cardiac alert to doctor

---

**B2. 12-Lead ECG Device**
- **Examples:** Contec ECG600G, Biocare iE12A
- **Estimated cost:** $200–$600 USD
- **Measures:** Full 12-lead ECG
- **Connection:** USB-C or Bluetooth
- **Auto-feeds into:** AI Diagnostics ECG module, patient cardiology record
- **Integration:** Exports standard XML or PDF — parsed and stored in Supabase Storage

---

**B3. Pulse Oximeter with Plethysmograph**
- **Examples:** Nonin 3230, Masimo MightySat
- **Estimated cost:** $150–$350 USD
- **Measures:** SpO2, HR, perfusion index, pleth waveform
- **Connection:** Bluetooth BLE
- **Extra value:** Pleth waveform irregularities can indicate arrhythmia

---

#### CATEGORY C — Laboratory Devices
*Used by: Lab technicians*

---

**C1. Haemoglobin Analyser**
- **Examples:** HemoCue Hb 301, Mission Hb Meter
- **Estimated cost:** $300–$500 USD
- **Measures:** Haemoglobin (g/dL)
- **Connection:** Manual entry (device displays result — nurse enters into app)
- **AI integration:** App interprets value — classifies anaemia severity automatically
```
Hb < 7 g/dL   → Severe anaemia  → 🔴 Critical alert to doctor
Hb 7–10 g/dL  → Moderate anaemia → 🟡 Flag to doctor
Hb 10–12 g/dL → Mild anaemia    → 🟢 Note in record
```

---

**C2. Portable Blood Analyser (i-STAT)**
- **Examples:** Abbott i-STAT 1, Abaxis Piccolo Xpress
- **Estimated cost:** $2,000–$5,000 USD
- **Measures:** CBC, electrolytes, creatinine, troponin, lactate, blood gases
- **Connection:** USB or WiFi
- **Auto-feeds into:** Lab results, AI interpretation module
- **Integration:** i-STAT exports HL7 or CSV — parsed by ECO~MEDIK backend

---

**C3. Portable Biochemistry Analyser**
- **Examples:** CardioChek PA, Samsung LABGEO PT10
- **Estimated cost:** $500–$1,500 USD
- **Measures:** Cholesterol, triglycerides, glucose, HDL/LDL
- **Connection:** Bluetooth or USB
- **Auto-feeds into:** Cardiovascular risk profile on patient record

---

**C4. USB Digital Microscope**
- **Examples:** AmScope MD35, Celestron 44308, Dino-Lite AM4113T
- **Estimated cost:** $40–$200 USD
- **Measures:** High-resolution slide images
- **Connection:** USB-C
- **Integration:**
```javascript
// WebUSB API
const device = await navigator.usb.requestDevice({
  filters: [{ vendorId: 0x1e4e }]  // Dino-Lite vendor ID
})
await device.open()
// Stream video frames → canvas → capture image → send to AI model
const stream = await navigator.mediaDevices.getUserMedia({
  video: { deviceId: microscopeDeviceId }
})
```
- **Auto-feeds into:** AI Diagnostics microscopy module
- **Auto-identification:** Listed as video capture device in WebUSB; device name matched against known microscope strings

---

**C5. Clip-On Smartphone Microscope Lens**
- **Examples:** Carson MicroBrite Plus, Apexel APL-MS003
- **Estimated cost:** $20–$60 USD
- **Connection:** Physical clip — uses phone's built-in camera
- **Integration:** App opens camera in macro mode with microscopy frame guide overlay
- **Auto-feeds into:** AI Diagnostics — lab tech taps "Microscopy mode" and camera activates

---

**C6. Rapid Test Strip Reader (AI Camera)**
- **Hardware needed:** None — built-in phone camera
- **Estimated cost:** $0 additional
- **How it works:**
```
Lab tech runs physical RDT strip normally
→ Opens ECO~MEDIK "Strip Reader" mode
→ Camera activates with rectangular frame overlay
→ Lab tech aligns strip inside the frame
→ TensorFlow.js model analyses image in real time
→ Result shown in < 3 seconds with confidence %
→ Strip photo saved to patient record automatically
```
- **Supported strips:** Malaria, HIV, COVID-19, Hepatitis B/C, Typhoid, Syphilis, Dengue, Pregnancy

---

**C7. Portable Ultrasound**
- **Examples:** Butterfly iQ+, Clarius L7, Lumify by Philips
- **Estimated cost:** $2,000–$8,000 USD
- **Measures:** Real-time ultrasound imaging
- **Connection:** USB-C (Butterfly iQ) or WiFi (Clarius)
- **Integration:** Device SDK streams frames to app → AI analyses for foetal measurements, organ abnormalities, cardiac function
- **Auto-feeds into:** AI Diagnostics imaging module, antenatal chart

---

#### CATEGORY D — Respiratory
*Used by: Nurses + Lab technicians*

---

**D1. Bluetooth Spirometer**
- **Examples:** Nuvoair Air Next, Vitalograph COPD-6, MIR Spirobank Smart
- **Estimated cost:** $100–$300 USD
- **Measures:** FEV1, FVC, FEV1/FVC ratio, PEF
- **Connection:** Bluetooth BLE
- **Auto-feeds into:** AI respiratory analysis module
- **AI interpretation:** Auto-classifies as Normal / Obstructive / Restrictive / Mixed pattern

---

**D2. Cough Recorder (Phone Microphone)**
- **Hardware needed:** None — built-in phone microphone
- **How it works:**
```
Nurse or lab tech taps "Cough Analysis" in AI Diagnostics
→ App records 5 cough samples (guided by on-screen prompt)
→ Whisper-based audio model analyses spectral pattern
→ Returns: TB risk score / COVID-19 pattern / Normal cough
→ Result + audio recording saved to patient record
```

---

#### CATEGORY E — Ophthalmology & Imaging
*Used by: Doctors + Lab technicians*

---

**E1. Retinal Camera (Clip-On)**
- **Examples:** Volk iNview, Optomed Aurora, D-EYE
- **Estimated cost:** $500–$2,000 USD
- **Connection:** Physical clip on phone camera
- **Measures:** Retinal fundus image
- **Auto-feeds into:** AI opthalmology module — diabetic retinopathy grading, glaucoma screening

---

**E2. Otoscope Attachment**
- **Examples:** Wispr Digital Otoscope, Oto HD
- **Estimated cost:** $100–$300 USD
- **Connection:** USB-C or physical clip
- **Measures:** Ear canal image
- **Auto-feeds into:** AI ENT module — otitis media detection

---

**E3. Dermatoscope**
- **Examples:** Dermlite DL4, Heine Delta 30
- **Estimated cost:** $300–$800 USD
- **Connection:** Physical clip on phone camera
- **Measures:** Skin lesion magnified image
- **Auto-feeds into:** AI dermatology module — melanoma screening, fungal infection

---

#### CATEGORY F — Maternal Health
*Used by: Antenatal nurses*

---

**F1. Foetal Doppler**
- **Examples:** Contec CMS800G, Sunray SR-F002
- **Estimated cost:** $30–$100 USD
- **Measures:** Foetal heart rate (bpm)
- **Connection:** 3.5mm audio jack or Bluetooth
- **Auto-feeds into:** Antenatal chart — foetal HR field

---

**F2. MUAC Tape**
- **Hardware:** Simple measuring tape — no digital integration
- **Integration:** Nurse enters value in app — AI classifies malnutrition severity automatically
```
MUAC < 115mm  → Severe Acute Malnutrition → 🔴 Alert
MUAC 115–125mm → Moderate Acute Malnutrition → 🟡 Flag
MUAC > 125mm  → Normal
```

---

### 11.3 Device Auto-Identification System

When a device connects, ECO~MEDIK identifies it automatically using:

**For Bluetooth devices:**
```javascript
// Each GATT service UUID maps to a device type
const DEVICE_MAP = {
  '0x1822': { type: 'pulse_oximeter',    form: 'vitals',    fields: ['spo2', 'heart_rate'] },
  '0x1810': { type: 'blood_pressure',    form: 'vitals',    fields: ['bp_systolic', 'bp_diastolic', 'heart_rate'] },
  '0x1809': { type: 'thermometer',       form: 'vitals',    fields: ['temperature'] },
  '0x1808': { type: 'glucometer',        form: 'ai_vitals', fields: ['glucose'] },
  '0x181D': { type: 'weight_scale',      form: 'vitals',    fields: ['weight_kg'] },
  '0x1822': { type: 'spirometer',        form: 'ai_resp',   fields: ['fev1', 'fvc', 'ratio'] },
}

async function identifyAndConnect() {
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true })
  const server = await device.gatt.connect()
  
  for (const [uuid, config] of Object.entries(DEVICE_MAP)) {
    try {
      await server.getPrimaryService(uuid)
      return connectDevice(device, config)  // auto-route to correct form
    } catch {}
  }
}
```

**For USB devices:**
```javascript
const USB_DEVICE_MAP = {
  { vendorId: 0x1e4e, productId: 0x0110 }: { type: 'microscope', name: 'Dino-Lite' },
  { vendorId: 0x0547, productId: 0x1002 }: { type: 'microscope', name: 'AmScope' },
}
```

**Visual indicator in app:**
Once a device is connected, a persistent badge appears in the sidebar:
```
🔵 Pulse Oximeter — Connected
🔵 BP Monitor — Connected
⚪ ECG — Not paired
```
Clicking any badge shows live readings or allows re-pairing.

---

### 11.4 Hardware Settings Page

Admin-only page where each facility configures which devices they have:

| Setting | Type |
|---------|------|
| Available devices | Checklist — tick which hardware the facility owns |
| Device nicknames | e.g. "Ward A oximeter" vs "Triage oximeter" |
| Auto-alert thresholds | Customise critical value limits per facility |
| Bluetooth pairing history | List of previously paired devices |
| Calibration reminders | Alert when device calibration is due |

---

## 12. Data Models

### patients
```sql
CREATE TABLE patients (
  id           TEXT PRIMARY KEY,         -- e.g. MT-00123
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

## 13. Pages & Components

### Pages

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/register` | PatientRegisterPage | Public |
| `/dashboard` | Dashboard | All staff roles |
| `/my-records` | PatientPortalPage | Patient |
| `/patients` | PatientListPage | All staff |
| `/patients/new` | PatientRegistrationPage | Receptionist, Admin |
| `/patients/:id` | PatientProfilePage | Doctor, Admin |
| `/lab` | LabResultsPage | LabTech, Doctor, Admin |
| `/lab/upload` | LabUploadPage | LabTech, Admin |
| `/ai-diagnostics` | AIDiagnosticsPage | LabTech, Doctor |
| `/ai-diagnostics/scan` | ScannerPage | LabTech |
| `/ai-diagnostics/results/:id` | AIResultDetailPage | LabTech, Doctor |
| `/ai-diagnostics/history` | AIResultsHistoryPage | Doctor, Admin |
| `/outbreak` | OutbreakMonitorPage | Doctor, Admin |
| `/settings` | SettingsPage | Admin |
| `/admin/users` | UserManagementPage | Admin |

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
├── ai/
│   ├── CameraCapture.jsx
│   ├── StripFrameGuide.jsx
│   ├── MicroscopeCapture.jsx
│   ├── AIResultCard.jsx
│   ├── CriticalAlert.jsx
│   ├── BluetoothDeviceManager.jsx
│   ├── ECGViewer.jsx
│   ├── DoctorConfirmPanel.jsx
│   └── ModelStatusBadge.jsx
├── dashboard/
│   ├── StatCard.jsx
│   ├── SymptomChart.jsx
│   └── OutbreakBanner.jsx
└── outbreak/
    ├── OutbreakCard.jsx
    └── OutbreakMeter.jsx
```

---

## 14. Offline & Sync Strategy

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

## 15. Outbreak Detection Logic

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

## 16. Non-Functional Requirements

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

## 17. Out of Scope (v1)

- Native mobile app (Android / iOS)
- Billing and insurance processing
- Appointment scheduling
- Prescription printing
- Multi-facility dashboard for regional health authorities
- Telemedicine / video consultation
- French / local language localisation
- SMS outbreak alerts to patients

---

## 18. Milestones

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| M1 — Setup | Vite + React scaffolded, React Router, Tailwind, Supabase project, sidebar layout | Week 1 |
| M2 — Auth | Supabase Auth, role metadata, protected routes, RLS policies | Week 2 |
| M3 — Patients | Registration form, patient table + search, profile page | Week 3 |
| M4 — Offline | Dexie.js, sync queue, Workbox service worker, connectivity badge | Week 4 |
| M5 — Lab Workflow | Test request queue (doctor → lab), result upload, Realtime notification, AI RDT strip reader | Week 6 |
| M6 — Outbreak | Detection logic, alert banner, outbreak monitor page | Week 7 |
| M7 — Nursing Phase 1 | Triage form + auto-classification, obs chart, NEWS2 score, vital trend charts, critical alerts | Week 9 |
| M8 — Nursing Phase 2 | Fluid balance, MAR + drug safety checks, wound assessment, shift handover summary | Week 11 |
| M9 — Nursing Phase 3 | Antenatal chart, paediatric IMCI, pre-op checklist, post-op Aldrete, discharge assessment | Week 13 |
| M10 — Doctor Phase 1 | Patient cockpit, structured history form, physical exam templates, ward round SOAP notes | Week 15 |
| M11 — Doctor Phase 2 | E-prescribing + weight-based dose calc, allergy/interaction safety checks, ICD-10 search + AI suggestion | Week 17 |
| M12 — Doctor Phase 3 | Test ordering (doctor → lab queue), differential diagnosis AI assistant, critical patient watch list | Week 19 |
| M13 — Doctor Phase 4 | One-click referral letter generator, one-click discharge summary, AI clinical summary | Week 21 |
| M14 — Interconnection | Full cross-role data flow live — prescription → MAR, test order → lab queue, obs → doctor trend view, allergy → MAR block | Week 22 |
| M15 — Hardware Phase 1 | Bluetooth pairing UI, AliveCor ECG integration, pulse oximeter, glucometer → obs chart auto-fill | Week 24 |
| M16 — Hardware Phase 2 | USB microscope, clip-on lens, BP cuff, spirometer integration | Week 26 |
| M17 — Dashboard | Role-specific dashboards — nurse station, doctor ward round, admin overview | Week 27 |
| M18 — Polish | Responsive design, empty states, error handling, admin user management, settings | Week 28 |
| M19 — Testing | Unit tests (Vitest), integration tests, UAT with hospital staff across all roles | Week 29 |
| **v1 Launch** | **Full core platform live — all roles, all workflows, hardware phase 1** | **Week 30** |
| M20 — AI Phase 1 | RDT strip reader on-device (TensorFlow.js) — Malaria, HIV, COVID-19 | Week 32 |
| M21 — AI Phase 2 | Chest X-ray Qure.ai integration, TB/pneumonia flagging, doctor confirm/override | Week 34 |
| M22 — AI Phase 3 | Microscopy AI — malaria YOLOv8, TB AFB smear, intestinal parasites | Week 37 |
| M23 — AI Phase 4 | Cough audio TB screening, ultrasound analysis, retinal fundus, maternal health AI | Week 41 |
| **v2 Launch** | **Full AI Diagnostics + Hardware suite live** | **Week 42** |

---

*This document is a living specification. Update it as requirements evolve during development.*
