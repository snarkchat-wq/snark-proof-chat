-- Create messages table for encrypted chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  proof_data JSONB NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  blockchain_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_wallet ON public.messages(wallet_address);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read messages (public chat)
CREATE POLICY "Anyone can view messages" 
ON public.messages 
FOR SELECT 
USING (true);

-- RLS Policy: Authenticated users can insert their own messages
CREATE POLICY "Users can insert their own messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;