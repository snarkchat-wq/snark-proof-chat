import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TerminalHeader from "@/components/TerminalHeader";

const About = () => {
  return (
    <div className="min-h-screen bg-background scanlines">
      <TerminalHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation */}
        <div className="mb-6 flex gap-4 border-b border-primary pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              [HOME]
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              [CHAT]
            </Button>
          </Link>
        </div>

        <div className="space-y-8 font-mono">
          {/* How it works */}
          <section className="border-2 border-primary p-6 bg-card/50">
            <h2 className="text-2xl text-primary terminal-glow mb-6 font-bold">
              HOW IT WORKS
            </h2>
            
            <div className="space-y-4 text-sm">
              <div className="border-l-2 border-accent pl-4">
                <h3 className="text-accent font-bold mb-2">1. WALLET CONNECTION</h3>
                <p className="text-foreground">
                  Connect your Phantom Wallet via Solana's browser SDK. Your public key serves as your identity.
                </p>
              </div>

              <div className="border-l-2 border-accent pl-4">
                <h3 className="text-accent font-bold mb-2">2. MESSAGE ENCRYPTION</h3>
                <p className="text-foreground">
                  Messages are encrypted client-side using WebCrypto API (AES-GCM). Your secrets never leave your browser.
                </p>
              </div>

              <div className="border-l-2 border-accent pl-4">
                <h3 className="text-accent font-bold mb-2">3. PROOF GENERATION</h3>
                <p className="text-foreground">
                  gnark (compiled to WASM) generates a zero-knowledge proof that you're authorized, without revealing your secret.
                </p>
              </div>

              <div className="border-l-2 border-accent pl-4">
                <h3 className="text-accent font-bold mb-2">4. BLOCKCHAIN VERIFICATION</h3>
                <p className="text-foreground">
                  Proof is verified and optionally logged to Solana blockchain via JSON-RPC for transparency.
                </p>
              </div>
            </div>
          </section>

          {/* Flow diagram */}
          <section className="border-2 border-accent p-6 bg-card/50">
            <h2 className="text-2xl text-accent terminal-glow-cyan mb-6 font-bold">
              SYSTEM ARCHITECTURE
            </h2>
            
            <pre className="text-xs md:text-sm text-primary overflow-x-auto">
{`
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   BROWSER   │────▶│  gnark.WASM  │────▶│    PROOF    │
│  (SECRET)   │     │   CIRCUIT    │     │  GENERATED  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   SOLANA    │◀────│   BACKEND    │◀────│  ENCRYPTED  │
│ BLOCKCHAIN  │     │   VERIFY     │     │   MESSAGE   │
└─────────────┘     └──────────────┘     └─────────────┘

PRIVACY GUARANTEE:
Your secret stays in browser ────────────────────────┐
                                                      │
Only proof is sent ────────────────────────────────┐ │
                                                    │ │
Blockchain logs only hash ──────────────────────┐  │ │
                                                 ▼  ▼ ▼
                                          🔒 ZERO KNOWLEDGE
`}
            </pre>
          </section>

          {/* Tech stack */}
          <section className="border-2 border-primary p-6 bg-card/50">
            <h2 className="text-2xl text-primary terminal-glow mb-6 font-bold">
              TECHNOLOGY STACK
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="border border-primary/50 p-4 bg-background/50">
                <div className="text-accent mb-2 font-bold">FRONTEND</div>
                <ul className="space-y-1 text-foreground">
                  <li>• React + Vite</li>
                  <li>• Tailwind CSS</li>
                  <li>• WebCrypto API</li>
                </ul>
              </div>

              <div className="border border-primary/50 p-4 bg-background/50">
                <div className="text-accent mb-2 font-bold">BLOCKCHAIN</div>
                <ul className="space-y-1 text-foreground">
                  <li>• Phantom Wallet SDK</li>
                  <li>• Solana JSON-RPC</li>
                  <li>• Devnet/Mainnet</li>
                </ul>
              </div>

              <div className="border border-primary/50 p-4 bg-background/50">
                <div className="text-accent mb-2 font-bold">CRYPTOGRAPHY</div>
                <ul className="space-y-1 text-foreground">
                  <li>• gnark WASM</li>
                  <li>• Zero-knowledge proofs</li>
                  <li>• AES-GCM encryption</li>
                </ul>
              </div>

              <div className="border border-primary/50 p-4 bg-background/50">
                <div className="text-accent mb-2 font-bold">BACKEND</div>
                <ul className="space-y-1 text-foreground">
                  <li>• Serverless Functions</li>
                  <li>• Go/JavaScript</li>
                  <li>• Proof verification</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Security guarantees */}
          <section className="border-2 border-destructive p-6 bg-card/50">
            <h2 className="text-2xl text-destructive mb-6 font-bold">
              SECURITY GUARANTEES
            </h2>
            
            <div className="space-y-3 text-sm text-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Your secret keys never leave your browser</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Zero-knowledge proofs verify identity without revealing secrets</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>End-to-end encryption for all messages</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Blockchain verification for transparency</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Open-source cryptographic primitives</span>
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center border-t-2 border-primary pt-6">
            <Link to="/chat">
              <Button variant="terminal" size="lg">
                [START CHATTING]
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4 cursor-blink">
              Ready to experience privacy-first communication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
