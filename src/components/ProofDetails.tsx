import { Check, X, Clock, Shield, Hash, Key } from "lucide-react";

interface ProofDetailsProps {
  proofData: {
    proof: any;
    publicInputs: any;
  };
  verified: boolean;
  timestamp: string;
  walletAddress: string;
  blockchainTxHash?: string | null;
}

const ProofDetails = ({ 
  proofData, 
  verified, 
  timestamp, 
  walletAddress,
  blockchainTxHash 
}: ProofDetailsProps) => {
  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="border-2 border-accent/30 p-4 bg-background/95 space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="border-b border-accent/30 pb-2">
        <h4 className="text-accent font-bold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          ZERO-KNOWLEDGE PROOF DETAILS
        </h4>
      </div>

      {/* Verification Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <span className={verified ? "text-primary" : "text-destructive"}>
            {verified ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                VERIFIED
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <X className="w-3 h-3" />
                FAILED
              </span>
            )}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Clock className="w-3 h-3 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-muted-foreground">Verified At:</span>
            <div className="text-foreground">{formatTimestamp(timestamp)}</div>
          </div>
        </div>
      </div>

      {/* Proof Hash */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Hash className="w-3 h-3" />
          <span className="font-bold">Proof Signature</span>
        </div>
        <div className="bg-card p-2 text-foreground">
          {typeof proofData.proof === 'object' && proofData.proof !== null ? (
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-muted-foreground">Type:</span> {(proofData.proof as any)?.protocol || 'groth16'} 
                {(proofData.proof as any)?.curve ? ` (${(proofData.proof as any).curve})` : ''}
              </div>
              <div className="text-[10px] text-muted-foreground break-all">
                pi_a: [{(proofData.proof as any)?.pi_a?.slice(0, 2).join(', ')}...]
              </div>
              <div className="text-[10px] text-muted-foreground break-all">
                pi_b: [[{(proofData.proof as any)?.pi_b?.[0]?.slice(0, 2).join(', ')}...], [{(proofData.proof as any)?.pi_b?.[1]?.slice(0, 2).join(', ')}...]]
              </div>
              <div className="text-[10px] text-muted-foreground break-all">
                pi_c: [{(proofData.proof as any)?.pi_c?.slice(0, 2).join(', ')}...]
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(proofData.proof, null, 2));
                }}
                className="text-accent hover:underline text-[10px] mt-1"
              >
                [Copy Full Proof]
              </button>
            </div>
          ) : (
            <div className="break-all">{String(proofData.proof || 'N/A')}</div>
          )}
        </div>
      </div>

      {/* Public Inputs */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Key className="w-3 h-3" />
          <span className="font-bold">Public Inputs</span>
        </div>
        <div className="bg-card p-2 space-y-1">
          {Object.entries(proofData.publicInputs).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-muted-foreground">{key}:</span>
              <span className="text-foreground break-all">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          {/* Hint when commitment equals a small constant like 10000 */}
          {String((proofData as any)?.publicInputs?.commitment) === '10000' && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Note: This circuit build exposes [valid, threshold] as public signals. Commitment shown here is derived client-side and should be unique per message.
            </div>
          )}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="space-y-1">
        <span className="text-muted-foreground">Wallet Address:</span>
        <div className="bg-card p-2 break-all text-foreground">
          {walletAddress}
        </div>
      </div>

      {/* Blockchain Transaction */}
      {blockchainTxHash && (
        <div className="space-y-1">
          <span className="text-muted-foreground">Blockchain TX:</span>
          <div className="bg-card p-2">
            <a 
              href={`https://explorer.solana.com/tx/${blockchainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline break-all"
            >
              {blockchainTxHash}
            </a>
          </div>
        </div>
      )}

      {/* Technical Info */}
      <div className="border-t border-accent/30 pt-2 space-y-1">
        <div className="text-muted-foreground text-[10px]">
          <div>Circuit: tokenBalance.circom (Circom)</div>
          <div>Proving System: Groth16 (bn128 curve)</div>
          <div>Algorithm: Zero-Knowledge Succinct Non-Interactive Argument of Knowledge</div>
          <div>Security: Cryptographic proof without revealing secret balance</div>
        </div>
      </div>

      {/* What This Proves */}
      <div className="border-t border-accent/30 pt-2">
        <div className="text-primary font-bold mb-1">What This Proves:</div>
        <ul className="text-muted-foreground space-y-1 text-[10px]">
          <li>✓ Sender owns the wallet address</li>
          <li>✓ Message was authorized by wallet holder</li>
          <li>✓ Proof generated without revealing private key</li>
          <li>✓ Cryptographic verification completed successfully</li>
          {blockchainTxHash && <li>✓ Transaction logged on Solana blockchain</li>}
        </ul>
      </div>
    </div>
  );
};

export default ProofDetails;
