# EdgeChain Arduino Demo - Setup Checklist

## Pre-Demo Preparation (1 Day Before)

### Hardware Setup
- [ ] Arduino Nano BLE Sense device charged/ready
- [ ] USB-C cable for power and serial debugging
- [ ] Laptop with Arduino IDE installed
- [ ] Laptop with Chrome/Edge browser (for Web Bluetooth)

### Software Installation
- [ ] Arduino IDE installed and configured
- [ ] Arduino libraries installed:
  - [ ] Arduino_HTS221 (built-in)
  - [ ] ArduinoBLE (built-in)
  - [ ] Ed25519
  - [ ] SHA256

### Firmware Flash
- [ ] Open `arduino/edgechain_iot/edgechain_iot.ino` in Arduino IDE
- [ ] Select board: "Arduino Nano 33 BLE Sense"
- [ ] Compile firmware (verify no errors)
- [ ] Upload to Arduino
- [ ] Open Serial Monitor (115200 baud)
- [ ] Copy device public key from first boot
- [ ] Save to `demo/arduino_pubkey.txt`

### Backend Configuration
- [ ] Node.js installed (v22+)
- [ ] Server dependencies installed: `cd server && npm install`
- [ ] Server starts successfully: `npm run dev`
- [ ] Health check passes: `curl http://localhost:3001/health`

### Device Registration
- [ ] Register device:
  ```bash
  curl -X POST http://localhost:3001/api/arduino/registry/register \
    -H "Content-Type: application/json" \
    -d '{"device_pubkey":"<YOUR_PUBKEY>","device_id":"EDGECHAIN_DEMO_001"}'
  ```
- [ ] Verify registration:
  ```bash
  curl -X POST http://localhost:3001/api/arduino/registry/check \
    -H "Content-Type: application/json" \
    -d '{"device_pubkey":"<YOUR_PUBKEY>"}'
  ```
- [ ] Response shows `"approved": true`

### BLE Gateway Test
- [ ] Create test HTML file or use existing gateway
- [ ] Open in Chrome/Edge browser
- [ ] Click "Connect to Arduino"
- [ ] Select "EdgeChain-Demo" from Bluetooth device list
- [ ] Verify connection established
- [ ] Observe readings in console
- [ ] Test full flow (reading → proof → verification)

### Mock Data Test (Backup Plan)
- [ ] Test simulation endpoint:
  ```bash
  curl -X POST http://localhost:3001/api/arduino/simulate \
    -H "Content-Type: application/json" \
    -d '{"temperature":25.3,"humidity":65,"device_pubkey":"<YOUR_PUBKEY>"}'
  ```
- [ ] Verify proof generation works
- [ ] Verify verification succeeds

## Demo Day Morning (2 Hours Before)

### Hardware Check
- [ ] Arduino powered on and advertising BLE
- [ ] Serial Monitor shows "✓ BLE advertising as 'EdgeChain-Demo'"
- [ ] Green LED on Arduino indicates power
- [ ] Device visible stand/mount ready

### Software Check
- [ ] Backend server running: `npm run dev`
- [ ] Health endpoint responding: http://localhost:3001/health
- [ ] Device registry has device registered
- [ ] Browser gateway page loaded and ready

### Network Check
- [ ] Laptop connected to reliable internet
- [ ] Backend API accessible from browser
- [ ] CORS enabled for browser requests
- [ ] No firewall blocking Web Bluetooth

### Presentation Setup
- [ ] Projector connected and working
- [ ] Serial Monitor window ready (large font)
- [ ] Browser window ready (zoom 150%)
- [ ] Server logs window ready (visible output)
- [ ] Arduino positioned where camera/audience can see it

### Rehearsal Run
- [ ] Walk through complete demo flow
- [ ] Time the demo (aim for 5 minutes)
- [ ] Verify all console outputs are visible
- [ ] Check that "✅ VERIFIED" message appears
- [ ] Practice narrative/talking points

## Demo Day - On Stage (5 Minutes)

### Minute 0-1: Introduction
- [ ] "This is a real Arduino Nano BLE Sense"
- [ ] Show physical device to camera/audience
- [ ] "A typical IoT device used in agricultural monitoring"

### Minute 1-2: Data Collection
- [ ] Show Serial Monitor on projector
- [ ] Point out temperature and humidity readings
- [ ] "The device reads environmental data every 5 seconds"
- [ ] Show JSON output: `{"t":23.5,"h":62,"ts":1234567}`

