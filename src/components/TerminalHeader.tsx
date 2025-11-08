const TerminalHeader = () => {
  return (
    <div className="border-b-2 border-primary py-4 px-6">
      <pre className="text-primary terminal-glow text-xs md:text-sm text-center">
{`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ███████╗███╗   ██╗ █████╗ ██████╗ ██╗  ██╗                    ║
║   ██╔════╝████╗  ██║██╔══██╗██╔══██╗██║ ██╔╝                    ║
║   ███████╗██╔██╗ ██║███████║██████╔╝█████╔╝                     ║
║   ╚════██║██║╚██╗██║██╔══██║██╔══██╗██╔═██╗                     ║
║   ███████║██║ ╚████║██║  ██║██║  ██║██║  ██╗                    ║
║   ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝                    ║
║                                                                   ║
║   Zero-Knowledge Group Chat                                      ║
║   "Talk in proofs, not secrets."                                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`}
      </pre>
    </div>
  );
};

export default TerminalHeader;
