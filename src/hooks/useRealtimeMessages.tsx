import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage, decryptMessage, generateMessageHash } from '@/lib/encryption';
import { createMemoTransaction, signAndSendTransaction } from '@/lib/solana';
import { toast } from '@/components/ui/use-toast';

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
  const pendingTxRef = useRef<Record<string, string>>({});
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

          // Merge any pending optimistic tx hash if exists
          let blockchain_tx_hash = newMessage.blockchain_tx_hash;
          const pendingTx = pendingTxRef.current[newMessage.id];
          if (!blockchain_tx_hash && pendingTx) {
            blockchain_tx_hash = pendingTx;
            delete pendingTxRef.current[newMessage.id];
          }

          setMessages((current) => [
            ...current, 
            { ...newMessage, blockchain_tx_hash, decryptedContent }
          ]);
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

          // Ensure we merge any pending tx if backend update missed
          let blockchain_tx_hash = updatedMessage.blockchain_tx_hash;
          const pendingTx = pendingTxRef.current[updatedMessage.id];
          if (!blockchain_tx_hash && pendingTx) {
            blockchain_tx_hash = pendingTx;
            delete pendingTxRef.current[updatedMessage.id];
          }

          setMessages((current) =>
            current.map((msg) =>
              msg.id === updatedMessage.id 
                ? { ...updatedMessage, blockchain_tx_hash, decryptedContent } 
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
      
      // 2. Create blockchain transaction FIRST (for authentication + logging)
      const messageHash = generateMessageHash(plainTextMessage);
      const timestamp = Date.now();
      const memoText = `SNARK:${messageHash}:${timestamp}:${walletAddress.substring(0, 8)}`;

      toast({
        title: 'Approve blockchain transaction',
        description: 'Sign once to authenticate and log to Solana',
      });
      console.log('📝 Creating Solana transaction...', { memoText });
      
      // Try to check SOL balance, but don't block if RPC is rate-limited
      try {
        const { Connection } = await import('@solana/web3.js');
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const balance = await connection.getBalance(wallet.publicKey);
        const solBalance = balance / 1e9;
        
        console.log(`💰 Wallet SOL balance: ${solBalance.toFixed(4)} SOL`);
        
        if (solBalance < 0.00001) {
          toast({
            title: 'Low SOL Balance',
            description: `Your balance is ${solBalance.toFixed(6)} SOL. Transaction may fail due to insufficient gas fees.`,
            variant: 'destructive',
          });
        }
      } catch (balanceError) {
        console.warn('⚠️ Could not check balance (RPC may be rate-limited):', balanceError);
        // Continue anyway - wallet will show error if insufficient funds
      }
      
      console.log('🔨 Creating transaction...');
      const { transaction } = await createMemoTransaction(wallet, memoText);
      
      console.log('✍️ Requesting signature from wallet...');
      const txSignature = await signAndSendTransaction(wallet, transaction);
      console.log('🎉 Transaction confirmed on Solana:', txSignature);
      console.log('🔗 View at:', `https://explorer.solana.com/tx/${txSignature}`);

      // 3. Send encrypted message + transaction signature to backend
      // Backend will verify the transaction on-chain as authentication
      console.log('📤 Sending message to backend with transaction proof...');
      const response = await supabase.functions.invoke('send-message', {
        body: {
          walletAddress,
          encryptedContent,
          proofData,
          transactionSignature: txSignature,
          messageHash,
          timestamp,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const messageData = response.data?.message;
      
      // Optimistically update local state with transaction hash
      if (messageData?.id) {
        setMessages((current) => {
          const exists = current.some((m) => m.id === messageData.id);
          if (exists) {
            return current.map((m) =>
              m.id === messageData.id ? { ...m, blockchain_tx_hash: txSignature } : m
            );
          } else {
            pendingTxRef.current[messageData.id] = txSignature;
            return current;
          }
        });
      }
      
      toast({
        title: 'Message Sent ✅',
        description: 'Verified and logged to Solana blockchain',
      });
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
