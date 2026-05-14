import { CodeReviewSection } from "./code-review-section";
import { HeroSection } from "./hero-section";
import { IconCloudSection } from "./icon-cloud-section";
import { LandingBackground } from "./landing-background";
import { LiveCollaborationSection } from "./live-collaboration-section";
import { TemplateEcosystemSection } from "./template-ecosystem-section";

export function LandingPage() {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#03050b] text-white">
      <LandingBackground />
      <HeroSection />
      <LiveCollaborationSection />
      <CodeReviewSection />
      <TemplateEcosystemSection />
      <IconCloudSection />
      <footer className="relative z-10 border-t border-white/10 px-6 py-10 text-center text-sm text-zinc-500 sm:px-8 lg:px-10">
        <p>Code Collab is built for ambitious open-source teams, hackathons, and modern product engineering.</p>
      </footer>
    </div>
  );
}

