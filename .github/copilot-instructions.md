# EdgeChain AI Coding Agent Instructions

## Project Overview

EdgeChain is a **privacy-preserving federated learning (FL) platform** for agricultural AI, built on **Midnight Network** (zero-knowledge blockchain). Farmers train crop yield prediction models locally on private farm data, submit only model weights (not raw data) to decentralized aggregators, and access predictions via SMS—all while Midnight's ZK-proofs protect sensitive information.

**Key Innovation**: $30-50 IoT sensors + smartphone gateway (vs $5,000+ traditional solutions) serving 500M+ smallholder farmers.

## Architecture: Three-Layer Privacy System

### 1. **Frontend** (`packages/ui/`) - Local Training & Browser Wallet
- **TensorFlow.js** trains models in-browser (never uploads farm data)
- **Lace Midnight Preview wallet** signs transactions with ZK-proofs
- **React + Vite** SPA with TypeScript strict mode
- Privacy flow: Raw data → Local model → Extract weights → Sign with wallet → Submit hash only

### 2. **Smart Contract** (`packages/contract/`) - On-Chain Coordination
- **Compact language** (`.compact` files) - Midnight's ZK-optimized contract language
- Stores only **hashes** of model weights (not actual weights) in ledger
- Circuits: `submitModel()`, `completeAggregation()`, `getGlobalModelHash()`, `checkAggregating()`
- Build: `yarn compact` → generates TypeScript API in `dist/managed/edgechain/`

### 3. **Backend** (`server/`) - FedAvg Aggregation Service
- Watches contract events for submission threshold (≥2 farmers)
- Performs **FedAvg** weighted averaging: `w_global = Σ(w_i × n_i) / Σ(n_i)`
- Detects outliers (Z-score method) to prevent model poisoning
- Stores global model, calls `contract.completeAggregation(hash)`

## Critical Build & Development Workflows

### Monorepo Structure (Turborepo)
```bash
# Build dependency order (defined in turbo.json):
# 1. contract (compact compilation)
# 2. api (TypeScript build)  
# 3. cli (TypeScript build)
# 4. ui (Vite build + copy ZK keys/zkir)

# ALWAYS use workspace root commands:
yarn build        # Build changed packages only (Turbo cache)
yarn build:all    # Full rebuild all packages sequentially
yarn dev          # Start all dev servers concurrently
```

### Contract Development (Compact Language)
```bash
cd packages/contract

# 1. Edit src/edgechain.compact
# 2. Compile Compact → TypeScript API + ZK keys/circuits
yarn compact      # Outputs to src/managed/edgechain/

# 3. Build package (copies managed/ to dist/)
yarn build        # Required before UI can import contract types

# Key outputs:
# - dist/managed/edgechain/contract/index.d.cts  (TypeScript definitions)
# - dist/managed/edgechain/keys/                 (ZK proving keys)
# - dist/managed/edgechain/zkir/                 (Circuit IR)
```

**Compact Syntax Gotchas**:
- Ledger fields: `export ledger fieldName: Type;` (NOT braces `{}`)
- Counter type auto-initializes (no `= 0` in constructor)
- Bytes literals: `"00000000..."` string format (32 hex chars for Bytes<32>)
- Circuit parameters are witnesses (private) by default
- Access ledger directly in circuits (no `ledger.` prefix)

### Frontend Development (React + TensorFlow.js)
```bash
cd packages/ui

yarn dev          # Vite dev server on port 8080
yarn build        # TypeScript check → Vite build → Copy ZK keys/zkir to dist/

# Build copies contract artifacts:
# dist/keys/  ← packages/contract/dist/managed/edgechain/keys/
# dist/zkir/  ← packages/contract/dist/managed/edgechain/zkir/
```

**Key Files**:
- `src/providers/WalletProvider.tsx` - Lace Midnight wallet connection (NOT regular Lace/Cardano)
- `src/providers/ContractProvider.tsx` - Smart contract circuit calls + ledger queries
- `src/fl/training.ts` - TensorFlow.js local model training (480 LOC, core FL logic)
- `src/fl/aggregation.ts` - FedAvg algorithm (600 LOC, weighted averaging + outlier detection)
- `src/components/FLDashboard.tsx` - Main UI workflow (connect → train → submit → download)

### Backend Aggregation Service
```bash
cd server

yarn dev          # Express server on port 3001
yarn build        # TypeScript → dist/

# Current state: HTTP polling (mock)
# TODO: Replace with Midnight contract event watching
```

## Project-Specific Conventions

