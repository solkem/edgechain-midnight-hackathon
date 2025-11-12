# Arduino IoT Contract - Deployment Guide

## Quick Start - Deploy to Midnight Testnet

### Prerequisites

1. **Start Proof Server** (Required for deployment)
   ```bash
   # Terminal 1 - Keep this running
   npx --yes @midnight-ntwrk/proof-server@latest
   ```
   Wait for: `Proof server listening on http://127.0.0.1:6300`

2. **Verify Contract is Built**
   ```bash
   cd packages/contract
   ls dist/managed/arduino-iot/contract/index.cjs
   # Should show the file exists
   ```

### Deploy Contract

```bash
cd packages/contract
npm run deploy:arduino
```

### Deployment Flow

**Step 1: Wallet Creation/Loading**
```
🔐 Building deployment wallet...
   ✅ Wallet connected!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 DEPLOYMENT WALLET ADDRESS:
   mn_shield-addr_test1xxxxxxxxxxxxxxxxxxxxxxxxxx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 2: Get tDUST Tokens**
If balance is 0, you'll see:
```
💰 Current balance: 0 tDUST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚰 GET tDUST FROM FAUCET:

   1. Open: https://faucet.testnet.midnight.network
   2. Paste address: mn_shield-addr_test1xxxxx...
   3. Click 'Request tDUST'
   4. Wait 2-3 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Waiting for tDUST tokens...
   (Will auto-continue when received)
```

**Action Required:**
1. Copy the wallet address shown
2. Go to https://faucet.testnet.midnight.network
3. Paste the address
4. Click "Request tDUST"
5. Wait for transaction to confirm (~2-3 minutes)
6. Script will automatically continue

**Step 3: Contract Deployment**
```
⚙️  Setting up providers...
   ✅ Providers configured

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DEPLOYING ARDUINO IOT CONTRACT TO MIDNIGHT TESTNET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ⏳ Generating zero-knowledge proofs...
   This takes 30-60 seconds - please be patient!
```

**Step 4: Success!**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 ARDUINO IOT CONTRACT DEPLOYED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 CONTRACT DETAILS:

   Address: 0x1234567890abcdef...
   Admin Pubkey: a1b2c3d4...
   Deployed at: 2025-11-12T03:30:00.000Z
   Network: Midnight Testnet (testnet-02)
   Deployment wallet: mn_shield-addr_test1xxxxx...

✅ Deployment info saved to: deployment.json
```

### Verify Deployment

**Check deployment.json:**
```bash
cat packages/contract/deployment.json
```

Should contain:
```json
{
  "deploymentWalletSeed": "...",
  "deploymentWalletAddress": "mn_shield-addr_...",
  "arduinoIoT": {
    "contractAddress": "0x...",
    "adminPubkey": "...",
    "deployedAt": "2025-11-12T...",
    "network": "testnet-02",
    "deploymentWalletAddress": "mn_shield-addr_...",
    "features": {
      "dualMerkleRoots": true,
      "autoCollectionReward": "0.1 tDUST",
      "manualEntryReward": "0.02 tDUST",
      "nullifierTracking": true
    }
  }
}
```

**View on Midnight Explorer:**
```
https://explorer.testnet.midnight.network/contract/[CONTRACT_ADDRESS]
```

---

## Post-Deployment: Backend Integration

Once deployed, integrate the contract with the backend:

### 1. Wire Database to Device Registry

Update `server/src/services/deviceRegistry.ts`:

```typescript
import { deviceDB, merkleRootDB } from '../database';

export class DeviceRegistryService {
  // Current: Uses in-memory Map
  // TODO: Replace with database

  registerDevice(device_pubkey: string, collection_mode: 'auto' | 'manual', ...) {
    // Current implementation...

    // Add: Persist to database
    const current_epoch = this.getCurrentEpoch();
    const merkle_leaf_hash = this.hashLeaf(device_pubkey, collection_mode);

    deviceDB.insert({
      device_pubkey,
      collection_mode,
      registration_epoch: current_epoch,
      expiry_epoch: current_epoch + 365,
      device_id,
      metadata: JSON.stringify(metadata),
      merkle_leaf_hash
    });

    // Rebuild roots
    this.rebuildGlobalRoots();

    // Store roots in database
    merkleRootDB.insert({
      root_hash: this.globalAutoCollectionRoot,
      collection_mode: 'auto',
      device_count: auto_devices.length
    });

    merkleRootDB.insert({
      root_hash: this.globalManualEntryRoot,
      collection_mode: 'manual',
      device_count: manual_devices.length
    });

    // TODO: Call updateMerkleRoot on contract
  }
}
```

### 2. Create Contract Service

Create `server/src/services/contractService.ts`:

