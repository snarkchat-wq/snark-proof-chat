import { useState, useEffect } from "react";

interface ProofAnimationProps {
  type: "generate" | "verify" | "blockchain";
  onComplete?: () => void;
}

const ProofAnimation = ({ type, onComplete }: ProofAnimationProps) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = {
    generate: [
      { text: "> compiling zk circuit...", progress: 40 },
      { text: "> generating proof...", progress: 80 },
      { text: "> proof complete ✅", progress: 100 },
      { text: "> secret never left browser 🔒", progress: 100 },
    ],
    verify: [
      { text: "> verifying proof...", progress: 50 },
      { text: "> checking cryptographic signature...", progress: 85 },
      { text: "proof validation: ✅ success", progress: 100 },
    ],
    blockchain: [
      { text: "> preparing transaction...", progress: 25 },
      { text: "> sending to Solana Mainnet...", progress: 85 },
      { text: "> transaction confirmed ✅", progress: 100 },
      { text: "> hash: 5H3fT9k9AB2c8Fd...", progress: 100 },
    ],
  };

  const currentStages = stages[type];

  useEffect(() => {
    if (stage >= currentStages.length) {
      onComplete?.();
      return;
    }

    const targetProgress = currentStages[stage].progress;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) {
          clearInterval(interval);
          setTimeout(() => {
            setStage((s) => s + 1);
            if (stage < currentStages.length - 1) {
              setProgress(currentStages[stage + 1]?.progress || 0);
            }
          }, 500);
          return prev;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [stage, currentStages, onComplete]);

  const renderProgressBar = () => {
    const filled = Math.floor((progress / 100) * 25);
    const empty = 25 - filled;
    return `[${"▓".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
  };

  return (
    <div className="font-mono space-y-2 text-xs md:text-sm">
      {currentStages.slice(0, stage + 1).map((s, i) => (
        <div key={i} className={i === stage ? "terminal-glow" : ""}>
          <div className="text-primary">{s.text}</div>
          {i === stage && s.progress < 100 && (
            <div className="text-accent mt-1">{renderProgressBar()}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProofAnimation;
