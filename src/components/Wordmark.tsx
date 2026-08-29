import { useNavigate } from "react-router-dom";

export function Wordmark({ small, className }: { small?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      className={`flex items-center group ${className ?? ""}`}
      aria-label="Fluxcore home"
    >
      <span
        className={`landing-head ${small ? "text-[16px]" : "text-[18px]"} font-bold text-foreground transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.03]`}
      >
        Fluxcore
      </span>
    </button>
  );
}
