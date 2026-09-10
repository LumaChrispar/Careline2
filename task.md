# ECO~MEDIK — Build Task Tracker

## Phase 1: Project Setup (M1)
- [x] Scaffold Vite + React project
- [x] Install dependencies (React Router, Zustand, Tailwind CSS, Recharts, Lucide React, Supabase JS, Dexie.js)
- [x] Configure Tailwind CSS
- [x] Set up project folder structure (components, pages, stores, lib, etc.)
- [x] Create Supabase client configuration (`.env` placeholder)
- [x] Build Sidebar + Topbar layout shell

## Phase 2: Authentication & Protected Routes (M2)
- [x] Create Login page with Supabase Auth
- [x] Set up auth store (Zustand)
- [x] Create ProtectedRoute component with role-based access
- [x] Set up React Router with all routes

## Phase 3: Patient Module (M3)
- [x] Patient registration form (`/patients/new`)
- [x] Patient list page with search (`/patients`)
- [x] Patient profile page (`/patients/:id`)

## Phase 4: Lab Results Module (M5)
- [x] Lab results list page (`/lab`)
- [x] Lab upload form page (`/lab/upload`)
- [x] Lab notification feed component

## Phase 5: Outbreak Detection (M6)
- [x] Outbreak monitor page (`/outbreak`)
- [x] Outbreak detection logic
- [x] Outbreak banner component

## Phase 6: Dashboard (M7)
- [x] Dashboard page with stat cards
- [x] Symptom frequency chart (Recharts)
- [x] Recent patients table
- [x] Notification feed widget

## Phase 7: Settings & Admin (M8)
- [x] Settings page for Admin
- [x] Connectivity badge (online/offline indicator)

## Phase 8: Offline & Sync (M4)
- [x] Dexie.js IndexedDB setup
- [x] Sync queue logic
- [x] Service worker with Workbox

## Verification
- [ ] Browser testing of all routes and role-based access
- [ ] Manual UI walkthrough
