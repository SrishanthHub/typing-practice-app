# KeyFlow — Typing Practice App

A full-stack, MonkeyType-inspired typing practice app with accounts, streaks,
achievements, daily challenges, custom text/code uploads, and detailed
WPM/accuracy analytics.

## Features

- **Typing test modes**: time (15/30/60/120s), word count (10/25/50/100), random quotes, code snippets, and custom user-uploaded text/code
- **Punctuation & numbers toggles** for word/time modes
- **Accounts** with JWT auth (register/login), so results persist across sessions
- **Streaks** — a day counts once you finish any test or the daily challenge
- **Achievements** — 12 unlockable badges (speed milestones, accuracy, streaks, volume, etc.)
- **Daily Challenge** — everyone gets the same prompt each day, one attempt, with its own leaderboard
- **Custom texts & code snippets** — upload your own paragraphs or code (JS/Python/Java/C/C++), share publicly or keep private, and practice them
- **Analytics**: WPM/accuracy line chart over time, and a keyboard mistake heatmap
- **Leaderboards** per mode (time/words/quote)
- **5 color themes** (Serika Dark, Dracula, Nord, Ocean, Daylight)

## Tech stack

- **Frontend**: React 19 + Vite, React Router, Recharts, hand-written CSS (no framework)
- **Backend**: Node.js + Express, JWT auth, bcrypt password hashing
- **Database**: SQLite via `sql.js` (pure JS/WASM — no native build tools required, works everywhere)

## Project structure

```
typing-practice-app/
├── backend/          # Express API
│   ├── routes/        # auth, tests, texts, leaderboard, achievements, daily-challenge, content
│   ├── utils/          # achievements logic, streak logic, text/quote/code generators
│   ├── data/            # seed word list, quotes, code snippets (+ the SQLite file at runtime)
│   ├── db.js
│   └── server.js
└── frontend/          # React app
    └── src/
        ├── pages/        # Home, Login, Register, Profile, Leaderboard, CustomTexts, Achievements, DailyChallenge
        ├── components/    # Navbar, TypingTest, WpmChart, Heatmap
        ├── context/        # AuthContext
        ├── api/             # fetch client
        └── utils/            # word/text decoration, WPM & consistency math, char comparison
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET for anything beyond local dev
npm start                 # listens on http://localhost:5000
```

The SQLite database file is created automatically at `backend/data/typing_app.db`
on first run — no separate database setup needed.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # points VITE_API_URL at the backend, defaults to localhost:5000
npm run dev                # http://localhost:5173
```

Open the printed local URL in your browser. Register an account to save results,
build streaks, and unlock achievements — or just start typing as a guest.

### Production build

```bash
cd frontend
npm run build      # outputs static files to frontend/dist
npm run preview    # serve the built app locally to sanity-check it
```

Deploy `frontend/dist` to any static host, and run the backend (`node server.js`)
on a Node host, pointing `VITE_API_URL` at wherever the backend ends up.

## Notes on the achievements system

Achievement definitions live in `backend/utils/achievements.js`. Each has a
`check(context)` function evaluated after every test submission and daily
challenge completion. Add a new achievement by adding an entry there — it's
auto-seeded into the database on server start.

## Notes on the daily challenge

The daily challenge's content is generated deterministically from the date
(same seed → same words/quote/code for everyone that day) and cached in the
`daily_challenges` table the first time anyone requests it. It rotates through
word practice, quotes, and code snippets by day of year.
