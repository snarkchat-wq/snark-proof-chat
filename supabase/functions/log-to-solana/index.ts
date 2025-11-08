import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SolanaLogRequest {
  messageId: string
  messageHash: string
  transactionSignature: string
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

    const { messageId, messageHash, transactionSignature }: SolanaLogRequest = await req.json()

    console.log('Logging to Solana - Message ID:', messageId)
    console.log('Message Hash:', messageHash)
    console.log('Transaction signature:', transactionSignature)

    // Verify transaction on Solana Mainnet
    const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
    
    const verifyResponse = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          transactionSignature,
          { encoding: 'json', maxSupportedTransactionVersion: 0 }
        ],
      }),
    })

    const txData = await verifyResponse.json()
    
    if (txData.error) {
      console.error('Transaction verification failed:', txData.error)
      return new Response(
        JSON.stringify({ error: 'Transaction not found on blockchain' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Transaction verified on Solana:', txData.result)

    // Update message with blockchain transaction hash
    const { error } = await supabase
      .from('messages')
      .update({ blockchain_tx_hash: transactionSignature })
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

    console.log('Transaction logged successfully:', transactionSignature)

    return new Response(
      JSON.stringify({ 
        success: true,
        transactionSignature,
        explorer: `https://explorer.solana.com/tx/${transactionSignature}`,
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
