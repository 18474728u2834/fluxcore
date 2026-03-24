import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowRight, Shield, Lock } from "lucide-react";

const mockWorkspaces = [
  {
    id: "1",
    name: "Pastriez Bakery",
    role: "Moderator",
    members: 142,
    icon: "🍰",
  },
  {
    id: "2",
    name: "BloxStreet Corp",
    role: "Staff",
    members: 389,
    icon: "🏬",
  },
  {
    id: "3",
    name: "Freshly Restaurant",
    role: "Admin",
    members: 67,
    icon: "🍽️",
  },
];

export default function Workspaces() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-15" />

      {/* Header */}
      <nav className="relative border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gradient">Fluxcore</span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground">
              D
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">DarkSlayer</span>
          </div>
        </div>
      </nav>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Your Workspaces</h1>
          <p className="text-muted-foreground">Select a workspace to manage or create your own</p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {mockWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => navigate("/dashboard")}
              className="glass-hover rounded-xl p-6 text-left group transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {ws.icon}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{ws.name}</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {ws.role}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {ws.members}
                </span>
              </div>
            </button>
          ))}

          {/* Create Workspace */}
          <button
            onClick={() => navigate("/verify")}
            className="glass-hover rounded-xl p-6 text-left group transition-all border-dashed border-2 border-border/60 hover:border-primary/40 flex flex-col items-center justify-center gap-3 min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Create Workspace</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                <Lock className="w-3 h-3" /> Requires Gamepass
              </p>
            </div>
          </button>
        </div>

        {/* Info banner */}
        <div className="glass rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Want to create your own workspace?</h4>
            <p className="text-sm text-muted-foreground">
              You need to own the Fluxcore gamepass on Roblox to create workspaces. Joining existing workspaces is always free.
            </p>
            <Button variant="link" className="px-0 mt-2 h-auto text-sm" onClick={() => navigate("/verify")}>
              Verify gamepass ownership →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
