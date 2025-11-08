import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessageRequest {
  walletAddress: string
  encryptedContent: string
  proofData: {
    proof: string
    publicInputs: any
  }
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

    const { walletAddress, encryptedContent, proofData }: MessageRequest = await req.json()

    console.log('Received message from wallet:', walletAddress)
    console.log('Proof data:', proofData)

    // TODO: Implement actual zero-knowledge proof verification
    // For now, we'll accept all proofs as valid
    const isValidProof = true

    if (!isValidProof) {
      return new Response(
        JSON.stringify({ error: 'Invalid zero-knowledge proof' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert message into database
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        wallet_address: walletAddress,
        encrypted_content: encryptedContent,
        proof_data: proofData,
        verified: isValidProof,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store message' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Message stored successfully:', message.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error processing message:', error)
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
