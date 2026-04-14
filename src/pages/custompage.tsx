import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import downtownLogo from "@/assets/bargains-downtown-logo.png";

const WORKSPACE_ID = "abc43fd3-734d-48fc-8461-0f3f92b24cb2";

export default function BloxyBargainsDowntown() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(`/w/${WORKSPACE_ID}/dashboard`);
    } else {
      navigate("/login");
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.06]" />
      <div className="text-center space-y-6">
        <img src={downtownLogo} alt="Bargains Downtown" className="w-24 h-24 mx-auto rounded-2xl" />
        <h1 className="text-2xl font-bold text-white">Bargains Downtown</h1>
        <Loader2 className="w-6 h-6 text-white/50 animate-spin mx-auto" />
        <p className="text-sm text-white/40">Redirecting...</p>
      </div>
    </div>
  );
}
