/**
 * EdgeChain IoT Configuration
 *
 * Device keys, UUIDs, and constants
 */

#ifndef EDGECHAIN_CONFIG_H
#define EDGECHAIN_CONFIG_H

// BLE Service Configuration
#define BLE_SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define DATA_CHAR_UUID "87654321-4321-8765-4321-fedcba987654"

// Device Identity
#define DEVICE_ID "EDGECHAIN_DEMO_001"
#define BLE_LOCAL_NAME "EdgeChain-Demo"

// Timing Configuration
#define READING_INTERVAL_MS 5000  // 5 seconds between readings
#define BAUD_RATE 115200

// Buffer Sizes
#define JSON_BUFFER_SIZE 64
#define TX_PAYLOAD_MAX_SIZE 256

#endif // EDGECHAIN_CONFIG_H
