import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface TokenBalanceRequest {
  walletAddress: string;
  tokenMintAddress: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { walletAddress, tokenMintAddress } = await req.json() as TokenBalanceRequest;

    // Get token balance from Solana
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          {
            mint: tokenMintAddress,
          },
          {
            encoding: 'jsonParsed',
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Solana RPC error: ${data.error.message}`);
    }

    // Calculate total balance from all token accounts
    let totalBalance = 0;
    if (data.result && data.result.value) {
      for (const account of data.result.value) {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        totalBalance += amount;
      }
    }

    // Get latest token requirements
    const { data: requirements, error: reqError } = await supabase
      .from('token_requirements')
      .select('threshold_amount')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reqError) {
      throw new Error(`Failed to fetch token requirements: ${reqError.message}`);
    }

    const requiredThreshold = (requirements?.threshold_amount ?? 0) as number;

    const hasAccess = totalBalance >= requiredThreshold;

    return new Response(
      JSON.stringify({
        balance: totalBalance,
        required: requiredThreshold,
        hasAccess,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error verifying token balance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
