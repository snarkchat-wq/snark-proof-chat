-- Create storage bucket for ZK proof verification keys
INSERT INTO storage.buckets (id, name, public)
VALUES ('zkp', 'zkp', true);

-- Allow public read access to verification keys
CREATE POLICY "Public read access to ZK verification keys"
ON storage.objects FOR SELECT
USING (bucket_id = 'zkp');

-- Allow authenticated users to upload verification keys (for admin setup)
CREATE POLICY "Authenticated users can upload verification keys"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'zkp' AND auth.role() = 'authenticated');