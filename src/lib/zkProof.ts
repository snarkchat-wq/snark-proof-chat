import { getTokenRequirements } from './tokenGating';

// SnarkJS will be loaded dynamically
let snarkjs: any = null;

export async function loadSnarkJS() {
  if (!snarkjs) {
    // @ts-ignore - Dynamic import for large library
    snarkjs = await import('snarkjs');
  }
  return snarkjs;
}

export interface ZKProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

/**
 * Generate a ZK proof that the wallet holds sufficient tokens
 * without revealing the exact balance
 */
export async function generateTokenBalanceProof(
  walletAddress: string
): Promise<ZKProofData> {
  console.log('🔐 Generating ZK proof for token balance...');
  
  try {
    // Load SnarkJS library
    const snarkjs = await loadSnarkJS();
    
    // Get token requirements from database
    const requirements = await getTokenRequirements();
    if (!requirements) {
      throw new Error('Token requirements not configured');
    }
    
    console.log('🌐 Fetching balance via backend to avoid CORS/rate-limits...');
    
    // Use backend edge function to get balance (avoids browser CORS/rate-limit issues)
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: balanceData, error: balanceError } = await supabase.functions.invoke(
      'verify-token-balance',
      {
        body: {
          walletAddress,
          tokenMintAddress: requirements.token_mint_address,
        },
      }
    );

    if (balanceError) {
      console.error('❌ Backend balance check failed:', balanceError);
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }

    if (!balanceData) {
      throw new Error('No balance data returned from backend');
    }

    const actualBalance = Number(balanceData.balance ?? 0);
    const requiredThreshold = Number(balanceData.required ?? requirements.threshold_amount);
    
    console.log(`Balance: ${actualBalance}, Required: ${requiredThreshold}`);
    
    if (actualBalance < requiredThreshold) {
      throw new Error(`Insufficient balance: ${actualBalance} < ${requiredThreshold}`);
    }
    
    // Generate random salt for commitment
    const salt = BigInt('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));
    
    // Convert balance to integer (handling decimals)
    const balanceInt = Math.floor(actualBalance);
    
    // Calculate commitment: Poseidon(balance, salt)
    // Note: This would normally use the Poseidon hash from circomlibjs
    // For now, we'll compute it using the circuit itself
    // Load Poseidon hash from circomlibjs (browser-safe)
    // @ts-ignore - Dynamic import
    const circomlib = await import('circomlibjs');
    const buildPoseidon = (circomlib as any).buildPoseidon || (circomlib as any).default?.buildPoseidon;
    if (!buildPoseidon) {
      throw new Error('circomlibjs.buildPoseidon not available');
    }
    const poseidon = await buildPoseidon();
    const commitmentEl = poseidon([BigInt(balanceInt), salt]);
    const commitment = poseidon.F.toString(commitmentEl);
    
    // Prepare circuit inputs
    const input = {
      actualBalance: balanceInt.toString(),
      salt: salt.toString(),
      threshold: requiredThreshold.toString(),
      commitment: commitment,
    };
    
    console.log('📝 Prepared circuit inputs (private data hidden)');
    
    // Load circuit files
    const wasmPath = '/zkp/tokenBalance.wasm';
    const zkeyPath = '/zkp/tokenBalance_final.zkey';
    
    console.log('⚙️  Generating witness...');
    
    // Generate witness
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    
    console.log('✅ ZK Proof generated successfully!');
    console.log('Public signals:', publicSignals);
    
    return {
      proof,
      publicSignals,
    };
    
  } catch (error) {
    console.error('❌ Error generating ZK proof:', error);
    throw new Error(`ZK proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify a ZK proof (client-side verification)
 * Backend should also verify!
 */
export async function verifyTokenBalanceProof(
  proofData: ZKProofData
): Promise<boolean> {
  try {
    const snarkjs = await loadSnarkJS();
    
    // Load verification key
    const vkeyResponse = await fetch('/zkp/verification_key.json');
    const vkey = await vkeyResponse.json();
    
    // Verify proof
    const verified = await snarkjs.groth16.verify(
      vkey,
      proofData.publicSignals,
      proofData.proof
    );
    
    return verified;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

/**
 * Format proof data for display
 */
export function formatProofForDisplay(proofData: ZKProofData): string {
  return JSON.stringify({
    proof: {
      pi_a: proofData.proof.pi_a.map(v => v.substring(0, 20) + '...'),
      pi_b: proofData.proof.pi_b.map(arr => arr.map(v => v.substring(0, 20) + '...')),
      pi_c: proofData.proof.pi_c.map(v => v.substring(0, 20) + '...'),
    },
    publicSignals: proofData.publicSignals,
  }, null, 2);
}
