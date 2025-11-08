import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TerminalHeader from "@/components/TerminalHeader";

const Index = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const connectWallet = async () => {
    // Mock wallet connection - in production this would integrate with Phantom
    const mockAddress = "7f3x" + Math.random().toString(36).substring(2, 9) + "ab2";
    setWalletAddress(mockAddress);
    setWalletConnected(true);
  };

  return (
    <div className="min-h-screen bg-background scanlines">
      <TerminalHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Main intro */}
          <div className="border-2 border-primary p-8 bg-card/50">
            <h2 className="text-2xl md:text-3xl text-primary terminal-glow mb-4 font-bold">
              SYSTEM INITIALIZED
            </h2>
            <div className="space-y-2 text-foreground font-mono text-sm md:text-base">
              <p className="flex items-start gap-2">
                <span className="text-accent">&gt;</span>
                <span>Encrypted group chat with zero-knowledge proofs</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">&gt;</span>
                <span>Your secrets never leave your browser</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">&gt;</span>
                <span>Powered by gnark WASM + Solana blockchain</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">&gt;</span>
                <span>Messages verified cryptographically on-chain</span>
              </p>
            </div>
          </div>

          {/* Wallet connection */}
          <div className="border-2 border-accent p-8 bg-card/50">
            <h3 className="text-xl text-accent terminal-glow-cyan mb-6 font-bold">
              CONNECTION REQUIRED
            </h3>
            
            {!walletConnected ? (
              <div className="space-y-4">
                <p className="text-foreground font-mono text-sm">
                  <span className="text-accent">&gt;</span> Connect your Phantom Wallet to access the chat
                </p>
                <Button 
                  variant="terminal-cyan" 
                  size="lg"
                  onClick={connectWallet}
                  className="w-full md:w-auto"
                >
                  [CONNECT PHANTOM WALLET]
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2 font-mono text-sm">
                  <p className="text-primary">
                    <span className="text-accent">&gt;</span> Wallet connected successfully ✅
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-accent">&gt;</span> Address: [{walletAddress}]
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <Link to="/chat" className="flex-1">
                    <Button variant="terminal" size="lg" className="w-full">
                      [ENTER CHAT]
                    </Button>
                  </Link>
                  <Link to="/about" className="flex-1">
                    <Button variant="outline" size="lg" className="w-full border-primary text-primary">
                      [HOW IT WORKS]
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-primary p-4 bg-card/30">
              <div className="text-primary text-4xl mb-2">🔒</div>
              <h4 className="text-primary font-bold mb-2">ZERO-KNOWLEDGE</h4>
              <p className="text-xs text-muted-foreground font-mono">
                Prove you know a secret without revealing it
              </p>
            </div>
            
            <div className="border border-accent p-4 bg-card/30">
              <div className="text-accent text-4xl mb-2">⚡</div>
              <h4 className="text-accent font-bold mb-2">BLOCKCHAIN</h4>
              <p className="text-xs text-muted-foreground font-mono">
                Verified on Solana for transparency
              </p>
            </div>
            
            <div className="border border-primary p-4 bg-card/30">
              <div className="text-primary text-4xl mb-2">🔐</div>
              <h4 className="text-primary font-bold mb-2">ENCRYPTED</h4>
              <p className="text-xs text-muted-foreground font-mono">
                End-to-end encryption using WebCrypto
              </p>
            </div>
          </div>

          {/* Terminal footer */}
          <div className="border-t-2 border-primary pt-4">
            <p className="text-muted-foreground font-mono text-xs text-center cursor-blink">
              System ready for secure communication
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
