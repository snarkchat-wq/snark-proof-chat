import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TerminalHeader from "@/components/TerminalHeader";
import ProofAnimation from "@/components/ProofAnimation";

interface Message {
  id: number;
  walletAddress: string;
  encryptedContent: string;
  proof: string;
  verified: boolean;
  timestamp: string;
}

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      walletAddress: "7f3xAb2c8...",
      encryptedContent: "(encrypted)",
      proof: "0x8a7b4c2d9f3e1a5b...",
      verified: true,
      timestamp: "12:00",
    },
  ]);
  const [showProofAnimation, setShowProofAnimation] = useState(false);
  const [selectedProof, setSelectedProof] = useState<number | null>(null);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setShowProofAnimation(true);
    setTimeout(() => {
      const newMessage: Message = {
        id: messages.length + 1,
        walletAddress: "7f3x" + Math.random().toString(36).substring(2, 6) + "...",
        encryptedContent: "(encrypted)",
        proof: "0x" + Math.random().toString(36).substring(2, 15) + "...",
        verified: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessage("");
      setShowProofAnimation(false);
    }, 4000);
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
          <div className="ml-auto text-primary font-mono text-sm flex items-center">
            <span className="text-accent">&gt;</span> WALLET: 7f3x...ab2
          </div>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 border-2 border-primary bg-card/30 p-4 overflow-y-auto mb-4 space-y-4 font-mono text-sm">
          <div className="text-accent border-b border-accent pb-2 mb-4">
            <pre className="text-xs">
{`====================================
   SNARK // Zero-Knowledge Chat
====================================`}
            </pre>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className="border border-primary/50 p-3 bg-background/50">
              <div className="flex items-start justify-between mb-2">
                <span className="text-primary">[{msg.timestamp}] &lt;{msg.walletAddress}&gt;</span>
                <span className={msg.verified ? "text-primary" : "text-destructive"}>
                  {msg.verified ? "✅ verified" : "❌ failed"}
                </span>
              </div>
              <div className="text-foreground mb-2">{msg.encryptedContent}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Proof: {msg.proof}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-accent hover:text-accent h-auto p-0 text-xs"
                  onClick={() => setSelectedProof(selectedProof === msg.id ? null : msg.id)}
                >
                  [{selectedProof === msg.id ? "Hide" : "Show"} Proof Details]
                </Button>
                {selectedProof === msg.id && (
                  <div className="mt-2 border border-accent/30 p-2 bg-background/80">
                    <ProofAnimation type="verify" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {showProofAnimation && (
            <div className="border-2 border-accent p-4 bg-card/80">
              <ProofAnimation type="generate" />
            </div>
          )}
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
                placeholder="type your message"
                className="pl-8 bg-input border-primary font-mono text-foreground placeholder:text-muted-foreground"
                disabled={showProofAnimation}
              />
            </div>
            <Button
              variant="terminal"
              onClick={handleSendMessage}
              disabled={showProofAnimation}
            >
              [SEND]
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            <span className="text-accent">&gt;</span> Press Enter to send • Messages are encrypted and verified with ZK proofs
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
