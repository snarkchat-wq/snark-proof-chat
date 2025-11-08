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
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMintAddress);

    // Get token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey }
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    // Sum up all token balances from all accounts
    const totalBalance = tokenAccounts.value.reduce((sum, account) => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
      return sum + amount;
    }, 0);

    return totalBalance;
  } catch (error) {
    console.error('Error fetching SPL token balance:', error);
    return 0;
  }
}

export async function checkTokenGating(
  walletAddress: string
): Promise<{ allowed: boolean; balance: number; required: number; tokenMint: string }> {
  const requirements = await getTokenRequirements();
  
  if (!requirements) {
    throw new Error('Token requirements not configured');
  }

  const balance = await getSPLTokenBalance(
    walletAddress,
    requirements.token_mint_address
  );

  return {
    allowed: balance >= requirements.threshold_amount,
    balance,
    required: requirements.threshold_amount,
    tokenMint: requirements.token_mint_address,
  };
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
