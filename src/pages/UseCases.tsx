import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TerminalHeader from "@/components/TerminalHeader";
import { Shield, Users, Lock, Key } from "lucide-react";

const UseCases = () => {
  const navigate = useNavigate();

  const useCases = [
    {
      icon: Users,
      title: "Whale Chats",
      description: "Form exclusive whale chats by simply verifying the amount of tokens users hold. Create high-value communities where membership is automatically validated through zero-knowledge proofs without revealing exact balances.",
      gradient: "from-blue-500/20 to-purple-500/20"
    },
    {
      icon: Shield,
      title: "Military-Grade Encryption",
      description: "Experience military-grade encryption for private chats. All messages are end-to-end encrypted using advanced cryptographic protocols, ensuring your conversations remain completely private and secure.",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: Key,
      title: "Token-Holder Communities",
      description: "Form communities where users who hold a specific native token can come together and communicate while verifying their token status with zero-knowledge proofs. Build trust without compromising privacy.",
      gradient: "from-pink-500/20 to-orange-500/20"
    },
    {
      icon: Lock,
      title: "Token-Gated Access",
      description: "Implement token gating for chats and information. Control access to exclusive content and conversations based on token holdings, automatically verified through blockchain technology.",
      gradient: "from-orange-500/20 to-blue-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <TerminalHeader />
        
        <div className="mt-8 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-primary">
              Use Cases
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover how our platform leverages zero-knowledge proofs and blockchain technology to create secure, private, and token-gated communication channels.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-12">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card
                  key={index}
                  className={`p-6 bg-gradient-to-br ${useCase.gradient} border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        {useCase.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center gap-4 mt-12">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="text-base px-8"
            >
              BACK TO HOME
            </Button>
            <Button
              onClick={() => navigate("/chat")}
              size="lg"
              className="text-base px-8"
            >
              ENTER CHAT
            </Button>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>SYSTEM_STATUS: OPERATIONAL | ENCRYPTION: ACTIVE | ZK_PROOFS: ENABLED</p>
        </div>
      </div>
    </div>
  );
};

export default UseCases;
