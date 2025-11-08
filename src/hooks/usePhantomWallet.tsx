import { useState, useEffect } from 'react';

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

export const usePhantomWallet = () => {
  const [wallet, setWallet] = useState<PhantomProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      setWallet(window.solana);
      
      // Check if already connected
      if (window.solana.publicKey) {
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

  return {
    wallet,
    connected,
    publicKey,
    connect,
    disconnect,
    signMessage,
    isInstalled: !!wallet,
  };
};
