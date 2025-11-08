# EdgeChain Midnight Hackathon - Stable Checkpoint v1.0

**Date**: November 8, 2025
**Status**: ✅ STABLE - Ready for Demo
**Git Tag**: `stable-v1.0`

---

## 🎯 What's Working

This checkpoint represents a **fully working** EdgeChain system with:

### ✅ Smart Contract
- **Contract compiled**: Compact 0.2.0 EdgeChain federated learning contract
- **Deployment ready**: `deploy-simple.ts` script with witness functions
- **Contract viewer**: Tool to query deployed contract state
- **Clean build**: All artifacts rebuilt from scratch

### ✅ Frontend UI
- **Vite build**: Fixed WASM bundling issues
- **React UI**: Working federated learning interface
- **Wallet integration**: Ready for Lace Midnight Preview wallet
- **Fly.io deployment**: Configured and ready to deploy

### ✅ Infrastructure
- **Proof server**: Docker setup with health checks
- **Deployment scripts**: Automated deployment to both Midnight Network and Fly.io
- **Clean repository**: All trial-and-error files removed

---

## 📁 Project Structure

```
edgechain-midnight-hackathon/
├── packages/
│   ├── contract/                      # Smart contract package
│   │   ├── src/
│   │   │   ├── edgechain.compact     # Contract source ✅
│   │   │   ├── deploy-simple.ts      # Deployment script ✅
│   │   │   └── view-contract.ts      # Contract state viewer ✅
│   │   ├── dist/                      # Built contract ✅
│   │   └── package.json              # Clean scripts ✅
│   │
│   └── ui/                            # Frontend package
│       ├── src/                       # React app
│       ├── dist/                      # Built UI (after npm run build)
│       ├── fly.toml                   # Fly.io config ✅
│       ├── Dockerfile                 # Production build ✅
│       └── package.json
│
├── start-proof-server.sh              # Proof server startup ✅
├── deploy-to-flyio.sh                 # Fly.io deployment ✅
└── README.md
```

---

## 🚀 How to Deploy (From This Checkpoint)

### Prerequisites
1. Docker installed and running
2. Midnight Compact compiler installed
3. Lace Midnight Preview wallet (optional for UI testing)

### Step 1: Start Proof Server
```bash
./start-proof-server.sh
```
**Expected output**: `We're alive 🎉!`

### Step 2: Deploy Smart Contract
```bash
cd packages/contract
npm run deploy
```

**What happens**:
1. Generates new deployment wallet seed → saved to `DEPLOYMENT_WALLET_SEED.txt`
2. Shows wallet address → save to get tDUST from faucet
3. Waits for funding from https://faucet.testnet.midnight.network
4. Auto-deploys contract when funded (~50 tDUST)
5. Saves contract address to `deployment.json`

**Time**: ~3-5 minutes (including faucet wait)

### Step 3: View Contract State (Optional)
```bash
npm run view-contract
```

### Step 4: Deploy UI to Fly.io
```bash
cd ../..
./deploy-to-flyio.sh
```

**What happens**:
1. Builds contract
2. Builds UI
3. Deploys to Fly.io
4. Returns live URL: `https://edgechain-midnight-ui.fly.dev`

**Time**: ~2-3 minutes

---

## 🧪 Testing the Demo

### Test Contract Deployment
```bash
cd packages/contract

# Check if contract compiled
ls -la dist/managed/edgechain/contract/index.cjs

# Test deployment script (dry run - exit before funding)
npm run deploy
# Ctrl+C when it asks for funding
```

### Test UI Locally
```bash
cd packages/ui

# Build UI
npm run build

# Check dist folder
ls -la dist/

# Run locally
npm run dev
# Visit http://localhost:5173
```

### Test Proof Server
```bash
curl http://127.0.0.1:6300/health
# Expected: "We're alive 🎉!"
```

---

## 📊 Key Files

### Contract Deployment
- **Source**: `packages/contract/src/deploy-simple.ts`
- **Script**: `npm run deploy`
- **Output**: `DEPLOYMENT_WALLET_SEED.txt`, `deployment.json`

### Contract Viewer
- **Source**: `packages/contract/src/view-contract.ts`
- **Script**: `npm run view-contract`
- **Shows**: Current round, model version, submission count, aggregation status

### UI Deployment
- **Config**: `packages/ui/fly.toml`
- **Docker**: `packages/ui/Dockerfile`
- **Script**: `./deploy-to-flyio.sh`
- **URL**: `https://edgechain-midnight-ui.fly.dev`

---

## 🔧 Package.json Scripts

### Contract Package
```json
{
  "compact": "compile edgechain.compact",
  "build": "compile + copy artifacts",
  "deploy": "build TypeScript + deploy contract",
  "view-contract": "query deployed contract state"
}
```

### UI Package
```json
{
  "dev": "run Vite dev server",
  "build": "build production bundle",
  "preview": "preview production build"
}
```

---

## 🔑 Important Files to Keep Safe

**DO NOT DELETE**:
- `DEPLOYMENT_WALLET_SEED.txt` - Your deployment wallet (needed for contract management)
- `DEPLOYMENT_WALLET_ADDRESS.txt` - Deployment wallet address
- `packages/contract/deployment.json` - Deployed contract info

