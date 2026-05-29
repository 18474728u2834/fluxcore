import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Props {
  className?: string;
  label?: string;
}

export function DiscordSignInButton({ className, label = "Sign in with Discord" }: Props) {
  const handleClick = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${SUPABASE_URL}/functions/v1/discord-oauth-callback?start=1&origin=${origin}`;
  };

  return (
    <Button
      onClick={handleClick}
      className={
        className ||
        "w-full h-12 text-base bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
      }
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a.074.074 0 0 0-.079.037 13.83 13.83 0 0 0-.61 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 5.683 4.369a.07.07 0 0 0-.032.027C2.533 9.046 1.68 13.58 2.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.029.078.078 0 0 0 .084-.028 14.23 14.23 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.946 2.419-2.157 2.419z" />
      </svg>
      {label}
    </Button>
  );
}
