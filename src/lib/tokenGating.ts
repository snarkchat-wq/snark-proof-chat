import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

// Use a more reliable RPC endpoint with retry logic
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana.public-rpc.com',
];

let currentEndpointIndex = 0;

const getConnection = () => {
  return new Connection(SOLANA_RPC_ENDPOINTS[currentEndpointIndex], {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
};

export interface TokenRequirement {
  id: string;
  token_mint_address: string;
  threshold_amount: number;
}

export async function getTokenRequirements(): Promise<TokenRequirement | null> {
  const { data, error } = await supabase
    .from('token_requirements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching token requirements:', error);
    return null;
  }

  if (!data) {
    console.warn('No token requirements row found');
    return null;
  }

  return data;
}

export async function getSPLTokenBalance(
  walletAddress: string,
  tokenMintAddress: string
): Promise<number> {
  console.log('🔍 Fetching token balance for wallet:', walletAddress);
  console.log('🪙 Token mint address:', tokenMintAddress);
  
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const connection = getConnection();
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(tokenMintAddress);

      console.log(`⏳ Attempt ${attempt + 1}/${maxRetries} - Querying Solana RPC...`);

      // Get token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey }
      );

      console.log(`📊 Token accounts found: ${tokenAccounts.value.length}`);

      if (tokenAccounts.value.length === 0) {
        console.log('⚠️ No token accounts found for this mint - balance is 0');
        return 0;
      }

      // Sum up all token balances from all accounts
      const totalBalance = tokenAccounts.value.reduce((sum, account) => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        const decimals = account.account.data.parsed.info.tokenAmount.decimals;
        console.log(`💰 Token account balance: ${amount} (decimals: ${decimals})`);
        return sum + amount;
      }, 0);

      console.log(`✅ Total token balance: ${totalBalance}`);
      return totalBalance;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt + 1} failed:`, error);
      
      // Try next RPC endpoint on next attempt
      if (attempt < maxRetries - 1) {
        currentEndpointIndex = (currentEndpointIndex + 1) % SOLANA_RPC_ENDPOINTS.length;
        console.log(`🔄 Retrying with endpoint: ${SOLANA_RPC_ENDPOINTS[currentEndpointIndex]}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  }

  console.error('❌ All retry attempts failed');
  throw lastError || new Error('Failed to fetch token balance after multiple attempts');
}

// Prefer server-side balance checks to avoid browser RPC and API key limits
async function getSPLTokenBalanceViaEdge(walletAddress: string, tokenMintAddress: string) {
  try {
    console.log('🌐 Invoking backend verify-token-balance...');
    const { data, error } = await supabase.functions.invoke('verify-token-balance', {
      body: { walletAddress, tokenMintAddress },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data) throw new Error('No data from verify-token-balance');

    const balance = Number(data.balance ?? 0);
    const required = Number(data.required ?? 0);
    const hasAccess = Boolean(data.hasAccess ?? (balance >= required));

    console.log('✅ Backend balance result:', { balance, required, hasAccess });
    return { balance, required, hasAccess };
  } catch (e) {
    console.error('❌ Backend balance check failed, will fallback to client RPC:', e);
    throw e;
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

  try {
    // 1) Try backend for speed and reliability
    const backend = await getSPLTokenBalanceViaEdge(
      walletAddress,
      requirements.token_mint_address
    );

    const result = {
      allowed: backend.hasAccess,
      balance: backend.balance,
      required: backend.required || requirements.threshold_amount,
      tokenMint: requirements.token_mint_address,
    };

    console.log('Token gating check result (backend):', result);
    return result;
  } catch {
    // 2) Fallback to client RPC if backend not available
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

    console.log('Token gating check result (client fallback):', result);
    return result;
  }
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
