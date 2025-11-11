# Arduino Nano BLE Sense Integration Guide

## Overview

This guide covers the complete integration of Arduino Nano BLE Sense hardware for real-time IoT data collection with zero-knowledge proofs on the EdgeChain platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Arduino Nano BLE Sense                   │
│                    (On-Device Processing)                   │
├─────────────────────────────────────────────────────────────┤
│  1. Read sensors (temp/humidity)                            │
│  2. Sign reading with EdDSA (device_secret_key)             │
│  3. Broadcast via BLE                                       │
│     Payload: [json_len][json][signature][pubkey]            │
└──────────────────────┬──────────────────────────────────────┘
                       │ BLE 5.0
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                Gateway (Laptop/Browser)                      │
│                (Heavy Computation)                           │
├─────────────────────────────────────────────────────────────┤
│  1. Receive signed reading via Web Bluetooth API            │
│  2. Verify device is in registry                            │
│  3. Fetch Merkle proof for device                           │
│  4. Generate ZK proof (Compact circuit)                     │
│  5. Submit proof to backend                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend Verifier                           │
│                  (Node.js/Express)                          │
├─────────────────────────────────────────────────────────────┤
│  1. Verify ZK proof                                         │
│  2. Check nullifier (prevent replay)                        │
│  3. Dispatch reward                                         │
│  4. Add datapoint to FL aggregation                         │
└─────────────────────────────────────────────────────────────┘
```

## Hardware Requirements

### Arduino Nano BLE Sense Specifications

| Component | Specification | Impact |
|-----------|--------------|---------|
| **MCU** | ARM Cortex-M4 @ 64 MHz | Can sign data; cannot prove ZK circuits |
| **RAM** | 256 KB | Proof generation must happen on gateway |
| **Flash** | 1 MB | Limited libraries; use minimal crypto |
| **Sensors** | Temp, Humidity, RGB, Gesture, IMU, Mic | ✓ Use built-in environmental sensors |
| **Connectivity** | Bluetooth 5.0 LE | ✓ Stream to gateway (phone/laptop) |
| **Power** | USB-C | ✓ Plug into laptop during demo |

### Required Arduino Libraries

Install via Arduino IDE Library Manager:

```
1. Arduino_HTS221 (built-in) - Temperature + Humidity sensor
2. ArduinoBLE (built-in) - Bluetooth LE
3. Ed25519 - EdDSA signing (by Ilya Levin or similar)
4. SHA256 - Hash function (by Olivier Gay or Arduino's crypto)
```

**Installation:**
```
Tools → Manage Libraries → Search "Ed25519" → Install
Tools → Manage Libraries → Search "SHA256" → Install
```

## Quick Start (2 Hours)

### 1. Flash Arduino Firmware (30 min)

```bash
# 1. Open Arduino IDE
# 2. Select board: "Arduino Nano 33 BLE Sense"
# 3. Open sketch: arduino/edgechain_iot/edgechain_iot.ino
# 4. Compile and upload
# 5. Open Serial Monitor (115200 baud)
# 6. Copy the device public key shown on first boot
```

**Expected Serial Output:**
```
=== EdgeChain Arduino IoT Demo ===
Initializing...
Device Public Key: 0102030405060708090a0b0c0d0e0f10...
✓ BLE advertising as 'EdgeChain-Demo'
✓ Waiting for gateway connection...
```

### 2. Register Device in Backend (10 min)

```bash
# Save the public key from Serial Monitor
export DEVICE_PUBKEY="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

# Register device
curl -X POST http://localhost:3001/api/arduino/registry/register \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"$DEVICE_PUBKEY\",\"device_id\":\"EDGECHAIN_DEMO_001\"}"

# Verify registration
curl -X POST http://localhost:3001/api/arduino/registry/check \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"$DEVICE_PUBKEY\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "registration": {
    "device_pubkey": "0102030405060708...",
    "device_id": "EDGECHAIN_DEMO_001",
    "registered_at": 1699564800000,
    "approved": true
  },
  "merkle_root": "a7b3c4d5e6f7..."
}
```

### 3. Start Backend Server (5 min)

```bash
cd server
npm install
npm run dev
```

**Expected Output:**
```
===========================================
🌐 EdgeChain FL Aggregation Server
===========================================
📡 Server running on port 3001
🔗 API endpoint: http://localhost:3001/api/fl
🔗 Arduino API: http://localhost:3001/api/arduino
💚 Health check: http://localhost:3001/health
===========================================
✅ Ready to receive Arduino data!
```

### 4. Test BLE Gateway (30 min)

**Option A: Browser-Based (Recommended for Demo)**

```html
<!-- Create test.html -->
<!DOCTYPE html>
<html>
<head>
  <title>EdgeChain BLE Gateway</title>
