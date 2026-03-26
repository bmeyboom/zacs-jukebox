# 🎵 Zac's Jukebox

A modern, real-time web dashboard that turns a **Google Sheet** into a live social jukebox. It displays song titles, the name of the person who added them, and fetches track data via the **Spotify API**.

## 🚀 Tech Stack (2026 Edition)
* **Framework:** Next.js 15+ (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4
* **APIs:** Google Sheets API v4 & Spotify Web API
* **Icons:** Lucide React

---

## 🛠️ Getting Started

### 1. Environment Setup
Ensure you have fnm installed for Node version management.
- Run: `fnm use lts`
- Run: `npm install`

### 2. Configuration (.env.local)
Create a `.env.local` file in the root directory and populate it with your credentials:

- GOOGLE_SHEET_ID=your_spreadsheet_id
- GOOGLE_SERVICE_ACCOUNT_EMAIL=jukebox-bot@your-project.iam.gserviceaccount.com
- GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"

- SPOTIFY_CLIENT_ID=your_client_id
- SPOTIFY_CLIENT_SECRET=your_client_secret

### 3. Google Sheet Permissions
* Share your Google Sheet with the Service Account Email found in your .env.local.
* Ensure the Service Account has at least Viewer permissions.

---

## 💻 Development

Run the development server using Turbopack:
- Run: `npm run dev`

Open http://localhost:3000 with your browser to see the result.

---

## 📁 Project Structure
* src/app/: Core application logic and routing.
* src/app/actions.ts: Server Actions for fetching Google and Spotify data.
* src/app/globals.css: Tailwind CSS v4 styling and theme variables.
* AGENTS.md: AI Assistant instructions for maintaining 2026 code standards.

---

## 📜 Roadmap
- [x] Initial Project Setup (Next.js + TypeScript)
- [x] Google Cloud API Authentication
- [ ] Implement Google Sheets Fetch Logic (actions.ts)
- [ ] Connect Spotify Search API
- [ ] Build UI with Tailwind v4
- [ ] Add Real-time Polling / Auto-refresh
