import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours

const DATABASES = [
  { id: "joyce", name: "Joyce's Review", url: "https://squig.link/lab/joycesreview/data/phone_book.json", base: "https://squig.link/lab/joycesreview/" },
  { id: "jaytiss", name: "Jaytiss", url: "https://jaytiss.squig.link/data/phone_book.json", base: "https://jaytiss.squig.link/" },
  { id: "jaysaudio", name: "Jay's Audio", url: "https://jaysaudio.github.io/data/phone_book.json", base: "https://jaysaudio.github.io/" },
  { id: "super", name: "Super*Review", url: "https://squig.link/data/phone_book.json", base: "https://squig.link/" },
  { id: "precog", name: "Precogvision", url: "https://precog.squig.link/data/phone_book.json", base: "https://precog.squig.link/" },
] as const;

type SearchIndexItem = {
  id: string;
  name: string;
  source: string;
  url: string;
  searchTarget: string;
};

const INDEX_TTL_MS = 24 * 60 * 60 * 1000;
const dbIndexCache = new Map<string, { items: SearchIndexItem[]; timestamp: number }>();

async function getDatabaseIndex(db: (typeof DATABASES)[number]): Promise<SearchIndexItem[]> {
  const now = Date.now();
  const cached = dbIndexCache.get(db.id);
  if (cached && now - cached.timestamp < INDEX_TTL_MS) {
    return cached.items;
  }

  try {
    const res = await fetch(db.url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return cached?.items ?? [];

    const data = await res.json();
    let entries: any[] = [];
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && typeof data === "object") {
      entries = Object.values(data).flat();
    }

    const extractedEntries: any[] = [];
    for (const entry of entries) {
      if (entry && entry.phones && Array.isArray(entry.phones)) {
        extractedEntries.push(...entry.phones);
      } else if (entry) {
        extractedEntries.push(entry);
      }
    }

    const items: SearchIndexItem[] = [];
    for (const entry of extractedEntries) {
      const rawFile = entry.file || entry.f;
      const files = Array.isArray(rawFile) ? rawFile : rawFile ? [rawFile] : [];

      for (const file of files) {
        if (typeof file !== "string" || !file) continue;
        const displayName = entry.name || entry.n || file;
        items.push({
          id: `${db.id}-${file}`,
          name: file,
          source: db.name,
          url: `${db.base}?share=${encodeURIComponent(file)}`,
          searchTarget: `${displayName} ${file}`.toLowerCase(),
        });
      }
    }

    dbIndexCache.set(db.id, { items, timestamp: now });
    return items;
  } catch (e) {
    console.error(`Failed to fetch ${db.id} phonebook:`, e);
    return cached?.items ?? [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const perDbMatches = await Promise.all(
      DATABASES.map(async (db) => {
        const index = await getDatabaseIndex(db);
        const matches: Omit<SearchIndexItem, "searchTarget">[] = [];
        for (let i = 0; i < index.length; i++) {
          const item = index[i];
          if (item.searchTarget.includes(q)) {
            matches.push({
              id: item.id,
              name: item.name,
              source: item.source,
              url: item.url,
            });
            if (matches.length >= 10) break;
          }
        }
        return matches;
      })
    );

    const combined = perDbMatches.flat().slice(0, 20);
    return NextResponse.json(combined);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
