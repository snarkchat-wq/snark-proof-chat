import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

export interface TokenRequirement {
  id: string;
  token_mint_address: string;
  threshold_amount: number;
}

export async function getTokenRequirements(): Promise<TokenRequirement | null> {
  const { data, error } = await supabase
    .from('token_requirements')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching token requirements:', error);
    return null;
  }

  return data;
}

export async function getSPLTokenBalance(
  walletAddress: string,
  tokenMintAddress: string
): Promise<number> {
  try {
    console.log('Fetching token balance for wallet:', walletAddress);
    console.log('Token mint address:', tokenMintAddress);
    
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMintAddress);

    // Get token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey }
    );

    console.log('Token accounts found:', tokenAccounts.value.length);

    if (tokenAccounts.value.length === 0) {
      console.log('No token accounts found for this mint');
      return 0;
    }

    // Sum up all token balances from all accounts
    const totalBalance = tokenAccounts.value.reduce((sum, account) => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
      console.log('Token account balance:', amount);
      return sum + amount;
    }, 0);

    console.log('Total token balance:', totalBalance);
    return totalBalance;
  } catch (error) {
    console.error('Error fetching SPL token balance:', error);
    throw error; // Re-throw to propagate the error
  }
}

export async function checkTokenGating(
  walletAddress: string
): Promise<{ allowed: boolean; balance: number; required: number; tokenMint: string }> {
  console.log('Starting token gating check for:', walletAddress);
  
  const requirements = await getTokenRequirements();
  
  if (!requirements) {
    console.error('Token requirements not found in database');
    throw new Error('Token requirements not configured');
  }

  console.log('Token requirements:', requirements);

  const balance = await getSPLTokenBalance(
    walletAddress,
    requirements.token_mint_address
  );

  const result = {
    allowed: balance >= requirements.threshold_amount,
    balance,
    required: requirements.threshold_amount,
    tokenMint: requirements.token_mint_address,
  };

  console.log('Token gating check result:', result);
  return result;
}

export async function isAdmin(walletAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'admin';
}
