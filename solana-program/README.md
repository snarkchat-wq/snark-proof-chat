# ZK Verifier Solana Program

On-chain ZK-SNARK proof verification for Groth16 proofs.

## Features

- Store verification results on Solana blockchain
- Validate proof structure and public signals
- Query verification status via PDA (Program Derived Address)
- Track total verifications globally

## Architecture

This program validates ZK proof metadata and stores verification results on-chain. For full cryptographic Groth16 verification (pairing checks), consider:
- Using Solana's syscalls for pairing operations (expensive)
- Integrating with Light Protocol for ZK primitives
- Pre-verifying off-chain and storing results

## Deployment

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### Build and Deploy

```bash
# Generate keypair (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Set to devnet
solana config set --url https://api.devnet.solana.com

# Airdrop SOL for deployment (devnet only)
solana airdrop 2

# Build the program
anchor build

# Get program ID
solana address -k target/deploy/zk_verifier-keypair.json

# Update Anchor.toml and lib.rs with the program ID

# Deploy
anchor deploy

# Initialize the program
# (See tests/ or use the frontend)
```

## Program Structure

### Instructions

1. **initialize**: Set up the global verifier state (one-time)
2. **verify_proof**: Submit and verify a ZK proof
3. **get_verification_status**: Query if a proof has been verified

### Accounts

- **VerifierState**: Global state tracking total verifications
- **VerificationAccount**: Per-proof verification result

### PDAs

- Verifier State: `["verifier-state"]`
- Verification Account: `["verification", proof_hash]`

## Integration with Frontend

Update your frontend to:

1. Connect to Solana wallet (already implemented)
2. Generate proof hash from the full proof
3. Call `verify_proof` instruction with proof metadata
4. Query verification status via `get_verification_status`

Example:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZkVerifier } from "./types/zk_verifier";

const programId = new PublicKey("YOUR_PROGRAM_ID");
const program = new Program<ZkVerifier>(IDL, programId);

// Submit proof for verification
const proofHash = sha256(JSON.stringify(proof));
const [verificationPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("verification"), Buffer.from(proofHash)],
  programId
);

await program.methods
  .verifyProof(
    Array.from(Buffer.from(proofHash, 'hex')),
    publicSignals,
    threshold,
    commitment
  )
  .accounts({
    verificationAccount: verificationPDA,
    verifierState: verifierStatePDA,
    verifier: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Cost Estimate

- Initialize: ~0.002 SOL (one-time)
- Verify proof: ~0.003-0.005 SOL per verification
- Query status: Free (read-only)

## Security Notes

⚠️ **Important**: This program validates proof structure and public signals but does NOT perform full cryptographic pairing verification due to computational limits. For production:

1. Use off-chain verification first (Vercel microservice)
2. Store results on-chain for transparency
3. Consider Light Protocol for native ZK support
4. Implement additional access controls

## Testing

```bash
anchor test
```

## License

MIT
