# EdgeChain Anonymous Set Verification Flow

## Diagram 1: Full System Flow with Anonymous Set Verification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    1. DEVICE REGISTRATION (One-time Setup)                   │
└─────────────────────────────────────────────────────────────────────────────┘

    Farmer's Arduino                EdgeChain API              Midnight Blockchain
         │                                │                            │
         │  Generate key pair             │                            │
         │  (pubKey, privKey)             │                            │
         │───────────────────────────────>│                            │
         │                                │   registerDevice(pubKey)   │
         │                                │───────────────────────────>│
         │                                │                            │
         │                                │                    ┌───────▼────────┐
         │                                │                    │ Anonymous Set  │
         │                                │                    │  (Merkle Tree) │
         │                                │                    │                │
         │                                │                    │  Device_1_PK   │
         │                                │                    │  Device_2_PK   │
         │                                │                    │  Device_3_PK ← │
         │                                │                    │  ...           │
         │                                │                    │                │
         │                                │                    │ Root: 0x1234.. │
         │                                │                    └────────────────┘
         │                                │                            │
         │  Registration confirmed        │<───────────────────────────│
         │<───────────────────────────────│                            │


┌─────────────────────────────────────────────────────────────────────────────┐
│                    2. DATA COLLECTION (Continuous Operation)                 │
└─────────────────────────────────────────────────────────────────────────────┘

    Arduino Nano BLE                EdgeChain API              Midnight Blockchain
         │                                │                            │
         │  Read sensors:                 │                            │
         │  temp=25°C, humidity=60%       │                            │
         │                                │                            │
         │  Sign data with privKey        │                            │
         │  signature = sign(data, priv)  │                            │
         │                                │                            │
         │  {data, signature}             │                            │
         │───────────────────────────────>│                            │
         │                                │                            │


┌─────────────────────────────────────────────────────────────────────────────┐
│              3. PROOF GENERATION (compact-runtime - API Server)              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    EdgeChain API
                                         │
                                         │ Query anonymous set
                                         │ (fetch Merkle tree)
                    ┌────────────────────▼──────────────────────┐
                    │      Compact Runtime Environment          │
                    │                                            │
                    │  1. Fetch device set from blockchain      │
                    │     anonymousSet = [D1, D2, D3, ...]       │
                    │                                            │
                    │  2. Generate Merkle proof                 │
                    │     proof = generateMerkleProof(           │
                    │       myDevicePubKey,                      │
                    │       anonymousSet                         │
                    │     )                                      │
                    │                                            │
                    │  3. Create ZK witness (PRIVATE)            │
                    │     witness = {                            │
                    │       devicePrivKey: 0xabc...,  // SECRET  │
                    │       devicePubKey: 0xdef...,   // SECRET  │
                    │       sensorData: {...},        // SECRET  │
                    │       merkleProof: [...],       // SECRET  │
                    │       signature: 0x123...       // SECRET  │
                    │     }                                      │
                    │                                            │
                    │  4. Generate ZK Proof                      │
                    │     π = PROVE(                             │
                    │       "I know a device in the set          │
                    │        that signed this data"              │
                    │     )                                      │
                    │                                            │
                    │  5. Create public transaction              │
                    │     tx = {                                 │
                    │       encryptedData: encrypt(data),        │
                    │       proof: π,                            │
                    │       merkleRoot: 0x1234...                │
                    │     }                                      │
                    │     // NO device identity revealed!        │
                    └────────────────┬───────────────────────────┘
                                     │
                                     │ Submit transaction
                                     │


┌─────────────────────────────────────────────────────────────────────────────┐
│              4. PROOF VERIFICATION (Midnight Blockchain)                     │
└─────────────────────────────────────────────────────────────────────────────┘

                                Midnight Blockchain
                                         │
                                         │ Receive transaction
                    ┌────────────────────▼──────────────────────┐
                    │      Compact Circuit Execution            │
                    │                                            │
                    │  circuit submitData(                       │
                    │    Ledger[Device] devices,  // Anon set   │
                    │    bytes encryptedData,                    │
                    │    Proof π                                 │
                    │  ) {                                       │
                    │                                            │
                    │    // Verify ZK proof                      │
                    │    assert(verifyProof(                     │
                    │      π,                                    │
                    │      devices.root(),  // 0x1234...         │
                    │      encryptedData                         │
                    │    ));                                     │
                    │                                            │
                    │    // Proof valid = device IS in set      │
                    │    // But blockchain CANNOT determine      │
                    │    // WHICH device!                        │
                    │                                            │
                    │    // Update global state                 │
                    │    dataPoints.insert(encryptedData);       │
                    │    totalSubmissions++;                     │
                    │  }                                         │
                    │                                            │
                    │  ✓ Verification successful                │
                    │  ✓ State updated                           │
                    │  ✓ Device identity: UNKNOWN                │
                    └────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT RESPONSIBILITIES                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  IoT Device          │
├──────────────────────┤
│ • Generate keys      │
│ • Read sensors       │
│ • Sign data          │
│ • Send to API        │
└──────────────────────┘

┌──────────────────────┐
│  Compact Runtime     │
│  (API Server)        │
├──────────────────────┤
│ • Query anon set     │
│ • Generate Merkle    │
│   proof              │
│ • Create ZK witness  │
│ • Generate ZK proof  │
│ • Submit transaction │
└──────────────────────┘

┌──────────────────────┐
│  Midnight Blockchain │
├──────────────────────┤
│ • Store anon set     │
│ • Verify ZK proofs   │
│ • Enforce consensus  │
│ • Update state       │
│ • Maintain privacy   │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEY PRIVACY PROPERTIES                               │
└─────────────────────────────────────────────────────────────────────────────┘

PUBLIC (On-chain):
  ✓ Anonymous set Merkle root
  ✓ Encrypted sensor data
  ✓ ZK proof (π)
  ✓ Total number of submissions

PRIVATE (Never revealed):
  ✗ Which specific device submitted
  ✗ Device private key
  ✗ Device public key (during submission)
  ✗ Raw sensor data
  ✗ Merkle proof path

VERIFIABLE (Without revealing identity):
  ✓ Data came from a valid device
  ✓ Device is in the anonymous set
  ✓ Signature is valid
  ✓ Data is properly formatted
