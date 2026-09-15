> Historical planning/review document. Current setup: [deployment guide](docs/DEPLOYMENT.md). Current verification: [release checklist](docs/RELEASE_CHECKLIST.md).

# ECO~MEDIK — Implementation Plan

Build a React + Vite web application for hospital patient record management, lab result delivery, and disease outbreak detection in Cameroon. Uses Supabase as the backend (auth, DB, storage, realtime) and supports offline-first usage via IndexedDB (Dexie.js).

## User Review Required

> [!IMPORTANT]
> **Supabase project required.** You will need to create a Supabase project at [supabase.com](https://supabase.com) and provide the `SUPABASE_URL` and `SUPABASE_ANON_KEY`. I will set up placeholder `.env` values and the SQL schema file — you'll run the SQL in the Supabase SQL editor manually.

> [!IMPORTANT]
> **This is a large build.** I'll scaffold the full project structure with all pages and components in one pass so you can see the complete app immediately. The app will use mock/demo data for features that require a live Supabase backend until you connect it.

---

## Proposed Changes

### Project Scaffolding

#### [NEW] Vite + React Project
Scaffold using `npx create-vite@latest ./ --template react` in the hackathon project directory.

#### Install dependencies
```
npm install react-router-dom zustand @supabase/supabase-js dexie recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

---

### Configuration

#### [NEW] `.env.example`
Placeholder Supabase credentials.

#### [NEW] `src/lib/supabase.js`
Supabase client initialization from env vars.

#### [NEW] `supabase-schema.sql`
Full SQL schema (patients, visits, lab_results, outbreak_alerts, facilities tables + RLS policies) — the user runs this in the Supabase SQL editor.

#### [MODIFY] `vite.config.js`
Add Tailwind CSS Vite plugin.

#### [NEW] `src/index.css`
Tailwind directives + custom CSS variables for dark medical theme.

---

### Layout Components

#### [NEW] `src/components/layout/Sidebar.jsx`
Navigation sidebar with role-aware menu items, connectivity badge, and branding.

#### [NEW] `src/components/layout/Topbar.jsx`
Top bar with page title, search, user info, and notification bell.

#### [NEW] `src/components/layout/ProtectedRoute.jsx`
Route guard that checks Supabase auth session and user role.

#### [NEW] `src/components/layout/AppLayout.jsx`
Wraps Sidebar + Topbar + page content outlet.

---

### UI Components

#### [NEW] `src/components/ui/Button.jsx`
#### [NEW] `src/components/ui/Modal.jsx`
#### [NEW] `src/components/ui/Toast.jsx`
#### [NEW] `src/components/ui/Badge.jsx`
#### [NEW] `src/components/ui/SearchBar.jsx`
#### [NEW] `src/components/ui/ConnectivityBadge.jsx`
#### [NEW] `src/components/ui/StatCard.jsx`

---

### State Management (Zustand Stores)

#### [NEW] `src/stores/authStore.js`
Auth state: user, session, role, login/logout actions.

#### [NEW] `src/stores/patientStore.js`
Patient CRUD actions, search, and offline queue.

#### [NEW] `src/stores/labStore.js`
Lab result management and notification state.

#### [NEW] `src/stores/outbreakStore.js`
Outbreak alert state and detection triggers.

#### [NEW] `src/stores/uiStore.js`
Toast notifications, modals, sidebar toggle.

---

### Pages

#### [NEW] `src/pages/LoginPage.jsx`
Email/password login form with Supabase Auth.

#### [NEW] `src/pages/DashboardPage.jsx`
Stat cards, symptom chart (Recharts), recent patients table, outbreak banner, notification feed.

#### [NEW] `src/pages/PatientListPage.jsx`
Searchable patient table with pagination.

#### [NEW] `src/pages/PatientRegistrationPage.jsx`
Full patient intake form per PRD spec.

#### [NEW] `src/pages/PatientProfilePage.jsx`
Patient details, visit history, lab results, add-visit form.

#### [NEW] `src/pages/LabResultsPage.jsx`
List of all lab results with filters.

#### [NEW] `src/pages/LabUploadPage.jsx`
Upload form: select patient, test type dropdown, file upload, summary.

#### [NEW] `src/pages/OutbreakMonitorPage.jsx`
Active alerts, historical alerts, symptom trend charts.

#### [NEW] `src/pages/SettingsPage.jsx`
Admin: outbreak thresholds, user management, facility info.

---

### Feature Components

#### [NEW] `src/components/patients/PatientTable.jsx`
#### [NEW] `src/components/patients/PatientCard.jsx`
#### [NEW] `src/components/patients/PatientForm.jsx`
#### [NEW] `src/components/lab/LabResultList.jsx`
#### [NEW] `src/components/lab/LabUploadForm.jsx`
#### [NEW] `src/components/lab/LabNotificationFeed.jsx`
#### [NEW] `src/components/dashboard/SymptomChart.jsx`
#### [NEW] `src/components/dashboard/OutbreakBanner.jsx`
#### [NEW] `src/components/outbreak/OutbreakCard.jsx`

---

### Routing

#### [NEW] `src/App.jsx`
React Router v6 setup with all routes, role-based protection, and AppLayout wrapper.

---

### Offline / Dexie.js

#### [NEW] `src/lib/db.js`
Dexie.js database definition — local patient, visit, lab_result, and sync_queue tables.

#### [NEW] `src/lib/syncEngine.js`
Sync queue processor — watches online/offline events, retries failed syncs.

---

### Demo Data

#### [NEW] `src/lib/demoData.js`
Seed data for demonstrating the app without a live Supabase backend — sample patients, visits, lab results, and outbreak alerts.

---

## Verification Plan

### Browser Testing
- Start the dev server with `npm run dev`
- Open each route in the browser and verify rendering
- Test responsive layout at mobile and desktop widths
- Verify role-based navigation (login as different roles using demo data)

### Manual Verification
1. **Login page**: Enter demo credentials → redirected to Dashboard
2. **Dashboard**: Verify stat cards, chart, and recent patients render
3. **Patient Registration**: Fill form → patient appears in patient list
4. **Patient Profile**: Click a patient → see visit history and lab results
5. **Lab Upload**: Select patient, pick test type, attach file → confirmation shown
6. **Outbreak Monitor**: View active alerts with case counts
7. **Settings**: Admin-only page — change outbreak threshold
8. **Offline badge**: Shows "Online" indicator in sidebar

> [!NOTE]
> Full Supabase integration testing (real auth, real-time notifications, file storage) requires the user to set up a Supabase project and provide credentials. The initial build will use demo data and mock auth for immediate previewing.
