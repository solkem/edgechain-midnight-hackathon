/**
 * EdgeChain IoT Demo - Arduino Nano BLE Sense
 *
 * Collects temperature/humidity data, signs with EdDSA, broadcasts via BLE
 * For live demo with real hardware + ZK proofs
 */

#include <Arduino_HTS221.h>  // Temperature + Humidity sensor
#include <ArduinoBLE.h>      // Bluetooth LE
#include <Ed25519.h>         // EdDSA signing (lightweight)
#include <SHA256.h>          // Hash function

// ===== CONFIGURATION =====
const char* DEVICE_ID = "EDGECHAIN_DEMO_001";
const char* BLE_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const char* DATA_CHAR_UUID = "87654321-4321-8765-4321-fedcba987654";

// Device keypair (pre-loaded at firmware flash time)
// In production: secure enclave / flash storage
const uint8_t device_secret_key[32] = {
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
  0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
};

uint8_t device_public_key[32]; // Derived from secret_key

// ===== STATE =====
unsigned long last_reading_time = 0;
const unsigned long READING_INTERVAL = 5000; // 5 seconds between readings

BLEService edgechainService(BLE_SERVICE_UUID);
BLECharacteristic dataCharacteristic(DATA_CHAR_UUID, BLERead | BLENotify, 256);

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== EdgeChain Arduino IoT Demo ===");
  Serial.println("Initializing...");

  // 1. Initialize sensors
  if (!HTS.begin()) {
    Serial.println("ERROR: HTS221 sensor failed");
    while (1);
  }

  // 2. Derive device public key from secret key
  Ed25519::derivePublicKey(device_public_key, device_secret_key);
  printHex("Device Public Key: ", device_public_key, 32);

  // 3. Initialize BLE
  if (!BLE.begin()) {
    Serial.println("ERROR: BLE failed");
    while (1);
  }

  BLE.setLocalName("EdgeChain-Demo");
  BLE.setAdvertisedService(edgechainService);
  edgechainService.addCharacteristic(dataCharacteristic);
  BLE.addService(edgechainService);
  BLE.advertise();

  Serial.println("✓ BLE advertising as 'EdgeChain-Demo'");
  Serial.println("✓ Waiting for gateway connection...");
}

void loop() {
  // Check for BLE connections
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("✓ Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      if (millis() - last_reading_time > READING_INTERVAL) {
        collectAndSignReading();
        last_reading_time = millis();
      }
      delay(100);
    }

    Serial.println("× Central disconnected");
  }

  delay(100);
}

/**
 * Collect temperature/humidity, sign, and broadcast via BLE
 */
void collectAndSignReading() {
  // 1. Read sensors
  float temperature = HTS.readTemperature();
  float humidity = HTS.readHumidity();
  unsigned long timestamp = millis() / 1000; // seconds since boot

  Serial.println("\n--- New Reading ---");
  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  // 2. Package reading as JSON with collection_mode
  // Format: { "t": temp, "h": humidity, "ts": timestamp, "mode": "auto" }
  // CRITICAL: "mode":"auto" proves automatic collection (higher reward: 0.1 DUST)
  // Example: {"t":25.3,"h":65,"ts":1234567,"mode":"auto"}
  char reading_json[80];
  snprintf(reading_json, sizeof(reading_json),
           "{\"t\":%.1f,\"h\":%.0f,\"ts\":%lu,\"mode\":\"auto\"}",
           temperature, humidity, timestamp);

  Serial.print("Reading JSON: ");
  Serial.println(reading_json);
  Serial.println("Collection mode: auto (0.1 DUST reward)");

  // 3. Hash the reading (SHA-256)
  uint8_t reading_hash[32];
  hashReading(reading_json, reading_hash);
  Serial.print("Reading Hash: ");
  printHex("", reading_hash, 32);

  // 4. Sign the hash with EdDSA
  uint8_t signature[64]; // EdDSA signature is 64 bytes (r + s)
  Ed25519::sign(signature, device_secret_key, device_public_key, reading_hash, 32);
  Serial.print("Signature: ");
  printHex("", signature, 64);

  // 5. Package for transmission: reading_json + signature + pubkey
  // Format: [1 byte length] [reading_json] [64-byte signature] [32-byte pubkey]
  uint8_t tx_payload[1 + 80 + 64 + 32]; // Increased for longer JSON with mode field
  int idx = 0;

  // Reading length
  uint8_t json_len = strlen(reading_json);
  tx_payload[idx++] = json_len;

  // Reading JSON
  memcpy(&tx_payload[idx], reading_json, json_len);
  idx += json_len;

  // Signature
  memcpy(&tx_payload[idx], signature, 64);
  idx += 64;

  // Device public key
  memcpy(&tx_payload[idx], device_public_key, 32);
  idx += 32;

  // 6. Broadcast via BLE characteristic
  dataCharacteristic.writeValue(tx_payload, idx);
  Serial.println("✓ Signed reading (auto-collection) broadcast via BLE");
  Serial.println("   Reward: 0.1 DUST (higher reward for automatic collection)");
}

/**
 * Hash the reading JSON with SHA-256
 */
void hashReading(const char* json_str, uint8_t* output) {
  SHA256 hasher;
  hasher.reset();
  hasher.update((const uint8_t*)json_str, strlen(json_str));
  hasher.finalize(output, 32);
}

/**
 * Print hex string for debugging
 */
void printHex(const char* label, const uint8_t* data, size_t len) {
  Serial.print(label);
  for (size_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
  }
  Serial.println();
}
