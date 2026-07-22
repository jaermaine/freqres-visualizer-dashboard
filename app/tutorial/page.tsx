import type { Metadata } from "next";
import { GuideContent } from "@/components/GuideContent";

export const metadata: Metadata = {
  title: "FreqRes – Guide & Help",
  description: "Learn how to import frequency response data from Squig.link, Hangout Audio, and raw measurement files.",
};

export default function TutorialPage() {
  return <GuideContent />;
}
