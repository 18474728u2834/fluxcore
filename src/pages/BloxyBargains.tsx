import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import bloxyLogo from "@/assets/bloxy-bargains-logo.png";

const WORKSPACE_ID = "b0b7ad15-e962-479e-8cf1-747f61e66147";

export default function BloxyBargains() {
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
        <img src={bloxyLogo} alt="Bloxy Bargains" className="w-24 h-24 mx-auto rounded-2xl" />
        <h1 className="text-2xl font-bold text-white">Bloxy Bargains</h1>
        <Loader2 className="w-6 h-6 text-white/50 animate-spin mx-auto" />
        <p className="text-sm text-white/40">Redirecting...</p>
      </div>
    </div>
  );
}