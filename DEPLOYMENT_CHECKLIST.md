# EdgeChain Deployment Checklist

Use this checklist before demo/presentation to ensure everything is working.

## ☐ Pre-Deployment Checks

### Environment Setup
- [ ] Docker is running (`docker ps`)
- [ ] Node.js installed (`node --version`)
- [ ] Yarn installed (`yarn --version`)
- [ ] Compact compiler available (`compact --version`)
- [ ] Fly.io CLI installed (`flyctl version`)
- [ ] Fly.io authenticated (`flyctl auth whoami`)

### Dependencies
- [ ] All packages installed (`yarn install`)
- [ ] Contract dependencies present (`cd packages/contract && ls node_modules`)
- [ ] UI dependencies present (`cd packages/ui && ls node_modules`)

## ☐ Build Verification

### Contract Build
```bash
cd packages/contract

# Compile Compact contract
npm run compact
# ✅ Check: src/managed/edgechain/contract/index.cjs exists

# Build TypeScript
npm run build
# ✅ Check: dist/deploy-simple.js exists
# ✅ Check: dist/view-contract.js exists
# ✅ Check: dist/managed/edgechain/contract/index.cjs exists
```

- [ ] Compact compilation successful
- [ ] TypeScript build successful
- [ ] Contract module in dist/ folder

### UI Build
```bash
cd packages/ui
npm run build
# ✅ Check: dist/index.html exists
# ✅ Check: dist/assets/ folder populated
```

- [ ] UI build successful
- [ ] Assets generated

## ☐ Proof Server

```bash
./start-proof-server.sh
# ✅ Expected: Container starts successfully

curl http://127.0.0.1:6300/health
# ✅ Expected: "We're alive 🎉!"
```

- [ ] Proof server running
- [ ] Health check passing

## ☐ Contract Deployment

### Get tDUST for Deployment Wallet
```bash
cd packages/contract
npm run deploy
# Wait for wallet address to be shown
# Copy the address
```

- [ ] Deployment script starts
- [ ] Wallet address generated
- [ ] Visit https://faucet.testnet.midnight.network
- [ ] Request tDUST for deployment wallet address
- [ ] Wait for tokens to arrive (~2-3 minutes)

### Complete Deployment
```bash
# Deployment should auto-continue when tDUST arrives
# ✅ Expected: "Contract deployed successfully"
# ✅ Expected: deployment.json created
# ✅ Expected: DEPLOYMENT_WALLET_SEED.txt exists
```

- [ ] Contract deployment successful
- [ ] `deployment.json` created
- [ ] Contract address saved
- [ ] Deployment wallet seed saved

### Verify Contract
```bash
npm run view-contract
# ✅ Expected: Shows contract state
# ✅ Expected: Current round: 0
# ✅ Expected: Submission count: 0
```

- [ ] Contract is queryable
- [ ] Contract state shows initial values

## ☐ UI Deployment to Fly.io

### Build and Deploy
```bash
cd ../..
./deploy-to-flyio.sh
# ✅ Expected: Build completes
# ✅ Expected: Deployment to Fly.io succeeds
# ✅ Expected: URL shown: https://edgechain-midnight-ui.fly.dev
```

- [ ] Contract rebuilt
- [ ] UI built successfully
- [ ] Deployed to Fly.io
- [ ] URL accessible

### Verify Deployment
```bash
export PATH="/home/codespace/.fly/bin:$PATH"
flyctl status
# ✅ Expected: Status shows running or stopped (auto-scales)

curl https://edgechain-midnight-ui.fly.dev
# ✅ Expected: Returns HTML
```

- [ ] Fly.io app status is healthy
- [ ] URL is accessible
- [ ] App serves correctly

## ☐ End-to-End Testing

### Test UI Locally (Optional)
```bash
cd packages/ui
npm run dev
# Visit http://localhost:5173
```

- [ ] Local dev server starts
- [ ] UI loads in browser
- [ ] No console errors

### Test Wallet Connection
**Requirements**: Lace Midnight Preview wallet with tDUST

Visit deployed URL or localhost:
- [ ] Click "Connect Wallet"
- [ ] Lace extension prompts
- [ ] Wallet connects successfully
- [ ] Wallet address shown in UI

### Test Contract Interaction
- [ ] Can see contract state
- [ ] Can submit model update (if implemented)
- [ ] No errors in console
- [ ] Transactions process correctly

## ☐ Demo Preparation

### Have Ready
- [ ] Deployed contract address
- [ ] Deployed UI URL: `https://edgechain-midnight-ui.fly.dev`
- [ ] Lace wallet with tDUST (~100+ tDUST recommended)
- [ ] Deployment wallet seed backed up
- [ ] CHECKPOINT_STABLE_v1.md reviewed

### Terminal Setup
Have 3 terminals ready:

**Terminal 1**: Proof server
```bash
./start-proof-server.sh
```

**Terminal 2**: Contract operations
```bash
cd packages/contract
# Ready to run: npm run view-contract
```

**Terminal 3**: Fly.io operations
```bash
export PATH="/home/codespace/.fly/bin:$PATH"
# Ready to run: flyctl logs, flyctl status
```

### Browser Setup
- [ ] Lace Midnight Preview wallet installed
- [ ] Wallet unlocked and funded
- [ ] Tab open to deployed UI
- [ ] Developer console open (for debugging if needed)

## ☐ Backup & Recovery

### Files to Backup
- [ ] `DEPLOYMENT_WALLET_SEED.txt`
- [ ] `DEPLOYMENT_WALLET_ADDRESS.txt`
- [ ] `packages/contract/deployment.json`

### Recovery Plan
If something breaks during demo:
```bash
# 1. Return to stable checkpoint
git stash
git checkout stable-v1.0

# 2. Quick rebuild
yarn install
cd packages/contract && npm run build
cd ../ui && npm run build

# 3. Restart proof server
./start-proof-server.sh
```

## ☐ Final Pre-Demo Check (5 minutes before)

```bash
# 1. Proof server
curl http://127.0.0.1:6300/health

# 2. Contract deployed
cd packages/contract && npm run view-contract

# 3. UI deployed
curl -I https://edgechain-midnight-ui.fly.dev

# 4. Wallet ready
# Check Lace wallet has tDUST
```

**All green?** → ✅ READY TO DEMO!

---

## Emergency Contacts & Resources

**Midnight Network**:
- Testnet Faucet: https://faucet.testnet.midnight.network
- Indexer: https://indexer.testnet-02.midnight.network
- Docs: https://docs.midnight.network

**Fly.io**:
- Dashboard: https://fly.io/dashboard
- Status: https://status.fly.io
- Docs: https://fly.io/docs

**Quick Commands**:
```bash
# Restart proof server
docker restart $(docker ps -q --filter ancestor=midnightnetwork/proof-server)

# Restart Fly.io app
flyctl apps restart edgechain-midnight-ui

# View logs
flyctl logs

# SSH into Fly.io machine
flyctl ssh console
```

---

**Last Updated**: November 8, 2025
**Checkpoint**: stable-v1.0
**Status**: Ready for Demo ✅
