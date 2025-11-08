import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZKProofVerificationRequest {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proof, publicSignals } = await req.json() as ZKProofVerificationRequest;

    console.log('📥 Received ZK proof verification request');
    console.log('Public signals:', publicSignals);

    // Load verification key from environment or fetch from storage
    // In production, this should be loaded from a secure location
    const vkeyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/zkp/verification_key.json`
    );
    
    if (!vkeyResponse.ok) {
      throw new Error('Verification key not found');
    }
    
    const vkey = await vkeyResponse.json();

    // Import snarkjs for verification
    // Note: Using default import for Deno compatibility
    // @ts-ignore - Dynamic import with ESM compatibility
    const snarkjsModule = await import('https://esm.sh/snarkjs@0.7.0');
    // @ts-ignore
    const snarkjs = snarkjsModule.default || snarkjsModule;

    console.log('🔐 Verifying ZK proof...');
    
    // Verify the proof
    // @ts-ignore
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Invalid zero-knowledge proof' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract public signals
    const threshold = publicSignals[0];
    const commitment = publicSignals[1];

    console.log(`✅ Proof verified! Threshold: ${threshold}, Commitment: ${commitment}`);

    return new Response(
      JSON.stringify({
        verified: true,
        publicSignals: {
          threshold,
          commitment,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error verifying ZK proof:', error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
