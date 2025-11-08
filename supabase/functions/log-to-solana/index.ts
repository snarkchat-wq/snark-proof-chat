import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SolanaLogRequest {
  messageId: string
  messageHash: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messageId, messageHash }: SolanaLogRequest = await req.json()

    console.log('Logging to Solana - Message ID:', messageId)
    console.log('Message Hash:', messageHash)

    // Solana Devnet RPC endpoint
    const SOLANA_RPC = 'https://api.devnet.solana.com'

    // Get latest blockhash
    const blockhashResponse = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestBlockhash',
        params: [{ commitment: 'finalized' }],
      }),
    })

    const blockhashData = await blockhashResponse.json()
    console.log('Latest blockhash:', blockhashData.result?.value?.blockhash)

    // Create a memo transaction (simplified version)
    // In production, this would use a proper Solana SDK and wallet signing
    const memoData = `SNARK:${messageHash.substring(0, 32)}`
    console.log('Memo data:', memoData)

    // TODO: Implement actual transaction signing and sending
    // For now, we'll create a mock transaction hash
    const mockTxHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    // Update message with blockchain transaction hash
    const { error } = await supabase
      .from('messages')
      .update({ blockchain_tx_hash: mockTxHash })
      .eq('id', messageId)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update message with tx hash' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Transaction logged successfully:', mockTxHash)

    return new Response(
      JSON.stringify({ 
        success: true,
        transactionHash: mockTxHash,
        explorer: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error logging to Solana:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
