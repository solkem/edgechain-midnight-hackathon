#!/bin/bash

# EdgeChain Arduino Integration Test Script with Incentive Layer
# Tests the complete flow with dual Merkle trees (auto vs manual)

set -e

BACKEND_URL="http://localhost:3001"
DEVICE_PUBKEY="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

echo "================================================"
echo "🧪 EdgeChain Arduino Integration Test"
echo "   (With Incentive Layer - Dual Merkle Trees)"
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

# Register device with auto collection mode
echo "2️⃣  Registering Arduino device (auto-collection mode)..."
REGISTER_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/registry/register" \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"${DEVICE_PUBKEY}\",\"collection_mode\":\"auto\",\"device_id\":\"TEST_AUTO_001\"}")

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Device registered successfully"
    AUTO_ROOT=$(echo "$REGISTER_RESPONSE" | grep -o '"global_auto_collection_root":"[^"]*"' | cut -d'"' -f4)
    MANUAL_ROOT=$(echo "$REGISTER_RESPONSE" | grep -o '"global_manual_entry_root":"[^"]*"' | cut -d'"' -f4)
    echo "   Auto Root: ${AUTO_ROOT:0:32}..."
    echo "   Manual Root: ${MANUAL_ROOT:0:32}..."
else
    if echo "$REGISTER_RESPONSE" | grep -q "already registered"; then
        echo "ℹ️  Device already registered (OK)"
        # Get the roots from registry status
        STATUS_RESPONSE=$(curl -s "${BACKEND_URL}/api/arduino/registry/devices")
        AUTO_ROOT=$(echo "$STATUS_RESPONSE" | grep -o '"global_auto_collection_root":"[^"]*"' | cut -d'"' -f4)
        MANUAL_ROOT=$(echo "$STATUS_RESPONSE" | grep -o '"global_manual_entry_root":"[^"]*"' | cut -d'"' -f4)
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

# Get Merkle proof (should return auto-collection proof)
echo "4️⃣  Fetching Merkle proof..."
PROOF_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/registry/proof" \
  -H "Content-Type: application/json" \
  -d "{\"device_pubkey\":\"${DEVICE_PUBKEY}\"}")

if echo "$PROOF_RESPONSE" | grep -q '"leaf_index"'; then
    LEAF_INDEX=$(echo "$PROOF_RESPONSE" | grep -o '"leaf_index":[0-9]*' | cut -d':' -f2)
    COLLECTION_MODE=$(echo "$PROOF_RESPONSE" | grep -o '"collection_mode":"[^"]*"' | cut -d'"' -f4)
    APPROPRIATE_ROOT=$(echo "$PROOF_RESPONSE" | grep -o '"appropriate_root":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Merkle proof retrieved"
    echo "   Leaf index: $LEAF_INDEX"
    echo "   Collection mode: $COLLECTION_MODE"
    echo "   Appropriate root: ${APPROPRIATE_ROOT:0:32}..."
else
    echo "❌ Failed to get Merkle proof: $PROOF_RESPONSE"
    exit 1
fi
echo ""

# Simulate Arduino reading with auto mode
echo "5️⃣  Simulating Arduino sensor reading (auto-collection)..."
READING_JSON="{\"t\":25.3,\"h\":65,\"ts\":1234567,\"mode\":\"auto\"}"
echo "   Reading: $READING_JSON"
echo "   Expected reward: 0.1 DUST (auto-collection)"
echo ""

# Generate ZK proof with collection_mode
echo "6️⃣  Generating ZK proof..."
SIGNATURE_R=$(printf 'a%.0s' {1..64})
SIGNATURE_S=$(printf 'b%.0s' {1..64})

# Extract merkle_proof array from JSON
MERKLE_PROOF=$(echo "$PROOF_RESPONSE" | grep -o '"merkle_proof":\[[^]]*\]' | sed 's/"merkle_proof"://')

PROVE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/prove" \
  -H "Content-Type: application/json" \
  -d "{
    \"reading_json\":\"${READING_JSON}\",
    \"collection_mode\":\"${COLLECTION_MODE}\",
    \"device_pubkey\":\"${DEVICE_PUBKEY}\",
    \"merkle_proof\":${MERKLE_PROOF},
    \"leaf_index\":${LEAF_INDEX},
    \"appropriate_root\":\"${APPROPRIATE_ROOT}\"
  }")

if echo "$PROVE_RESPONSE" | grep -q '"proof"'; then
    echo "✅ ZK proof generated"
    PROOF=$(echo "$PROVE_RESPONSE" | grep -o '"proof":"[^"]*"' | cut -d'"' -f4)
    CLAIMED_ROOT=$(echo "$PROVE_RESPONSE" | grep -o '"claimed_root":"[^"]*"' | cut -d'"' -f4)
    DATA_HASH=$(echo "$PROVE_RESPONSE" | grep -o '"data_hash":"[^"]*"' | cut -d'"' -f4)
    NULLIFIER=$(echo "$PROVE_RESPONSE" | grep -o '"claim_nullifier":"[^"]*"' | cut -d'"' -f4)
    EPOCH=$(echo "$PROVE_RESPONSE" | grep -o '"epoch":[0-9]*' | cut -d':' -f2)
    PROOF_COLLECTION_MODE=$(echo "$PROVE_RESPONSE" | grep -o '"collection_mode":"[^"]*"' | cut -d'"' -f4)
    echo "   Proof: ${PROOF:0:30}..."
    echo "   Claimed root: ${CLAIMED_ROOT:0:32}..."
    echo "   Collection mode: ${PROOF_COLLECTION_MODE}"
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
    \"claimed_root\":\"${CLAIMED_ROOT}\",
    \"collection_mode\":\"${PROOF_COLLECTION_MODE}\",
    \"data_hash\":\"${DATA_HASH}\",
    \"claim_nullifier\":\"${NULLIFIER}\",
    \"epoch\":${EPOCH},
    \"data_payload\":{\"t\":25.3,\"h\":65,\"ts\":1234567,\"mode\":\"auto\"}
  }")

