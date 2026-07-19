import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours

const DATABASES = [
  { id: 'jaytiss', name: 'Jaytiss', url: 'https://jaytiss.squig.link/data/phone_book.json', base: 'https://jaytiss.squig.link/' },
  { id: 'super', name: 'Super*Review', url: 'https://squig.link/data/phone_book.json', base: 'https://squig.link/' },
  { id: 'precog', name: 'Precogvision', url: 'https://precog.squig.link/data/phone_book.json', base: 'https://precog.squig.link/' }
];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    let results: any[] = [];

    // Fetch all databases in parallel
    const fetches = DATABASES.map(async (db) => {
      try {
        const res = await fetch(db.url, { next: { revalidate: 86400 } });
        if (!res.ok) return;
        
        const data = await res.json();
        // phone_book.json is usually an array of objects: { file: "...", name: "..." }
        // or a nested array depending on the Squiglink version, but standard is array of { name, file } or { n: name, f: file }
        let entries = [];
        if (Array.isArray(data)) {
          entries = data;
        } else if (data && typeof data === 'object') {
          entries = Object.values(data).flat();
        }

        // Filter and map
        for (const entry of entries) {
          const name = entry.name || entry.n || entry.file || entry.f;
          if (name && name.toLowerCase().includes(q)) {
            // Build the URL that can be imported
            // Standard squiglink share URL format: https://[db]/?share=[name]
            const importUrl = `${db.base}?share=${encodeURIComponent(name)}`;
            results.push({
              id: `${db.id}-${name}`,
              name: name,
              source: db.name,
              url: importUrl
            });
            if (results.length > 30) break; // limit
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${db.id} phonebook:`, e);
      }
    });

    await Promise.all(fetches);

    // Limit overall results
    return NextResponse.json(results.slice(0, 20));
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
