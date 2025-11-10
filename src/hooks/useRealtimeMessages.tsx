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
      const raw = response.data as any;
      const messageId: string | undefined = raw?.message?.id;

      // Build memo text regardless, so we can still attempt TX even if ID missing
      const messageHash = generateMessageHash(plainTextMessage);
      const memoText = `SNARK:${messageHash}:${messageId ?? 'noid'}:${Date.now()}`;

      toast({
        title: 'Step 2/2: Approve blockchain transaction',
        description: 'Phantom will now open a mainnet transaction for approval.',
      });
      console.log('📝 Creating Solana transaction...', { messageId, memoText });
      
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
          
          console.log('🔨 Creating transaction...');
          const { transaction } = await createMemoTransaction(wallet, memoText);
          
          console.log('✍️ Requesting signature from wallet...');
          const txSignature = await signAndSendTransaction(wallet, transaction);
          console.log('🎉 Transaction confirmed:', txSignature);

          // Optimistically update local state immediately
          setMessages((current) => {
            const exists = messageId ? current.some((m) => m.id === messageId) : false;
            if (exists && messageId) {
              return current.map((m) =>
                m.id === messageId ? { ...m, blockchain_tx_hash: txSignature } : m
              );
            } else {
              // Store pending tx to merge when the INSERT arrives (only if we have an id)
              if (messageId) pendingTxRef.current[messageId] = txSignature;
              return current;
            }
          });
          
          console.log('✅ Transaction confirmed on Solana:', txSignature);
          console.log('🔗 View transaction:', `https://explorer.solana.com/tx/${txSignature}`);
          
          // Wait 2 seconds for transaction to fully propagate on Solana before verifying
          console.log('⏳ Waiting for transaction to propagate on Solana network...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('⛓️ Logging transaction to backend for verification...');
          try {
            const logResponse = await supabase.functions.invoke('log-to-solana', {
              body: {
                messageId,
                messageHash,
                transactionSignature: txSignature,
              },
            });
            
            console.log('📡 Backend response:', logResponse);
            
            if (logResponse.error) {
              console.error('❌ Backend returned error:', logResponse.error);
              // Don't throw - transaction already succeeded
              toast({
                title: 'Backend verification failed',
                description: 'Transaction succeeded but backend logging failed',
                variant: 'destructive',
              });
            } else {
              console.log('✅ Backend verification complete:', logResponse.data);
              toast({
                title: 'Blockchain verified ✓',
                description: 'Message logged to Solana mainnet',
              });
            }
          } catch (backendError) {
            console.error('❌ Backend logging failed:', backendError);
            // Don't throw - transaction already succeeded
            toast({
              title: 'Backend verification failed',
              description: 'Transaction succeeded but backend logging failed',
              variant: 'destructive',
            });
          }
        } catch (solanaError) {
          console.error('❌ Solana transaction failed:', solanaError);
          const errorMsg = solanaError instanceof Error ? solanaError.message : String(solanaError);
          
          // Notify user of blockchain logging failure
          toast({
            title: 'Blockchain logging failed',
            description: errorMsg.includes('rejected') ? 'Transaction was rejected in wallet.' : errorMsg,
            variant: 'destructive',
          });
          
          // Don't throw the error - message was already saved successfully
          console.warn('⚠️ Message saved to database but blockchain logging failed');
        }
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
