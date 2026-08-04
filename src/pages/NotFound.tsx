import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import dogThinking from "@/assets/404-thinking-dog.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
          <img
            src={dogThinking}
            alt="Confused dog thinking about a missing page"
            width={768}
            height={768}
            className="w-56 animate-[bounce_3s_ease-in-out_infinite] drop-shadow-2xl sm:w-64"
          />
        </div>

        <p className="mt-2 font-mono text-sm uppercase tracking-[0.3em] text-primary">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Uh oh… 404</h1>
        <p className="mt-3 text-muted-foreground">
          Even the good boy can't sniff out this page. It may have been moved, renamed, or never existed.
        </p>
        <code className="mt-4 max-w-full truncate rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          {location.pathname}
        </code>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/support">
              <LifeBuoy className="mr-2 h-4 w-4" />
              Get support
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
