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
      
      // 2. Create signature for authentication
      console.log('Creating signature...');
      toast({
        title: 'Step 1/2: Sign to authenticate',
        description: "Phantom will show a 'Sign Message' prompt.",
      });
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
      const raw = response.data ?? {} as any;
      const messageId = (raw as any)?.message?.id ?? (raw as any)?.id ?? (raw as any)?.messageId ?? (raw as any)?.message?.message_id;
      if (messageId) {
        toast({
          title: 'Step 2/2: Approve blockchain transaction',
          description: 'Phantom will now open a mainnet transaction for approval.',
        });
        console.log('📝 Creating Solana transaction...');
        const messageHash = generateMessageHash(plainTextMessage);
        // Ensure unique memo per message to guarantee unique tx signatures
        const memoText = `SNARK:${messageHash}:${messageId}:${Date.now()}`;
        
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

          // Optimistically update local state immediately
          setMessages((current) => {
            const exists = current.some((m) => m.id === messageId);
            if (exists) {
              return current.map((m) =>
                m.id === messageId ? { ...m, blockchain_tx_hash: txSignature } : m
              );
            } else {
              // Store pending tx to merge when the INSERT arrives
              pendingTxRef.current[messageId] = txSignature;
              return current;
            }
          });
          
          console.log('✅ Transaction confirmed on Solana:', txSignature);
          console.log('🔗 View transaction:', `https://explorer.solana.com/tx/${txSignature}`);
          
          // Wait 2 seconds for transaction to fully propagate on Solana before verifying
          console.log('⏳ Waiting for transaction to propagate on Solana network...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('⛓️ Logging transaction to backend for verification...');
          let logOk = false;
          try {
            const logResponse = await supabase.functions.invoke('log-to-solana', {
              body: {
                messageId,
                messageHash,
                transactionSignature: txSignature,
              },
            });
            if (logResponse.error) throw logResponse.error;
            logOk = true;
            console.log('✅ Backend verification complete (invoke):', logResponse.data);
          } catch (e1) {
            console.warn('⚠️ invoke failed, trying direct fetch fallback...', e1);
            try {
              const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-to-solana`;
              const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ messageId, messageHash, transactionSignature: txSignature }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(JSON.stringify(data));
              logOk = true;
              console.log('✅ Backend verification complete (fetch):', data);
            } catch (e2) {
              console.error('❌ Backend logging failed (both methods):', e2);
            }
          }
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
