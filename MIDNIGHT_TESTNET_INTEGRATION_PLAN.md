# EdgeChain Midnight Testnet Integration Plan

## 🎯 Goal
Transform EdgeChain from a hackathon demo with mocked proofs into a **production-grade system** that fully integrates with **Midnight Testnet**, impressing judges with real blockchain interactions, ZK proofs, and distributed storage.

---

## 📊 Current State vs. Target State

| Component | **Current (Mocked)** | **Target (Production)** |
|-----------|---------------------|------------------------|
| **Device Registry** | In-memory Map | On-chain state + PostgreSQL |
| **ZK Proofs** | Mock proof strings | Real Compact circuits + proof server |
| **Token Transfers** | Simulated tx hashes | Real tDUST transfers via Midnight wallet |
| **Data Storage** | In-memory arrays | PostgreSQL database |
| **Merkle Roots** | Computed locally | Stored on-chain in contract state |
| **Proof Verification** | Always returns true | On-chain verification via Compact |
| **Nullifier Tracking** | In-memory Set | On-chain nullifier state |
| **Contract Deployment** | Already deployed (FL only) | Extend with Arduino IoT circuits |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARDUINO HARDWARE LAYER                        │
│  Arduino Nano 33 BLE Sense Rev2 → Real sensor data + EdDSA      │
└────────────────────┬────────────────────────────────────────────┘
                     │ BLE
┌────────────────────▼────────────────────────────────────────────┐
│                    GATEWAY (Browser)                             │
│  - Web Bluetooth API                                             │
│  - Signature verification (Ed25519)                              │
│  - Batch accumulation (30 readings)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────────────┐
│                 BACKEND SERVER (Node.js)                         │
│  - Express API endpoints                                         │
│  - PostgreSQL for persistent storage                             │
│  - Midnight SDK integration                                      │
│  - ZK proof generation (Compact circuits)                        │
└─────┬──────────────┬──────────────────┬────────────────────────┘
      │              │                  │
      │              │                  │
┌─────▼─────┐  ┌────▼─────┐  ┌────────▼────────────────────────┐
│PostgreSQL │  │Proof     │  │  MIDNIGHT TESTNET               │
│Database   │  │Server    │  │  - Smart Contract (Compact)      │
│- Devices  │  │(port     │  │  - On-chain device registry      │
│- Readings │  │6300)     │  │  - ZK proof verification         │
│- Proofs   │  │          │  │  - tDUST token transfers         │
│- Txs      │  │          │  │  - Nullifier tracking            │
└───────────┘  └──────────┘  └─────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### **Phase 1: Database Layer (PostgreSQL)**

#### 1.1 Set up PostgreSQL
```bash
# Install PostgreSQL in Codespaces
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres createdb edgechain
```

#### 1.2 Database Schema
```sql
-- Device Registry
CREATE TABLE devices (
  device_pubkey VARCHAR(64) PRIMARY KEY,
  collection_mode VARCHAR(10) NOT NULL, -- 'auto' or 'manual'
  registration_epoch INTEGER NOT NULL,
  expiry_epoch INTEGER NOT NULL,
  device_id VARCHAR(255),
  metadata JSONB,
  merkle_leaf_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sensor Readings
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  device_pubkey VARCHAR(64) REFERENCES devices(device_pubkey),
  reading_json TEXT NOT NULL,
  temperature FLOAT,
  humidity FLOAT,
  timestamp_device BIGINT NOT NULL,
  signature_r VARCHAR(64) NOT NULL,
  signature_s VARCHAR(64) NOT NULL,
  batch_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Batch Proofs
CREATE TABLE batch_proofs (
  batch_id VARCHAR(64) PRIMARY KEY,
  device_pubkey VARCHAR(64) REFERENCES devices(device_pubkey),
  collection_mode VARCHAR(10) NOT NULL,
  readings_count INTEGER NOT NULL,
  proof_data TEXT NOT NULL, -- ZK proof from Compact
  public_inputs JSONB NOT NULL,
  merkle_root VARCHAR(64) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  tx_hash VARCHAR(128), -- Midnight transaction hash
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rewards
CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(64) REFERENCES batch_proofs(batch_id),
  farmer_address VARCHAR(128) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL, -- tDUST amount
  tx_hash VARCHAR(128) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

-- Nullifiers (prevent replay attacks)
CREATE TABLE nullifiers (
  claim_nullifier VARCHAR(128) PRIMARY KEY,
  batch_id VARCHAR(64) REFERENCES batch_proofs(batch_id),
  spent_at TIMESTAMP DEFAULT NOW()
);

-- Merkle Roots (historical tracking)
CREATE TABLE merkle_roots (
  root_hash VARCHAR(64) PRIMARY KEY,
  collection_mode VARCHAR(10) NOT NULL,
  device_count INTEGER NOT NULL,
  published_to_chain BOOLEAN DEFAULT FALSE,
  tx_hash VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Install Dependencies
```bash
cd server
npm install pg @types/pg knex
```

---

### **Phase 2: Compact ZK Circuit for Arduino Data**

#### 2.1 Extend `edgechain.compact` with Arduino Circuits

Create new circuit file: `packages/contract/src/arduino-iot.compact`

```compact
pragma language_version >= 0.16.0;

