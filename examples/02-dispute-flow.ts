/**
 * Example 02: Dispute Flow
 *
 * This example demonstrates how disputes work in ACTP:
 * 1. Create and fund transaction
 * 2. Provider delivers work
 * 3. Requester raises dispute (unsatisfied with delivery)
 * 4. Show dispute state and resolution process
 *
 * Note: Actual dispute resolution requires mediator role (admin).
 * This example shows how to raise a dispute from the requester side.
 */

import 'dotenv/config';
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';
import {
  logSection,
  log,
  logTransaction,
  formatState,
  formatUSDC,
  logError,
  handleNetworkError
} from '../src/utils/helpers';

async function main() {
  try {
    logSection('AGIRAILS SDK - Dispute Flow Example');

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }

    // 1. Initialize client
    log('🔧', 'Initializing ACTP Client...');
    let client;
    try {
      client = await ACTPClient.create({
        network: 'base-sepolia',
        privateKey: process.env.PRIVATE_KEY
      });
    } catch (error) {
      handleNetworkError(error);
    }

    const myAddress = await client.getAddress();
    log('✅', `Connected as: ${myAddress}`);

    const config = client.getNetworkConfig();
    console.log(`Network: ${config.name}`);

    // 2. Check USDC balance
    const usdcBalance = await client.escrow.getTokenBalance(config.contracts.usdc, myAddress);
    console.log(`USDC Balance: ${formatUSDC(usdcBalance)}`);

    if (usdcBalance < parseUnits('5', 6)) {
      console.warn('\n⚠️  Insufficient USDC balance for this example.');
      return;
    }

    // 3. Create transaction
    logSection('Step 1: Create & Fund Transaction');

    const amount = parseUnits('5', 6); // 5 USDC
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const disputeWindow = 300; // 5 minutes for testing

    log('📝', 'Creating transaction...');
    const txId = await client.kernel.createTransaction({
      requester: myAddress,
      provider: myAddress, // Self-test
      amount,
      deadline,
      disputeWindow
    });

    log('✅', 'Transaction created!');
    logTransaction(txId, myAddress, myAddress, amount);

    // 4. Fund transaction
    log('💳', 'Funding transaction...');
    const escrowId = await client.fundTransaction(txId);
    log('✅', `Escrow linked: ${escrowId.substring(0, 10)}...`);

    let tx = await client.kernel.getTransaction(txId);
    console.log(`State: ${formatState(tx.state)}`);

    // 5. Provider delivers
    logSection('Step 2: Provider Delivers Work');

    log('📦', 'Transitioning to DELIVERED...');
    await client.kernel.transitionState(txId, State.DELIVERED);

    tx = await client.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);

    // 6. Requester raises dispute
    logSection('Step 3: Requester Raises Dispute');

    console.log('\n⚠️  Scenario: Requester is unsatisfied with the delivered work.\n');

    const disputeReason = 'Work does not meet specifications';
    const disputeEvidence = 'ipfs://QmExampleEvidenceHash123'; // In production, upload evidence to IPFS

    log('🚨', 'Raising dispute...');
    console.log(`  Reason: ${disputeReason}`);
    console.log(`  Evidence: ${disputeEvidence}`);

    await client.kernel.raiseDispute(txId, disputeReason, disputeEvidence);

    tx = await client.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);

    // 7. Explain next steps
    logSection('Dispute Resolution Process');

    console.log('The transaction is now in DISPUTED state.');
    console.log('');
    console.log('What happens next:');
    console.log('1. Both parties can present evidence');
    console.log('2. A mediator (admin role) reviews the dispute');
    console.log('3. Mediator calls resolveDispute() with payment split:');
    console.log('   - requesterAmount: Refund to requester');
    console.log('   - providerAmount: Payment to provider');
    console.log('   - mediatorAmount: Mediator fee (optional)');
    console.log('');
    console.log('Example resolution scenarios:');
    console.log('');
    console.log('• Requester wins (100% refund):');
    console.log(`  requesterAmount: ${formatUSDC(amount)}`);
    console.log('  providerAmount: $0');
    console.log('');
    console.log('• Provider wins (100% payment):');
    console.log('  requesterAmount: $0');
    console.log(`  providerAmount: ${formatUSDC(amount)}`);
    console.log('');
    console.log('• Split 50/50:');
    console.log(`  requesterAmount: ${formatUSDC(amount / 2n)}`);
    console.log(`  providerAmount: ${formatUSDC(amount / 2n)}`);
    console.log('');

    // 8. Show code for resolution (mediator only)
    logSection('Dispute Resolution Code (Mediator Only)');

    console.log('To resolve this dispute, a mediator would run:');
    console.log('');
    console.log('```typescript');
    console.log('const mediatorClient = await ACTPClient.create({');
    console.log('  network: "base-sepolia",');
    console.log('  privateKey: process.env.MEDIATOR_PRIVATE_KEY');
    console.log('});');
    console.log('');
    console.log('// Example: 70% to provider, 30% refund to requester');
    console.log('await mediatorClient.kernel.resolveDispute(txId, {');
    console.log(`  requesterAmount: parseUnits('1.5', 6), // 30%`);
    console.log(`  providerAmount: parseUnits('3.5', 6),  // 70%`);
    console.log('  mediatorAmount: 0n');
    console.log('});');
    console.log('```');
    console.log('');

    // 9. Summary
    logSection('Summary');

    console.log('Dispute Flow Demonstrated:');
    console.log('✅ Transaction created and funded');
    console.log('✅ Provider delivered work');
    console.log('✅ Requester raised dispute with reason and evidence');
    console.log('⏳ Awaiting mediator resolution');
    console.log('');
    console.log('Transaction Details:');
    console.log(`  ID: ${txId.substring(0, 10)}...`);
    console.log(`  State: ${formatState(tx.state)}`);
    console.log(`  Amount: ${formatUSDC(amount)}`);
    console.log(`  Dispute Window: ${disputeWindow} seconds`);
    console.log('');
    console.log('Note: Only authorized mediators can call resolveDispute().');
    console.log('      The mediator address is configured in the ACTPKernel contract.');

  } catch (error: any) {
    logError(error);
    process.exit(1);
  }
}

// Run example
main();
