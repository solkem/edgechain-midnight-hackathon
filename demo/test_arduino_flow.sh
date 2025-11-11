#!/bin/bash

# EdgeChain Arduino Integration Test Script
# Tests the complete flow without hardware

set -e

BACKEND_URL="http://localhost:3001"
DEVICE_PUBKEY="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

echo "================================================"
echo "🧪 EdgeChain Arduino Integration Test"
echo "================================================"
echo ""

# Check if server is running
echo "1️⃣  Checking backend server..."
if ! curl -s "${BACKEND_URL}/health" > /dev/null; then
    echo "❌ Backend server not running at ${BACKEND_URL}"
    echo "   Start with: cd server && npm run dev"
    exit 1
fi
echo "✅ Backend server is running"
echo ""

# Register device
echo "2️⃣  Registering Arduino device..."
REGISTER_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/registry/register" \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"${DEVICE_PUBKEY}\",\"device_id\":\"TEST_DEVICE_001\"}")

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Device registered successfully"
    MERKLE_ROOT=$(echo "$REGISTER_RESPONSE" | grep -o '"merkle_root":"[^"]*"' | cut -d'"' -f4)
    echo "   Merkle Root: ${MERKLE_ROOT:0:32}..."
else
    if echo "$REGISTER_RESPONSE" | grep -q "already registered"; then
        echo "ℹ️  Device already registered (OK)"
    else
        echo "❌ Registration failed: $REGISTER_RESPONSE"
        exit 1
    fi
fi
echo ""

# Check device is approved
echo "3️⃣  Verifying device approval..."
CHECK_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/registry/check" \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"${DEVICE_PUBKEY}\"}")

if echo "$CHECK_RESPONSE" | grep -q '"approved":true'; then
    echo "✅ Device is approved"
else
    echo "❌ Device not approved: $CHECK_RESPONSE"
    exit 1
fi
echo ""

# Get Merkle proof
echo "4️⃣  Fetching Merkle proof..."
PROOF_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/registry/proof" \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"${DEVICE_PUBKEY}\"}")

if echo "$PROOF_RESPONSE" | grep -q '"leaf_index"'; then
    LEAF_INDEX=$(echo "$PROOF_RESPONSE" | grep -o '"leaf_index":[0-9]*' | cut -d':' -f2)
    echo "✅ Merkle proof retrieved (leaf index: $LEAF_INDEX)"
else
    echo "❌ Failed to get Merkle proof: $PROOF_RESPONSE"
    exit 1
fi
echo ""

# Simulate Arduino reading
echo "5️⃣  Simulating Arduino sensor reading..."
SIMULATE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/simulate" \
  -H "Content-Type: application/json" \
  -d "{\"temperature\":25.3,\"humidity\":65,\"device_pubkey\":\"${DEVICE_PUBKEY}\"}")

if echo "$SIMULATE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Reading simulated successfully"
    READING_JSON=$(echo "$SIMULATE_RESPONSE" | grep -o '"reading_json":"[^"]*"' | cut -d'"' -f4)
    echo "   Data: $READING_JSON"
else
    echo "❌ Simulation failed: $SIMULATE_RESPONSE"
    exit 1
fi
echo ""

# Generate ZK proof
echo "6️⃣  Generating ZK proof..."
SIGNATURE_R=$(printf 'a%.0s' {1..64})
SIGNATURE_S=$(printf 'b%.0s' {1..64})
MERKLE_PROOF='["hash1","hash2"]'

PROVE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/prove" \
  -H "Content-Type: application/json" \
  -d "{
    \"reading_json\":\"{\\\"t\\\":25.3,\\\"h\\\":65,\\\"ts\\\":1234567}\",
    \"device_signature_r\":\"${SIGNATURE_R}\",
    \"device_signature_s\":\"${SIGNATURE_S}\",
    \"device_pubkey\":\"${DEVICE_PUBKEY}\",
    \"merkle_proof\":${MERKLE_PROOF},
    \"leaf_index\":${LEAF_INDEX}
  }")

if echo "$PROVE_RESPONSE" | grep -q '"proof"'; then
    echo "✅ ZK proof generated"
    PROOF=$(echo "$PROVE_RESPONSE" | grep -o '"proof":"[^"]*"' | cut -d'"' -f4)
    GLOBAL_ROOT=$(echo "$PROVE_RESPONSE" | grep -o '"global_root":"[^"]*"' | cut -d'"' -f4)
    DATA_HASH=$(echo "$PROVE_RESPONSE" | grep -o '"data_hash":"[^"]*"' | cut -d'"' -f4)
    NULLIFIER=$(echo "$PROVE_RESPONSE" | grep -o '"claim_nullifier":"[^"]*"' | cut -d'"' -f4)
    EPOCH=$(echo "$PROVE_RESPONSE" | grep -o '"epoch":[0-9]*' | cut -d':' -f2)
    echo "   Proof: ${PROOF:0:30}..."
else
    echo "❌ Proof generation failed: $PROVE_RESPONSE"
    exit 1
fi
echo ""

# Submit proof for verification
echo "7️⃣  Submitting proof for verification..."
VERIFY_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/submit-proof" \
  -H "Content-Type: application/json" \
  -d "{
    \"proof\":\"${PROOF}\",
    \"global_root\":\"${GLOBAL_ROOT}\",
    \"data_hash\":\"${DATA_HASH}\",
    \"claim_nullifier\":\"${NULLIFIER}\",
    \"epoch\":${EPOCH},
    \"data_payload\":{\"t\":25.3,\"h\":65,\"ts\":1234567}
  }")

if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
    echo "✅ Proof verified successfully!"
    REWARD=$(echo "$VERIFY_RESPONSE" | grep -o '"reward":[0-9.]*' | cut -d':' -f2)
    echo "   💰 Reward: ${REWARD} DUST"
    echo "   📊 Datapoint added to aggregation"
else
    echo "❌ Verification failed: $VERIFY_RESPONSE"
    exit 1
fi
echo ""

# List all devices
echo "8️⃣  Listing registered devices..."
DEVICES_RESPONSE=$(curl -s "${BACKEND_URL}/api/arduino/registry/devices")
DEVICE_COUNT=$(echo "$DEVICES_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "✅ Registry has $DEVICE_COUNT device(s) registered"
echo ""

echo "================================================"
echo "✅ ALL TESTS PASSED!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Flash Arduino firmware: arduino/edgechain_iot/edgechain_iot.ino"
echo "2. Open Serial Monitor and copy device public key"
echo "3. Register real device with actual public key"
echo "4. Open browser gateway and connect to Arduino"
echo "5. Watch live readings flow through the system!"
echo ""
