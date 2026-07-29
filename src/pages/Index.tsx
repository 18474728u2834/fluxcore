import { useSearchParams } from "react-router-dom";
import { useLandingTheme, type LandingTheme } from "@/hooks/useLandingTheme";
import LandingClassic from "@/pages/landing/LandingClassic";
import LandingAurora from "@/pages/landing/LandingAurora";
import LandingTerminal from "@/pages/landing/LandingTerminal";

export default function Index() {
  const { theme } = useLandingTheme();
  const [params] = useSearchParams();

  // ?theme=aurora lets staff preview a design without switching it for everyone.
  const preview = params.get("theme");
  const active: LandingTheme =
    preview === "classic" || preview === "aurora" || preview === "terminal" ? preview : theme;

  if (active === "aurora") return <LandingAurora />;
  if (active === "terminal") return <LandingTerminal />;
  return <LandingClassic />;
}
