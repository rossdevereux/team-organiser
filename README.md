# SubShuffle ⚽
### Equal Playing Time & Matchday Manager for Grassroots Youth Football

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Zero_Idle_Cost-4285f4.svg)](https://cloud.google.com/run)
[![Firebase Hosting](https://img.shields.io/badge/Firebase_Hosting-Edge_CDN-ffca28.svg)](https://firebase.google.com/)

**SubShuffle** is a modern, decoupled full-stack application designed specifically for grassroots youth football coaches, team managers, and club secretaries. It eliminates the sideline headache of managing fair playing time, substitution rotations, tactical formations, and matchday attendance while strictly complying with FA youth development rules and international privacy regulations (GDPR / UK DPA 2018).

---

## 🌟 Key Features

### ⏱️ Fair Match Rotations & Period Management
- **Halves or Custom Periods:** Defaults to 2 Halves (standard youth football match structure) or supports 3-period / 4-quarter structures with configurable match durations (e.g. 2 x 25m = 50m).
- **Target Playing Time Compliance:** Visual indicators guarantee every child meets minimum playing time mandates (e.g. 50%+ equal game time).
- **Auto-Balance Algorithm:** One-click automated rotation engine prevents consecutive benchings, spreads minutes evenly, and respects positional preferences.

### 📐 Formations & Team Sizes
- **All Youth Formats Supported:** Seamlessly handles **5-a-side**, **7-a-side**, **9-a-side**, and **11-a-side**.
- **Interactive Visual Pitch:** Visualise tactical slots with drag-and-drop or one-click position swapping.
- **Custom Formation Builder:** Create custom team layouts (e.g. `2-3-1`, `3-2-1`, `2-4-1`, `3-1-2`) with bespoke pitch coordinates.

### 🔄 Sideline Suggested Substitutions Guide
- **Configurable Interval Rotation:** Select rotation marks (e.g. every **5m, 8m, 10m, 12m, 15m, 20m**).
- **Game Time Spreading:** Dynamic in-match tracking prioritises benching players with the most minutes and bringing on unplayed substitutes.
- **Unused Sub Prioritisation:** Guarantees players who have not stepped on the pitch yet get priority entry.
- **Historical Minutes Balancing:** Breaks ties by considering season-long historical playing minutes.
- **Tactical Strategies:** Choose between *Equal Game Time & Unused Subs*, *Positional Match (Like-for-like role preservation)*, or *Rolling Single Sub*.

### 📊 Post-Match Participation Tracking
- **100% Equal Participation Default:** When coaches prefer not to track minute-by-minute pitch time during casual or tournament matches, a single toggle awards 100% full match credit to all attending squad players.
- **Exact Minutes Mode:** Fine-tune exact pitch minutes per player with interactive sliders and save coach notes.

### 📅 Player Tenure & Holiday Calendars
- **Sign-on and Leave Dates:** Set optional registration join and leave dates. Players outside their active tenure window are automatically prevented from matchday squad selection.
- **Holiday & Absence Tracking:** Add single vacation days or full holiday date ranges. Ineligible players are flagged with warning badges across all matchday rosters.
- **Specific Tactical Roles:** Select broad categories (*Goalkeeper, Defence, Midfield, Attack*) alongside specific roles (*Centre Back, Left Back, Central Midfield, Striker, Wingers*).

### 📋 All Fixtures Team Sheet Matrix Table
- **Multi-Fixture Panoramic View:** Inspect every match across the season in a clean horizontal table.
- **Column per Fixture:** Columns display opponent, date, kick-off time, venue, and season.
- **Dedicated Line-Separated Rows:**
  - **Matchday Squad:** Selected pitch and bench players separated by new lines.
  - **Rested / Inactive:** Rested, holiday, or non-signed players separated by new lines.
- **One-Click Clipboard Export:** Copy matrix data in formatted text/TSV ready to paste into WhatsApp, email, or spreadsheets.

### 🤝 Multi-Team Management & Coach Collaboration
- **Multi-Team Support:** Switch between multiple teams (e.g. *U10 Boys*, *U12 Girls*), each maintaining independent squad lists, pitch sizes, and formations.
- **Secure Isolation & Sharing:** Team workspaces are isolated by Google Account UID and can be shared securely with assistant coaches via email.

---

## 🏗️ Architecture & Zero-Idle-Cost Design

SubShuffle is built to run indefinitely at **$0 / month** on Google Cloud Platform for typical grassroots clubs:

```text
[ Browser / Client (SPA) ]
          │
          ▼
[ Firebase Hosting Edge CDN ] ──── (Static Assets / HTML / JS / CSS)
          │
          ├── /api/**  (Automatic URL Rewrite)
          ▼
[ Google Cloud Run Container ] ── (Node.js + Express TypeScript API)
  * Scales to 0 instances when idle ($0 idle cost)
  * Cold start ~1s on demand
          │
          ├── Firebase Auth (Token verification)
          ▼
[ Google Cloud Firestore ] ────── (Multi-tenant persistent data store)
  (Or In-Memory Mock Fallback for local development)
```

1. **Frontend (`client/`):** React 19 + TypeScript + Vite + Tailwind CSS. Hosted globally at Google's edge via Firebase Hosting.
2. **Backend API (`server/`):** Express + TypeScript packaged in a container on Google Cloud Run configured with `--min-instances 0` to scale to zero when inactive.
3. **CDN URL Rewrites:** Firebase Hosting routes `/api/**` traffic directly to Cloud Run, eliminating CORS issues and SSL certificates management.
4. **Persistence:** Connects to Cloud Firestore in production, with an automated zero-config in-memory mock store for local development.

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x+

### 1. Clone & Install
```bash
git clone https://github.com/your-username/team-organiser.git
cd team-organiser

# Install dependencies across root, client, and server
npm run install:all
```

### 2. Environment Configuration

#### Client Configuration (`client/.env`)
Create a `.env` file in `client/` if using Firebase Authentication locally (optional; local sandbox mode works out-of-the-box):
```env
# client/.env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=team-organiser-prod
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Server Configuration (`server/.env`)
Create a `.env` file in `server/` (optional; local in-memory store and offline simulated billing work out-of-the-box):
```env
# server/.env
PORT=8080
NODE_ENV=development
INITIAL_ADMIN_EMAIL=admin@therovers.local
FIREBASE_PROJECT_ID=team-organiser-prod

# Optional: Stripe Billing (runs in offline simulated mode if omitted)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Jira Service Management Support Desk (runs in simulated mode if omitted)
JIRA_HOST=subshuffle.atlassian.net
JIRA_USER_EMAIL=your-atlassian-email@example.com
JIRA_API_TOKEN=your_atlassian_api_token
```

### 3. Run Development Servers
```bash
# Concurrently runs Express API (port 8080) and Vite dev server (port 5173)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ☁️ Setting Up in Google Cloud Platform (GCP) & Firebase

Follow these steps to deploy SubShuffle to Google Cloud with zero idle hosting costs.

### Prerequisites
1. Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install).
2. Install the [Firebase CLI (`firebase-tools`)](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`.
3. Install [Docker](https://docs.docker.com/get-docker/).

---

### Step 1: Create a Google Cloud & Firebase Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `team-organiser-prod`).
2. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project** -> select your existing Google Cloud project `team-organiser-prod`.
3. In Firebase Console, enable **Authentication** -> Sign-in method -> Enable **Google Sign-In**.
4. In Firebase Console, create a **Firestore Database** in production mode in your preferred region (e.g. `europe-west1`).

---

### Step 2: Enable Required GCP APIs
In your terminal, authenticate with GCP and enable the required services:
```bash
gcloud auth login
gcloud config set project team-organiser-prod

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

### Step 3: Set Up Artifact Registry
Create a Docker repository in Artifact Registry:
```bash
gcloud artifacts repositories create team-organiser \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker repository for SubShuffle"
```

Configure Docker to authenticate against Google Artifact Registry:
```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

---

### Step 4: Build & Deploy Backend to Cloud Run
1. Build the container image:
```bash
docker build -t europe-west1-docker.pkg.dev/team-organiser-prod/team-organiser/server:latest ./server
docker push europe-west1-docker.pkg.dev/team-organiser-prod/team-organiser/server:latest
```

2. Deploy to Cloud Run with zero-idle scaling:
```bash
gcloud run deploy team-organiser-api \
  --image europe-west1-docker.pkg.dev/team-organiser-prod/team-organiser/server:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --update-env-vars NODE_ENV=production
```
*Note: Note the service URL or ensure the serviceId matches `team-organiser-api` in `firebase.json`.*

---

### Step 5: Configure Multi-Site Firebase Hosting Rewrites (`live` & `beta`)
Your `firebase.json` in the root directory configures multi-site Firebase Hosting targets (`live` for `subshuffle.com` and `beta` for `beta.subshuffle.com`) to proxy API calls directly to their respective Cloud Run services:
```json
{
  "hosting": [
    {
      "target": "live",
      "public": "client/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "/api/**",
          "run": {
            "serviceId": "team-organiser-api",
            "region": "europe-west1"
          }
        },
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "beta",
      "public": "client/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "/api/**",
          "run": {
            "serviceId": "backend-api-beta",
            "region": "europe-west1"
          }
        },
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

Set your default project and hosting target aliases in `.firebaserc`:
```json
{
  "projects": {
    "default": "team-organiser-prod"
  },
  "targets": {
    "team-organiser-prod": {
      "hosting": {
        "live": ["team-organiser-prod"],
        "beta": ["subshuffle-beta"]
      }
    }
  }
}
```

---

### Step 6: Build & Deploy Frontend to Firebase Hosting
```bash
# Build the production React bundle
npm run build:client

# Deploy static files & rewrites to Firebase Hosting
firebase login
firebase deploy --only hosting
```

Your app will be live at `https://team-organiser-prod.web.app`!

---

### Step 7: Automated CI/CD via GitHub Actions
A complete GitHub Actions workflow is provided in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

To activate automatic deployments on `git push main`:
1. In your GitHub repository settings, navigate to **Settings -> Secrets and variables -> Actions**.
2. Add the following repository secrets:
   - `GCP_SA_KEY`: Service account key JSON with `Cloud Run Admin`, `Artifact Registry Writer`, `Service Account User`, and `Firebase Hosting Admin` (`roles/firebasehosting.admin`) roles. (Used for both Cloud Run backend and Firebase Hosting frontend deployments).
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.: Client Firebase configuration values.

---

## 💳 Stripe Billing & Subscriptions Setup

SubShuffle incorporates a fair grassroots cost-recovery billing model designed strictly to offset cloud hosting and database costs:
- **Coach Monthly:** £1.50 / month (flexible, cancel anytime).
- **Coach Annual:** £15.00 / year (~£1.25/month).
- **30-Day Free Trial:** Automatically provisioned upon registration with zero credit card required.
- **Complimentary Free for Life:** Club Owners can grant permanent lifetime access to volunteer coaches directly in the Admin Portal (`/admin` -> Users tab).
- **No Hostage Data Policy:** If a subscription lapses, coaches permanently retain full read access to historical fixtures, minutes statistics, and PDF match sheet exports. Active rotation planning and live match tracking resume once renewed or upgraded.

---

### Architecture & Modes

SubShuffle leverages **Stripe Checkout** (hosted payment page) and **Stripe Customer Portal** (hosted invoice and card management) alongside server-side webhook processing with cryptographic signature verification:
- `POST /api/billing/create-checkout-session`: Generates a Stripe Checkout URL with plan metadata (`coach_monthly` or `coach_annual`).
- `POST /api/billing/create-portal-session`: Generates a self-service Stripe Customer Portal link for VAT invoices and card changes.
- `POST /api/billing/webhook`: Verifies Stripe signatures and automatically updates user token claims in Firebase Auth (`subscriptionStatus`, `subscriptionTier`).

#### Offline Simulated Mode (Default)
If `STRIPE_SECRET_KEY` is not defined in `server/.env`, SubShuffle automatically runs in **offline simulated mode**:
- Checkout and portal requests succeed with mock URLs without making external network calls.
- Ideal for local development, automated testing, and demonstration instances.

---

### Step-by-Step Stripe Setup (Test or Live)

#### 1. Retrieve Your Stripe API Key
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Navigate to **Developers -> API keys**.
3. Under the **Standard keys** table (do not use "Restricted keys"):
   - For local development and staging: copy your test key (**`sk_test_...`**).
   - For production: copy your live key (**`sk_live_...`**).
   > [!IMPORTANT]
   > Ensure you copy the **Secret key** (prefix `sk_live_` or `sk_test_`). Do not use a **Restricted key** (`rk_live_...`) or a **Publishable key** (`pk_live_...`), as Stripe Checkout requires standard secret key permissions.

#### 2. Set Up the Webhook Endpoint in Stripe
1. In the Stripe Dashboard, navigate to **Developers -> Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:** `https://<your-app-domain>/api/billing/webhook`
   - Example for Firebase Hosting rewrite: `https://team-organiser-prod.web.app/api/billing/webhook`
   - Example for custom domain: `https://subshuffle.app/api/billing/webhook`
4. **Events to send:** Click **Select events** and enable:
   - `checkout.session.completed` (activates subscription and syncs Firebase claims)
   - `customer.subscription.updated` (tracks renewals, status changes like `past_due` or `canceled`)
   - `customer.subscription.deleted` (marks expired/canceled accounts)
   - `invoice.payment_failed` (flags `past_due` payment warnings)
5. Click **Add endpoint**.
6. Under **Signing secret**, click **Reveal** and copy the secret (`whsec_...`).

#### 3. Enable the Stripe Customer Portal
1. In the Stripe Dashboard, navigate to **Settings -> Billing -> Customer portal** (or search "Customer portal").
2. Click **Activate** (or configure portal features):
   - Enable **Invoice history** (allows coaches to download VAT receipts for club expense reimbursement).
   - Enable **Payment methods** (allows coaches to update credit/debit cards).
   - Enable **Subscription cancellation** and **Plan switching**.
3. Save your portal settings.

#### 4. Configure Server Environment Variables
In your local `server/.env` or deployment configuration:
```env
# server/.env
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 5. Local Testing via Stripe CLI
To test Stripe Checkout and webhook events locally against `http://localhost:8080`:

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli):
   ```bash
   # Windows (via Scoop or manual download)
   scoop bucket add stripe https://github.com/stripe/stripe-cli-scoop-bucket.git
   scoop install stripe

   # macOS (Homebrew)
   brew install stripe/stripe-cli/stripe

   # Linux
   sudo apt-get install stripe
   ```

2. Log in with your Stripe account:
   ```bash
   stripe login
   ```

3. Forward incoming webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:8080/api/billing/webhook
   ```
   *The CLI will print your local webhook signing secret (`whsec_...`). Put this in `server/.env` as `STRIPE_WEBHOOK_SECRET`.*

4. In a separate terminal, trigger a test subscription completion:
   ```bash
   stripe trigger checkout.session.completed
   ```
   You will see the Express API log: `[Stripe Webhook] Activated coach_monthly subscription for UID: ...`.

#### 6. Production Deployment on Google Cloud Run
To persist your Stripe keys securely across all future Cloud Run deployments and GitHub Actions upgrades using **Google Cloud Secret Manager**, run the included PowerShell setup script once:

```powershell
.\scripts\setup-stripe-secrets.ps1
```

Alternatively, provide them directly via `--update-env-vars`:

```bash
gcloud run services update team-organiser-api \
  --region europe-west1 \
  --update-env-vars STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 7. Enable Firestore 24-Month Native TTL Policy (Accounting & GDPR Hygiene)
Payment receipts (`users/{uid}/payments/{paymentId}`) automatically include an `expireAt` timestamp set 24 months ahead of the payment date, and webhook idempotency records (`stripe_events/{eventId}`) include a 30-day `expireAt` timestamp. Enable Cloud Firestore's native TTL policy so expired records are purged automatically at zero operational cost:

```bash
gcloud firestore fields ttls update expireAt \
  --collection-group=payments \
  --enable-ttl \
  --project=team-organiser-prod

gcloud firestore fields ttls update expireAt \
  --collection-group=stripe_events \
  --enable-ttl \
  --project=team-organiser-prod
```

---

## 🎫 Jira Service Management (JSM) Support Desk Setup

SubShuffle includes an in-app **Help & Feedback** modal (`POST /api/support/ticket`) that creates categorized issues directly in Jira Service Management (`OPS` project on `subshuffle.atlassian.net`) with an Atlassian Document Format (ADF) description and automated diagnostic telemetry (`SupportTelemetry`).

- **Category to Issue Type ID Mapping (`OPS`):**
  - `bug` -> `10002` (Problem)
  - `feature` -> `10003` (Suggestion)
  - `question` -> `10001` (Question)
- **Cloud Run Secret Provisioning:**
  Run the helper script once to store `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` in Google Cloud Secret Manager and attach them to `team-organiser-api` and `backend-api-beta`:
  ```powershell
  .\scripts\setup-jira-secrets.ps1
  ```

---

## 🛡️ GDPR & Child Data Protection Compliance

### Legal Context
Because this application stores player names, squad numbers, holiday/absence records, and match participation minutes for **minors (children under 18)**, it processes personal data governed by:
- **UK Data Protection Act 2018 (UK GDPR)**
- **EU General Data Protection Regulation (EU GDPR)**
- **Children's Online Privacy Protection Act (COPPA - US)**

### 5 Core Rules for Grassroots Football Clubs
1. **Parental Consent / Registration Notice:** Children under 13/16 cannot provide legal consent. Clubs should include a clear data notice in their annual player signing form confirming that player names and match statistics are maintained in coaching rotation software.
2. **Data Minimisation (Art. 5(1)(c)):** Only store necessary information (first name, initials, squad number). Never store sensitive home addresses, financial details, or medical records directly in this software.
3. **Right to Erasure (Art. 17):** Parents can request their child's records be removed. SubShuffle allows coaches to delete player profiles and associated records instantly.
4. **Account & Tenant Isolation (Art. 32):** Data is isolated to authenticated coaches. Lineup data is never publicly searchable or exposed.
5. **Privacy Policy Requirement (Art. 13/14):** Any club or web tool processing personal data must provide a Privacy Policy. SubShuffle includes an integrated **Privacy & GDPR Modal** accessible via the application footer and settings.

---

## 📝 Changelog
All notable changes and release versions are documented in [CHANGELOG.md](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standards.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

