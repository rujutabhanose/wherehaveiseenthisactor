# 🎬 Where Have I Seen This Actor?

A cinematic web app to track your watched movies & TV shows, then instantly discover where you've seen any actor before — with your watched titles highlighted.

## ✨ Features

- **Watched List** — Search and add any movie or TV show to your personal watchlist
- **Filter Your List** — Search within your watchlist by title instead of scrolling
- **Open Cast** — Click any item in your watchlist to see the full cast with character names
- **Jump to Actor** — From the cast modal, click any actor to load their full filmography
- **Actor Search** — Search for any actor/actress by name
- **Full Filmography** — See every movie and TV show they've appeared in, with character names
- **Seen Highlights** — Works you've already watched get a green "SEEN" ribbon
- **Mark Seen Inline** — A "+" / "✓" toggle on each work card lets you add/remove from your watchlist without leaving the actor page
- **Smart Filters** — Filter by Movies, TV, or "Seen Only"
- **Stats** — See how many of an actor's works you've seen out of their total
- **Server-Backed Storage** — Your watchlist persists across sessions and survives a cleared browser cache (via cookie + Upstash Redis); falls back to localStorage in local dev
- **Fully Responsive** — Works on mobile and desktop

## 🛠 Tech Stack

- **Next.js 14** (Pages Router)
- **TMDB API** for all media/cast/actor data
- **Upstash Redis** (via Vercel Marketplace) for per-user watchlist storage
- **Cookie-based anonymous user id** (set by `middleware.js`)
- **localStorage** as instant cache + offline fallback
- **Framer Motion** for animations
- **Vercel** for deployment

---

## 🚀 Quick Start

### 1. Get a TMDB API Key (Free)

1. Go to [themoviedb.org](https://www.themoviedb.org/)
2. Create a free account
3. Go to **Settings → API**
4. Request an API key (choose "Developer" → fill out the form)
5. Copy your **API Key (v3 auth)**

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd wherehaveiseenthisactor
npm install
```

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
# Edit .env.local and paste your TMDB API key
```

The Upstash Redis variables in `.env.local` are **optional for local dev** — if you leave them blank, the app silently falls back to localStorage-only (same as the original behavior).

### 4. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## ☁️ Deploy to Vercel

### Step 1 — Deploy the app

**Option A: Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel
```

When prompted, add `TMDB_API_KEY` with your key from TMDB.

**Option B: Vercel Dashboard**

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new), import your repo
3. Add env var `TMDB_API_KEY` = your TMDB key
4. Click **Deploy**

### Step 2 — Add Upstash Redis (for cross-session watchlist storage)

1. In your Vercel project → **Storage** → **Create Database**
2. Choose **Marketplace** → **Upstash Redis**
3. Pick the free tier; click **Continue** → **Connect Project**
4. Vercel will auto-inject `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into your environment
5. Trigger a redeploy (or push a new commit)

**That's it.** First-time visitors get a `uid` cookie; every save reads/writes their row in Redis. Come back later (same browser) → watchlist is there.

> If you skip Step 2, the app still works — it just falls back to localStorage-only, so watchlists won't survive a cache clear.

---

## 📁 Project Structure

```
wherehaveiseenthisactor/
├── lib/
│   └── tmdb.js              # TMDB API helper functions
├── middleware.js            # Sets the `uid` cookie on first visit
├── pages/
│   ├── api/
│   │   ├── search-media.js  # Search movies & TV shows
│   │   ├── search-person.js # Search actors
│   │   ├── actor.js         # Get actor filmography
│   │   ├── media-cast.js    # Get cast for a movie/show
│   │   └── watchlist.js     # GET/PUT user watchlist (Upstash Redis)
│   ├── _app.js
│   └── index.js             # Main app page
├── styles/
│   ├── globals.css          # Global styles & CSS variables
│   └── Home.module.css      # Component styles
├── .env.local.example
├── next.config.js
└── package.json
```

---

## 🔐 How Storage & "Who You Are" Works

- On your first visit, [middleware.js](middleware.js) sets a `uid` cookie (random UUID, httpOnly, 5-year lifetime).
- The client hook `useWatchlist()` in [pages/index.js](pages/index.js) loads any cached list from localStorage instantly, then asks `/api/watchlist` for the server copy.
- All writes are debounced (400 ms) and go to **both** localStorage and the server, so the UI stays snappy even on slow connections.
- One-time migration: if the server is empty but localStorage has a list (e.g., users from the old version), it's pushed up automatically.
- **Limitation:** "you" = "this browser's cookie." Switching device or clearing cookies looks like a new user. Real cross-device sync would need email-based auth (e.g., Supabase magic links).

---

## 🎨 Design

- **Dark cinematic theme** with film-inspired typography (Bebas Neue display font)
- **Coral/pink accent** (#ff4d6d) and **mint** (#4ecdc4) for the "seen" state
- CSS noise texture overlay for depth
- Smooth fade-up animations throughout

---

## 📝 Notes

- TMDB data is fetched server-side via API routes (your API key stays secret)
- Images are served directly from TMDB's CDN
- The TMDB API is **free** for non-commercial use — just display the TMDB logo somewhere
- Upstash Redis free tier (10,000 commands/day) is more than enough for personal use