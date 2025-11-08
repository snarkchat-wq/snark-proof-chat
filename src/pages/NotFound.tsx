import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background scanlines">
      <div className="text-center border-2 border-destructive p-8 max-w-lg">
        <pre className="text-destructive text-6xl mb-4 font-bold terminal-glow">404</pre>
        <h1 className="mb-4 text-2xl font-bold text-foreground font-mono">ROUTE NOT FOUND</h1>
        <p className="mb-6 text-sm text-muted-foreground font-mono">
          <span className="text-destructive">&gt;</span> ERROR: The requested path does not exist in the system
        </p>
        <a href="/" className="inline-block">
          <button className="border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 font-mono uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,102,0.5)]">
            [RETURN TO HOME]
          </button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
