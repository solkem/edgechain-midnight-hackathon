# Deployment Architecture & CI/CD Pipeline

**Purpose**: Understand how GitHub, Fly.io, and various services interact to deploy EdgeChain
**Audience**: Developers confused by tokens, secrets, and deployment automation
**Last Updated**: November 14, 2025

---

## 🎯 The Big Picture: What Are We Trying To Do?

**Goal**: Automatically deploy EdgeChain to production whenever we push code to the `main` branch.

**Problem**: We have code on our local machine (or in GitHub) but need it running on the internet where users can access it.

**Solution**: Use GitHub Actions (free automation) to build and deploy to Fly.io (cloud hosting) automatically.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR LOCAL MACHINE                              │
│                                                                          │
│  /workspaces/edgechain-midnight-hackathon/                              │
│  ├── packages/ui/          (React frontend - Vite)                      │
│  ├── server/               (Node.js backend - Express)                  │
│  ├── arduino/              (IoT firmware - Arduino C++)                 │
│  └── ipfs-service/         (IPFS microservice - Express)                │
│                                                                          │
│  Developer types:                                                        │
│  $ git add .                                                             │
│  $ git commit -m "feat: Add real-time rewards"                          │
│  $ git push origin main    ← THIS TRIGGERS EVERYTHING                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS push
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                              GITHUB.COM                                  │
│                    (Git repository + automation)                         │
│                                                                          │
│  Repository: solkem/edgechain-midnight-hackathon                         │
│  Branch: main                                                            │
│                                                                          │
│  When code is pushed to main:                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ GitHub Actions (FREE automation service)                          │  │
│  │                                                                    │  │
│  │ Workflow File: .github/workflows/deploy-flyio.yml                 │  │
│  │                                                                    │  │
│  │ Step 1: Checkout code       (download repo)                       │  │
│  │ Step 2: Install Node.js     (runtime environment)                 │  │
│  │ Step 3: Install deps        (yarn install)                        │  │
│  │ Step 4: Build UI            (yarn workspace edgechain-ui build)   │  │
│  │         ↓                                                          │  │
│  │         Creates: packages/ui/dist/  (HTML, CSS, JS files)         │  │
│  │                                                                    │  │
│  │ Step 5: Install Fly CLI     (deployment tool)                     │  │
│  │ Step 6: Deploy to Fly.io    (using FLY_API_TOKEN secret)          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  Uses SECRET stored in:            │                                     │
│  Settings → Secrets → FLY_API_TOKEN (hidden from public view)           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Authenticated HTTPS request
                                    │ (with FLY_API_TOKEN)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                               FLY.IO                                     │
