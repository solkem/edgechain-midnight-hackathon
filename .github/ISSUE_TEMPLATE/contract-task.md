---
name: Smart Contract Task
about: Create or modify Compact circuit
title: "[CONTRACT] "
labels: ['contracts', 'packages/contract', 'high-priority']
assignees: []
---

## Overview
Brief description of the circuit/functionality

## Location
📁 `packages/contract/src/edgechain.compact`

## Circuit Signature
```compact
export circuit yourCircuit(param1: Type, param2: Type): Result {
  // Implementation
}
```

## Requirements
- [ ] Accept correct parameters
- [ ] Update ledger state correctly
- [ ] Emit appropriate events
- [ ] Handle error cases
- [ ] Verify inputs/proofs (if applicable)

## Ledger State Changes
```compact
// Before:
ledger.field = oldValue

// After:
ledger.field = newValue
```

## Acceptance Criteria
- [ ] Circuit compiles successfully
- [ ] Can be called from API/frontend
- [ ] State updates correctly on testnet
- [ ] Events are emitted
- [ ] Transaction visible on explorer

## Testing
```bash
cd packages/contract
npm run compact

# Deploy to testnet:
yarn deploy:testnet

# Verify on explorer:
# [paste testnet explorer link]
```
