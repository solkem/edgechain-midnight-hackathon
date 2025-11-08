#!/bin/bash
# Deploy EdgeChain UI to Fly.io

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           EdgeChain UI - Fly.io Deployment                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Add flyctl to PATH
export PATH="/home/codespace/.fly/bin:$PATH"

# Step 1: Build the contract
echo "📦 Step 1: Building contract..."
cd packages/contract
npm run build
echo "✅ Contract built"
echo ""

# Step 2: Build the UI
echo "📦 Step 2: Building UI..."
cd ../ui
npm run build
echo "✅ UI built"
echo ""

# Step 3: Create Fly.io app if it doesn't exist
echo "🚀 Step 3: Setting up Fly.io app..."
if flyctl apps list | grep -q "edgechain-midnight-ui"; then
    echo "ℹ️  App 'edgechain-midnight-ui' already exists"
else
    echo "Creating new Fly.io app..."
    flyctl apps create edgechain-midnight-ui --org personal
fi
echo ""

# Step 4: Deploy to Fly.io
echo "🚀 Step 4: Deploying to Fly.io..."
flyctl deploy --ha=false --now
echo ""

# Step 5: Show deployment info
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 Deployment Complete! ✅                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your app is live at: https://edgechain-midnight-ui.fly.dev"
echo ""
echo "📊 Useful commands:"
echo "   flyctl status           - Check app status"
echo "   flyctl logs             - View logs"
echo "   flyctl open             - Open app in browser"
echo "   flyctl dashboard        - Open Fly.io dashboard"
echo ""
