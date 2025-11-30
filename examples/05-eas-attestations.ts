/**
 * Example 05: EAS Attestations
 *
 * This example demonstrates Ethereum Attestation Service (EAS) integration:
 * 1. Generate delivery proof
 * 2. Create EAS attestation for proof
 * 3. Anchor attestation to transaction
 * 4. Verify attestation before settlement
 *
 * EAS provides cryptographic proof of delivery on-chain.
 */

import 'dotenv/config';
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';
import {
  logSection,
  log,
  formatState,
  formatUSDC,
  logError,
  shortTxId,
  handleNetworkError
} from '../src/utils/helpers';

async function main() {
  try {
    logSection('AGIRAILS SDK - EAS Attestations Example');

    const requesterKey = process.env.PRIVATE_KEY;
    const providerKey = process.env.PROVIDER_PRIVATE_KEY;

    if (!requesterKey || !providerKey) {
      throw new Error('PRIVATE_KEY (requester) and PROVIDER_PRIVATE_KEY (provider) are required in .env');
    }

    // 1. Initialize clients WITH EAS configuration
    log('🔧', 'Initializing ACTP Clients (requester + provider) with EAS support...');

    let requester;
    let provider;
    try {
      requester = await ACTPClient.create({
        network: 'base-sepolia',
        privateKey: requesterKey,
        eas: {
          contractAddress: '0x4200000000000000000000000000000000000021', // Base Sepolia EAS
          deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
        }
      });

      provider = await ACTPClient.create({
        network: 'base-sepolia',
        privateKey: providerKey,
        eas: {
          contractAddress: '0x4200000000000000000000000000000000000021',
          deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
        }
      });
    } catch (error) {
      handleNetworkError(error);
    }

    const requesterAddress = await requester.getAddress();
    const providerAddress = await provider.getAddress();
    log('✅', `Requester: ${requesterAddress}`);
    log('✅', `Provider:  ${providerAddress}`);

    if (requesterAddress.toLowerCase() === providerAddress.toLowerCase()) {
      throw new Error('Requester and provider must be different keys to mirror real flows.');
    }

    const config = requester.getNetworkConfig();

    // Verify EAS module is available BEFORE logging EAS config
    if (!requester.eas || !provider.eas) {
      throw new Error('EAS module not initialized. Check EAS configuration.');
    }

    // Now safe to log EAS details
    console.log(`EAS Contract: ${config.contracts.eas}`);
    console.log(`Delivery Schema: ${config.eas.deliverySchemaUID}`);

    // 2. Check USDC balance
    const usdcBalance = await requester.escrow.getTokenBalance(config.contracts.usdc, requesterAddress);
    console.log(`USDC Balance: ${formatUSDC(usdcBalance)}`);

    if (usdcBalance < parseUnits('10', 6)) {
      console.warn('\n⚠️  Insufficient USDC balance for this example.');
      return;
    }

    // 3. Create and fund transaction
    logSection('Step 1: Create & Fund Transaction');

    const amount = parseUnits('10', 6);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const disputeWindow = 300;

    log('📝', 'Creating transaction...');
    const txId = await requester.kernel.createTransaction({
      requester: requesterAddress,
      provider: providerAddress,
      amount,
      deadline,
      disputeWindow
    });

    log('✅', `Transaction created: ${shortTxId(txId)}`);

    log('💳', 'Funding transaction...');
    await requester.fundTransaction(txId);

    let tx = await requester.kernel.getTransaction(txId);
    console.log(`State: ${formatState(tx.state)}`);

    // 4. Generate delivery proof
    logSection('Step 2: Generate Delivery Proof');

    // Simulate work delivery (in production, this would be actual service result)
    const deliveryResult = {
      service: 'Data Analysis',
      status: 'completed',
      data: {
        insights: ['Revenue up 15%', 'User retention improved'],
        charts: ['chart1.png', 'chart2.png']
      },
      timestamp: new Date().toISOString()
    };

    log('📦', 'Generating delivery proof...');

    const proof = provider.proofGenerator.generateDeliveryProof({
      txId,
      deliverable: JSON.stringify(deliveryResult),
      deliveryUrl: 'ipfs://QmExampleDeliverableHash', // In production, upload to IPFS first
      metadata: {
        mimeType: 'application/json',
        description: 'Data analysis report with charts'
      }
    });

    console.log('\nDelivery Proof:');
    console.log(`  Content Hash: ${proof.contentHash.substring(0, 10)}...`);
    console.log(`  Timestamp: ${new Date(proof.timestamp).toLocaleString()}`);
    console.log(`  Size: ${proof.metadata.size} bytes`);
    console.log(`  MIME Type: ${proof.metadata.mimeType}`);

    // 5. Create EAS attestation
    logSection('Step 3: Create EAS Attestation');

    log('🔏', 'Creating on-chain attestation...');
    console.log('This creates a permanent, verifiable proof of delivery on Base.');

    const attestation = await provider.eas.attestDeliveryProof(
      proof,
      requesterAddress, // Recipient = requester (consumer)
      {
        revocable: true, // Allow revocation if needed
        expirationTime: 0 // Never expires (use deadline + 30 days in production)
      }
    );

    log('✅', 'Attestation created!');
    console.log(`  UID: ${attestation.uid}`);
    console.log(`  Transaction: ${attestation.transactionHash.substring(0, 10)}...`);

    // 6. Mark as delivered (provider signs)
    logSection('Step 4: Deliver Work');

    log('📦', 'Transitioning to DELIVERED...');

    await provider.kernel.transitionState(
      txId,
      State.DELIVERED,
      provider.proofGenerator.encodeProof(proof)
    );

    tx = await requester.kernel.getTransaction(txId);
    console.log(`State: ${formatState(tx.state)}`);
    console.log(`Attestation UID (from metadata): ${tx.metadata}`);

    // 7. Verify attestation (requester side)
    logSection('Step 5: Verify Attestation');

    log('🔍', 'Verifying attestation before settlement...');

    try {
      // Get attestation from EAS
      const onChainAttestation = await requester.eas.getAttestation(attestation.uid);

      console.log('\nAttestation Details:');
      console.log(`  Schema: ${onChainAttestation.schema.substring(0, 10)}...`);
      console.log(`  Attester: ${onChainAttestation.attester.substring(0, 6)}...`);
      console.log(`  Recipient: ${onChainAttestation.recipient.substring(0, 6)}...`);
      console.log(`  Time: ${new Date(Number(onChainAttestation.time) * 1000).toLocaleString()}`);
      console.log(`  Revocable: ${onChainAttestation.revocable}`);
      console.log(`  Revoked: ${onChainAttestation.revocationTime > 0n ? 'Yes' : 'No'}`);

      // Verify attestation matches transaction
      const isValid = await requester.eas.verifyDeliveryAttestation(txId, attestation.uid);

      log('✅', `Attestation verified: ${isValid}`);

    } catch (error: any) {
      log('❌', `Attestation verification failed: ${error.message}`);
      console.log('This could mean:');
      console.log('• Attestation was revoked');
      console.log('• Attestation expired');
      console.log('• Schema mismatch');
      console.log('• Transaction ID mismatch');
      throw error;
    }

    // 8. (Optional) Anchor attestation on-chain for auditability
    // Note: V1 contracts do NOT validate the UID; anchoring is cosmetic until V2.
    logSection('Step 6: Anchor Attestation (optional)');
    log('⚓', 'Anchoring attestation to transaction (cosmetic in V1)...');
    await requester.kernel.anchorAttestation(txId, attestation.uid);
    log('✅', 'Attestation UID anchored (no on-chain validation in V1)');

    // 9. Safe settlement with verification
    logSection('Step 7: Secure Settlement');

    log('💸', 'Using releaseEscrowWithVerification() for secure settlement...');
    console.log('This method automatically verifies attestation before releasing funds.');

    // Wait for dispute window (in production, this would be 2 hours)
    console.log(`\nWaiting for dispute window (${disputeWindow} seconds)...`);
    await new Promise(resolve => setTimeout(resolve, disputeWindow * 1000));

    await requester.releaseEscrowWithVerification(txId, attestation.uid);

    tx = await requester.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);
    console.log('Payment released securely with attestation verification!');

    // 10. Summary
    logSection('Summary');

    console.log('EAS Attestation Flow Completed:');
    console.log('✅ Generated delivery proof with content hash');
    console.log('✅ Created on-chain EAS attestation');
    console.log('✅ Anchored attestation UID to transaction');
    console.log('✅ Verified attestation before settlement');
    console.log('✅ Settled payment with automatic verification');
    console.log('');
    console.log('Security Benefits:');
    console.log('• Cryptographic proof of delivery on-chain');
    console.log('• Immutable timestamp and content hash');
    console.log('• Prevents submission of fake attestations');
    console.log('• Attestation can be verified by anyone');
    console.log('• Revocation support for disputes');
    console.log('');
    console.log('View attestation on Base Sepolia:');
    console.log(`https://base-sepolia.easscan.org/attestation/view/${attestation.uid}`);

    log('🎉', 'EAS attestation example complete!');

  } catch (error: any) {
    logError(error);
    process.exit(1);
  }
}

// Run example
main();