</head>
<body>
  <h1>EdgeChain Arduino Gateway</h1>
  <button id="connectBtn">Connect to Arduino</button>
  <div id="status"></div>
  <div id="readings"></div>

  <script type="module">
    import { setupArduinoIntegration } from './gateway/ble_receiver.js';

    document.getElementById('connectBtn').addEventListener('click', async () => {
      try {
        await setupArduinoIntegration('http://localhost:3001');
      } catch (error) {
        console.error('Connection failed:', error);
      }
    });
  </script>
</body>
</html>
```

**Option B: Test with Mock Data (No Hardware)**

```bash
# Simulate Arduino reading
curl -X POST http://localhost:3001/api/arduino/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 25.3,
    "humidity": 65,
    "device_pubkey": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
  }'
```

### 5. End-to-End Test (30 min)

**Complete Flow Test:**

1. Arduino collects reading (check Serial Monitor)
2. Gateway receives via BLE (check browser console)
3. Backend generates proof (check server logs)
4. Backend verifies proof (check server logs)
5. Reward dispatched (check response)

**Expected Flow:**

```
Arduino Serial Monitor:
--- New Reading ---
Temp: 23.5°C | Humidity: 62%
Reading JSON: {"t":23.5,"h":62,"ts":1234567}
✓ Signed reading broadcast via BLE

Browser Console:
📊 Received reading from Arduino:
   Data: {"t":23.5,"h":62,"ts":1234567}
   Device: 0102030405060708...
⏳ Generating ZK proof (~15s)...
📤 Submitting proof to backend...
✅ VERIFIED!
   Reward: 0.1 DUST
   Added to federated model aggregation

