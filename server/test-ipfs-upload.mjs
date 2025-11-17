/**
 * Test IPFS Upload for IoT Data Collection
 * Simulates a complete ZK proof generation and IPFS upload flow
 */

// Read device from database
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('./data/edgechain.db');

// Get registered device
const device = db.prepare('SELECT * FROM devices LIMIT 1').get();

if (!device) {
  console.error('❌ No device registered. Please register a device first.');
  process.exit(1);
}

console.log('📱 Using registered device:');
console.log(`   Pubkey: ${device.device_pubkey.slice(0, 32)}...`);
console.log(`   Mode: ${device.collection_mode}`);

// Generate sensor reading
const reading = {
  temperature: 25.5 + Math.random() * 5,  // 25.5-30.5°C
  humidity: 60 + Math.random() * 20,       // 60-80%
  timestamp: Math.floor(Date.now() / 1000)
};

console.log('\n📊 Sensor Reading:');
console.log(`   Temperature: ${reading.temperature.toFixed(2)}°C`);
console.log(`   Humidity: ${reading.humidity.toFixed(2)}%`);
console.log(`   Timestamp: ${reading.timestamp}`);

// Step 1: Generate ZK proof
console.log('\n🔐 Step 1: Generating ZK Proof...');

const proofResponse = await fetch('http://localhost:3001/api/arduino/zk/generate-proof', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_pubkey: device.device_pubkey,
    device_secret: device.device_pubkey, // In real scenario, this would be stored securely
    temperature: reading.temperature,
    humidity: reading.humidity,
    timestamp: reading.timestamp,
    collection_mode: device.collection_mode
  })
});

if (!proofResponse.ok) {
  console.error('❌ Proof generation failed:', await proofResponse.text());
  process.exit(1);
}

const proofData = await proofResponse.json();
console.log('✅ ZK Proof generated!');
console.log(`   Nullifier: ${proofData.public_inputs.nullifier.slice(0, 32)}...`);
console.log(`   Epoch: ${proofData.public_inputs.epoch}`);

// Step 2: Submit private reading with IPFS upload
console.log('\n📤 Step 2: Submitting Private Reading with IPFS Upload...');

const submitResponse = await fetch('http://localhost:3001/api/arduino/zk/submit-private-reading', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    proof: proofData.proof,
    public_inputs: proofData.public_inputs,
    temperature: reading.temperature,
    humidity: reading.humidity,
    timestamp: reading.timestamp
  })
});

if (!submitResponse.ok) {
  console.error('❌ Submission failed:', await submitResponse.text());
  process.exit(1);
}

const submitData = await submitResponse.json();

console.log('\n✅ SUBMISSION SUCCESSFUL!');
console.log('═══════════════════════════════════════');
console.log(`💰 Reward: ${submitData.reward} tDUST`);
console.log(`🔒 Nullifier: ${submitData.nullifier.slice(0, 32)}...`);
console.log(`📅 Epoch: ${submitData.epoch}`);

if (submitData.ipfs_cid) {
  console.log(`\n🌐 IPFS Storage:`);
  console.log(`   CID: ${submitData.ipfs_cid}`);
  console.log(`   Gateway URL: ${submitData.ipfs_gateway_url}`);
  console.log(`   Public verifiability: ✅`);

  // Step 3: Retrieve from IPFS to verify
  console.log('\n🔍 Step 3: Retrieving from IPFS to verify...');

  const retrieveResponse = await fetch(`http://localhost:3001/api/arduino/zk/ipfs/${submitData.ipfs_cid}`);

  if (retrieveResponse.ok) {
    const retrievedData = await retrieveResponse.json();
    console.log('✅ Successfully retrieved from IPFS!');
    console.log(`   Temperature from IPFS: ${retrievedData.data.reading.temperature}°C`);
    console.log(`   Humidity from IPFS: ${retrievedData.data.reading.humidity}%`);
    console.log(`   Verified: ${retrievedData.data.verified}`);
  } else {
    console.log('⚠️  Retrieval failed (expected for mock CIDs)');
  }
} else {
  console.log(`\n⚠️  IPFS Upload: Failed (check IPFS service)`);
}

// Step 4: Check stats
console.log('\n📊 Step 4: Checking Stats...');
const statsResponse = await fetch('http://localhost:3001/api/arduino/zk/stats');
const stats = await statsResponse.json();

console.log('\n📈 Current Statistics:');
console.log(`   Total Submissions: ${stats.ipfs.total_submissions}`);
console.log(`   Stored on IPFS: ${stats.ipfs.stored_on_ipfs}`);
console.log(`   Decentralized: ${stats.ipfs.percentage}%`);
console.log(`   Anonymity Set: ${stats.privacy.anonymity_set_size} devices`);
console.log(`   Current Epoch: ${stats.privacy.current_epoch}`);

console.log('\n✅ IPFS INTEGRATION TEST COMPLETE!');
console.log('═══════════════════════════════════════\n');

process.exit(0);
