#!/bin/bash

# ZK Circuit Setup Script
# This compiles the Circom circuit and generates proving/verification keys

set -e

CIRCUIT_NAME="tokenBalance"
CIRCUIT_DIR="circuits"
BUILD_DIR="circuits/build"
PUBLIC_DIR="public/zkp"

echo "🔧 Starting ZK Circuit Setup..."

# Create directories
mkdir -p $BUILD_DIR
mkdir -p $PUBLIC_DIR

echo "📦 Installing circomlib..."
npm install --save-dev circomlib

echo "🔨 Compiling circuit..."
circom2 $CIRCUIT_DIR/$CIRCUIT_NAME.circom --r1cs --wasm --sym -o $BUILD_DIR

echo "📥 Downloading Powers of Tau (Phase 1 trusted setup)..."
# Using Hermez's ceremony (perpetual powers of tau)
if [ ! -f $BUILD_DIR/powersOfTau28_hez_final_12.ptau ]; then
    wget -O $BUILD_DIR/powersOfTau28_hez_final_12.ptau \
        https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
fi

echo "🔑 Generating proving key (Phase 2)..."
# Generate zkey (proving key) from Powers of Tau
npx snarkjs groth16 setup \
    $BUILD_DIR/$CIRCUIT_NAME.r1cs \
    $BUILD_DIR/powersOfTau28_hez_final_12.ptau \
    $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey

echo "🎲 Adding random beacon for extra security..."
# Add random contribution (you can add more contributions for production)
npx snarkjs zkey contribute \
    $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey \
    $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
    --name="First contribution" \
    -e="$(openssl rand -hex 32)"

echo "📋 Exporting verification key..."
npx snarkjs zkey export verificationkey \
    $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
    $BUILD_DIR/verification_key.json

echo "📂 Copying files to public directory..."
# Copy WASM and final zkey to public directory for browser access
cp $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm $PUBLIC_DIR/
cp $BUILD_DIR/${CIRCUIT_NAME}_final.zkey $PUBLIC_DIR/
cp $BUILD_DIR/verification_key.json $PUBLIC_DIR/

echo "✅ Setup complete!"
echo ""
echo "Generated files:"
echo "  - $PUBLIC_DIR/${CIRCUIT_NAME}.wasm (circuit WASM)"
echo "  - $PUBLIC_DIR/${CIRCUIT_NAME}_final.zkey (proving key)"
echo "  - $PUBLIC_DIR/verification_key.json (verification key)"
echo ""
echo "⚠️  IMPORTANT: Add these files to git LFS or host separately!"
echo "   The .zkey file is typically 5-50MB depending on circuit size."
