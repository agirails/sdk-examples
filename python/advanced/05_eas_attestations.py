#!/usr/bin/env python3
"""
Advanced API Example 05: EAS Attestations

Demonstrates Ethereum Attestation Service (EAS) integration
for verifiable delivery proofs.

EAS provides:
- On-chain proof of delivery
- Verifiable provider attestations
- Replay protection

This example demonstrates:
- Creating delivery proof attestations
- Verifying attestations
- Attestation-gated escrow release

Note: EAS is available on Base Sepolia and Base Mainnet.
Run: python advanced/05_eas_attestations.py
"""

import asyncio
import sys
import time
import hashlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_state


async def main() -> None:
    log_section("AGIRAILS Advanced API - EAS Attestations")

    clear_mock_state()

    from agirails import ACTPClient, ProofGenerator, DeliveryProofBuilder

    # =====================================================
    # Part 1: Understanding Delivery Proofs (Mock Mode)
    # =====================================================
    log_section("Part 1: Delivery Proofs")

    log("📝", "Creating a delivery proof...")

    # Generate a delivery proof using fluent builder API
    tx_id = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    provider_address = "0x2222222222222222222222222222222222222222"
    consumer_address = "0x1111111111111111111111111111111111111111"
    deliverable = {
        "result": "Translation completed",
        "wordCount": 500,
        "quality": "high",
    }

    proof = (
        DeliveryProofBuilder()
        .for_transaction(tx_id)
        .from_provider(provider_address)
        .for_consumer(consumer_address)
        .with_output(deliverable)
        .with_result_cid("ipfs://QmYourDeliverableHash")
        .build()
    )

    print("Delivery Proof Structure:")
    print(f"  Transaction ID: {proof.tx_id[:16]}...")
    print(f"  Provider: {proof.provider[:16]}...")
    print(f"  Result Hash: {proof.result_hash[:16]}...")
    print(f"  Delivered At: {proof.delivered_at}")
    print()

    # =====================================================
    # Part 2: EIP-712 Typed Data (Conceptual)
    # =====================================================
    log_section("Part 2: EIP-712 Typed Data")

    log("🔧", "EIP-712 Typed Data for signed attestations...")

    print("EIP-712 Typed Data Structure:")
    print("```python")
    print("# DeliveryProofBuilder creates EIP-712 typed data")
    print("typed_data = {")
    print("    'domain': {")
    print("        'name': 'ACTP Protocol',")
    print("        'version': '1',")
    print("        'chainId': 84532,  # Base Sepolia")
    print("    },")
    print("    'primaryType': 'DeliveryProof',")
    print("    'types': {")
    print("        'DeliveryProof': [")
    print("            {'name': 'txId', 'type': 'bytes32'},")
    print("            {'name': 'providerDID', 'type': 'string'},")
    print("            {'name': 'outputHash', 'type': 'bytes32'},")
    print("            {'name': 'timestamp', 'type': 'uint256'},")
    print("            {'name': 'nonce', 'type': 'bytes32'},")
    print("        ]")
    print("    }")
    print("}")
    print("```")
    print()

    # =====================================================
    # Part 3: EAS Integration (testnet/mainnet)
    # =====================================================
    log_section("Part 3: EAS Integration")

    print("EAS integration is available in testnet/mainnet mode.")
    print()
    print("Configuration:")
    print("```python")
    print("client = await ACTPClient.create(")
    print("    mode='testnet',")
    print("    requester_address=wallet_address,")
    print("    private_key=private_key,")
    print("    eas_config={")
    print("        'contract_address': '0x4200000000000000000000000000000000000021',")
    print("        'schema_uid': '0x1b0ebdf0...',")
    print("    },")
    print("    require_attestation=True,  # Enforce attestation before release")
    print(")")
    print("```")
    print()

    # =====================================================
    # Part 4: Mock Transaction with Proof
    # =====================================================
    log_section("Part 4: Transaction with Delivery Proof")

    requester_address = "0x1111111111111111111111111111111111111111"
    provider_address = "0x2222222222222222222222222222222222222222"

    log("🔧", "Creating client in mock mode...")
    client = await ACTPClient.create(
        mode="mock",
        requester_address=requester_address,
    )

    await client.mint_tokens(requester_address, 100_000_000)

    log("📝", "Creating transaction...")
    tx_id = await client.standard.create_transaction({
        "provider": provider_address,
        "amount": 50,
        "deadline": "+2h",
        "dispute_window": 3600,  # 1 hour (minimum)
    })

    print(f"   Transaction: {tx_id[:16]}...")

    log("💳", "Linking escrow...")
    await client.standard.link_escrow(tx_id)

    log("📦", "Provider completes work and creates proof...")

    # Provider generates delivery proof using fluent builder
    delivery_proof = (
        DeliveryProofBuilder()
        .for_transaction(tx_id)
        .from_provider(provider_address)
        .for_consumer(requester_address)
        .with_output({"result": "AI analysis completed"})
        .with_result_cid("ipfs://QmResultHash")
        .build()
    )

    print("   Proof generated:")
    print(f"     Result Hash: {delivery_proof.result_hash[:20]}...")

    log("✅", "Transitioning to DELIVERED with proof...")
    await client.standard.transition_state(tx_id, "DELIVERED")

    tx = await client.standard.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    # =====================================================
    # Part 5: Attestation Workflow (conceptual)
    # =====================================================
    log_section("Part 5: Attestation Workflow")

    print("Complete attestation workflow (testnet/mainnet):")
    print()
    print("1. Provider completes work")
    print("   └─ Generates delivery proof with content hash")
    print()
    print("2. Provider creates EAS attestation")
    print("   └─ Attests: 'I delivered X for transaction Y'")
    print("   └─ Returns: attestation_uid")
    print()
    print("3. Provider transitions to DELIVERED")
    print("   └─ Includes attestation_uid in state transition")
    print()
    print("4. Requester verifies attestation")
    print("   └─ Checks: attestation exists, not revoked, correct schema")
    print("   └─ Checks: content hash matches deliverable")
    print()
    print("5. Escrow release")
    print("   └─ With require_attestation=True, SDK verifies attestation")
    print("   └─ Prevents replay via UsedAttestationTracker")
    print("   └─ Funds released to provider")
    print()

    # =====================================================
    # Part 6: Security Considerations
    # =====================================================
    log_section("Part 6: Security Considerations")

    print("Security features in attestation flow:")
    print()
    print("1. Content Hash Verification")
    print("   - Deliverable is hashed before attestation")
    print("   - Hash included in attestation data")
    print("   - Requester can verify content matches hash")
    print()
    print("2. Replay Protection")
    print("   - Each attestation_uid can only be used once")
    print("   - UsedAttestationTracker prevents double-spending")
    print("   - Persists across restarts (file-based)")
    print()
    print("3. Schema Validation")
    print("   - Only attestations with correct schema accepted")
    print("   - Schema defines required fields (txId, contentHash, etc.)")
    print()
    print("4. Attester Verification")
    print("   - Attestation must be from transaction provider")
    print("   - Prevents third-party attestation fraud")

    log("🎉", "EAS attestations demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
