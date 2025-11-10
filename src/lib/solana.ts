import { Connection, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';

// Solana Mainnet RPC endpoint
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Memo program ID (standard Solana memo program)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export async function createMemoTransaction(
  wallet: any,
  memo: string
): Promise<{ transaction: Transaction; signature?: string }> {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    console.log('🔨 Creating Solana memo transaction...');
    
    // Get latest blockhash with maximum freshness
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    console.log('📦 Got fresh blockhash:', blockhash.substring(0, 8) + '...');

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    });

    // Create transaction with proper structure for Phantom
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.publicKey,
    }).add(memoInstruction);

    console.log('✅ Transaction created successfully');
    return { transaction };
  } catch (error) {
    console.error('❌ Error creating memo transaction:', error);
    throw error;
  }
}

export async function signAndSendTransaction(
  wallet: any,
  transaction: Transaction
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    console.log('🔐 Attempting to sign transaction with Phantom...');
    
    // Phantom requires signTransaction (not signAndSendTransaction) for Transaction objects
    if (typeof (wallet as any).signTransaction === 'function') {
      console.log('📝 Requesting signature from Phantom wallet...');
      
      // This will trigger the Phantom popup
      const signed = await (wallet as any).signTransaction(transaction);
      console.log('✅ Transaction signed by user');
      
      console.log('📡 Sending signed transaction to Solana network...');
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log('🚀 Transaction sent to network:', signature);
      
      console.log('⏳ Waiting for transaction confirmation...');
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Transaction confirmed on-chain:', signature);
      
      return signature;
    }

    throw new Error('Wallet does not support transaction signing');
  } catch (error) {
    console.error('❌ Error signing/sending transaction:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('User rejected')) {
        throw new Error('Transaction rejected by user in Phantom wallet');
      }
      if (error.message.includes('Blockhash not found')) {
        throw new Error('Transaction expired. Please try again.');
      }
    }
    
    throw error;
  }
}

export function getExplorerUrl(signature: string, network: 'devnet' | 'mainnet' = 'mainnet'): string {
  // Mainnet doesn't need cluster parameter, devnet does
  return network === 'mainnet' 
    ? `https://explorer.solana.com/tx/${signature}`
    : `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
}

export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: PublicKey
): Promise<boolean> {
  // Note: Signature verification should be done server-side
  // This is a client-side utility for reference
  const nacl = await import('tweetnacl');
  return nacl.default.sign.detached.verify(message, signature, publicKey.toBytes());
}
