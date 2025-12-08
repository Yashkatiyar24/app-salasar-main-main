# Salasar Stay Manager

A mobile-first hotel stay and booking management app built with Expo + React Native and Firebase.

This repository contains a frontend Expo app and a small Python backend. The frontend uses Firebase (Auth, Firestore, Realtime Database) for realtime room availability and bookings.

Screenshots
-----------
Place the screenshots you attached into `docs/screenshots/` using the exact filenames below. They are referenced in this README so they render on GitHub.

- `docs/screenshots/dashboard.png` — Dashboard overview with stats and quick actions
- `docs/screenshots/rooms_list_1.png` — Rooms list (white cards, occupied badge)
- `docs/screenshots/rooms_list_2.png` — Rooms list (alternate crop)

Example (rendered):
![Dashboard](docs/screenshots/dashboard.png)
![Rooms list 1](docs/screenshots/rooms_list_1.png)
![Rooms list 2](docs/screenshots/rooms_list_2.png)

Repository layout
-----------------
- `frontend/` — Expo React Native application (TypeScript)
- `backend/` — Python backend (FastAPI)
- `scripts/` — utility scripts (RTDB smoke tests, reset scripts)

Quick start (frontend)
----------------------
1. Install dependencies

```bash
cd frontend
npm install
```

2. Configure Firebase

- Follow `frontend/FIREBASE_SETUP_GUIDE.md` to create a Firebase project and copy credentials into `frontend/src/firebase/config.ts` or set the EXPO_PUBLIC_FIREBASE_* env vars.

3. Run the app

```bash
npx expo start
```

Quick start (backend)
---------------------
1. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

2. Run the API server

```bash
uvicorn backend.server:app --reload
```

Key files and where to look
---------------------------
- Frontend overview: `frontend/README.md` and `frontend/APP_OVERVIEW.md`
- Firebase setup: `frontend/FIREBASE_SETUP_GUIDE.md` and `frontend/src/firebase/config.ts`
- Rooms UI: `frontend/app/(tabs)/rooms.tsx`
- Dashboard UI: `frontend/app/(tabs)/dashboard.tsx`
- RTDB helpers: `frontend/src/utils/rtdbService.ts` and `frontend/realtimehelpers.ts`
- Auth provider: `frontend/src/context/AuthContext.tsx`
- Backend entry: `backend/server.py`

Testing & scripts
------------------
- Reset RTDB: `scripts/reset_rtdb_state.js`
- RTDB smoke tests: `scripts/smoke_rtdb_test.js`, `scripts/smoke_rtdb_atomic_test.js`

Contributing
------------
Open a PR with a short description. Run smoke tests and update `test_result.md` when you change booking or RTDB logic.

License
-------
MIT

Contact
-------
See project files for maintainer and Firebase setup instructions.
# Here are your Instructions