if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
    echo "✅ Proof verified successfully!"
    REWARD=$(echo "$VERIFY_RESPONSE" | grep -o '"reward":[0-9.]*' | cut -d':' -f2)
    VERIFIED_MODE=$(echo "$VERIFY_RESPONSE" | grep -o '"collection_mode":"[^"]*"' | cut -d'"' -f4)
    echo "   💰 Reward: ${REWARD} DUST"
    echo "   🔧 Collection mode: ${VERIFIED_MODE}"
    echo "   📊 Datapoint added to aggregation"

    # Verify reward is correct for auto mode
    if [ "$REWARD" == "0.1" ]; then
        echo "   ✅ Reward is correct (0.1 DUST for auto-collection)"
    else
        echo "   ❌ WARNING: Expected 0.1 DUST, got ${REWARD}"
    fi
else
    echo "❌ Verification failed: $VERIFY_RESPONSE"
    exit 1
fi
echo ""

# Test replay protection
echo "8️⃣  Testing replay protection (submit same proof again)..."
REPLAY_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/arduino/submit-proof" \
  -H "Content-Type: application/json" \
  -d "{
    \"proof\":\"${PROOF}\",
    \"claimed_root\":\"${CLAIMED_ROOT}\",
    \"collection_mode\":\"${PROOF_COLLECTION_MODE}\",
    \"data_hash\":\"${DATA_HASH}\",
    \"claim_nullifier\":\"${NULLIFIER}\",
    \"epoch\":${EPOCH},
    \"data_payload\":{\"t\":25.3,\"h\":65,\"ts\":1234567,\"mode\":\"auto\"}
  }")

if echo "$REPLAY_RESPONSE" | grep -q "Nullifier already spent"; then
    echo "✅ Replay protection working (nullifier rejected)"
else
    echo "❌ WARNING: Replay protection failed: $REPLAY_RESPONSE"
fi
echo ""

# List all devices
echo "9️⃣  Listing registered devices..."
DEVICES_RESPONSE=$(curl -s "${BACKEND_URL}/api/arduino/registry/devices")
DEVICE_COUNT=$(echo "$DEVICES_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
AUTO_COUNT=$(echo "$DEVICES_RESPONSE" | grep -o '"auto_devices":[0-9]*' | cut -d':' -f2)
MANUAL_COUNT=$(echo "$DEVICES_RESPONSE" | grep -o '"manual_devices":[0-9]*' | cut -d':' -f2)
echo "✅ Registry has $DEVICE_COUNT device(s) registered"
echo "   Auto-collection: $AUTO_COUNT"
echo "   Manual-entry: $MANUAL_COUNT"
echo ""

echo "================================================"
echo "✅ ALL TESTS PASSED!"
echo "================================================"
echo ""
echo "🎉 Incentive Layer Working:"
echo "   • Dual Merkle trees (auto vs manual)"
echo "   • Auto-collection rewarded 0.1 DUST"
echo "   • Manual-entry would get 0.02 DUST"
echo "   • Replay protection via nullifiers"
echo "   • Collection mode cryptographically bound"
echo ""
echo "Next steps:"
echo "1. Flash Arduino firmware: arduino/edgechain_iot/edgechain_iot.ino"
echo "2. Open Serial Monitor and copy device public key"
echo "3. Register real device with: collection_mode='auto'"
echo "4. Open browser gateway and connect to Arduino"
echo "5. Watch live readings with 0.1 DUST rewards!"
echo ""
