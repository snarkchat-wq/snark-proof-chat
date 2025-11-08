import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { isAdmin, getTokenRequirements, TokenRequirement } from '@/lib/tokenGating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import TerminalHeader from '@/components/TerminalHeader';
import { NavLink } from '@/components/NavLink';

const Admin = () => {
  const { publicKey } = usePhantomWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [tokenMint, setTokenMint] = useState('');
  const [threshold, setThreshold] = useState('');
  const [currentRequirements, setCurrentRequirements] = useState<TokenRequirement | null>(null);

  useEffect(() => {
    checkAdminStatus();
    loadCurrentRequirements();
  }, [publicKey]);

  const checkAdminStatus = async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    try {
      const adminStatus = await isAdmin(publicKey.toString());
      setAuthorized(adminStatus);
      
      if (!adminStatus) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRequirements = async () => {
    const requirements = await getTokenRequirements();
    if (requirements) {
      setCurrentRequirements(requirements);
      setTokenMint(requirements.token_mint_address);
      setThreshold(requirements.threshold_amount.toString());
    }
  };

  const handleSave = async () => {
    if (!tokenMint || !threshold) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      toast({
        title: "Validation Error",
        description: "Threshold must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('token_requirements')
        .update({
          token_mint_address: tokenMint,
          threshold_amount: thresholdNum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentRequirements?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Token requirements updated successfully",
      });

      loadCurrentRequirements();
    } catch (error: any) {
      console.error('Error updating requirements:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update token requirements",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="terminal-window">
          <TerminalHeader />
          
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Manage token gating requirements</p>
              </div>
            </div>

            <nav className="flex gap-4 mb-6 pb-4 border-b border-border/50">
              <NavLink to="/" className="text-muted-foreground hover:text-primary">Chat</NavLink>
              <NavLink to="/about" className="text-muted-foreground hover:text-primary">About</NavLink>
              <NavLink to="/admin" className="text-primary font-semibold">Admin</NavLink>
            </nav>

            <Card className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Token Gating Configuration</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure which SPL token and how many tokens users need to hold to send messages
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenMint">SPL Token Mint Address</Label>
                  <Input
                    id="tokenMint"
                    value={tokenMint}
                    onChange={(e) => setTokenMint(e.target.value)}
                    placeholder="Enter SPL token mint address"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The Solana Program Library (SPL) token contract address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">Minimum Token Balance</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="Enter minimum balance"
                    min="0"
                    step="0.000001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum number of tokens required to send messages
                  </p>
                </div>
              </div>

              {currentRequirements && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-sm font-semibold mb-2">Current Settings</h3>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <p>Token: {currentRequirements.token_mint_address}</p>
                    <p>Threshold: {currentRequirements.threshold_amount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