│                    (Cloud hosting platform)                              │
│                                                                          │
│  App: edgechain-midnight                                                 │
│  Region: iad (US East - Virginia)                                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Build Process (happens on Fly.io servers)                        │   │
│  │                                                                   │   │
│  │ 1. Read: Dockerfile.unified                                      │   │
│  │ 2. Install dependencies (npm ci)                                 │   │
│  │ 3. Build TypeScript backend (tsc)                                │   │
│  │ 4. Copy built UI files (from GitHub Actions)                     │   │
│  │ 5. Create Docker container image                                 │   │
│  │ 6. Deploy to production VM                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  Running Application:              │                                     │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ Virtual Machine (Fly.io)                                        │     │
│  │                                                                  │     │
│  │ Port 3001: Node.js server                                       │     │
│  │ ├── Serves: packages/ui/dist/    (frontend at /)                │     │
│  │ ├── API:    /api/*                (backend REST API)            │     │
│  │ └── DB:     /app/data/edgechain.db (SQLite persistent volume)   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                    │                                     │
│  Public URL:                       │                                     │
│  https://edgechain-midnight.fly.dev ← Users access this                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS requests from users
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                                  │
│                                                                          │
│  Chrome/Edge/Opera                                                       │
│  URL: https://edgechain-midnight.fly.dev/arduino                        │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ React App (runs in browser)                                       │  │
│  │                                                                    │  │
│  │ • Connects to Arduino via Web Bluetooth (BLE)                     │  │
│  │ • Sends readings to backend: POST /api/arduino/readings/submit    │  │
│  │ • Shows green notification: "🎉 +0.1 tDUST earned!"                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Part 1: GitHub Secrets (Why We Need Them)

### The Problem: How Does GitHub Deploy To Fly.io?

GitHub Actions needs to tell Fly.io: "Hey, deploy this code!"

But Fly.io asks: "Who are you? How do I know you're authorized?"

**Solution**: Use an API token (like a password) to prove identity.

### What Is An API Token?

Think of it like a hotel room key card:
- **Physical key**: Your username + password (you type this in)
- **Key card**: API token (machines use this automatically)

**Example**:
```
FLY_API_TOKEN = "fo1_abc123xyz789..." (52 characters)
```

This token gives **full access** to your Fly.io account. If someone steals it, they can:
- ❌ Delete your apps
- ❌ See your data
- ❌ Rack up your bill

So we **NEVER** put it directly in code!

### How GitHub Secrets Work

```
┌─────────────────────────────────────────────────────────────┐
│           BAD APPROACH (NEVER DO THIS!)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ File: .github/workflows/deploy-flyio.yml                    │
│                                                              │
│ env:                                                         │
│   FLY_API_TOKEN: "fo1_abc123..."  ← VISIBLE TO EVERYONE!    │
│                                                              │
│ ❌ Token is in Git history forever                           │
│ ❌ Anyone can see it on GitHub                               │
│ ❌ Hackers will steal it immediately                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           GOOD APPROACH (WHAT WE DID)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Step 1: Store token in GitHub Secrets (encrypted vault)     │
│ GitHub UI: Settings → Secrets → Actions → New secret        │
│ Name: FLY_API_TOKEN                                          │
│ Value: fo1_abc123...                                         │
│                                                              │
│ ✅ Token is encrypted at rest                                │
│ ✅ Only GitHub Actions can read it                           │
│ ✅ Never appears in logs                                     │
│                                                              │
│ Step 2: Reference it in workflow (public file)              │
│ File: .github/workflows/deploy-flyio.yml                    │
│                                                              │
│ env:                                                         │
│   FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}               │
│                       ↑                                      │
│                       Placeholder that GitHub replaces       │
│                       with real value at runtime             │
└─────────────────────────────────────────────────────────────┘
```

### Where To Get The Fly.io Token

**Option A: Command Line (if you have `flyctl` installed locally)**
```bash
flyctl auth token
# Output: fo1_abc123xyz789...
```

**Option B: Fly.io Dashboard (web browser)**
1. Go to https://fly.io/dashboard
2. Click your profile (top right)
3. Click "Access Tokens"
4. Click "Create Token"
5. Name: "GitHub Actions Deploy"
6. Copy the token (starts with `fo1_`)

**IMPORTANT**: Save it immediately! Fly.io only shows it once. If you lose it, create a new one.

---

## 📄 Part 2: GitHub Actions Workflow (The Automation Script)

### What Is GitHub Actions?

Think of it like a **robot assistant** that lives on GitHub's servers:
- **Trigger**: When you push code to `main` branch
- **Action**: Robot wakes up and follows your instructions
- **Result**: Code gets built and deployed automatically

### The Workflow File

**Location**: [`.github/workflows/deploy-flyio.yml`](../.github/workflows/deploy-flyio.yml)

This file is the **instruction manual** for the robot. Let's break it down:

#### Lines 1-8: When To Run

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main         # Only run when pushing to main branch
  workflow_dispatch:  # Also allow manual trigger from GitHub UI
```

**Translation**:
- Run this robot when someone pushes to `main` branch
- Also add a button in GitHub UI to run it manually

#### Lines 10-20: The Robot's Workspace

```yaml
jobs:
  deploy:
    name: Deploy app to Fly.io
    runs-on: ubuntu-latest   # Use a Linux computer (free tier)
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
```

**What happens**:
1. GitHub creates a **brand new Linux computer** (virtual machine)
2. This computer is **empty** - no code, no tools
3. First step: Download your code from GitHub to this computer

**Analogy**: Like getting a new laptop and cloning the Git repo.

#### Lines 22-27: Install Node.js

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Enable Corepack
        run: corepack enable
```

**What happens**:
1. Install Node.js version 20 (JavaScript runtime)
2. Enable Corepack (allows using Yarn 4.x)

**Analogy**: Like installing software on your new laptop so you can run the code.

#### Lines 29-31: Install Dependencies

```yaml
      - name: Install dependencies
        run: yarn install --immutable
```

**What happens**:
- Downloads all npm packages listed in `package.json` and `yarn.lock`
- Creates `node_modules/` folder with 10,000+ files

**Analogy**: Like installing all the libraries your app needs (React, Express, TensorFlow, etc.)

#### Lines 33-36: Build Frontend

```yaml
      - name: Build UI package
        run: yarn workspace edgechain-ui build
        env:
          NODE_ENV: production
```

**What happens**:
```bash
# Runs Vite build process
Input:  packages/ui/src/          (React source code)
Output: packages/ui/dist/         (HTML, CSS, JS files)

Example output:
packages/ui/dist/
├── index.html                    (entry point)
├── assets/
│   ├── index-a1b2c3d4.js        (bundled JavaScript)
│   └── index-e5f6g7h8.css       (bundled CSS)
└── favicon.ico
```

**Why**: Vite compiles React code into static files that browsers can load.

**Analogy**: Like compiling a C++ program - turns source code into executable output.

#### Lines 38-39: Install Fly CLI

```yaml
      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master
```

**What happens**:
- Downloads the `flyctl` command-line tool
- Allows robot to communicate with Fly.io

**Analogy**: Like installing the AWS CLI or `gcloud` tool.

#### Lines 41-44: Deploy To Fly.io

```yaml
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only --config ./server/fly.toml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**What happens** (this is the magic!):

1. **Robot authenticates** with Fly.io using the secret token
2. **Reads config** from `server/fly.toml`:
   ```toml
   app = 'edgechain-midnight'        # Which app to deploy
   primary_region = 'iad'            # Where to host (Virginia)
   dockerfile = '../Dockerfile.unified'  # How to build
   ```

3. **Sends files** to Fly.io (entire project directory)

4. **Fly.io builds** the Docker container:
   ```dockerfile
   # Simplified Dockerfile.unified
   FROM node:20-alpine
   WORKDIR /app
   COPY server/ ./
   RUN npm ci --omit=dev
   RUN npm run build
   COPY packages/ui/dist ./packages/ui/dist
   CMD ["node", "dist/index.js"]
   ```

5. **Fly.io deploys** the container to production VM

6. **Health check** runs: `GET /api/db-stats`

7. **Done!** Site is live at `https://edgechain-midnight.fly.dev`

---

## 🚀 Part 3: Fly.io (The Cloud Hosting)

### What Is Fly.io?

Fly.io is like **renting a computer** in the cloud that's always on and accessible from the internet.

**Alternatives you might know**:
- AWS EC2 (complicated, enterprise)
- Heroku (simple, expensive)
- Vercel (frontend only)
- Fly.io (simple, affordable, full-stack) ← We use this

### How Fly.io Works

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR FLY.IO ACCOUNT                     │
│                                                              │
│  Organization: solkem (you)                                  │
│  Apps:                                                       │
│  ├── edgechain-midnight       (main app)                    │
│  └── edgechain-ipfs           (IPFS microservice)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ "Deploy this app!"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 FLY.IO INFRASTRUCTURE                        │
│                                                              │
│  Region: iad (US East - Virginia)                           │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Virtual Machine                                       │  │
│  │                                                        │  │
│  │ CPU: Shared (1 core)                                  │  │
│  │ RAM: 512 MB                                           │  │
│  │ Disk: /app/data/ (1 GB persistent volume)            │  │
│  │                                                        │  │
│  │ Running: Docker container                             │  │
│  │ ├── Node.js v20                                       │  │
│  │ ├── Express server (port 3001)                        │  │
│  │ ├── SQLite database                                   │  │
│  │ └── Static files (React UI)                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  Public endpoint:          │                                 │
│  https://edgechain-midnight.fly.dev                         │
│  ↓                                                           │
│  Fly.io Proxy (handles HTTPS, load balancing)               │
└─────────────────────────────────────────────────────────────┘
```

### The Dockerfile (How To Build The Container)

**File**: [`Dockerfile.unified`](../Dockerfile.unified)

Think of a Docker container like a **shipping container** for software:
- Everything your app needs is packaged inside
- Runs the same way everywhere (local, staging, production)
- Isolated from other apps (security)

**Build stages** (lines 1-64):

```dockerfile
# Stage 1: BUILD (compile TypeScript)
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci                          # Install ALL dependencies
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build                   # tsc → compiles TS to JS
# Output: /app/dist/ (JavaScript files)

# Stage 2: PRODUCTION (final container)
FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev               # Install only prod dependencies
COPY --from=builder /app/dist ./dist  # Copy compiled JS from Stage 1
COPY packages/ui/dist ./packages/ui/dist  # Copy built React UI
CMD ["node", "dist/index.js"]       # Start the server
```

**Why two stages?**
- Stage 1 needs TypeScript compiler (`tsc`) - 50 MB
- Stage 2 doesn't need it - only needs compiled JS
- **Result**: Final container is smaller (faster deployments, cheaper hosting)

---

## 🔗 Part 4: How All The Pieces Connect

### The Complete Flow (From Code Push To Live Site)

```
T+0 seconds: Developer pushes code
────────────────────────────────────────────────────────────────
$ git push origin main

Git uploads code to GitHub.com
───────────────────────────────────────────────────────────────

T+5 seconds: GitHub detects push
────────────────────────────────────────────────────────────────
GitHub: "New commit to main branch detected!"
GitHub: "Looking for .github/workflows/*.yml files..."
GitHub: "Found: deploy-flyio.yml"
GitHub: "Starting workflow..."

───────────────────────────────────────────────────────────────

T+10 seconds: GitHub Actions starts
────────────────────────────────────────────────────────────────
GitHub Actions: "Creating Ubuntu VM..."
GitHub Actions: "Checking out code..."
GitHub Actions: "Installing Node.js 20..."

───────────────────────────────────────────────────────────────

T+30 seconds: Installing dependencies
────────────────────────────────────────────────────────────────
$ yarn install --immutable

Downloading:
├── react (UI library)
├── vite (build tool)
├── express (backend framework)
├── better-sqlite3 (database)
└── 500+ other packages...

Total: 200 MB downloaded, 10,000+ files in node_modules/

───────────────────────────────────────────────────────────────

T+60 seconds: Building UI
────────────────────────────────────────────────────────────────
$ yarn workspace edgechain-ui build

Vite build process:
1. Parse React components
2. Bundle JavaScript (tree-shaking, minification)
3. Bundle CSS
4. Optimize images
5. Generate index.html

Output: packages/ui/dist/ (2 MB)

───────────────────────────────────────────────────────────────

T+75 seconds: Installing Fly CLI
────────────────────────────────────────────────────────────────
GitHub Actions: "Downloading flyctl..."
GitHub Actions: "Version: 0.2.0 installed"

───────────────────────────────────────────────────────────────

T+80 seconds: Deploying to Fly.io
────────────────────────────────────────────────────────────────
$ flyctl deploy --remote-only --config ./server/fly.toml

flyctl: "Authenticating with token..."
flyctl: "Reading fly.toml..."
flyctl: "App: edgechain-midnight"
flyctl: "Region: iad"
flyctl: "Dockerfile: ../Dockerfile.unified"

flyctl: "Uploading context (50 MB)..."
───────────────────────────────────────────────────────────────

T+90 seconds: Fly.io builds container
────────────────────────────────────────────────────────────────
Fly.io: "Building Docker image..."

Step 1: FROM node:20-alpine
Fly.io: "Pulling base image (30 MB)..."

Step 2: WORKDIR /app
Fly.io: "Creating /app directory..."

Step 3: COPY server/package.json ./
Fly.io: "Copying dependency list..."

Step 4: RUN npm ci
Fly.io: "Installing backend dependencies..."

Step 5: COPY server/src ./src
Fly.io: "Copying TypeScript source..."

Step 6: RUN npm run build
Fly.io: "Compiling TypeScript to JavaScript..."
Fly.io: "Output: dist/ (5 MB)"

Step 7: COPY packages/ui/dist ./packages/ui/dist
Fly.io: "Copying built UI (2 MB)..."

Step 8: CMD ["node", "dist/index.js"]
Fly.io: "Setting startup command..."

Fly.io: "Docker image built successfully (80 MB)"

───────────────────────────────────────────────────────────────

T+120 seconds: Fly.io deploys to VM
────────────────────────────────────────────────────────────────
Fly.io: "Stopping old version (v11)..."
Fly.io: "Starting new version (v12)..."
Fly.io: "Waiting for health check..."

Health check: GET https://edgechain-midnight.fly.dev/api/db-stats
Response: 200 OK

Fly.io: "Health check passed!"
Fly.io: "Routing traffic to v12..."
Fly.io: "Deployment complete!"

───────────────────────────────────────────────────────────────

T+125 seconds: GitHub Actions finishes
────────────────────────────────────────────────────────────────
GitHub Actions: "✅ Deployment successful"
GitHub Actions: "View logs: https://fly.io/apps/edgechain-midnight/monitoring"
GitHub Actions: "Workflow complete in 2m 5s"

───────────────────────────────────────────────────────────────

T+130 seconds: Site is live
────────────────────────────────────────────────────────────────
✅ https://edgechain-midnight.fly.dev is now serving new code!

Users visiting the site will see the updated version immediately.
```

---

## 🔧 Part 5: Troubleshooting Common Issues

### Issue 1: "Secrets not working"

**Symptom**: Deployment fails with `Error: FLY_API_TOKEN is not set`

**Diagnosis**:
```yaml
# In .github/workflows/deploy-flyio.yml
env:
  FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
                          ↑
                          Typo? Wrong name?
```

**Solution**:
1. Go to GitHub: Settings → Secrets → Actions
2. Check secret name matches exactly: `FLY_API_TOKEN` (case-sensitive)
3. If missing, add it with your Fly.io token

### Issue 2: "TypeScript compilation errors"

**Symptom**: Build fails with `TS2576: Property does not exist`

**Diagnosis**:
- Code works locally but fails in CI
- Likely: TypeScript strict mode differences

**Solution**:
1. Run locally: `yarn workspace server build`
2. Fix TypeScript errors
3. Commit and push again

### Issue 3: "Dockerfile not found"

**Symptom**: `ERROR: failed to solve: failed to read dockerfile`

**Diagnosis**:
```yaml
# Wrong working directory
- name: Deploy
  working-directory: ./server  # ← Deploy runs from here
  run: flyctl deploy --remote-only
```

But `fly.toml` says:
```toml
dockerfile = '../Dockerfile.unified'  # ← Looks for ../Dockerfile.unified
```

This path is relative to `./server/`, so it looks for:
`./server/../Dockerfile.unified` = `./Dockerfile.unified` ✅

**Solution**: Don't change `working-directory` - run from project root with `--config` flag.

### Issue 4: "Deployment successful but site shows old code"

**Symptom**: GitHub Actions shows green checkmark, but site doesn't change

**Diagnosis**:
- Browser cache
- CDN cache (if using Cloudflare)
- Wrong deployment target

**Solution**:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check Fly.io logs: `flyctl logs -a edgechain-midnight`
3. Verify deployment version: `flyctl status -a edgechain-midnight`

---

## 📊 Part 6: Monitoring & Observability

### How To Check If Deployment Succeeded

**GitHub Actions**:
```
https://github.com/solkem/edgechain-midnight-hackathon/actions

Green checkmark ✅ = Success
Red X ❌ = Failed
Yellow circle 🟡 = Running
```

**Fly.io Dashboard**:
```
https://fly.io/dashboard/solkem/edgechain-midnight

Status: Running ✅
Region: iad
Instances: 1
Version: v12
URL: edgechain-midnight.fly.dev
```

**Fly.io Logs (real-time)**:
```bash
flyctl logs -a edgechain-midnight

# Output:
2025-11-14T12:34:56Z app[...] info Server listening on port 3001
2025-11-14T12:35:01Z app[...] info ✓ Database connected
2025-11-14T12:35:02Z app[...] info ✓ IPFS client initialized
```

**Health Check Endpoint**:
```bash
curl https://edgechain-midnight.fly.dev/api/db-stats

# Response:
{
  "status": "healthy",
  "database": "connected",
  "devices_registered": 5,
  "total_readings": 1247
}
```

---

## 💡 Key Takeaways

### The 5 Moving Parts

1. **Your Code** (local machine) → Version control
2. **GitHub** (git repository) → Source of truth
3. **GitHub Actions** (automation) → Build + deploy robot
4. **Fly.io** (cloud hosting) → Production servers
5. **Users** (browsers) → Access the live site

### The Secret Sauce

- **GitHub Secrets** protect sensitive tokens
- **GitHub Actions** automate the boring stuff
- **Fly.io** handles infrastructure (VMs, networking, HTTPS)
- **Docker** makes deployments repeatable

### What Happens When You Push

```
Code change → Git push → GitHub receives → Actions trigger →
Build UI → Deploy to Fly.io → Health check → Live! 🎉
```

**Total time**: 2-5 minutes (fully automated)

---

## 🔗 Related Files

- **Workflow**: [`.github/workflows/deploy-flyio.yml`](../.github/workflows/deploy-flyio.yml)
- **Fly config**: [`server/fly.toml`](../server/fly.toml)
- **Dockerfile**: [`Dockerfile.unified`](../Dockerfile.unified)
- **Backend**: [`server/src/index.ts`](../server/src/index.ts)
- **Frontend**: [`packages/ui/`](../packages/ui/)

---

## 🎓 Learning Resources

**GitHub Actions**:
- https://docs.github.com/en/actions/quickstart
- https://docs.github.com/en/actions/security-guides/encrypted-secrets

**Fly.io**:
- https://fly.io/docs/getting-started/
- https://fly.io/docs/reference/configuration/

**Docker**:
- https://docs.docker.com/get-started/
- https://docs.docker.com/develop/develop-images/multistage-build/

---

**Last Updated**: November 14, 2025
**Maintainer**: EdgeChain Team
**Questions?**: Check GitHub Actions logs first, then Fly.io logs

---

*Made with ❤️ for developers confused by DevOps magic*
