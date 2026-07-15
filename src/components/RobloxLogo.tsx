import robloxLogo from "@/assets/roblox-logo-v2.png.asset.json";

export function RobloxLogo({ className }: { className?: string }) {
  return (
    <img
      src={robloxLogo.url}
      alt="Roblox"
      className={className}
      aria-hidden="true"
    />
  );
}
