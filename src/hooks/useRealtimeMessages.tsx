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
        console.log('Creating Solana transaction...');
        const messageHash = generateMessageHash(plainTextMessage);
        const memoText = `SNARK:${messageHash}`;
        
        try {
          const { transaction } = await createMemoTransaction(wallet, memoText);
          console.log('Signing and sending transaction...');
          const txSignature = await signAndSendTransaction(wallet, transaction);
          
          console.log('Logging transaction to backend...');
          await supabase.functions.invoke('log-to-solana', {
            body: {
              messageId: response.data.message.id,
              messageHash,
              transactionSignature: txSignature,
            },
          });
          
          console.log('✅ Message logged to Solana:', txSignature);
        } catch (solanaError) {
          console.error('Solana logging failed (message still saved):', solanaError);
          // Don't throw - message was saved successfully even if blockchain logging failed
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