**CAN DELETE** (regenerated on build):
- `packages/contract/dist/` - Compiled contract
- `packages/contract/src/managed/` - Generated contract API
- `packages/ui/dist/` - Built UI
- `packages/ui/.vite/` - Vite cache

---

## 🌐 Network Configuration

**Midnight Testnet**:
- Network ID: `TestNet`
- Indexer: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- RPC: `https://rpc.testnet-02.midnight.network`
- Proof Server: `http://localhost:6300` (local Docker)

**Fly.io**:
- App: `edgechain-midnight-ui`
- Region: `iad` (US East)
- Memory: 512MB
- Auto-scaling: Enabled

---

## 🐛 Known Issues & Solutions

### Issue: "Contract constructor does not contain farmerSecretKey"
**Status**: ✅ FIXED
**Solution**: Added witness functions in `deploy-simple.ts:161-168`

### Issue: Lace wallet shows 0 tDUST in SDK
**Status**: ✅ RESOLVED
**Solution**: Use separate deployment wallet (SDK-generated) for deployment, Lace wallet for UI

### Issue: Vite WASM bundling errors
**Status**: ✅ FIXED
**Solution**: Updated `vite.config.ts` with proper polyfills and WASM plugins

---

## 📈 Metrics

**Build Times**:
- Compact compilation: ~30 seconds
- TypeScript build: ~5 seconds
- UI build: ~15 seconds

**Deployment Times**:
- Contract deployment: ~60 seconds (after funding)
- UI deployment: ~2 minutes
- Proof generation: ~30-60 seconds per proof

**Resource Usage**:
- Contract deployment: ~50 tDUST
- UI hosting: Fly.io free tier
- Proof server: ~500MB Docker container

---

## 🎬 Demo Script

### 5-Minute Demo Flow

1. **Show Proof Server** (30 sec)
   ```bash
   docker ps | grep proof-server
   curl http://127.0.0.1:6300/health
   ```

2. **Show Built Contract** (1 min)
   ```bash
   cd packages/contract
   ls -la dist/managed/edgechain/
   cat deployment.json
   ```

3. **Show Contract State** (1 min)
   ```bash
   npm run view-contract
   # Shows: current round, submissions, aggregation status
   ```

4. **Show UI** (2.5 min)
   - Open `https://edgechain-midnight-ui.fly.dev`
   - Connect Lace wallet
   - Show federated learning interface
   - Explain privacy-preserving model aggregation

### 10-Minute Deep Dive

Add to above:
- Explain Compact smart contract code
- Show zero-knowledge proof generation
- Demonstrate model submission flow
- Explain privacy guarantees

---

## 🔄 Rebuilding from Scratch

If you need to start fresh from this checkpoint:

```bash
# Clean everything
cd packages/contract
rm -rf dist src/managed node_modules

cd ../ui
rm -rf dist .vite node_modules

# Rebuild
cd ../..
yarn install

cd packages/contract
npm run compact
npm run build

cd ../ui
npm run build
```

**Time**: ~5 minutes

---

## 📝 Version History

**v1.0** (November 8, 2025)
- ✅ Contract compilation working
- ✅ Deployment scripts cleaned up
- ✅ UI build fixed
- ✅ Fly.io deployment configured
- ✅ Repository cleaned of experimental files
- ✅ Fresh build verification passed

---

## 🎯 Next Steps (Post-Checkpoint)

**Optional Enhancements**:
- Add contract deployment to Fly.io for automated re-deployment
- Implement wallet balance checking in UI
- Add model training visualization
- Set up CI/CD pipeline
- Add more comprehensive error handling

**For Hackathon Presentation**:
- Deploy contract to Midnight Testnet
- Deploy UI to Fly.io
- Prepare demo wallet with tDUST
- Practice demo flow
- Prepare slides explaining privacy-preserving FL

---

## ⚠️ Critical Notes

1. **Wallet Strategy**: Use deployment wallet for contract deployment, Lace wallet for UI interaction
2. **tDUST Faucet**: Get tokens from https://faucet.testnet.midnight.network
3. **Proof Server**: Must be running before deployment
4. **Network**: All deployments use Midnight Testnet (not mainnet)
5. **WASM Headers**: Fly.io config includes required CORS headers for SharedArrayBuffer

---

## 📞 Quick Reference

**Start Everything**:
```bash
./start-proof-server.sh                  # Terminal 1
cd packages/contract && npm run deploy   # Terminal 2
./deploy-to-flyio.sh                     # Terminal 3
```

**Check Status**:
```bash
docker ps                                # Proof server
cd packages/contract && npm run view-contract  # Contract
flyctl status                            # UI deployment
```

**Clean Restart**:
```bash
git checkout stable-v1.0                 # Restore checkpoint
yarn install                             # Reinstall deps
cd packages/contract && npm run build    # Rebuild
```

---

**Checkpoint Created**: November 8, 2025
**System Status**: ✅ FULLY OPERATIONAL
**Ready for**: Demo, Testing, Deployment

---

*This checkpoint represents a known-good state. You can always return here!*
