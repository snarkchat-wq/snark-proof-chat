import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  wallet_address: string;
  encrypted_content: string;
  proof_data: any;
  verified: boolean;
  blockchain_tx_hash: string | null;
  created_at: string;
}

export const useRealtimeMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
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
        setMessages(data || []);
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
        (payload) => {
          console.log('New message received:', payload);
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages((current) =>
            current.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
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
    walletAddress: string,
    encryptedContent: string,
    proofData: any
  ) => {
    try {
      const response = await supabase.functions.invoke('send-message', {
        body: {
          walletAddress,
          encryptedContent,
          proofData,
        },
      });

      if (response.error) {
        throw response.error;
      }

      // Optionally log to blockchain
      if (response.data?.message?.id) {
        const messageHash = btoa(encryptedContent).substring(0, 32);
        await supabase.functions.invoke('log-to-solana', {
          body: {
            messageId: response.data.message.id,
            messageHash,
          },
        });
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
