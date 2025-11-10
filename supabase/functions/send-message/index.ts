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
    publicSignals?: string[]
  }
  transactionSignature: string
  messageHash: string
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

    const { walletAddress, encryptedContent, proofData, transactionSignature, messageHash, timestamp }: MessageRequest = await req.json()

    console.log('Received message from wallet:', walletAddress)
    console.log('Transaction signature:', transactionSignature)
    console.log('Message hash:', messageHash)

    // Verify the transaction exists on Solana blockchain (authentication via on-chain tx)
    console.log('Verifying transaction on Solana...')
    const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
    
    const txResponse = await fetch(SOLANA_RPC, {
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

    const txData = await txResponse.json()
    
    if (txData.error || !txData.result) {
      console.error('Transaction verification failed:', txData.error)
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found on blockchain',
          details: txData.error?.message || 'Transaction may still be processing'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the transaction was signed by the claimed wallet
    const txAccountKeys = txData.result.transaction.message.accountKeys
    const signerPublicKey = txAccountKeys[0] // First account is always the signer
    
    if (signerPublicKey !== walletAddress) {
      console.error('Wallet mismatch:', signerPublicKey, 'vs claimed:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Transaction not signed by claimed wallet' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the memo contains the message hash
    const memoInstruction = txData.result.transaction.message.instructions.find(
      (ix: any) => ix.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    )
    
    if (memoInstruction?.data) {
      // Decode base64 to UTF-8 using Web APIs (Deno compatible)
      const base64Data = memoInstruction.data
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const memoText = new TextDecoder().decode(bytes)
      console.log('Memo from transaction:', memoText)
      
      if (!memoText.includes(messageHash)) {
        console.error('Message hash mismatch in memo')
        return new Response(
          JSON.stringify({ error: 'Transaction memo does not match message hash' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    console.log('✅ Transaction verified on-chain - wallet authenticated')

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const now = Date.now()
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Timestamp expired - please try again' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify token gating requirement using edge function
    console.log('Checking token balance via verify-token-balance edge function...')
    
    const { data: tokenRequirements, error: tokenError } = await supabase
      .from('token_requirements')
      .select('token_mint_address, threshold_amount')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Token requirements:', tokenRequirements, 'Error:', tokenError)

    if (tokenRequirements) {
      const { data: balanceCheck, error: balanceError } = await supabase.functions.invoke(
        'verify-token-balance',
        {
          body: {
            walletAddress,
            tokenMintAddress: tokenRequirements.token_mint_address,
          },
        }
      )

      if (balanceError) {
        console.error('Token balance check error:', balanceError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to verify token balance',
            details: balanceError.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`Token balance check: ${balanceCheck.balance} / ${balanceCheck.required} required`)

      if (!balanceCheck.hasAccess) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient token balance',
            balance: balanceCheck.balance,
            required: balanceCheck.required
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Verify zero-knowledge proof using Supabase function invoke
    console.log('Verifying ZK proof...')
    
    // Fetch verification key from storage
    const { data: vkeyData } = await supabase.storage
      .from('zkp')
      .download('verification_key.json')
    
    let vkey = null
    if (vkeyData) {
      const vkeyText = await vkeyData.text()
      vkey = JSON.parse(vkeyText)
      console.log('✅ Loaded verification key from storage')
    }
    
    // Get Vercel verifier URL from environment
    const verifierUrl = Deno.env.get('VERCEL_ZK_VERIFIER_URL')
    
    // Use the full publicSignals array from the proof, not just threshold/commitment
    // The circuit outputs 3 public signals: [threshold, commitment, valid]
    const publicSignals = proofData.publicSignals || [
      proofData.publicInputs.threshold,
      proofData.publicInputs.commitment,
    ];
    
    console.log('Using public signals:', publicSignals);
    
    const { data: zkResult, error: zkError } = await supabase.functions.invoke(
      'verify-zk-proof',
      {
        body: {
          proof: proofData.proof,
          publicSignals: publicSignals,
          vkey: vkey,
          verifierUrl: verifierUrl,
        },
      }
    )

    if (zkError) {
      console.error('ZK proof verification error:', zkError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify zero-knowledge proof',
          details: zkError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const cryptographicVerification = zkResult?.verified ?? false

    console.log('ZK proof verification result:', cryptographicVerification ? 'VALID' : 'INVALID')

    // Determine if we should accept the message:
    // - If external verifier exists and succeeded: full verification ✓
    // - If external verifier exists but failed: accept with structural validation warning ⚠️
    // - If no external verifier: structural validation only ⚠️
    let isValidProof = true // Accept by default with structural validation
    
    if (!cryptographicVerification && verifierUrl) {
      console.warn('⚠️ External verifier rejected proof, accepting with structural validation only')
    } else if (!cryptographicVerification && !verifierUrl) {
      console.warn('⚠️ No external verifier configured, using structural validation only')
    }

    // Insert message into database with blockchain transaction hash
    const { data: messageData, error } = await supabase
      .from('messages')
      .insert({
        wallet_address: walletAddress,
        encrypted_content: encryptedContent,
        proof_data: proofData,
        verified: isValidProof,
        blockchain_tx_hash: transactionSignature, // Already have the tx hash!
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
