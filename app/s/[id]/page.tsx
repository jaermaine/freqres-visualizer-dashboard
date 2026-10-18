import { Metadata } from "next";
import { redis } from "@/lib/redis";
import { Redirector } from "@/components/Redirector";

type Props = {
  params: { id: string };
};

const VALID_ID_RE = /^[a-zA-Z0-9]{4,12}$/;

function extractNames(urls: string[]): string[] {
  const names: string[] = [];
  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.searchParams.has("share")) {
        const share = parsed.searchParams.get("share");
        if (share) {
          const models = share.split(",");
          for (const m of models) {
            names.push(decodeURIComponent(m).replace(/_/g, " "));
          }
        }
      } else {
        let filename = parsed.pathname.split("/").pop() || "";
        filename = decodeURIComponent(filename)
          .replace(/\.txt|\.csv|\.tsv/gi, "")
          .replace(/_/g, " ");
        if (filename && !names.includes(filename)) names.push(filename);
      }
    } catch {
      continue;
    }
  }
  return names;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;

  let title = "FreqRes: Frequency Response Comparator";
  let description = "Interactive frequency response comparison graph.";

  if (VALID_ID_RE.test(id)) {
    try {
      const data = await redis.get(`workspace:${id}`);
      if (data) {
        const workspace: any = typeof data === "string" ? JSON.parse(data) : data;
        if (workspace && Array.isArray(workspace.urls) && workspace.urls.length > 0) {
          const names = extractNames(workspace.urls);
          if (names.length > 0) {
            title = `FreqRes: ${names.join(" vs ")}`;
            description = `Interactive frequency response comparison of ${names.length} trace${
              names.length > 1 ? "s" : ""
            }. Target: ${workspace.target || "Harman"}`;
          }
        }
      }
    } catch (error) {
      console.error("Error generating metadata for shortlink:", error);
    }
  }

  const ogImageUrl = `/api/og-image?id=${encodeURIComponent(id)}`;
  const pageUrl = `/s/${encodeURIComponent(id)}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://freqres-visualizer-dashboard.vercel.app");

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: pageUrl,
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    metadataBase: new URL(siteUrl),
  };
}

export default function ShortLinkPage({ params }: Props) {
  return <Redirector id={params.id} />;
}
