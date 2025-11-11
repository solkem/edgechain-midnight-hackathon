/**
 * BLE Receiver for Browser (Web Bluetooth API)
 *
 * Connects to Arduino Nano BLE Sense and processes signed sensor readings
 * Generates ZK proofs on the gateway (laptop/browser) and submits to backend
 */

const BLE_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const DATA_CHAR_UUID = "87654321-4321-8765-4321-fedcba987654";

interface SignedReading {
  reading_json: string;
  signature: string; // hex
  device_pubkey: string; // hex
  timestamp: number; // when received
}

interface ArduinoReading {
  t: number; // temperature
  h: number; // humidity
  ts: number; // device timestamp
}

/**
 * Start BLE listener and process readings
 */
export async function startBLEListener(
  onReading: (reading: SignedReading) => void
): Promise<void> {
  try {
    console.log("🔍 Scanning for EdgeChain devices...");

    // Request device from user
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ name: "EdgeChain-Demo" }],
      optionalServices: [BLE_SERVICE_UUID],
    });

    console.log("✓ Connected to:", device.name);

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(DATA_CHAR_UUID);

    // Listen for notifications
    await characteristic.startNotifications();
    characteristic.addEventListener(
      "characteristicvaluechanged",
      (event: any) => {
        const buffer = event.target.value.buffer as ArrayBuffer;
        const reading = parseArduinoPayload(buffer);
        onReading(reading);
      }
    );

    console.log("✓ Listening for sensor readings...");
  } catch (e) {
    console.error("BLE error:", e);
    throw e;
  }
}

/**
 * Parse Arduino BLE payload
 */
function parseArduinoPayload(buffer: ArrayBuffer): SignedReading {
  const view = new Uint8Array(buffer);
  let idx = 0;

  // Read JSON length
  const json_len = view[idx++];

  // Read JSON
  const json_bytes = view.slice(idx, idx + json_len);
  const reading_json = new TextDecoder().decode(json_bytes);
  idx += json_len;

  // Read signature (64 bytes)
  const signature = Array.from(view.slice(idx, idx + 64))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  idx += 64;

  // Read device pubkey (32 bytes)
  const device_pubkey = Array.from(view.slice(idx, idx + 32))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    reading_json,
    signature,
    device_pubkey,
    timestamp: Date.now(),
  };
}

/**
 * Setup complete Arduino integration flow
 */
export async function setupArduinoIntegration(
  backendUrl: string
): Promise<void> {
  await startBLEListener(async (reading) => {
    console.log("\n📊 Received reading from Arduino:");
    console.log("   Data:", reading.reading_json);
    console.log("   Device:", reading.device_pubkey.slice(0, 16) + "...");

    // 1. Verify device is in registry
    const inRegistry = await checkDeviceInRegistry(
      backendUrl,
      reading.device_pubkey
    );
    if (!inRegistry) {
      console.error("❌ Device not in approved registry");
      return;
    }

    // 2. Parse collection_mode from reading JSON
    const reading_obj: ArduinoReading = JSON.parse(reading.reading_json);
    const collection_mode = (reading_obj as any).mode || 'auto';
    console.log(`   Collection mode: ${collection_mode}`);
    console.log(`   Expected reward: ${collection_mode === 'auto' ? '0.1' : '0.02'} DUST`);

    // 3. Get Merkle proof from backend
    const { merkle_proof, leaf_index, appropriate_root } = await getDeviceMerkleProof(
      backendUrl,
      reading.device_pubkey
    );

    // 4. Generate ZK proof (gateway does heavy lifting)
    console.log("⏳ Generating ZK proof (~15s)...");
    const proofResult = await generateProofForReading(
      backendUrl,
      reading,
      collection_mode,
      merkle_proof,
      leaf_index,
      appropriate_root
    );

    // 4. Submit to backend verifier
    console.log("📤 Submitting proof to backend...");
    const verificationResult = await submitProofToBackend(
      backendUrl,
      proofResult,
      reading.reading_json
    );

    if (verificationResult.valid) {
      console.log("✅ VERIFIED!");
      console.log(`   Reward: ${verificationResult.reward} DUST`);
      console.log("   Added to federated model aggregation");
    } else {
      console.log("❌ Verification failed:", verificationResult.reason);
    }
  });
}

/**
 * Check if device is in registry
 */
async function checkDeviceInRegistry(
  backendUrl: string,
  device_pubkey: string
): Promise<boolean> {
  const response = await fetch(`${backendUrl}/api/arduino/registry/check`, {
    method: "POST",
    body: JSON.stringify({ device_pubkey }),
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();
  return result.approved;
}

/**
 * Get Merkle proof for device
 */
async function getDeviceMerkleProof(
  backendUrl: string,
  device_pubkey: string
): Promise<{ merkle_proof: string[]; leaf_index: number; collection_mode: 'auto' | 'manual'; appropriate_root: string }> {
  const response = await fetch(`${backendUrl}/api/arduino/registry/proof`, {
    method: "POST",
    body: JSON.stringify({ device_pubkey }),
    headers: { "Content-Type": "application/json" },
  });
  return await response.json();
}

/**
 * Generate ZK proof for reading
 */
async function generateProofForReading(
  backendUrl: string,
  reading: SignedReading,
  collection_mode: 'auto' | 'manual',
  merkle_proof: string[],
  leaf_index: number,
  appropriate_root: string
): Promise<any> {
  return await fetch(`${backendUrl}/api/arduino/prove`, {
    method: "POST",
    body: JSON.stringify({
      reading_json: reading.reading_json,
      collection_mode,
      device_signature_r: reading.signature.slice(0, 64),
      device_signature_s: reading.signature.slice(64, 128),
      device_pubkey: reading.device_pubkey,
      merkle_proof,
      leaf_index,
      appropriate_root,
    }),
    headers: { "Content-Type": "application/json" },
  }).then((r) => r.json());
}

/**
 * Submit proof to backend verifier
 */
async function submitProofToBackend(
  backendUrl: string,
  proofResult: any,
  reading_json: string
): Promise<any> {
  return await fetch(`${backendUrl}/api/arduino/submit-proof`, {
    method: "POST",
    body: JSON.stringify({
      proof: proofResult.proof,
      claimed_root: proofResult.public_inputs.claimed_root,
      collection_mode: proofResult.public_inputs.collection_mode,
      data_hash: proofResult.public_inputs.data_hash,
      claim_nullifier: proofResult.public_inputs.claim_nullifier,
      epoch: proofResult.public_inputs.epoch,
      data_payload: JSON.parse(reading_json),
    }),
    headers: { "Content-Type": "application/json" },
  }).then((r) => r.json());
}
