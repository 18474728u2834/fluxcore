import LandingClassic from "@/pages/landing/LandingClassic";
import { SiteDesignRenderer } from "@/components/SiteDesignRenderer";
import { useActiveSiteDesign } from "@/hooks/useSiteDesign";

export default function Index() {
  const { design, loading } = useActiveSiteDesign("landing");

  if (loading) return <div className="min-h-screen bg-background" />;
  if (design && design.sections.length) {
    return <SiteDesignRenderer design={design} className="min-h-screen" />;
  }
  return <LandingClassic />;
}
