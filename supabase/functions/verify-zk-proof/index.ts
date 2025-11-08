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
  // Optional: full verification key JSON (as shipped in public/zkp/verification_key.json)
  vkey?: unknown;
  // Optional: full URL to a verifier service (e.g., Vercel function)
  verifierUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proof, publicSignals, vkey, verifierUrl } = await req.json() as ZKProofVerificationRequest;

    console.log('📥 Received ZK proof verification request');
    console.log('Public signals:', publicSignals);

    // Basic validation of proof structure
    if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Invalid proof structure' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!publicSignals || publicSignals.length < 2) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Invalid public signals' 
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

console.log(`✅ Proof structure valid! Threshold: ${threshold}, Commitment: ${commitment}`);

// If an external verifier URL and vkey are provided, forward for full cryptographic verification
if (verifierUrl && vkey) {
  try {
    console.log('🔗 Forwarding to external verifier:', verifierUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const resp = await fetch(verifierUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof, publicSignals, vkey }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await resp.json().catch(() => ({} as any));

    if (!resp.ok) {
      console.error('❌ External verifier error:', data?.error || resp.statusText);
      return new Response(
        JSON.stringify({
          verified: false,
          error: data?.error || 'External verifier failed',
          status: resp.status,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ External verifier result:', data?.verified);
    return new Response(
      JSON.stringify({
        verified: Boolean(data?.verified),
        timestamp: data?.timestamp || new Date().toISOString(),
        publicSignals: { threshold, commitment },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('❌ Error calling external verifier:', err);
    return new Response(
      JSON.stringify({
        verified: false,
        error: err instanceof Error ? err.message : 'External verifier unreachable',
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Fallback: structural validation only (no cryptographic verification)
return new Response(
  JSON.stringify({
    verified: true,
    publicSignals: { threshold, commitment },
    note: 'Structural validation only; provide verifierUrl and vkey for full verification.'
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