### 1. **FL Type System** (`packages/ui/src/fl/types.ts`)
All FL components use centralized types (284 LOC). Always import from this file:
```typescript
import type {
  FarmDataPoint,      // Input: rainfall, temp, soil, irrigation, etc.
  ModelWeights,       // Serialized neural net parameters
  TrainingResult,     // Output: accuracy, loss, predictions
  ModelSubmission,    // ZK-proof + hash + signature
  GlobalModel,        // Aggregated model package
} from './fl/types';
```

### 2. **Privacy-First Data Flow**
**NEVER upload raw farm data**. Follow this pattern:
```typescript
// ✅ CORRECT: Local training, submit only weights
const dataset = await collectFarmData();           // Stays on device
const result = await trainLocalModel(dataset);     // Runs in browser
const weights = extractModelWeights(result.model); // ~50KB
await contract.submitModel(hash(weights));         // Only hash on-chain

// ❌ WRONG: Uploading raw data
fetch('/api/train', { body: JSON.stringify(dataset) }); // PRIVACY VIOLATION
```

### 3. **Wallet Integration Pattern**
Use React Context providers (main.tsx wraps app):
```tsx
import { useWallet } from './providers/WalletProvider';
import { useContract } from './providers/ContractProvider';

function MyComponent() {
  const { isConnected, connectWallet, signTransaction } = useWallet();
  const { submitModel, ledger } = useContract();
  
  // Wallet operations require Lace Midnight Preview extension
  // Network: Midnight devnet (NOT Cardano mainnet/testnet)
}
```

### 4. **Midnight.js SDK Structure** (ContractProvider.tsx)
```typescript
// Provider initialization order (critical):
// 1. DApp Connector API (from Lace extension)
const api = await getDAppConnectorAPI();

// 2. ZK Config Provider (loads keys/zkir from dist/)
const zkConfigProvider = await createZkConfigProvider({
  keysPath: '/keys/',
  zkirPath: '/zkir/'
});

// 3. Indexer Provider (queries blockchain state)
const indexerProvider = createHttpClientProvider(INDEXER_URL);

// 4. Proof Provider (generates ZK-proofs)
const proofProvider = createProofProvider(zkConfigProvider);

// 5. Contract Instance (calls circuits)
const contract = await Contract.deploy(providers, CONTRACT_ADDRESS);
```

### 5. **Model Architecture** (Hardcoded - DO NOT change without retrain)
```typescript
// Neural network: [64, 32, 16] hidden layers + dropout
// Input: 14 features (5 numeric + 9 one-hot categorical)
// Output: 1 (yield prediction in tons/hectare)
// Total params: ~4,500 | Model size: ~50KB
// Training: 50 epochs, early stopping, batch size 32
```

## Integration Points & External Dependencies

### 1. **Midnight Network Devnet**
- **Indexer**: `https://indexer.devnet.midnight.network` (query blockchain state)
- **RPC Node**: `https://rpc.devnet.midnight.network` (submit transactions)
- **Currency**: tDUST (test tokens from faucet: `https://faucet.devnet.midnight.network`)

### 2. **Wallet Requirements**
- **Extension**: Lace Midnight Preview (separate from regular Lace wallet)
- **Network**: Midnight devnet only (incompatible with Cardano networks)
- **Detection**: Check `window.midnight` (NOT `window.cardano`)

### 3. **Package Resolution** (Yarn 4.9.2 + Resolutions)
Root `package.json` forces specific versions to avoid conflicts:
```json
"resolutions": {
  "@midnight-ntwrk/compact-runtime/@midnight-ntwrk/onchain-runtime": "^0.3.0",
  "@midnight-ntwrk/zswap": "4.0.0"
}
```

### 4. **TensorFlow.js Backend**
UI uses WebGL backend for GPU acceleration. Fallback to CPU if unavailable:
```typescript
await tf.setBackend('webgl'); // Browser training ~1-2 min
await tf.ready();
```

### 5. **Vite Bundling Configuration** (Critical for Midnight SDK)
The Midnight SDK requires specific Vite plugins to bundle correctly:
```typescript
// vite.config.ts essentials
plugins: [
  wasm(),              // ZK proof WASM support
  topLevelAwait(),     // Async contract initialization
  viteCommonjs()       // Handle .cjs modules from Midnight SDK
],
build: {
  target: "esnext",    // Midnight SDK uses ES2022+ features
},
resolve: {
  alias: {
    buffer: 'buffer',  // Node.js polyfills for browser
    crypto: 'crypto-browserify',
    stream: 'stream-browserify',
    // ... (see private-docs/MIDNIGHT_SDK_VITE_BUNDLING.md)
  }
}
```

## Common Pitfalls & Solutions

### 1. **"Contract not found" Error**
- **Cause**: UI built before contract compiled
- **Fix**: `cd packages/contract && yarn build` then `cd ../ui && yarn build`

