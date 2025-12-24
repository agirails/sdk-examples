/**
 * Advanced API Example 06: Direct Protocol Access
 *
 * Demonstrates direct access to protocol modules (Kernel, Escrow, Events).
 * This is the lowest level API for maximum control.
 *
 * Available Protocol Modules:
 * - ACTPKernel: Transaction lifecycle management
 * - EscrowVault: Fund management
 * - EventMonitor: Blockchain event monitoring
 * - EASHelper: Attestation verification
 * - MessageSigner: EIP-712 message signing
 *
 * This example demonstrates:
 * - Accessing protocol modules via BlockchainRuntime
 * - Direct smart contract interaction
 * - Low-level protocol operations
 *
 * Note: This level is for advanced users building custom integrations.
 * Run: npx ts-node advanced/06-direct-protocol.ts
 */

import 'dotenv/config';
import {
  ACTPClient,
  BlockchainRuntime,
  ACTPKernel,
  EscrowVault,
  EventMonitor,
  getNetwork,
} from '@agirails/sdk';
import { log, logSection } from '../src/utils/helpers';

async function main() {
  logSection('AGIRAILS Advanced API - Direct Protocol Access');

  // =====================================================
  // Part 1: Protocol Module Overview
  // =====================================================
  logSection('Part 1: Protocol Modules');

  console.log('The SDK provides access to low-level protocol modules:');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  ACTPClient                                                 │');
  console.log('│  ├── beginner (BeginnerAdapter)                             │');
  console.log('│  ├── intermediate (IntermediateAdapter)                     │');
  console.log('│  └── advanced (IACTPRuntime)                                │');
  console.log('│       └── BlockchainRuntime (testnet/mainnet)               │');
  console.log('│            ├── getKernel() → ACTPKernel                     │');
  console.log('│            ├── getEscrow() → EscrowVault                    │');
  console.log('│            ├── getEvents() → EventMonitor                   │');
  console.log('│            ├── getEASHelper() → EASHelper                   │');
  console.log('│            └── getMessageSigner() → MessageSigner           │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');

  // =====================================================
  // Part 2: Network Configuration
  // =====================================================
  logSection('Part 2: Network Configuration');

  log('📋', 'Available network configurations...');

  const baseSepolia = getNetwork('base-sepolia');
  console.log('\nBase Sepolia (Testnet):');
  console.log(`  Chain ID: ${baseSepolia.chainId}`);
  console.log(`  RPC URL: ${baseSepolia.rpcUrl}`);
  console.log(`  Block Explorer: ${baseSepolia.blockExplorer}`);
  console.log('  Contracts:');
  console.log(`    ACTPKernel: ${baseSepolia.contracts.actpKernel}`);
  console.log(`    EscrowVault: ${baseSepolia.contracts.escrowVault}`);
  console.log(`    USDC: ${baseSepolia.contracts.usdc}`);
  console.log(`    EAS: ${baseSepolia.contracts.eas}`);

  // Base Mainnet - contracts not yet deployed
  console.log('\nBase Mainnet:');
  console.log('  Chain ID: 8453');
  console.log('  USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  console.log('  (Kernel/Escrow: Not yet deployed - coming soon)');

  // =====================================================
  // Part 3: ACTPKernel Methods
  // =====================================================
  logSection('Part 3: ACTPKernel');

  console.log('ACTPKernel is the main transaction coordinator.');
  console.log('');
  console.log('Core Methods:');
  console.log('');
  console.log('  // Transaction creation');
  console.log('  kernel.createTransaction(params) → txId');
  console.log('');
  console.log('  // State transitions');
  console.log('  kernel.transitionState(txId, newState, proof?)');
  console.log('  kernel.linkEscrow(txId, escrowVault, escrowId)');
  console.log('');
  console.log('  // Escrow release');
  console.log('  kernel.releaseEscrow(txId, attestationUID?)');
  console.log('');
  console.log('  // Dispute handling');
  console.log('  kernel.raiseDispute(txId, reason)');
  console.log('  kernel.resolveDispute(txId, resolution)');
  console.log('');
  console.log('  // Queries');
  console.log('  kernel.getTransaction(txId) → Transaction');
  console.log('  kernel.getEconomicParams() → { platformFeeBps, ... }');
  console.log('  kernel.isPaused() → boolean');

  // =====================================================
  // Part 4: EscrowVault Methods
  // =====================================================
  logSection('Part 4: EscrowVault');

  console.log('EscrowVault holds funds during transactions.');
  console.log('');
  console.log('Core Methods:');
  console.log('');
  console.log('  // Token approval (required before linking)');
  console.log('  escrow.approveToken(tokenAddress, amount)');
  console.log('');
  console.log('  // Queries');
  console.log('  escrow.getEscrow(escrowId) → Escrow');
  console.log('  escrow.getRemaining(escrowId) → bigint');
  console.log('');
  console.log('Security Notes:');
  console.log('  - Funds are locked until DELIVERED + dispute window');
  console.log('  - Only Kernel can release/refund (onlyKernel modifier)');
  console.log('  - 7-day timelock for emergency withdrawals');

  // =====================================================
  // Part 5: EventMonitor
  // =====================================================
  logSection('Part 5: EventMonitor');

  console.log('EventMonitor tracks blockchain events in real-time.');
  console.log('');
  console.log('Event Types:');
  console.log('');
  console.log('  // Transaction events');
  console.log('  events.onTransactionCreated((txId, requester, provider) => { ... })');
  console.log('  events.onStateChanged((txId, oldState, newState) => { ... })');
  console.log('');
  console.log('  // Escrow events');
  console.log('  events.onEscrowLinked((txId, escrowId, amount) => { ... })');
  console.log('  events.onEscrowReleased((escrowId, recipient, amount) => { ... })');
  console.log('');
  console.log('  // Dispute events');
  console.log('  events.onDisputeRaised((txId, raiser, reason) => { ... })');
  console.log('  events.onDisputeResolved((txId, resolution) => { ... })');
  console.log('');
  console.log('  // Transaction watching');
  console.log('  events.watchTransaction(txId, callback)');
  console.log('  events.waitForState(txId, targetState, timeout)');

  // =====================================================
  // Part 6: Code Example (testnet)
  // =====================================================
  logSection('Part 6: Code Example');

  console.log('Direct protocol access in testnet/mainnet:');
  console.log('');
  console.log('```typescript');
  console.log("import { ACTPClient, BlockchainRuntime } from '@agirails/sdk';");
  console.log('import { ethers } from "ethers";');
  console.log('');
  console.log('// Create client with testnet config');
  console.log('const client = await ACTPClient.create({');
  console.log("  mode: 'testnet',");
  console.log('  requesterAddress: wallet.address,');
  console.log('  privateKey: wallet.privateKey,');
  console.log('  rpcUrl: process.env.RPC_URL,');
  console.log('});');
  console.log('');
  console.log('// Access BlockchainRuntime');
  console.log('const runtime = client.advanced as BlockchainRuntime;');
  console.log('');
  console.log('// Get protocol modules');
  console.log('const kernel = runtime.getKernel();');
  console.log('const escrow = runtime.getEscrow();');
  console.log('const events = runtime.getEvents();');
  console.log('');
  console.log('// Direct kernel interaction');
  console.log('const params = await kernel.getEconomicParams();');
  console.log('console.log("Platform fee:", params.platformFeeBps / 100, "%");');
  console.log('');
  console.log('// Set up event listener');
  console.log('events.onTransactionCreated((txId, requester, provider) => {');
  console.log('  console.log("New tx:", txId);');
  console.log('});');
  console.log('');
  console.log('// Create transaction via kernel');
  console.log('const txId = await kernel.createTransaction({');
  console.log('  provider: "0x...",');
  console.log('  requester: wallet.address,');
  console.log('  amount: ethers.parseUnits("100", 6), // 100 USDC');
  console.log('  deadline: Math.floor(Date.now() / 1000) + 3600,');
  console.log('  disputeWindow: 7200,');
  console.log('  serviceHash: ethers.keccak256(ethers.toUtf8Bytes("my-service")),');
  console.log('});');
  console.log('');
  console.log('// Approve USDC for escrow');
  console.log('await escrow.approveToken(usdcAddress, amount);');
  console.log('');
  console.log('// Link escrow');
  console.log('await kernel.linkEscrow(txId, escrowVaultAddress, escrowId);');
  console.log('```');

  // =====================================================
  // Part 7: When to Use Direct Access
  // =====================================================
  logSection('Part 7: When to Use Direct Access');

  console.log('Use direct protocol access when you need:');
  console.log('');
  console.log('✅ Custom gas management');
  console.log('   - Override default gas settings');
  console.log('   - Implement gas price oracles');
  console.log('');
  console.log('✅ Complex transaction patterns');
  console.log('   - Multi-step atomic operations');
  console.log('   - Custom state machine workflows');
  console.log('');
  console.log('✅ Event-driven architecture');
  console.log('   - Real-time blockchain monitoring');
  console.log('   - Custom event aggregation');
  console.log('');
  console.log('✅ Integration with other contracts');
  console.log('   - DEX integrations');
  console.log('   - Cross-protocol operations');
  console.log('');
  console.log('❌ Prefer higher-level APIs when:');
  console.log('   - Building simple integrations');
  console.log('   - Rapid prototyping');
  console.log('   - Standard transaction patterns');

  log('🎉', 'Direct protocol access demo complete!');
}

main().catch(console.error);
