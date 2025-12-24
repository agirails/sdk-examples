/**
 * Advanced API Example 05: EAS Attestations
 *
 * Demonstrates Ethereum Attestation Service (EAS) integration
 * for verifiable delivery proofs.
 *
 * EAS provides:
 * - On-chain proof of delivery
 * - Verifiable provider attestations
 * - Replay protection
 *
 * This example demonstrates:
 * - Creating delivery proof attestations
 * - Verifying attestations
 * - Attestation-gated escrow release
 *
 * Note: EAS is available on Base Sepolia and Base Mainnet.
 * Run: npx ts-node advanced/05-eas-attestations.ts
 */

import 'dotenv/config';
import { ACTPClient, ProofGenerator } from '@agirails/sdk';
import { log, logSection, formatState } from '../src/utils/helpers';

async function main() {
  logSection('AGIRAILS Advanced API - EAS Attestations');

  // =====================================================
  // Part 1: Understanding Delivery Proofs (Mock Mode)
  // =====================================================
  logSection('Part 1: Delivery Proofs');

  log('📝', 'Creating a delivery proof...');

  const proofGenerator = new ProofGenerator();

  // Generate a delivery proof
  const deliveryProof = proofGenerator.generateDeliveryProof({
    txId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    deliverable: JSON.stringify({
      result: 'Translation completed',
      wordCount: 500,
      quality: 'high',
    }),
    deliveryUrl: 'ipfs://QmYourDeliverableHash',
    metadata: {
      service: 'translation',
      language: 'en-de',
      completedAt: Date.now(),
    },
  });

  console.log('Delivery Proof Structure:');
  console.log(`  Transaction ID: ${deliveryProof.txId.substring(0, 16)}...`);
  console.log(`  Content Hash: ${deliveryProof.contentHash.substring(0, 16)}...`);
  console.log(`  Timestamp: ${new Date(deliveryProof.timestamp).toISOString()}`);
  console.log('');

  // =====================================================
  // Part 2: EIP-712 Typed Data (Conceptual)
  // =====================================================
  logSection('Part 2: EIP-712 Typed Data');

  log('🔧', 'EIP-712 Typed Data for signed attestations...');

  console.log('EIP-712 Typed Data Structure:');
  console.log('```typescript');
  console.log('// DeliveryProofBuilder is used internally by BlockchainRuntime');
  console.log('// to create EIP-712 typed data for signing');
  console.log('const typedData = {');
  console.log('  domain: {');
  console.log("    name: 'ACTP Protocol',");
  console.log('    version: 1,');
  console.log('    chainId: 84532, // Base Sepolia');
  console.log('  },');
  console.log("  primaryType: 'DeliveryProof',");
  console.log('  types: {');
  console.log('    DeliveryProof: [');
  console.log("      { name: 'txId', type: 'bytes32' },");
  console.log("      { name: 'contentHash', type: 'bytes32' },");
  console.log("      { name: 'timestamp', type: 'uint256' },");
  console.log('    ]');
  console.log('  }');
  console.log('};');
  console.log('```');
  console.log('');

  // =====================================================
  // Part 3: EAS Integration (testnet/mainnet)
  // =====================================================
  logSection('Part 3: EAS Integration');

  console.log('EAS integration is available in testnet/mainnet mode.');
  console.log('');
  console.log('Configuration:');
  console.log('```typescript');
  console.log('const client = await ACTPClient.create({');
  console.log("  mode: 'testnet',");
  console.log('  requesterAddress: wallet.address,');
  console.log('  privateKey: wallet.privateKey,');
  console.log('  easConfig: {');
  console.log("    contractAddress: '0x4200000000000000000000000000000000000021',");
  console.log("    schemaUID: '0x1b0ebdf0...',");
  console.log('  },');
  console.log('  requireAttestation: true, // Enforce attestation before release');
  console.log('});');
  console.log('```');
  console.log('');

  // =====================================================
  // Part 4: Mock Transaction with Proof
  // =====================================================
  logSection('Part 4: Transaction with Delivery Proof');

  const requesterAddress = '0x1111111111111111111111111111111111111111';
  const providerAddress = '0x2222222222222222222222222222222222222222';

  log('🔧', 'Creating client in mock mode...');
  const client = await ACTPClient.create({
    mode: 'mock',
    requesterAddress,
  });

  await client.mintTokens(requesterAddress, '100000000');

  log('📝', 'Creating transaction...');
  const txId = await client.intermediate.createTransaction({
    provider: providerAddress,
    amount: '50',
    deadline: '+2h',
    disputeWindow: 3600, // 1 hour (minimum)
  });

  console.log(`   Transaction: ${txId.substring(0, 16)}...`);

  log('💳', 'Linking escrow...');
  await client.intermediate.linkEscrow(txId);

  log('📦', 'Provider completes work and creates proof...');

  // Provider generates delivery proof
  const proof = proofGenerator.generateDeliveryProof({
    txId,
    deliverable: JSON.stringify({
      result: 'AI analysis completed',
      dataPoints: 1000,
      accuracy: 0.95,
    }),
    metadata: {
      service: 'ai-analysis',
      model: 'gpt-4',
    },
  });

  console.log('   Proof generated:');
  console.log(`     Content Hash: ${proof.contentHash.substring(0, 20)}...`);

  log('✅', 'Transitioning to DELIVERED with proof...');
  await client.intermediate.transitionState(txId, 'DELIVERED');

  const tx = await client.intermediate.getTransaction(txId);
  console.log(`   State: ${formatState(tx!.state)}`);

  // =====================================================
  // Part 5: Attestation Workflow (conceptual)
  // =====================================================
  logSection('Part 5: Attestation Workflow');

  console.log('Complete attestation workflow (testnet/mainnet):');
  console.log('');
  console.log('1. Provider completes work');
  console.log('   └─ Generates delivery proof with content hash');
  console.log('');
  console.log('2. Provider creates EAS attestation');
  console.log('   └─ Attests: "I delivered X for transaction Y"');
  console.log('   └─ Returns: attestationUID');
  console.log('');
  console.log('3. Provider transitions to DELIVERED');
  console.log('   └─ Includes attestationUID in state transition');
  console.log('');
  console.log('4. Requester verifies attestation');
  console.log('   └─ Checks: attestation exists, not revoked, correct schema');
  console.log('   └─ Checks: content hash matches deliverable');
  console.log('');
  console.log('5. Escrow release');
  console.log('   └─ With requireAttestation: true, SDK verifies attestation');
  console.log('   └─ Prevents replay via UsedAttestationTracker');
  console.log('   └─ Funds released to provider');
  console.log('');

  // =====================================================
  // Part 6: Security Considerations
  // =====================================================
  logSection('Part 6: Security Considerations');

  console.log('Security features in attestation flow:');
  console.log('');
  console.log('1. Content Hash Verification');
  console.log('   - Deliverable is hashed before attestation');
  console.log('   - Hash included in attestation data');
  console.log('   - Requester can verify content matches hash');
  console.log('');
  console.log('2. Replay Protection');
  console.log('   - Each attestationUID can only be used once');
  console.log('   - UsedAttestationTracker prevents double-spending');
  console.log('   - Persists across restarts (file-based)');
  console.log('');
  console.log('3. Schema Validation');
  console.log('   - Only attestations with correct schema accepted');
  console.log('   - Schema defines required fields (txId, contentHash, etc.)');
  console.log('');
  console.log('4. Attester Verification');
  console.log('   - Attestation must be from transaction provider');
  console.log('   - Prevents third-party attestation fraud');

  log('🎉', 'EAS attestations demo complete!');
}

main().catch(console.error);
