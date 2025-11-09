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
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('finalized');

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    });

    // Create transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.publicKey,
    }).add(memoInstruction);

    return { transaction };
  } catch (error) {
    console.error('Error creating memo transaction:', error);
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
    // Sign transaction with Phantom
    const signed = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('Transaction sent:', signature);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Transaction confirmed:', signature);
    return signature;
  } catch (error) {
    console.error('Error signing/sending transaction:', error);
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
