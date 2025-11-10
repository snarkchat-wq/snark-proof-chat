import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  publicKey: { toString: () => string } | null;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

interface WalletContextType {
  wallet: PhantomProvider | null;
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
  isInstalled: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<PhantomProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hasDisconnected, setHasDisconnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      setWallet(window.solana);
      
      // Only auto-connect if user hasn't explicitly disconnected
      const hasUserDisconnected = sessionStorage.getItem('wallet_disconnected');
      if (!hasUserDisconnected && window.solana.publicKey) {
        setConnected(true);
        setPublicKey(window.solana.publicKey.toString());
      }
    }
  }, []);

  const connect = async () => {
    if (!wallet) {
      window.open('https://phantom.app/', '_blank');
      return null;
    }

    try {
      const response = await wallet.connect();
      setConnected(true);
      const pubKey = response.publicKey.toString();
      setPublicKey(pubKey);
      setHasDisconnected(false);
      // Clear the disconnected flag when user connects
      sessionStorage.removeItem('wallet_disconnected');
      return pubKey;
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    if (!wallet) return;

    try {
      await wallet.disconnect();
      setConnected(false);
      setPublicKey(null);
      setHasDisconnected(true);
      // Set flag to prevent auto-reconnection
      sessionStorage.setItem('wallet_disconnected', 'true');
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
      throw error;
    }
  };

  const signMessage = async (message: string) => {
    if (!wallet) throw new Error('Wallet not connected');

    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await wallet.signMessage(encodedMessage, 'utf8');
    return signedMessage.signature;
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        publicKey,
        connect,
        disconnect,
        signMessage,
        isInstalled: !!wallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
