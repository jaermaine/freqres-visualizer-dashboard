import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreqRes – Headphone Frequency Response Comparator",
  description:
    "Compare headphone and IEM frequency response curves. Import from Squig.link, Hangout Audio, or raw measurement files.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
