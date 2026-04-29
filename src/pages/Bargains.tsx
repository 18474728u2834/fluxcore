import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Crown, ArrowRight, Loader2 } from "lucide-react";
import bargainsLogo from "@/assets/bargains-logo.png";

const WORKSPACE_ID = "81bd37c3-fb0a-465a-86b5-de4cfed43a09";

export default function Bargains() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleContinue = () => {
    if (user) navigate(`/w/${WORKSPACE_ID}/dashboard`);
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
            Staff Portal
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Bargains</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Welcome to the official staff hub. Manage operations, sessions, and your team — all in one place.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-4 mb-16">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-sm">
            <Crown className="w-6 h-6 text-primary mb-3" />
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Owner</p>
            <p className="text-lg font-semibold">Archie</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-sm">
            <Users className="w-6 h-6 text-primary mb-3" />
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Group Members</p>
            <p className="text-lg font-semibold">500+</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-sm">
            <Calendar className="w-6 h-6 text-primary mb-3" />
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Founded</p>
            <p className="text-lg font-semibold">2023</p>
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 p-8 md:p-12 mb-12">
          <h2 className="text-2xl font-bold mb-4">About Bargains</h2>
          <div className="space-y-4 text-white/70 leading-relaxed">
            <p>
              Founded in 2023, Bargains has grown into a thriving community of over 500 members on Roblox.
              Led by <span className="text-white font-medium">Archie</span>, we've built a reputation for delivering
              quality experiences and a welcoming staff culture.
            </p>
            <p>
              This portal is dedicated to our staff team — a place to coordinate shifts, run trainings, host events,
              and keep everyone aligned as we keep growing.
            </p>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={loading}
            className="min-w-[220px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {user ? "Go to Dashboard" : "Go to Login"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        <footer className="text-center mt-16 text-xs text-white/30">
          © {new Date().getFullYear()} Bargains • Staff Portal
        </footer>
      </div>
    </div>
  );
}
