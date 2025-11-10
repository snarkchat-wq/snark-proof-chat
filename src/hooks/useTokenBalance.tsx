import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { checkTokenGating } from '@/lib/tokenGating';

interface TokenBalanceResult {
  balance: number | null;
  required: number | null;
  hasAccess: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useTokenBalance = (walletAddress: string | null): TokenBalanceResult => {
  const [balance, setBalance] = useState<number | null>(null);
  const [required, setRequired] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      setRequired(null);
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Checking token balance for:', walletAddress);
      const result = await checkTokenGating(walletAddress);
      
      setBalance(result.balance);
      setRequired(result.required);
      setHasAccess(result.allowed);
      
      console.log(`✅ Balance updated: ${result.balance}/${result.required} (Access: ${result.allowed})`);
    } catch (error) {
      console.error('❌ Error checking token balance:', error);
      setBalance(null);
      setRequired(null);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    // Initial check
    checkBalance();

    // Set up real-time monitoring with polling (every 10 seconds)
    // This is a fallback for when websocket subscriptions might not work
    const pollInterval = setInterval(checkBalance, 10000);

    // Try to set up websocket subscription for real-time updates
    let subscriptionId: number | null = null;
    
    const setupWebSocketSubscription = async () => {
      try {
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const publicKey = new PublicKey(walletAddress);
        
        // Subscribe to account changes for real-time updates
        subscriptionId = connection.onAccountChange(
          publicKey,
          (accountInfo) => {
            console.log('🔔 Account change detected, refreshing balance...');
            checkBalance();
          },
          'confirmed'
        );
        
        console.log('✅ WebSocket subscription established for token balance updates');
      } catch (error) {
        console.warn('⚠️ Could not establish WebSocket subscription:', error);
        // Polling will handle updates as fallback
      }
    };

    setupWebSocketSubscription();

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      if (subscriptionId !== null) {
        try {
          const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
          connection.removeAccountChangeListener(subscriptionId);
          console.log('🔌 WebSocket subscription cleaned up');
        } catch (error) {
          console.warn('⚠️ Error cleaning up subscription:', error);
        }
      }
    };
  }, [walletAddress, checkBalance]);

  return {
    balance,
    required,
    hasAccess,
    loading,
    refresh: checkBalance,
  };
};
