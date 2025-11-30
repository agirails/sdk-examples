/**
 * Example 01: Happy Path - Complete Transaction Lifecycle
 *
 * This example demonstrates the complete flow of an ACTP transaction:
 * 1. Create transaction (requester = provider for self-testing)
 * 2. Fund transaction (approve USDC + link escrow)
 * 3. Transition to IN_PROGRESS (provider signals work started)
 * 4. Transition to DELIVERED (provider completes work)
 * 5. Release escrow (settle payment after dispute window)
 *
 * Gas costs (estimated on Base Sepolia):
 * - Create: ~85k gas (~$0.001)
 * - Fund: ~120k gas (~$0.001)
 * - Transitions: ~45k gas each (~$0.0005)
 * - Release: ~65k gas (~$0.0007)
 * Total: ~365k gas (~$0.004)
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
  sleep,
  handleNetworkError
} from '../src/utils/helpers';

async function main() {
  try {
    logSection('AGIRAILS SDK - Happy Path Example');

    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file. Copy .env.example to .env and add your key.');
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
    console.log(`Network: ${config.name} (Chain ID: ${config.chainId})`);
    console.log(`ACTPKernel: ${config.contracts.actpKernel}`);
    console.log(`EscrowVault: ${config.contracts.escrowVault}`);
    console.log(`USDC: ${config.contracts.usdc}`);

    // 2. Check USDC balance
    log('💰', 'Checking USDC balance...');
    const usdcBalance = await client.escrow.getTokenBalance(config.contracts.usdc, myAddress);
    console.log(`  Balance: ${formatUSDC(usdcBalance)}`);

    if (usdcBalance < parseUnits('10', 6)) {
      console.warn('\n⚠️  Low USDC balance! You need at least 10 USDC for this example.');
      console.warn('   Get testnet USDC from the faucet or contact the team.');
      return;
    }

    // 3. Create transaction (self-test: requester = provider)
    logSection('Step 1: Create Transaction');

    const amount = parseUnits('10', 6); // 10 USDC
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const disputeWindow = 120; // 2 minutes (short for testing, normally 2 hours)

    log('📝', 'Creating transaction...');
    const txId = await client.kernel.createTransaction({
      requester: myAddress,
      provider: myAddress, // Self-test: paying ourselves
      amount,
      deadline,
      disputeWindow
    });

    log('✅', `Transaction created!`);
    logTransaction(txId, myAddress, myAddress, amount);

    // Verify state
    let tx = await client.kernel.getTransaction(txId);
    console.log(`State: ${formatState(tx.state)}`);
    console.log(`Deadline: ${new Date(tx.deadline * 1000).toLocaleString()}`);
    console.log(`Dispute Window: ${tx.disputeWindow} seconds`);

    // 4. Fund transaction
    logSection('Step 2: Fund Transaction');

    log('💳', 'Approving USDC and linking escrow...');
    const escrowId = await client.fundTransaction(txId);
    log('✅', `Escrow linked!`);
    console.log(`Escrow ID: ${escrowId.substring(0, 10)}...${escrowId.substring(escrowId.length - 8)}`);

    // Verify state transition to COMMITTED
    tx = await client.kernel.getTransaction(txId);
    console.log(`State: ${formatState(tx.state)} (auto-transitioned)`);

    // Check escrow balance
    const escrowBalance = await client.escrow.getEscrowBalance(escrowId);
    console.log(`Escrow Balance: ${formatUSDC(escrowBalance)}`);

    // 5. Transition to IN_PROGRESS (optional state)
    logSection('Step 3: Provider Signals Work Started');

    log('🔨', 'Transitioning to IN_PROGRESS...');
    await client.kernel.transitionState(txId, State.IN_PROGRESS);

    tx = await client.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);

    // Simulate work being done
    log('⏳', 'Provider is working on the service... (simulating 5 seconds)');
    await sleep(5000);

    // 6. Transition to DELIVERED
    logSection('Step 4: Provider Delivers Result');

    log('📦', 'Transitioning to DELIVERED...');
    // In production, you would include proof data here (delivery hash, IPFS CID, etc.)
    await client.kernel.transitionState(txId, State.DELIVERED);

    tx = await client.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);
    console.log(`Delivered at: ${new Date().toLocaleString()}`);

    // 7. Wait for dispute window
    logSection('Step 5: Dispute Window');

    console.log(`Waiting for dispute window to pass (${disputeWindow} seconds)...`);
    console.log('During this time, the requester can raise a dispute if unsatisfied.');

    // Show countdown
    for (let i = disputeWindow; i > 0; i -= 10) {
      const remaining = Math.max(0, i);
      process.stdout.write(`\r⏳ Time remaining: ${remaining}s `);
      const sleepTime = Math.min(10, remaining) * 1000; // Sleep for min(10s, remaining)
      await sleep(sleepTime);
    }
    console.log('\n');

    log('✅', 'Dispute window passed without disputes.');

    // 8. Release escrow
    logSection('Step 6: Release Escrow (Settlement)');

    log('💸', 'Releasing escrow to provider...');
    await client.kernel.releaseEscrow(txId);

    tx = await client.kernel.getTransaction(txId);
    log('✅', `State: ${formatState(tx.state)}`);
    console.log('Payment settled! Funds released to provider.');

    // 9. Check final balances
    logSection('Final Summary');

    const finalUsdcBalance = await client.escrow.getTokenBalance(config.contracts.usdc, myAddress);
    console.log(`Final USDC Balance: ${formatUSDC(finalUsdcBalance)}`);

    const escrowData = await client.escrow.getEscrow(escrowId);
    console.log(`Escrow Released: ${escrowData.released ? '✅ Yes' : '❌ No'}`);

    // Get economic params to show fee
    const economicParams = await client.kernel.getEconomicParams();
    const feePercent = (economicParams.baseFeeNumerator / economicParams.baseFeeDenominator) * 100;
    const feeAmount = (amount * BigInt(economicParams.baseFeeNumerator)) / BigInt(economicParams.baseFeeDenominator);

    console.log(`\nPlatform Fee: ${feePercent}% (${formatUSDC(feeAmount)})`);
    console.log(`Provider Received: ${formatUSDC(amount - feeAmount)}`);

    log('🎉', 'Happy path complete! Transaction lifecycle successful.');

  } catch (error: any) {
    logError(error);
    process.exit(1);
  }
}

// Run example
main();