### 2. **"ZK keys missing" Error**
- **Cause**: UI build didn't copy keys/zkir from contract package
- **Fix**: Check `packages/ui/package.json` build script includes:
  ```bash
  cp -r ../contract/dist/managed/edgechain/keys ./dist/keys
  cp -r ../contract/dist/managed/edgechain/zkir ./dist/zkir
  ```

### 3. **Wallet Connection Fails**
- **Cause**: Using regular Lace instead of Lace Midnight Preview
- **Fix**: Install correct extension from https://www.lace.io/midnight
- **Check**: `window.midnight` should exist (NOT `window.cardano`)

### 4. **Turborepo Cache Stale**
- **Symptom**: Changes not reflected after build
- **Fix**: `yarn clean:cache` then `yarn build:all`

### 5. **Contract Compilation Fails**
- **Cause**: Compact syntax errors (common with ledger/circuit declarations)
- **Fix**: Check:
  - Ledger uses `export ledger name: Type;` (no braces)
  - Counter doesn't initialize in constructor
  - Bytes literals are strings: `"0000..."`

## Testing Strategy

### Current State (Hackathon - Mock Data)
- **Frontend**: Uses `generateMockFarmData()` in `fl/dataCollection.ts`
- **Backend**: In-memory submissions (no persistence)
- **Contract**: Compiled but not deployed (devnet deployment pending)

### Testing Workflow
```bash
# 1. Frontend FL logic (browser)
cd packages/ui && yarn dev
# Navigate to http://localhost:8080 → FLDashboard
# Click "Train Model" → Shows real TensorFlow.js training

# 2. Backend aggregation (simulated)
cd server && yarn dev
# POST to http://localhost:3001/api/fl/submit
# Check console logs for FedAvg computation

# 3. Contract circuits (not yet deployed)
# TODO: Deploy to devnet, test with Lace wallet
```

## File Navigation Shortcuts

**Critical FL Implementation**:
- `packages/ui/src/fl/types.ts` - Type system (284 LOC)
- `packages/ui/src/fl/training.ts` - TensorFlow.js training (480 LOC)
- `packages/ui/src/fl/aggregation.ts` - FedAvg algorithm (600 LOC)
- `packages/ui/src/fl/dataCollection.ts` - IoT sensor data (350 LOC)
- `packages/ui/src/fl/inference.ts` - Predictions (470 LOC)

**Smart Contract**:
- `packages/contract/src/edgechain.compact` - Midnight contract (100 LOC)
- `packages/contract/dist/managed/edgechain/contract/index.d.cts` - Generated TypeScript API

**Backend**:
- `server/src/services/aggregation.ts` - FedAvg service (294 LOC)
- `server/src/routes/aggregation.ts` - REST API endpoints

**Documentation** (extensive - read before major changes):
- `README.md` - Architecture overview + setup instructions
- `private-docs/MIDNIGHT_INTEGRATION_STATUS.md` - Smart contract integration status
- `private-docs/FL_SYSTEM_COMPLETE.md` - Complete FL implementation details
- `private-docs/DEPLOYMENT_GUIDE.md` - Midnight devnet deployment steps
- `private-docs/MIDNIGHT_SDK_VITE_BUNDLING.md` - Vite configuration for Midnight SDK (troubleshooting)

## When Making Changes

### To Smart Contract (`edgechain.compact`)
1. Edit `.compact` file
2. Run `yarn compact` (generates TypeScript API)
3. Run `yarn build` (copies to dist/)
4. Rebuild UI: `cd ../ui && yarn build`
5. Test contract calls in ContractProvider.tsx

### To FL Algorithm (`fl/*.ts`)
1. Edit algorithm file (types, training, aggregation, etc.)
2. Check imports match `fl/types.ts` definitions
3. Update FLDashboard.tsx if UI affected
4. Test in browser dev tools (console logs show training progress)

### To Backend Aggregation
1. Edit `server/src/services/aggregation.ts`
2. Ensure FedAvg formula matches UI implementation
3. Restart server: `yarn dev`
4. Test with Postman/curl to `/api/fl/submit`

## Success Criteria for AI Agents

When completing a task, ensure:

1. **Privacy preserved**: No raw farm data leaves device (only weights/hashes)
2. **Types consistent**: All FL types imported from `fl/types.ts`
3. **Build passes**: `yarn build:all` succeeds without errors
4. **Contract compiled**: `yarn compact` regenerates API if `.compact` changed
5. **Wallet integrated**: Uses `useWallet()` + `useContract()` hooks correctly
6. **Documentation updated**: Update relevant `private-docs/*.md` if architecture changes

---

**Last Updated**: November 6, 2025
**Hackathon**: IOG Midnight Developer Challenge
**Team**: NeRudo (EdgeChain for smallholder farmers 🌾)