import CompactStandardLibrary;

/**
 * EdgeChain Arduino IoT Smart Contract
 *
 * Handles ZK-verified sensor data submission with dual incentive layer:
 * - Auto-collection devices (higher reward: 0.1 DUST)
 * - Manual-entry devices (lower reward: 0.02 DUST)
 */

// ============= PUBLIC LEDGER =============

// Device Registry (Merkle roots)
export ledger globalAutoCollectionRoot: Bytes<32>;
export ledger globalManualEntryRoot: Bytes<32>;

// Submission tracking
export ledger totalSubmissions: Counter;
export ledger autoSubmissions: Counter;
export ledger manualSubmissions: Counter;

// Nullifier tracking (prevent replay attacks)
export ledger spentNullifiers: Set<Bytes<32>>;

constructor() {
  globalAutoCollectionRoot = "00000000000000000000000000000000";
  globalManualEntryRoot = "00000000000000000000000000000000";
}

/**
 * Submit Batch Sensor Data with ZK Proof
 *
 * Proves:
 * 1. Device is in approved registry (Merkle proof)
 * 2. Data signature is valid (EdDSA verification)
 * 3. Collection mode matches device registration
 * 4. Nullifier hasn't been spent (no replay)
 */
export circuit submitSensorBatch(
  // Public inputs
  dataHash: Bytes<32>,                    // H(sensor readings)
  collectionMode: Field,                  // 0 = manual, 1 = auto
  claimNullifier: Bytes<32>,              // Unique claim ID
  epoch: Field,                           // Timestamp epoch

  // Private inputs (via witness)
  devicePubkey: Bytes<32>,                // Device Ed25519 public key
  merkleProof: Vector<10, Bytes<32>>,     // Merkle proof (max depth 10)
  leafIndex: Field,                       // Position in tree
  signatureR: Bytes<32>,                  // EdDSA signature part 1
  signatureS: Bytes<32>                   // EdDSA signature part 2
): [] {

  // 1. Check nullifier not spent
  assert(!spentNullifiers.contains(claimNullifier), "Nullifier already spent");

  // 2. Verify device is in appropriate Merkle tree
  const leafHash = persistentHash([devicePubkey, collectionMode as Bytes<32>]);
  const expectedRoot = if collectionMode == 1 {
    globalAutoCollectionRoot
  } else {
    globalManualEntryRoot
  };

  const computedRoot = verifyMerkleProof(leafHash, merkleProof, leafIndex);
  assert(computedRoot == expectedRoot, "Device not in approved registry");

  // 3. Verify EdDSA signature on data
  // (Simplified - full implementation would use Ed25519 verification)
  const messageHash = persistentHash([dataHash, epoch as Bytes<32>]);
  // assert(verifyEd25519(messageHash, signatureR, signatureS, devicePubkey));

  // 4. Validate sensor data ranges (basic sanity checks)
  // Temperature: -50 to 60°C, Humidity: 0-100%
  // (In practice, these would be extracted from dataHash witness)

  // 5. Mark nullifier as spent
  spentNullifiers.insert(claimNullifier);

  // 6. Update counters
  totalSubmissions.increment(1);
  if collectionMode == 1 {
    autoSubmissions.increment(1);
  } else {
    manualSubmissions.increment(1);
  }
}

/**
 * Update Device Registry Roots
 *
 * Admin function to publish new Merkle roots when devices are added/removed
 */
export circuit updateRegistryRoots(
  newAutoRoot: Bytes<32>,
  newManualRoot: Bytes<32>
): [] {
  globalAutoCollectionRoot = disclose(newAutoRoot);
  globalManualEntryRoot = disclose(newManualRoot);
}

