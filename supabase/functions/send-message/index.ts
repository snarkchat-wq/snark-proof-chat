import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'

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
  signature: string
  timestamp: number
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

    const { walletAddress, encryptedContent, proofData, signature, timestamp }: MessageRequest = await req.json()

    console.log('Received message from wallet:', walletAddress)
    console.log('Proof data:', proofData)
    console.log('Signature:', signature)

    // Verify signature to authenticate wallet ownership
    const authMessage = `SNARK:${walletAddress}:${timestamp}`
    const messageBytes = new TextEncoder().encode(authMessage)
    
    // Convert hex signature to Uint8Array
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    )
    
    // Convert base58 public key to bytes
    const publicKeyBytes = decodeBase58(walletAddress)
    
    const isValidSignature = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    )

    console.log('Signature verification:', isValidSignature ? 'VALID' : 'INVALID')

    if (!isValidSignature) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet signature - authentication failed' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const now = Date.now()
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Signature expired - please try again' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify token gating requirement
    const { data: tokenRequirements, error: tokenError } = await supabase
      .from('token_requirements')
      .select('token_mint_address, threshold_amount')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Token requirements:', tokenRequirements, 'Error:', tokenError)

    if (tokenRequirements) {
      // Check SPL token balance via Solana RPC
      const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
      const balanceResponse = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: tokenRequirements.token_mint_address },
            { encoding: 'jsonParsed' },
          ],
        }),
      })

      const balanceData = await balanceResponse.json()
      let totalBalance = 0

      if (balanceData.result && balanceData.result.value) {
        for (const account of balanceData.result.value) {
          const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0
          totalBalance += amount
        }
      }

      console.log(`Token balance check: ${totalBalance} / ${tokenRequirements.threshold_amount} required`)

      if (totalBalance < tokenRequirements.threshold_amount) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient token balance',
            balance: totalBalance,
            required: tokenRequirements.threshold_amount
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Verify zero-knowledge proof using dedicated verification function
    console.log('Verifying ZK proof...')
    
    const zkVerifyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-zk-proof`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          proof: proofData.proof,
          publicSignals: [
            proofData.publicInputs.threshold,
            proofData.publicInputs.commitment,
          ],
        }),
      }
    )

    const zkResult = await zkVerifyResponse.json()
    const isValidProof = zkResult.verified

    console.log('ZK proof verification result:', isValidProof ? 'VALID' : 'INVALID')

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
    const { data: messageData, error } = await supabase
      .from('messages')
      .insert({
        wallet_address: walletAddress,
        encrypted_content: encryptedContent,
        proof_data: proofData,
        verified: isValidProof && isValidSignature,
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

    console.log('Message stored successfully:', messageData.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: messageData,
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

// Helper function to decode base58 (Solana public key format)
function decodeBase58(str: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const ALPHABET_MAP = new Map(ALPHABET.split('').map((c, i) => [c, BigInt(i)]))
  
  let result = BigInt(0)
  for (const char of str) {
    const value = ALPHABET_MAP.get(char)
    if (value === undefined) throw new Error('Invalid base58 character')
    result = result * BigInt(58) + value
  }
  
  // Convert BigInt to Uint8Array (32 bytes for Solana public key)
  const bytes = new Uint8Array(32)
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(result & BigInt(0xff))
    result = result >> BigInt(8)
  }
  
  return bytes
}
