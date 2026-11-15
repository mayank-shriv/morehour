# Study Time Tracker

A full-stack study timer with a responsive React dashboard, protected Express API, JWT authentication, and MongoDB persistence. Focus and break durations are derived from activity timestamps, so refreshing the browser does not reset a running timer.

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)

## Run locally

1. Copy `.env.example` to `.env` in the project root and set `MONGODB_URI` and a long, random `JWT_SECRET`. The API loads this root-level file when started from its workspace.
2. Install dependencies from the project root:

   ```sh
   npm install
   ```

3. Start MongoDB, then start the client and API:

   ```sh
   npm run dev
   ```

The React app is available at `http://localhost:5173`; Vite proxies `/api` requests to the Express API at `http://localhost:4000`. Set `CLIENT_ORIGIN` if the client runs at another origin. For a production frontend, serve the output of `npm run build` from a static host and point it at the API.

If Atlas reports `bad auth`, check the database user's username/password (these are separate from an Atlas website login), ensure that user is allowed to access the cluster, and URL-encode reserved characters in the password inside the connection URI. Do not share or commit `.env`.

## Available scripts

- `npm run dev` — run the API and Vite development server together
- `npm run build` — create the production client bundle
- `npm start` — start the API

## Tracking behavior

Starting a tracking session begins a study activity. Study and break buttons close the current activity and open the next one. Finishing the day closes the active activity and saves the final totals. A MongoDB partial unique index prevents more than one open session per user. Session and activity durations are stored in milliseconds; the UI presents them as `HH:MM:SS`.

The dashboard, history, and analytics endpoints require a bearer token. User timezone is captured at registration and used for date-based reports. Analytics includes the last seven days or the current calendar month.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`, `PATCH /api/auth/me`
- `POST /api/sessions/start`, `/study`, `/break`, `/end`
- `GET /api/sessions/current`, `GET /api/sessions/history?date=YYYY-MM-DD`
- `GET /api/analytics/daily`, `/weekly`, `/monthly`
- `GET /api/health`
