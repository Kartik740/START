# START — Setup & Deployment Guide

This guide covers local development, Supabase backend configuration, progressive web app (PWA) verification, testing, and production deployment.

---

## 1. Local Development Setup

### 1.1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: npm (v9+) or pnpm
- **Modern Browser**: Chrome, Edge, Safari, or Firefox with Service Worker support

### 1.2. Installation & Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/your-org/beproductive.git
cd beproductive

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

### 1.3. Environment Variables
Create a `.env` file in the project root:

```env
# Supabase Configuration (Optional: runs in standalone local mode if omitted)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API (Optional: used for AI decomposition workflows)
VITE_GEMINI_API_KEY=AIzaSy...
```

---

## 2. Running Quality Checks & Tests

START enforces zero-regression test verification and strict React compiler hygiene:

```bash
# Run unit test suite (Vitest)
npm test

# Run linter (oxlint)
npm run lint

# Run full TypeScript compiler and production build verification
npm run build
```

---

## 3. Supabase Backend Setup (Optional Cloud Sync)

START runs 100% locally with high-performance IndexedDB/LocalStorage storage by default. To enable multi-device sync:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Paste and run the schema defined in [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md).
4. Copy the **Project URL** and **anon public key** from *Project Settings $\rightarrow$ API*.
5. Paste them into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Restart the Vite dev server.

---

## 4. Progressive Web App (PWA) & Offline Shell

### 4.1. Requirements for Install Prompt
To allow users to install START as a desktop or mobile application:
- Must be served over **HTTPS** (or `localhost` during development).
- Service worker must be registered (`/sw.js`).
- Web App Manifest must be valid (`/manifest.webmanifest`).

### 4.2. Service Worker Strategy
- **Navigation Requests**: Network-first with immediate offline fallback to `/index.html`.
- **Static Assets (JS/CSS/Fonts)**: Stale-While-Revalidate caching with versioned cache busting (`start-os-v1`).
- **Data APIs**: Network-first to ensure freshness, falling back to local client state.

---

## 5. Production Deployment

### 5.1. Build Output
To create the optimized production bundle:

```bash
npm run build
```

This generates production-ready static assets in the `dist/` directory.

### 5.2. Deploying to Cloudflare Pages / Vercel / Netlify

#### Vercel
1. Connect your repository.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Add Single Page Application (SPA) rewrite rule in `vercel.json`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

#### Netlify
Create `public/_redirects`:
```
/*    /index.html   200
```

#### Nginx (Self-Hosted VPS)
Sample Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name start.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/start.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/start.yourdomain.com/privkey.pem;

    root /var/www/beproductive/dist;
    index index.html;

    # Service worker should not be cached aggressively
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Static assets with long cache lifetime
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