```typescript
import deployment from '../../../packages/contract/deployment.json';

export const CONTRACT_ADDRESS = deployment.arduinoIoT.contractAddress;
export const ADMIN_PUBKEY = deployment.arduinoIoT.adminPubkey;

// TODO: Initialize contract instance
// TODO: Add methods to call contract circuits
// TODO: Add methods to query contract state
```

### 3. Implement Real ZK Proofs

Update `server/src/routes/arduino.ts`:

```typescript
// Current: POST /api/arduino/prove returns mock proof
// TODO: Generate real ZK proof using Midnight SDK

router.post('/prove', async (req, res) => {
  // 1. Get device from registry
  // 2. Get Merkle proof for device
  // 3. Create witnesses
  // 4. Generate ZK proof
  // 5. Store in batch_proofs table
  // 6. Return proof to gateway
});
```

### 4. Enable Real Token Transfers

Update `server/src/routes/arduino.ts`:

```typescript
// Uncomment: import { deploymentWalletService } from '../services/deploymentWallet';

router.post('/claim-rewards', async (req, res) => {
  // Replace mock with real transfer
  const result = await deploymentWalletService.transferReward(
    farmerAddress,
    amount
  );

  // Store in rewards table
  rewardDB.insert({
    batch_id,
    farmer_address: farmerAddress,
    amount,
    tx_hash: result.txHash,
    status: 'completed'
  });
});
```

---

## Testing Plan

### 1. Test Device Registration
```bash
curl -X POST http://localhost:3001/api/arduino/registry/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_pubkey": "a1b2c3d4e5f6...",
    "collection_mode": "auto",
    "device_id": "ARDUINO_001"
  }'
```

Expected: Device stored in database + Merkle root updated

### 2. Test Arduino Data Flow
1. Connect Arduino Nano 33 BLE Sense Rev2
2. Upload sketch from `arduino/edgechain_iot/edgechain_iot.ino`
3. Open gateway: `gateway/ble_receiver.html`
4. Connect to Arduino via BLE
5. Collect 30 readings
6. Verify ZK proof generated
7. Check backend logs for proof verification
8. Confirm reward distribution

### 3. Verify On-Chain State
```bash
# Query contract stats
# TODO: Add contract query endpoints to backend
curl http://localhost:3001/api/arduino/contract/stats
```

---

## Troubleshooting

### Deployment Issues

**Error: "Proof server not running"**
```bash
# Make sure proof server is running on port 6300
npx --yes @midnight-ntwrk/proof-server@latest
```

**Error: "Contract not found"**
```bash
# Rebuild contract
cd packages/contract
npm run build
```

**Error: "No tDUST balance"**
- Visit faucet: https://faucet.testnet.midnight.network
- Request tDUST with deployment wallet address
- Wait 2-3 minutes for confirmation

### Backend Integration Issues

**Database connection errors:**
```bash
# Check database file exists
ls server/data/edgechain.db

# Verify server started
curl http://localhost:3001/api/db-stats
```

**Contract import errors:**
```bash
# Ensure deployment.json exists
cat packages/contract/deployment.json

# Rebuild if needed
cd packages/contract && npm run build
```

---

## Next Steps After Deployment

1. ✅ Deploy contract to Midnight Testnet
2. 🔄 Wire database to device registry
3. 🔄 Create contract service layer
4. 🔄 Implement real ZK proof generation
5. 🔄 Enable real token transfers
6. 🔄 Test end-to-end with Arduino hardware
7. 🔄 Add monitoring and analytics
8. 🔄 Prepare demo for judges

---

## Important Files

**Contract:**
- Circuit: `packages/contract/src/arduino-iot.compact`
- Deployment: `packages/contract/src/deploy-arduino.ts`
- Compiled: `packages/contract/dist/managed/arduino-iot/`

**Backend:**
- Database: `server/src/database/`
- Routes: `server/src/routes/arduino.ts`
- Device Registry: `server/src/services/deviceRegistry.ts`
- Deployment Wallet: `server/src/services/deploymentWallet.ts`

**Arduino:**
- Sketch: `arduino/edgechain_iot/edgechain_iot.ino`
- Gateway: `gateway/ble_receiver.html`

**Documentation:**
- Status: `MIDNIGHT_INTEGRATION_STATUS.md`
- This Guide: `DEPLOYMENT_GUIDE.md`
- Original Plan: `MIDNIGHT_TESTNET_INTEGRATION_PLAN.md`

---

## Support Resources

- Midnight Docs: https://docs.midnight.network
- Testnet Explorer: https://explorer.testnet.midnight.network
- Testnet Faucet: https://faucet.testnet.midnight.network
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Ready to Deploy!** 🚀

Run: `cd packages/contract && npm run deploy:arduino`
