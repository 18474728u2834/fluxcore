import { useSearchParams } from "react-router-dom";
import { useLandingTheme, type LandingTheme } from "@/hooks/useLandingTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import LandingClassic from "@/pages/landing/LandingClassic";
import LandingAurora from "@/pages/landing/LandingAurora";
import LandingTerminal from "@/pages/landing/LandingTerminal";
import LandingMobile from "@/pages/landing/LandingMobile";

export default function Index() {
  const { theme } = useLandingTheme();
  const [params] = useSearchParams();
  const isMobile = useIsMobile();

  // ?theme=aurora lets staff preview a design without switching it for everyone.
  const preview = params.get("theme");
  const active: LandingTheme =
    preview === "classic" || preview === "aurora" || preview === "terminal" ? preview : theme;

  // Phones always get the dedicated mobile template, unless a theme is explicitly previewed.
  if (isMobile && !preview) return <LandingMobile />;
  if (preview === "mobile") return <LandingMobile />;

  if (active === "aurora") return <LandingAurora />;
  if (active === "terminal") return <LandingTerminal />;
  return <LandingClassic />;
}
