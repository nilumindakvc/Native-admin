# Natives — Admin Console (Phase 1)

Web admin UI for the **Natives** marketplace. Lets administrators manage
customer & seller accounts, approve sellers, manage product/service categories,
and moderate listings.

## Stack
- **Vite** + **React 18** (JavaScript)
- **Tailwind CSS** for styling
- **React Router** for routing
- **TanStack Query** for server state
- **supabase-js** for admin authentication

## How auth works
Admins sign in with email/password via Supabase (`supabase-js`). The resulting
access token is sent as `Authorization: Bearer <token>` to the FastAPI backend.
After sign-in the app calls `GET /me`; access is granted only if that profile
has `role === "admin"` (set in the backend, e.g. via the backend seed script's
`BOOTSTRAP_ADMIN_EMAIL`). Non-admins see an "admin access required" screen.

## Setup
```bash
cd admin
npm install
cp .env.example .env      # then edit .env
npm run dev               # http://localhost:5173
```

`.env` variables (only `VITE_*` are exposed to the browser):
- `VITE_API_BASE_URL` — backend base, including `/api/v1` (default
  `http://127.0.0.1:8000/api/v1`).
- `VITE_SUPABASE_URL` — your Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_…` key (client-safe).
  Never put the secret key in this app.

Make sure the backend's `CORS_ORIGINS` includes the admin dev origin
(`http://localhost:5173`).

## Pages
| Route         | Purpose |
|---------------|---------|
| `/login`      | Supabase email/password sign-in |
| `/`           | Dashboard — counts + pending approvals |
| `/sellers`    | List/filter sellers, approve & reject registrations |
| `/users`      | List/filter users, change role, activate/deactivate |
| `/categories` | Manage product & service categories (major + sub) |
| `/listings`   | Moderate listings (active / inactive / hidden) |

## Structure
```
src/
  main.jsx            app bootstrap (Router + Query + Auth providers)
  App.jsx             routes
  index.css           Tailwind + component classes
  lib/
    supabase.js       supabase-js client
    api.js            fetch wrapper that attaches the bearer token
  context/AuthContext.jsx   session + /me profile + role
  components/         Layout, ProtectedRoute, Modal, ui primitives
  pages/             Login, Dashboard, Sellers, Users, Categories, Listings
```

## Build
```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```
