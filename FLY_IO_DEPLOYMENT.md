# Fly.io Deployment Guide - EdgeChain Backend

Deploy the EdgeChain backend server to Fly.io for public testing and Arduino hardware integration.

---

## Prerequisites

1. **Fly.io Account**
   - Sign up at https://fly.io/app/sign-up
   - Free tier includes 3 VMs with 256MB RAM (we'll use 1 VM with 512MB)

2. **flyctl CLI** ✅
   - Already installed at `/home/codespace/.fly/bin/flyctl`
   - Version: v0.3.211

---

## Quick Deployment

### Step 1: Authenticate with Fly.io

```bash
export FLYCTL_INSTALL="/home/codespace/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Login to Fly.io (opens browser for authentication)
flyctl auth login
```

**Note:** In Codespaces, you may need to use token authentication:
```bash
# Get your token from: https://fly.io/user/personal_access_tokens
flyctl auth token
# Paste your token when prompted
```

### Step 2: Launch the Application

```bash
cd /workspaces/edgechain-midnight-hackathon/server

# Launch app (creates app + volume in one go)
flyctl launch --no-deploy

# Create persistent volume for SQLite database
flyctl volumes create edgechain_data --region iad --size 1

# Deploy the application
flyctl deploy
```

### Step 3: Verify Deployment

```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Open in browser
flyctl open

# Test API endpoint
curl https://edgechain-midnight.fly.dev/api/db-stats
```

---

## Configuration Details

### fly.toml Configuration

The app is configured with:

- **App Name:** `edgechain-midnight`
- **Region:** `iad` (Ashburn, Virginia - close to US East Coast)
- **Port:** 3001 (internal) → 80/443 (external)
- **Memory:** 512MB
- **CPU:** 1 shared vCPU
- **Storage:** 1GB persistent volume at `/app/data`
- **Health Check:** `GET /api/db-stats` every 10s

### Dockerfile

Multi-stage build:
1. **Builder stage:** Installs dependencies, builds TypeScript
2. **Production stage:** Runs optimized Node.js with SQLite support

Key features:
- Alpine Linux (minimal size)
- SQLite3 included
- Database schema copied
- Persistent volume for database
- Health checks enabled

---

## Database Persistence

The SQLite database is stored on a **persistent Fly.io volume**:

- **Mount point:** `/app/data`
- **Volume name:** `edgechain_data`
- **Size:** 1GB
- **Backup:** Automatically backed up by Fly.io

**Important:** Volumes are region-specific. If you scale to multiple regions, each region needs its own volume.

---

## Environment Variables

Currently configured in `fly.toml`:
- `PORT=3001`
- `NODE_ENV=production`

To add secrets (for future Midnight SDK integration):
```bash
flyctl secrets set MIDNIGHT_WALLET_SEED=your_seed_here
flyctl secrets set MIDNIGHT_CONTRACT_ADDRESS=0x...
```

---

## Scaling

### Vertical Scaling (More Resources)
```bash
# Increase memory
flyctl scale memory 1024

# Increase CPU
flyctl scale vm shared-cpu-2x
```

### Horizontal Scaling (More Machines)
```bash
# Add another machine in the same region
flyctl scale count 2

# Add machine in different region (requires new volume)
flyctl regions add ord  # Chicago
flyctl volumes create edgechain_data --region ord --size 1
flyctl scale count 3
```

---

## Monitoring

### Real-time Logs
```bash
# Stream logs
flyctl logs

# Filter by level
flyctl logs --level error

# Show last 100 lines
flyctl logs --lines 100
```

### Metrics Dashboard
```bash
# Open Fly.io dashboard
flyctl dashboard
```

### Health Checks
```bash
# Check health status
flyctl checks list

# View specific check
flyctl checks show http
```

---

## Deployment Workflow

### Manual Deployment
```bash
cd server
flyctl deploy
```

### GitHub Actions (Future)

Add `.github/workflows/fly-deploy.yml`:
```yaml
name: Deploy to Fly.io
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## Testing with Arduino Hardware

Once deployed, update your Arduino gateway to use the Fly.io URL:

**Gateway:** `gateway/ble_receiver.html`

Change:
```javascript
// Before (local)
const API_BASE = 'http://localhost:3001/api/arduino';

// After (Fly.io)
const API_BASE = 'https://edgechain-midnight.fly.dev/api/arduino';
```

**Test endpoints:**
```bash
BASE_URL="https://edgechain-midnight.fly.dev"

# Check database stats
curl $BASE_URL/api/db-stats

# Register device
curl -X POST $BASE_URL/api/arduino/registry/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_pubkey": "arduino_device_001",
    "collection_mode": "auto",
    "device_id": "ARDUINO_001"
  }'

