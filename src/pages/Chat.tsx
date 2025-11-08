import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TerminalHeader from "@/components/TerminalHeader";
import ProofAnimation from "@/components/ProofAnimation";
import ProofDetails from "@/components/ProofDetails";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useToast } from "@/hooks/use-toast";
import { checkTokenGating, isAdmin } from "@/lib/tokenGating";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [showProofAnimation, setShowProofAnimation] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showBlockchainAnimation, setShowBlockchainAnimation] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenRequired, setTokenRequired] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { wallet, connected, publicKey } = usePhantomWallet();
  const { messages, loading, sendMessage } = useRealtimeMessages();
  const { toast } = useToast();

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (connected && publicKey) {
      checkTokenAccess();
      checkAdminStatus();
    }
  }, [connected, publicKey]);

  const checkTokenAccess = async () => {
    if (!publicKey) {
      console.error('No publicKey available for token check');
      return;
    }
    
    console.log('Checking token access for wallet:', publicKey);
    
    try {
      const result = await checkTokenGating(publicKey.toString());
      console.log('Token gating result:', result);
      
      setTokenBalance(result.balance);
      setTokenRequired(result.required);
      setHasAccess(result.allowed);
      
      if (!result.allowed) {
        toast({
          title: "Insufficient Token Balance",
          description: `You need ${result.required.toLocaleString()} tokens to send messages. Current balance: ${result.balance.toLocaleString()}`,
          variant: "destructive",
        });
      } else {
        console.log(`✅ Token access granted: ${result.balance}/${result.required}`);
      }
    } catch (error) {
      console.error('Error checking token access:', error);
      toast({
        title: "Token Check Failed",
        description: error instanceof Error ? error.message : "Unable to verify token balance",
        variant: "destructive",
      });
    }
  };

  const checkAdminStatus = async () => {
    if (!publicKey) return;
    
    try {
      const adminStatus = await isAdmin(publicKey.toString());
      setIsUserAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    if (!connected || !publicKey || !wallet) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!hasAccess) {
      // Attempt a fresh check to populate values if missing
      try { await checkTokenAccess(); } catch {}
      const requiredText = tokenRequired != null ? tokenRequired.toLocaleString() : 'the required';
      const balanceText = tokenBalance != null ? tokenBalance.toLocaleString() : '0';
      toast({
        title: "Access Denied",
        description: `You need ${requiredText} tokens to send messages. Current balance: ${balanceText}`,
        variant: "destructive",
      });
      return;
    }
    
    setShowProofAnimation(true);
    
    try {
      // Generate REAL ZK proof
      const { generateTokenBalanceProof } = await import('@/lib/zkProof');
      
      toast({
        title: "Generating ZK Proof",
        description: "This may take 3-5 seconds...",
      });
      
      const zkProof = await generateTokenBalanceProof(publicKey.toString());
      
      const proofData = {
        proof: zkProof.proof,
        publicInputs: {
          threshold: zkProof.publicSignals[0],
          commitment: zkProof.publicSignals[1],
          timestamp: Date.now(),
          walletAddress: publicKey,
        },
      };

      // Show blockchain animation
      setTimeout(() => {
        setShowProofAnimation(false);
        setShowBlockchainAnimation(true);
      }, 3000);

      await sendMessage(wallet, message, proofData);
      
      setMessage("");
      
      setTimeout(() => setShowBlockchainAnimation(false), 4000);
      
      toast({
        title: "Message Sent ✅",
        description: "Your message has been encrypted, verified, and logged to Solana Mainnet",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setShowProofAnimation(false);
      setShowBlockchainAnimation(false);
      toast({
        title: "Failed to Send",
        description: error instanceof Error ? error.message : "Could not send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-background scanlines flex flex-col">
      <TerminalHeader />
      
      <div className="container mx-auto px-4 py-4 flex-1 flex flex-col max-w-5xl">
        {/* Navigation */}
        <div className="mb-4 flex gap-4 border-b border-primary pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              [HOME]
            </Button>
          </Link>
          <Link to="/about">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              [ABOUT]
            </Button>
          </Link>
          {isUserAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
                [ADMIN]
              </Button>
            </Link>
          )}
          <div className="ml-auto text-primary font-mono text-sm flex items-center gap-4">
            {connected && tokenRequired && (
              <span className={hasAccess ? "text-primary" : "text-destructive"}>
                {hasAccess ? "✅" : "❌"} {tokenBalance?.toLocaleString()}/{tokenRequired.toLocaleString()} tokens
              </span>
            )}
            <span className="text-accent">&gt;</span> WALLET: {connected ? formatWalletAddress(publicKey || '') : 'NOT CONNECTED'}
          </div>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 border-2 border-primary bg-card/30 p-4 overflow-y-auto mb-4 space-y-4 font-mono text-sm">
          <div className="text-accent border-b border-accent pb-2 mb-4">
            <pre className="text-xs">
{`====================================
   SNARK // Zero-Knowledge Chat
   🔴 LIVE // Real-time enabled
====================================`}
            </pre>
          </div>

          {loading ? (
            <div className="text-primary text-center">
              <span className="text-accent">&gt;</span> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-muted-foreground text-center">
              <span className="text-accent">&gt;</span> No messages yet. Be the first to send one!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="border border-primary/50 p-3 bg-background/50">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-primary">
                    [{formatTime(msg.created_at)}] &lt;{formatWalletAddress(msg.wallet_address)}&gt;
                  </span>
                  <span className={msg.verified ? "text-primary" : "text-destructive"}>
                    {msg.verified ? "✅ verified" : "❌ failed"}
                  </span>
                </div>
                <div className="text-foreground mb-2">{msg.decryptedContent}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Proof: {msg.proof_data.proof}</div>
                  {msg.blockchain_tx_hash && (
                    <div className="text-accent">
                      ⛓️ Blockchain: 
                      <a 
                        href={`https://explorer.solana.com/tx/${msg.blockchain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline ml-1"
                      >
                        {msg.blockchain_tx_hash.substring(0, 16)}...
                      </a>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent hover:text-accent h-auto p-0 text-xs"
                    onClick={() => setSelectedProof(selectedProof === msg.id ? null : msg.id)}
                  >
                    [{selectedProof === msg.id ? "Hide" : "Show"} Proof Details]
                  </Button>
                  {selectedProof === msg.id && (
                    <div className="mt-2">
                      <ProofDetails 
                        proofData={msg.proof_data}
                        verified={msg.verified}
                        timestamp={msg.created_at}
                        walletAddress={msg.wallet_address}
                        blockchainTxHash={msg.blockchain_tx_hash}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {showProofAnimation && (
            <div className="border-2 border-accent p-4 bg-card/80">
              <ProofAnimation type="generate" />
            </div>
          )}

          {showBlockchainAnimation && (
            <div className="border-2 border-primary p-4 bg-card/80">
              <ProofAnimation type="blockchain" />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-2 border-primary bg-card/50 p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent font-mono">&gt;</span>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={connected ? "type your message" : "connect wallet first"}
                className="pl-8 bg-input border-primary font-mono text-foreground placeholder:text-muted-foreground"
                disabled={showProofAnimation || !connected}
              />
            </div>
            <Button
              variant="terminal"
              onClick={handleSendMessage}
              disabled={showProofAnimation || !connected}
            >
              [SEND]
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            <span className="text-accent">&gt;</span> Press Enter to send • Messages are encrypted and verified with ZK proofs • Logged to Solana Mainnet
            {connected && tokenRequired && (
              <span className={hasAccess ? "text-primary" : "text-destructive"}>
                {" • "}Token Gated: {tokenBalance?.toLocaleString()}/{tokenRequired.toLocaleString()} required
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