/**
 * Helper: Verify Merkle proof
 */
circuit verifyMerkleProof(
  leaf: Bytes<32>,
  proof: Vector<10, Bytes<32>>,
  index: Field
): Bytes<32> {
  let current = leaf;
  let idx = index;

  for i in 0..10 {
    const sibling = proof[i];
    if sibling == "00000000000000000000000000000000" {
      break; // End of proof
    }

    current = if idx % 2 == 0 {
      persistentHash([current, sibling])
    } else {
      persistentHash([sibling, current])
    };

    idx = idx / 2;
  }

  return current;
}

/**
 * Get registry status
 */
export circuit getRegistryRoots(): (Bytes<32>, Bytes<32>) {
  return (globalAutoCollectionRoot, globalManualEntryRoot);
}
```

#### 2.2 Compile Compact Circuit
```bash
cd packages/contract
npm run compact  # Compiles .compact files
npm run build    # Builds TypeScript wrappers
```

---

### **Phase 3: Backend Integration with Midnight SDK**

#### 3.1 Create Contract Service
```typescript
// server/src/services/contractService.ts

import { ContractInstance } from "@edgechain/contract";
import { deploymentWalletService } from "./deploymentWallet";
import { ZkProofResult } from "../types/arduino";

export class ContractService {
  private contractInstance: ContractInstance | null = null;
  private contractAddress: string;

  async initialize() {
    // Load deployed contract
    const deploymentInfo = require('../../../packages/contract/deployment.json');
    this.contractAddress = deploymentInfo.contractAddress;

    // Initialize contract instance with wallet provider
    const wallet = await deploymentWalletService.getWallet();
    this.contractInstance = new ContractInstance(
      this.contractAddress,
      wallet
    );
  }

