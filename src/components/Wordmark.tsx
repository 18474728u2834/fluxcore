import { useNavigate } from "react-router-dom";

export function Wordmark({ small, className }: { small?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      className={`flex items-center ${className ?? ""}`}
      aria-label="Fluxcore home"
    >
      <span
        className={`${small ? "text-[15px]" : "text-[17px]"} font-semibold tracking-[-0.02em] text-foreground`}
      >
        Fluxcore
      </span>
    </button>
  );
}
