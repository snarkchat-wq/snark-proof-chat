import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage, decryptMessage, generateMessageHash } from '@/lib/encryption';
import { createMemoTransaction, signAndSendTransaction } from '@/lib/solana';

interface Message {
  id: string;
  wallet_address: string;
  encrypted_content: string;
  proof_data: any;
  verified: boolean;
  blockchain_tx_hash: string | null;
  created_at: string;
}

export interface DecryptedMessage extends Message {
  decryptedContent: string;
}

export const useRealtimeMessages = () => {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        // Decrypt all messages
        const decryptedMessages = await Promise.all(
          (data || []).map(async (msg) => ({
            ...msg,
            decryptedContent: await decryptMessage(msg.encrypted_content),
          }))
        );
        setMessages(decryptedMessages);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;
          const decryptedContent = await decryptMessage(newMessage.encrypted_content);
          setMessages((current) => [...current, { ...newMessage, decryptedContent }]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('Message updated:', payload);
          const updatedMessage = payload.new as Message;
          const decryptedContent = await decryptMessage(updatedMessage.encrypted_content);
          setMessages((current) =>
            current.map((msg) =>
              msg.id === updatedMessage.id 
                ? { ...updatedMessage, decryptedContent } 
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async (
    wallet: any,
    plainTextMessage: string,
    proofData: any
  ) => {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const walletAddress = wallet.publicKey.toString();
      
      // 1. Encrypt the message
      console.log('Encrypting message...');
      const encryptedContent = await encryptMessage(plainTextMessage);
      
      // 2. Create signature for authentication
      console.log('Creating signature...');
      const timestamp = Date.now();
      const authMessage = `SNARK:${walletAddress}:${timestamp}`;
      const encodedMessage = new TextEncoder().encode(authMessage);
      const signatureObj = await (wallet as any).signMessage(encodedMessage, 'utf8');
      
      // Convert signature to hex string
      const signature = Array.from(signatureObj.signature)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      
      // 3. Send to backend for verification and storage
      console.log('Sending to backend...');
      const response = await supabase.functions.invoke('send-message', {
        body: {
          walletAddress,
          encryptedContent,
          proofData,
          signature,
          timestamp,
        },
      });

      if (response.error) {
        throw response.error;
      }

      // 4. Log to Solana blockchain
      if (response.data?.message?.id) {
        console.log('📝 Creating Solana transaction...');
        const messageHash = generateMessageHash(plainTextMessage);
        const memoText = `SNARK:${messageHash}`;
        
        try {
          // Check SOL balance before attempting transaction
          const { Connection } = await import('@solana/web3.js');
          const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
          const balance = await connection.getBalance(wallet.publicKey);
          const solBalance = balance / 1e9; // Convert lamports to SOL
          
          console.log(`💰 Wallet SOL balance: ${solBalance.toFixed(4)} SOL`);
          
          if (solBalance < 0.00001) {
            throw new Error(`Insufficient SOL for gas fees. Balance: ${solBalance.toFixed(6)} SOL. Please add at least 0.001 SOL to your wallet.`);
          }
          
          const { transaction } = await createMemoTransaction(wallet, memoText);
          console.log('✍️ Signing and sending transaction...');
          const txSignature = await signAndSendTransaction(wallet, transaction);
          
          console.log('⛓️ Logging transaction to backend...');
          const logResponse = await supabase.functions.invoke('log-to-solana', {
            body: {
              messageId: response.data.message.id,
              messageHash,
              transactionSignature: txSignature,
            },
          });
          
          if (logResponse.error) {
            console.error('❌ Backend logging failed:', logResponse.error);
            throw logResponse.error;
          }
          
          console.log('✅ Message logged to Solana Mainnet:', txSignature);
          console.log('🔗 View transaction:', `https://explorer.solana.com/tx/${txSignature}`);

          // Optimistically update local state so UI shows the link immediately
          setMessages((current) =>
            current.map((m) =>
              m.id === response.data.message.id ? { ...m, blockchain_tx_hash: txSignature } : m
            )
          );
        } catch (solanaError) {
          console.error('❌ Solana logging failed (message still saved):', solanaError);
          const errorMsg = solanaError instanceof Error ? solanaError.message : String(solanaError);
          console.error('📋 Error details:', errorMsg);
          // Don't throw - message was saved successfully even if blockchain logging failed
          // But notify user about the blockchain logging failure
          if (errorMsg.includes('Insufficient SOL')) {
            throw new Error('Message saved but blockchain logging failed: ' + errorMsg);
          }
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
  };
};