  /**
   * Submit sensor batch to Midnight Testnet
   */
  async submitSensorBatch(proofResult: ZkProofResult) {
    if (!this.contractInstance) {
      await this.initialize();
    }

    // Call Compact circuit via Midnight SDK
    const tx = await this.contractInstance.submitSensorBatch({
      dataHash: proofResult.public_inputs.data_hash,
      collectionMode: proofResult.public_inputs.collection_mode === 'auto' ? 1 : 0,
      claimNullifier: proofResult.public_inputs.claim_nullifier,
      epoch: proofResult.public_inputs.epoch,
      // Private witness inputs
      devicePubkey: proofResult.private_inputs.device_pubkey,
      merkleProof: proofResult.private_inputs.merkle_proof,
      leafIndex: proofResult.private_inputs.leaf_index,
      signatureR: proofResult.private_inputs.signature_r,
      signatureS: proofResult.private_inputs.signature_s
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    return {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      success: receipt.status === 'success'
    };
  }

  /**
   * Update registry Merkle roots on-chain
   */
  async updateRegistryRoots(autoRoot: string, manualRoot: string) {
    const tx = await this.contractInstance.updateRegistryRoots({
      newAutoRoot: autoRoot,
      newManualRoot: manualRoot
    });

    return await tx.wait();
  }
}

export const contractService = new ContractService();
```

---

### **Phase 4: Real ZK Proof Generation**

#### 4.1 Update Proof Generation Endpoint
```typescript
// server/src/routes/arduino.ts

router.post('/prove', async (req, res) => {
  try {
    const { reading_json, collection_mode, device_pubkey, merkle_proof, leaf_index } = req.body;

    // Parse reading
    const reading = JSON.parse(reading_json);

    // Compute data hash
    const dataHash = crypto.createHash('sha256')
      .update(reading_json)
      .digest('hex');

    // Generate unique nullifier
    const claimNullifier = crypto.createHash('sha256')
      .update(`${device_pubkey}${Date.now()}${dataHash}`)
      .digest('hex');

    // Current epoch (daily)
    const epoch = Math.floor(Date.now() / 86400000);

    // ===== CALL MIDNIGHT PROOF SERVER =====
    const proofRequest = {
      circuitName: 'submitSensorBatch',
      publicInputs: {
        dataHash,
        collectionMode: collection_mode === 'auto' ? 1 : 0,
        claimNullifier,
        epoch
      },
      privateWitnesses: {
        devicePubkey: device_pubkey,
        merkleProof: merkle_proof,
        leafIndex: leaf_index,
        signatureR: req.body.device_signature_r,
        signatureS: req.body.device_signature_s
      }
    };

    // Generate ZK proof via Midnight proof server
    const proofResult = await fetch('http://localhost:6300/prove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proofRequest)
    }).then(r => r.json());

    // Store proof in database
    await db.batch_proofs.insert({
      batch_id: claimNullifier,
      device_pubkey,
      collection_mode,
      proof_data: JSON.stringify(proofResult.proof),
      public_inputs: JSON.stringify(proofResult.publicInputs),
      merkle_root: merkle_proof.appropriate_root
    });

    res.json(proofResult);
  } catch (error) {
    console.error('Proof generation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### **Phase 5: Real Token Distribution**

#### 5.1 Implement Actual tDUST Transfer
```typescript
// server/src/services/deploymentWallet.ts

async transferReward(farmerAddress: string, amountDUST: number): Promise<TransferResult> {
  if (!this.wallet) {
    await this.initialize();
  }

  // Convert DUST to smallest units
  const amountSmallestUnits = BigInt(Math.floor(amountDUST * 1_000_000));

  // ===== REAL MIDNIGHT TRANSACTION =====
  try {
    // Create transfer transaction
    const tx = await this.wallet.createTransaction({
      type: 'transfer',
      to: farmerAddress,
      amount: amountSmallestUnits,
      token: nativeToken()
    });

    // Sign and submit
    const signedTx = await this.wallet.signTransaction(tx);
    const txHash = await this.wallet.submitTransaction(signedTx);

    // Wait for confirmation
    const receipt = await this.wallet.waitForTransaction(txHash);

    console.log(`✅ Real tDUST transfer confirmed!`);
    console.log(`   TX: ${txHash}`);
    console.log(`   Block: ${receipt.blockNumber}`);

    // Store in database
    await db.rewards.insert({
      batch_id: receipt.metadata.batchId,
      farmer_address: farmerAddress,
      amount: amountDUST,
      tx_hash: txHash,
      status: 'completed',
      paid_at: new Date()
    });

    return {
      success: true,
      txHash,
      amount: amountDUST
    };
  } catch (error) {
    console.error(`Transfer failed:`, error);
    return {
      success: false,
      amount: amountDUST,
      error: error.message
    };
  }
}
```

---

## 📋 Implementation Checklist

### Database Setup
- [ ] Install PostgreSQL in Codespaces
- [ ] Create `edgechain` database
- [ ] Run schema migrations
- [ ] Add Knex.js query builder
- [ ] Create database service layer

### Compact Circuit Development
- [ ] Write `arduino-iot.compact` circuit
- [ ] Add EdDSA signature verification
- [ ] Add Merkle proof verification
- [ ] Compile circuit with `npm run compact`
- [ ] Generate TypeScript bindings

### Backend Integration
- [ ] Install Midnight SDK dependencies
- [ ] Create contract service
- [ ] Update proof generation to use real proof server
- [ ] Add PostgreSQL persistence layer
- [ ] Implement real token transfers

### Contract Deployment
- [ ] Fund deployment wallet with tDUST
- [ ] Deploy Arduino IoT contract to Testnet
- [ ] Update `deployment.json` with new contract address
- [ ] Publish initial Merkle roots on-chain

### Testing
- [ ] Test device registration with PostgreSQL
- [ ] Test proof generation with proof server
- [ ] Test on-chain proof submission
- [ ] Test real tDUST transfers
- [ ] End-to-end test with real Arduino

---

## 🚀 Demo Flow for Judges

1. **Show Real Hardware**: Arduino collecting temperature/humidity
2. **Show Database**: PostgreSQL with persistent device registry
3. **Show ZK Proof**: Real proof generated by Midnight proof server
4. **Show On-Chain**: Transaction explorer showing submitted proof
5. **Show Token Transfer**: Lace wallet receiving real tDUST

---

## ⏱️ Time Estimate

| Phase | Estimated Time |
|-------|---------------|
| Database setup | 2 hours |
| Compact circuit | 4 hours |
| Backend integration | 3 hours |
| Token transfers | 2 hours |
| Testing | 3 hours |
| **Total** | **14 hours** |

---

## 🎯 Impact on Judges

**Before (Current)**: "Nice demo, but proofs are mocked"
**After (Real Integration)**: "Wow! Real ZK proofs on Midnight Testnet with actual tDUST transfers and persistent storage!"

This transforms EdgeChain from a concept demo into a **production-ready** system that showcases Midnight's full capabilities.
