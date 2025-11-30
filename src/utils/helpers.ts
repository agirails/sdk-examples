/**
 * Shared utilities for AGIRAILS SDK examples
 */

import { State } from '@agirails/sdk';
import { formatUnits } from 'ethers';

/**
 * Format USDC amount (6 decimals) to human-readable string
 */
export function formatUSDC(amount: bigint): string {
  return `$${formatUnits(amount, 6)} USDC`;
}

/**
 * Get colored state name for terminal output
 */
export function formatState(state: State): string {
  const colors = {
    [State.INITIATED]: '\x1b[33m',    // Yellow
    [State.QUOTED]: '\x1b[36m',       // Cyan
    [State.COMMITTED]: '\x1b[34m',    // Blue
    [State.IN_PROGRESS]: '\x1b[35m',  // Magenta
    [State.DELIVERED]: '\x1b[32m',    // Green
    [State.SETTLED]: '\x1b[32m\x1b[1m', // Bold Green
    [State.DISPUTED]: '\x1b[31m',     // Red
    [State.CANCELLED]: '\x1b[90m'     // Gray
  };

  const reset = '\x1b[0m';
  const color = colors[state] || '';
  return `${color}${State[state]}${reset}`;
}

/**
 * Log with timestamp and formatting
 */
export function log(emoji: string, message: string, details?: any) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${emoji} [${timestamp}] ${message}`);
  if (details) {
    console.log('  ', details);
  }
}

/**
 * Log section header
 */
export function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Log transaction info
 */
export function logTransaction(txId: string, requester: string, provider: string, amount: bigint) {
  console.log(`Transaction ID: ${txId.substring(0, 10)}...${txId.substring(txId.length - 8)}`);
  console.log(`Requester: ${requester.substring(0, 6)}...${requester.substring(requester.length - 4)}`);
  console.log(`Provider: ${provider.substring(0, 6)}...${provider.substring(provider.length - 4)}`);
  console.log(`Amount: ${formatUSDC(amount)}`);
}

/**
 * Log error with formatting
 */
export function logError(error: any) {
  console.error('\n\x1b[31m❌ ERROR:\x1b[0m', error.message);
  if (error.details) {
    console.error('Details:', error.details);
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get shortened address for display
 */
export function shortAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Get shortened transaction ID for display
 */
export function shortTxId(txId: string): string {
  return `${txId.substring(0, 10)}...${txId.substring(txId.length - 8)}`;
}

/**
 * Format timestamp to human-readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Calculate time until deadline
 */
export function timeUntilDeadline(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;

  if (diff <= 0) return 'EXPIRED';

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Handle network validation errors with user-friendly messages
 */
export function handleNetworkError(error: any): never {
  if (error.message?.includes('not yet deployed')) {
    console.error('\n\x1b[31m❌ NETWORK ERROR:\x1b[0m Contracts not deployed');
    console.error('\nThe ACTP contracts are not deployed to this network yet.');
    console.error('Please ensure you are using Base Sepolia testnet.\n');
    console.error('Solutions:');
    console.error('  1. Verify network in your .env or code');
    console.error('  2. Deploy contracts to the network first');
    console.error('  3. Contact AGIRAILS team on Discord\n');
    process.exit(1);
  }
  throw error;
}