# Get Merkle proof
curl -X POST $BASE_URL/api/arduino/registry/proof \
  -H "Content-Type: application/json" \
  -d '{"device_pubkey": "arduino_device_001"}'
```

---

## Troubleshooting

### Build Failures

**Issue:** Docker build fails
```bash
# Check build logs
flyctl logs --build

# Force rebuild
flyctl deploy --no-cache
```

**Issue:** SQLite dependency error
```bash
# Verify Dockerfile has: RUN apk add --no-cache sqlite
# Rebuild with: flyctl deploy --no-cache
```

### Runtime Errors

**Issue:** Database not initializing
```bash
# SSH into machine
flyctl ssh console

# Check if database exists
ls -la /app/data/

# Check if schema is copied
ls -la /app/src/database/

# View server logs
cat /app/logs/* || echo "No log files"
```

**Issue:** Health check failing
```bash
# Test health endpoint manually
flyctl ssh console
wget -O- http://localhost:3001/api/db-stats
```

### Volume Issues

**Issue:** Volume not mounted
```bash
# List volumes
flyctl volumes list

# Check volume status
flyctl volumes show edgechain_data

# Recreate volume (WARNING: deletes data)
flyctl volumes delete edgechain_data
flyctl volumes create edgechain_data --region iad --size 1
```

---

## Cost Estimation

**Free Tier:**
- 3 shared-cpu-1x VMs (up to 256MB RAM)
- 3GB persistent storage
- 160GB outbound data transfer

**Our Configuration:**
- 1 VM with 512MB RAM: **~$1.94/month**
- 1GB persistent volume: **~$0.15/month**
- **Total: ~$2.09/month**

**Note:** Staying within free tier:
- Use 256MB RAM instead of 512MB: **FREE**
- Keep under 3GB storage: **FREE**
- Keep under 160GB transfer: **FREE**

---

## Database Backup

### Manual Backup
```bash
# SSH into machine
flyctl ssh console

# Create backup
sqlite3 /app/data/edgechain.db ".backup /app/data/backup-$(date +%Y%m%d).db"

# Download backup
exit
flyctl ssh sftp get /app/data/backup-*.db
```

### Automated Backups (Future)

Add to `fly.toml`:
```toml
[mounts]
  source = "edgechain_data"
  destination = "/app/data"
  initial_size = "1gb"
  snapshot = true
  snapshot_retention = 7
```

---

## Next Steps After Deployment

1. ✅ Deploy backend to Fly.io
2. 🔄 Update gateway HTML to use Fly.io URL
3. 🔄 Test device registration from browser
4. 🔄 Test Arduino BLE connection with deployed backend
5. 🔄 Deploy Midnight contract to testnet
6. 🔄 Integrate real ZK proof generation
7. 🔄 Enable real tDUST token transfers

---

## Useful Commands

```bash
# App management
flyctl apps list
flyctl apps restart edgechain-midnight
flyctl apps destroy edgechain-midnight  # DANGER: Deletes everything

# Volume management
flyctl volumes list
flyctl volumes snapshots list edgechain_data
flyctl volumes snapshots create edgechain_data

# Secrets management
flyctl secrets list
flyctl secrets set KEY=value
flyctl secrets unset KEY

# SSH access
flyctl ssh console
flyctl ssh sftp shell

# Resource monitoring
flyctl status
flyctl checks list
flyctl metrics
```

---

## Support Resources

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Status Page: https://status.flyio.net
- EdgeChain Docs: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Ready to Deploy!** 🚀

Run:
```bash
cd /workspaces/edgechain-midnight-hackathon/server
export FLYCTL_INSTALL="/home/codespace/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
flyctl auth login
flyctl launch --no-deploy
flyctl volumes create edgechain_data --region iad --size 1
flyctl deploy
```
