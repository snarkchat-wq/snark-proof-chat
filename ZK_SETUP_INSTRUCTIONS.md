# Zero-Knowledge Proof Setup Instructions

This guide will help you set up the ZK proof system for token balance verification.

## Prerequisites

Install these tools locally (not in Lovable):

```bash
# Install Circom compiler
npm install -g circom

# Install SnarkJS CLI
npm install -g snarkjs
```

## Setup Steps

### 1. Run the Setup Script

The setup script will:
- Compile the Circom circuit
- Download Powers of Tau (trusted setup)
- Generate proving and verification keys
- Export files for browser use

```bash
# Make script executable
chmod +x circuits/setup.sh

# Run setup (takes 5-10 minutes)
./circuits/setup.sh
```

### 2. Verify Generated Files

After setup completes, verify these files exist:

```
public/zkp/
├── tokenBalance.wasm           (~500KB - circuit WASM)
├── tokenBalance_final.zkey     (~5-20MB - proving key)
└── verification_key.json       (~2KB - verification key)
```

### 3. Upload Verification Key to Supabase Storage

The backend needs access to the verification key:

1. Go to your Supabase project
2. Navigate to Storage
3. Create a new bucket called `zkp` (public bucket)
4. Upload `public/zkp/verification_key.json` to the bucket

### 4. Git LFS Setup (Optional but Recommended)

The `.zkey` file is large (5-20MB). Use Git LFS:

```bash
# Install Git LFS
git lfs install

# Track large ZK files
git lfs track "public/zkp/*.zkey"
git lfs track "public/zkp/*.wasm"

# Commit
git add .gitattributes
git commit -m "Add Git LFS for ZK files"
```

### 5. Test the System

1. Connect your Phantom wallet
2. Ensure you have >= 10,000 tokens
3. Try sending a message
4. Watch the console for ZK proof generation (3-5 seconds)

## How It Works

### Circuit Design

```
Inputs:
  - actualBalance (private): Your real token balance
  - salt (private): Random number for commitment
  - threshold (public): Minimum required (10,000)
  - commitment (public): Poseidon(balance, salt)

Constraints:
  1. commitment === Poseidon(actualBalance, salt)
  2. actualBalance >= threshold

Output:
  - Proof that you have enough tokens
  - WITHOUT revealing your exact balance
```

### Proof Generation Flow

```
Client Browser:
  1. Fetch token balance from Solana (750 tokens)
  2. Generate random salt
  3. Calculate commitment = Poseidon(750, salt)
  4. Create circuit inputs (private + public)
  5. Generate ZK proof using WASM circuit
  6. Send proof + public signals to backend

Backend:
  1. Receive proof + public signals (threshold, commitment)
  2. Verify proof using verification key
  3. Accept if valid (doesn't know actual balance!)
  4. Reject if invalid
```

## Troubleshooting

### "Verification key not found" Error

**Solution:** Upload `verification_key.json` to Supabase Storage in the `zkp` bucket.

### "Circuit file not found" Error

**Solution:** Ensure `public/zkp/tokenBalance.wasm` and `public/zkp/tokenBalance_final.zkey` exist.

### Proof Generation Takes Too Long (>10 seconds)

**Possible causes:**
- Large circuit size (reduce constraints if possible)
- Slow device (proof generation is CPU-intensive)
- Missing WASM file

### "Invalid proof" Error

**Possible causes:**
- Balance changed between proof generation and verification
- Corrupted circuit files
- Incorrect public signals

## Security Notes

### Trusted Setup

The current setup uses Hermez's Powers of Tau ceremony, which is secure if at least ONE participant was honest.

For production, consider:
- Running your own ceremony with multiple participants
- Using a more recent ceremony
- Documenting the ceremony hash for transparency

### Privacy Guarantees

✅ **What's Private:**
- Your exact token balance
- Transaction history
- Other tokens you hold

❌ **What's NOT Private:**
- That you meet the threshold (binary yes/no)
- Your wallet address (required for signature)
- The threshold amount (public parameter)

### Performance Considerations

- **Proof generation:** 3-5 seconds (client-side)
- **Proof verification:** <100ms (backend)
- **Circuit size:** ~5MB (one-time download)
- **Memory usage:** ~50-100MB during proof generation

## Advanced: Customizing the Circuit

To modify the circuit (e.g., change threshold, add more constraints):

1. Edit `circuits/tokenBalance.circom`
2. Run `./circuits/setup.sh` again
3. Upload new verification key to Supabase

Example: Add maximum balance constraint:

```circom
// Add to circuit
component lte = LessEqThan(64);
lte.in[0] <== actualBalance;
lte.in[1] <== maxBalance;
lte.out === 1;
```

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Guide](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Explained](https://z.cash/technology/zksnarks/)
- [Powers of Tau Ceremony](https://github.com/iden3/snarkjs#7-prepare-phase-2)