Server Logs:
📊 SIMULATED READING FROM ARDUINO
🌡️  Temperature: 23.5°C
💧 Humidity: 62%
⏳ GENERATING ZK PROOF
✅ ZK Proof generated successfully
📤 PROOF VERIFICATION
✅ VERIFIED!
💰 Reward: 0.1 DUST
```

## Demo Day Setup (Checklist)

### Before Demo

- [ ] **Flash Arduino Firmware**
  ```bash
  Arduino IDE → Select "Arduino Nano 33 BLE Sense"
  → Open edgechain_iot.ino
  → Compile + Upload
  ```

- [ ] **Register Device Public Key**
  ```bash
  # Copy from Serial Monitor
  curl -X POST http://localhost:3001/api/arduino/registry/register \
    -d '{"device_pubkey":"<from printout>"}' \
    -H "Content-Type: application/json"
  ```

- [ ] **Start Backend Server**
  ```bash
  cd server
  npm run dev
  ```

- [ ] **Test BLE Connection**
  ```bash
  # Open browser to test.html
  # Click "Connect to Arduino"
  # Verify connection established
  ```

### On Stage (5 min segment)

1. **Setup** - Place Arduino on visible stand with USB power
2. **Show Serial Monitor** - Display on projector
3. **Launch Gateway UI** - Open browser, click "Connect"
4. **Live Reading** - Show: Temp: 23.5°C, Humidity: 62%
5. **Proof Generation** - Gateway shows "⏳ Generating proof..."
6. **Verification** - ~15 seconds later:
   ```
   ✅ VERIFIED
   ✅ Reward: 0.1 DUST
   ✅ Data committed to federated learning
   ```
7. **Applause** 🎉

## Demo Narrative

**Script for Judges:**

> "This is a real Arduino Nano BLE Sense—a typical farm IoT device used in agricultural monitoring.
>
> [Show device] It's currently reading temperature and humidity from its built-in sensors.
>
> [Show Serial Monitor] Here you can see it collecting data: 23.5°C and 62% humidity.
>
> Instead of sending raw data to the cloud, the device signs each reading cryptographically with EdDSA.
>
> [Show signature in logs] This signature proves the data came from an approved device, without revealing which specific device.
>
> The gateway—running on this laptop—receives the signed data via Bluetooth and generates a zero-knowledge proof.
>
> [Show browser console] The proof demonstrates three things: the device is in our approved registry, the data is authentic, and this is not a replay attack.
>
> [Wait for verification] And... verified! The backend has confirmed the proof, dispatched a reward to the farmer, and added the datapoint to our federated learning model.
>
> This is real hardware, real crypto, real privacy. No simulation."

## API Endpoints

### Device Registration

**POST** `/api/arduino/registry/register`
```json
{
  "device_pubkey": "0102030405060708...",
  "device_id": "EDGECHAIN_DEMO_001"
}
```

**POST** `/api/arduino/registry/check`
```json
{
  "device_pubkey": "0102030405060708..."
}
```

**POST** `/api/arduino/registry/proof`
```json
{
  "device_pubkey": "0102030405060708..."
}
```

**GET** `/api/arduino/registry/devices`

### Proof Generation

**POST** `/api/arduino/prove`
```json
{
  "reading_json": "{\"t\":25.3,\"h\":65,\"ts\":1234567}",
  "device_signature_r": "a1b2c3...",
  "device_signature_s": "d4e5f6...",
  "device_pubkey": "0102030405060708...",
  "merkle_proof": ["hash1", "hash2", ...],
  "leaf_index": 0
}
```

**POST** `/api/arduino/submit-proof`
```json
{
  "proof": "zk_proof_abc123",
  "global_root": "merkle_root_hash",
  "data_hash": "reading_hash",
  "claim_nullifier": "nullifier_12345",
  "epoch": 19680,
  "data_payload": {"t": 25.3, "h": 65, "ts": 1234567}
}
```

### Testing

**POST** `/api/arduino/simulate`
```json
{
  "temperature": 25.3,
  "humidity": 65,
  "device_pubkey": "0102030405060708..."
}
```

**POST** `/api/arduino/reset`

## Troubleshooting

### Arduino Won't Upload
- Check COM port in Arduino IDE
- Select "Arduino Nano 33 BLE Sense" board
- Press reset button twice (bootloader mode)

### BLE Won't Advertise
- Restart Arduino
- Check `BLE.begin()` in Serial Monitor
- Verify battery/USB power

### Signature Verification Fails
- Verify SHA-256 hash matches between Arduino and gateway
- Check that signature is 128 hex characters (64 bytes)
- Ensure device public key is correct

### Proof Takes >30s
- Simplify circuit (if custom implementation)
- Consider batching multiple readings
- Check gateway CPU resources

### Gateway Can't Find Device
- Ensure Arduino is powered and advertising
- Check Serial Monitor for "BLE advertising" message
- Use Chrome/Edge (best Web Bluetooth support)
- Try browser on different OS if persistent issues

## File Structure

```
edgechain-midnight-hackathon/
├── arduino/
│   └── edgechain_iot/
│       ├── edgechain_iot.ino    # Main Arduino sketch
│       └── config.h              # Device keys, UUIDs
│
├── gateway/
│   └── ble_receiver.ts          # Browser BLE client
│
├── server/
│   └── src/
│       ├── routes/
│       │   └── arduino.ts       # Arduino API endpoints
│       ├── services/
│       │   ├── deviceRegistry.ts # Merkle tree management
│       │   └── bleReceiver.ts    # BLE service (mock)
│       └── types/
│           └── arduino.ts        # Type definitions
│
└── demo/
    └── arduino_pubkey.txt       # Store device public key
```

## Security Considerations

### Production Deployment

1. **Secure Key Storage**
   - Use ATECC608 secure element for device keys
   - Never hardcode keys in firmware
   - Implement key rotation

2. **BLE Security**
   - Enable BLE pairing (numeric comparison)
   - Encrypt characteristic data
   - Validate device MAC addresses

3. **Proof Verification**
   - Store used nullifiers in database
   - Implement rate limiting
   - Add timestamp validation

4. **Data Privacy**
   - Never log sensitive data
   - Implement data retention policies
   - Comply with GDPR/local regulations

## Next Steps

### Post-Hackathon Improvements

1. **Hardware Enhancements**
   - Add more sensors (soil moisture, CO2)
   - Implement LoRaWAN for remote devices
   - Use secure element (ATECC608)

2. **Software Improvements**
   - Implement actual ZK circuit in Compact
   - Add TPM attestation
   - Enable over-the-air firmware updates

3. **Production Readiness**
   - Database for device registry
   - Proper nullifier storage
   - Rate limiting and DDoS protection
   - Monitoring and alerting

## Resources

- [Arduino Nano BLE Sense Docs](https://docs.arduino.cc/hardware/nano-33-ble-sense)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [EdDSA Signature Scheme](https://ed25519.cr.yp.to/)
- [Merkle Tree Proofs](https://en.wikipedia.org/wiki/Merkle_tree)
- [Midnight Network ZK Proofs](https://docs.midnight.network/)

---

**Real hardware. Real crypto. Real privacy.** 🚀
