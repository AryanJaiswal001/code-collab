import type { Metadata } from "next";
import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "Code Collab | Build Together. Merge Faster.",
  description:
    "A real-time collaborative coding platform for teams, hackathons, and open-source developers.",
};

export default function Home() {
  return <LandingPage />;
}

