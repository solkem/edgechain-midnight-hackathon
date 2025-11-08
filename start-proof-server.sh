#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       Starting Midnight Proof Server (Testnet)                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This server generates zero-knowledge proofs for EdgeChain transactions."
echo "Keep this terminal window open while deploying or using the app."
echo ""
echo "📍 Server will listen on: http://localhost:6300"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running!"
  echo ""
  echo "Please start Docker Desktop and try again."
  echo ""
  exit 1
fi

echo "✅ Docker is running"
echo "🚀 Starting proof server container..."
echo ""

# Run the proof server
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
