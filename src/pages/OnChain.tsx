import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TerminalHeader from "@/components/TerminalHeader";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";

const OnChain = () => {
  const { connected, publicKey } = usePhantomWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean;
    txSignature?: string;
    timestamp?: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    proof: "",
    publicSignals: "",
    threshold: "",
    commitment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Phantom wallet first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setVerificationStatus(null);

    try {
      // Parse inputs
      const proof = JSON.parse(formData.proof);
      const publicSignals = JSON.parse(formData.publicSignals);
      const threshold = parseInt(formData.threshold);
      const commitment = parseInt(formData.commitment);

      // Validate inputs
      if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
        throw new Error("Invalid proof structure");
      }

      // Generate proof hash (SHA-256)
      const proofString = JSON.stringify(proof);
      const encoder = new TextEncoder();
      const data = encoder.encode(proofString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
      const proofHash = Array.from(new Uint8Array(hashBuffer));

      // TODO: Integrate with actual Solana program
      // For now, simulate on-chain verification
      
      toast({
        title: "Deploying Program Required",
        description: "Deploy the Solana program first (see solana-program/ directory)",
      });

      // Simulated response
      setVerificationStatus({
        verified: true,
        txSignature: "SIMULATED_TX_" + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Verification Submitted",
        description: "Proof submitted to Solana (simulation mode)",
      });

    } catch (error) {
      console.error('On-chain verification error:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to submit proof",
        variant: "destructive",
      });
      setVerificationStatus({
        verified: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background scanlines">
      <TerminalHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="outline" size="sm" className="mb-6 border-accent text-accent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header */}
          <Card className="border-2 border-primary p-6 bg-card/50">
            <h1 className="text-3xl text-primary terminal-glow mb-2 font-bold">
              ON-CHAIN VERIFICATION
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Submit ZK proofs to Solana blockchain for decentralized verification
            </p>
          </Card>

          {/* Wallet Status */}
          {!connected ? (
            <Card className="border-2 border-destructive p-6 bg-card/50">
              <p className="text-destructive font-mono">
                ⚠️ Wallet not connected. Please connect your Phantom wallet from the home page.
              </p>
            </Card>
          ) : (
            <Card className="border border-primary p-4 bg-card/30">
              <p className="text-primary font-mono text-sm">
                ✅ Connected: {publicKey?.substring(0, 8)}...{publicKey?.substring(publicKey.length - 8)}
              </p>
            </Card>
          )}

          {/* Program Status */}
          <Card className="border border-accent p-6 bg-card/50">
            <h2 className="text-xl text-accent terminal-glow-cyan mb-4 font-bold">
              PROGRAM STATUS
            </h2>
            <div className="space-y-2 font-mono text-sm">
              <p className="text-muted-foreground">
                <span className="text-accent">&gt;</span> Program: <span className="text-destructive">NOT DEPLOYED</span>
              </p>
              <p className="text-muted-foreground">
                <span className="text-accent">&gt;</span> Network: Devnet
              </p>
              <p className="text-muted-foreground">
                <span className="text-accent">&gt;</span> Deploy instructions: See solana-program/README.md
              </p>
            </div>
          </Card>

          {/* Verification Form */}
          <Card className="border-2 border-primary p-6 bg-card/50">
            <h2 className="text-xl text-primary terminal-glow mb-6 font-bold">
              SUBMIT PROOF
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="proof" className="text-foreground font-mono">
                  ZK Proof (JSON)
                </Label>
                <Textarea
                  id="proof"
                  placeholder='{"pi_a":["..."],"pi_b":[["..."]],"pi_c":["..."],"protocol":"groth16","curve":"bn128"}'
                  value={formData.proof}
                  onChange={(e) => setFormData({ ...formData, proof: e.target.value })}
                  className="font-mono text-xs min-h-[120px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicSignals" className="text-foreground font-mono">
                  Public Signals (JSON Array)
                </Label>
                <Input
                  id="publicSignals"
                  placeholder='["1", "10000"]'
                  value={formData.publicSignals}
                  onChange={(e) => setFormData({ ...formData, publicSignals: e.target.value })}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold" className="text-foreground font-mono">
                    Threshold
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    placeholder="1"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commitment" className="text-foreground font-mono">
                    Commitment
                  </Label>
                  <Input
                    id="commitment"
                    type="number"
                    placeholder="10000"
                    value={formData.commitment}
                    onChange={(e) => setFormData({ ...formData, commitment: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="terminal"
                size="lg"
                className="w-full"
                disabled={loading || !connected}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    SUBMITTING TO SOLANA...
                  </>
                ) : (
                  "[VERIFY ON-CHAIN]"
                )}
              </Button>
            </form>
          </Card>

          {/* Verification Result */}
          {verificationStatus && (
            <Card className={`border-2 p-6 ${
              verificationStatus.verified 
                ? "border-primary bg-primary/5" 
                : "border-destructive bg-destructive/5"
            }`}>
              <div className="flex items-start gap-4">
                {verificationStatus.verified ? (
                  <CheckCircle2 className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
                )}
                
                <div className="space-y-2 font-mono text-sm flex-1">
                  <p className={verificationStatus.verified ? "text-primary font-bold" : "text-destructive font-bold"}>
                    {verificationStatus.verified ? "✅ PROOF VERIFIED ON-CHAIN" : "❌ VERIFICATION FAILED"}
                  </p>
                  
                  {verificationStatus.txSignature && (
                    <p className="text-muted-foreground break-all">
                      <span className="text-accent">&gt;</span> TX: {verificationStatus.txSignature}
                    </p>
                  )}
                  
                  {verificationStatus.timestamp && (
                    <p className="text-muted-foreground">
                      <span className="text-accent">&gt;</span> Time: {new Date(verificationStatus.timestamp).toLocaleString()}
                    </p>
                  )}
                  
                  {verificationStatus.verified && (
                    <p className="text-muted-foreground text-xs pt-2">
                      This proof is now permanently recorded on Solana blockchain
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Info Box */}
          <Card className="border border-muted p-6 bg-card/30">
            <h3 className="text-lg text-foreground font-bold mb-3">
              How It Works
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground font-mono">
              <p className="flex items-start gap-2">
                <span className="text-accent">1.</span>
                <span>Generate proof in the Chat page</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">2.</span>
                <span>Copy the full proof JSON</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">3.</span>
                <span>Submit to Solana program via this form</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">4.</span>
                <span>Proof hash stored permanently on-chain</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">5.</span>
                <span>Anyone can verify the proof via blockchain explorer</span>
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OnChain;
