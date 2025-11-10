import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";

const WalletHeader = () => {
  const { connected, publicKey, connect, disconnect, isInstalled } = useWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!isInstalled) {
      toast({
        title: "Phantom Wallet Not Found",
        description: "Please install Phantom Wallet extension",
        variant: "destructive",
      });
      return;
    }

    try {
      await connect();
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to Phantom wallet",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected from wallet",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      {connected && publicKey ? (
        <>
          <div className="bg-card/80 backdrop-blur-sm border border-primary px-4 py-3 rounded font-mono text-base text-primary">
            {formatAddress(publicKey)}
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleDisconnect}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-base px-6"
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          variant="terminal"
          size="lg"
          onClick={handleConnect}
          className="text-base px-8 py-6"
        >
          Connect Wallet
        </Button>
      )}
    </div>
  );
};

export default WalletHeader;