### Minute 2-3: Cryptographic Signing
- [ ] Show signature in Serial Monitor
- [ ] "Device signs the reading cryptographically with EdDSA"
- [ ] "This proves data authenticity without revealing device identity"

### Minute 3-4: Gateway Processing
- [ ] Show browser console
- [ ] Click "Connect to Arduino" (if not auto-connected)
- [ ] "Gateway receives signed data via Bluetooth"
- [ ] Point out: "⏳ Generating ZK proof"
- [ ] "Proof generation happens on the gateway, not the device"

### Minute 4-5: Verification & Results
- [ ] Show server logs
- [ ] Point out verification steps
- [ ] When verification completes:
  - [ ] "✅ VERIFIED!"
  - [ ] "Reward: 0.1 DUST dispatched"
  - [ ] "Datapoint added to federated learning model"
- [ ] Emphasize: "Real hardware, real crypto, real privacy"

### Key Points to Emphasize
- [ ] Hardware constraints (256KB RAM → proof on gateway)
- [ ] Privacy preservation (device identity hidden via ZK)
- [ ] Replay protection (nullifier prevents double-spending)
- [ ] Real-world applicability (farmers can use basic IoT devices)

## Post-Demo

### Cleanup
- [ ] Disconnect Arduino
- [ ] Stop backend server
- [ ] Close browser windows
- [ ] Save logs if needed for review

### Follow-Up
- [ ] Answer judge questions
- [ ] Provide GitHub repo link
- [ ] Offer to show code/architecture
- [ ] Explain production deployment path

## Contingency Plans

### If Arduino Won't Connect
- [ ] **Plan B**: Use simulation endpoint
  ```bash
  curl -X POST http://localhost:3001/api/arduino/simulate \
    -H "Content-Type: application/json" \
    -d '{"temperature":25.3,"humidity":65,"device_pubkey":"<YOUR_PUBKEY>"}'
  ```
- [ ] Explain: "This simulates what the Arduino would send"

### If BLE Won't Pair
- [ ] Restart Arduino (unplug/replug USB)
- [ ] Restart browser
- [ ] Use different laptop/browser
- [ ] Fall back to simulation

### If Proof Generation Fails
- [ ] Show mock proof structure
- [ ] Explain what the real proof would contain
- [ ] Reference circuit design in codebase

### If Backend Is Down
- [ ] Show local server running on laptop
- [ ] Explain production would use hosted backend
- [ ] Walk through code instead of live demo

## Talking Points

### Why This Matters
- "Traditional IoT sends raw data to cloud"
- "Farmers lose privacy and control"
- "EdgeChain keeps data on-device, proves authenticity via ZK"

### Technical Highlights
- "EdDSA signature: lightweight, fast (~5ms on Arduino)"
- "Merkle tree: efficient proof of device membership"
- "ZK proof: prove device approved without revealing which one"

### Real-World Impact
- "Works with basic IoT hardware (<$50)"
- "No internet required on device (only BLE)"
- "Scales to millions of devices"

### Future Enhancements
- "Add secure element for key storage"
- "Support LoRaWAN for remote farms"
- "Integrate with ML model training"

## Success Criteria

### Must-Have
- [x] Arduino collecting real sensor data
- [x] Data signed with EdDSA
- [x] BLE transmission working
- [x] Backend receiving and verifying
- [x] Live demo on real hardware

### Nice-to-Have
- [ ] Multiple readings during demo
- [ ] Visualization of proof verification
- [ ] Real-time dashboard showing datapoints
- [ ] Multiple devices connected

### Wow Factor
- [ ] Sub-20 second proof generation
- [ ] Zero failed verifications
- [ ] Smooth, rehearsed presentation
- [ ] Clear explanation of privacy benefits

## Resources During Demo

### Quick Links
- GitHub: https://github.com/your-team/edgechain-midnight-hackathon
- Docs: ARDUINO_INTEGRATION.md
- API Docs: Server running at http://localhost:3001

### Contact Info
- Team member for questions
- Backup laptop ready
- Mobile hotspot if WiFi fails

---

**Remember**: Judges want to see real hardware working. Even if something breaks, explaining the architecture and showing code quality is valuable.

**Good luck!** 🚀
