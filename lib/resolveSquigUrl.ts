/**
 * Squig.link (CrinGraph) phone_book resolver.
 *
 * Squig.link sites expose a JSON manifest at:
 *   https://{host}/data/phone_book.json
 *
 * Structure:
 *   [ { name: "Brand", phones: [ { name: "Model", file: "Brand Model" | ["variant1", ...] } ] } ]
 *
 * Raw measurement files are served at:
 *   https://{host}/{optional_path}/data/{file}.txt
 *
 * This module fetches the phone_book, searches for model tokens from a share URL,
 * and returns resolved raw file URLs.
 */

type PhoneEntry = {
  name: string;
  file?: string | string[];
  suffix?: string | string[];
};

type BrandEntry = {
  name: string;
  phones: PhoneEntry[];
};

export type ResolvedFile = {
  label: string;
  leftUrl: string;
  rightUrl: string;
  fallbackUrl: string;
};

// Simple process-lifetime cache: avoids re-fetching phone_book for the same baseUrl
const phoneBookCache = new Map<string, BrandEntry[]>();

async function fetchPhoneBook(baseUrl: string): Promise<BrandEntry[]> {
  if (phoneBookCache.has(baseUrl)) return phoneBookCache.get(baseUrl)!;

  const url = `${baseUrl}data/phone_book.json`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json, */*" },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    throw new Error(`phone_book.json returned HTTP ${resp.status} for ${baseUrl}`);
  }

  const data = (await resp.json()) as BrandEntry[];
  phoneBookCache.set(baseUrl, data);
  return data;
}

/**
 * Normalise a token or filename for fuzzy matching.
 * Collapses whitespace, lowercases, replaces underscores with spaces.
 */
function normalise(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Check if a phone_book file entry matches the given model token.
 * Returns 2 for exact match, 1 for prefix match, 0 for no match.
 * We use scoring to prefer exact matches over prefix matches.
 */
function matchScore(file: string, token: string): number {
  const nFile  = normalise(file);
  const nToken = normalise(token);
  if (nFile === nToken) return 2;                         // exact
  if (nFile.startsWith(nToken + " ")) return 1;           // prefix (variant like "7Hz Zero deep")
  return 0;
}

/**
 * Resolve model tokens from a squig.link share URL into raw .txt file URLs.
 *
 * CrinGraph sites serve per-channel files: "{file} L.txt" and "{file} R.txt".
 * Returns leftUrl, rightUrl, and fallbackUrl for each resolved model.
 */
export async function resolveSquigUrls(
  baseUrl: string,
  tokens: string[]
): Promise<ResolvedFile[]> {
  const phoneBook = await fetchPhoneBook(baseUrl);

  const results: ResolvedFile[] = [];

  for (const token of tokens) {
    // Find best-scored match across all brands/phones/files
    let bestScore = 0;
    let bestResult: ResolvedFile | null = null;

    for (const brand of phoneBook) {
      for (const phone of brand.phones) {
        const files = Array.isArray(phone.file)
          ? phone.file
          : phone.file
          ? [phone.file]
          : [];

        for (const file of files) {
          const score = matchScore(file, token);
          if (score > bestScore) {
            bestScore = score;
            const encodedFile = file.replace(/ /g, "%20");
            const base = `${baseUrl}data/${encodedFile}`;
            
            // Prevent duplicated brand names (e.g. "Truthear Truthear Gate")
            const resolvedLabel = phone.name.toLowerCase().startsWith(brand.name.toLowerCase())
              ? phone.name
              : `${brand.name} ${phone.name}`;

            bestResult = {
              label: resolvedLabel,
              leftUrl: `${base} L.txt`,
              rightUrl: `${base} R.txt`,
              fallbackUrl: `${base}.txt`,
            };
            if (score === 2) break; // exact match — no need to search further in this phone
          }
        }
      }
      if (bestScore === 2) break; // exact match found — stop searching brands
    }

    if (bestResult) results.push(bestResult);
  }

  return results;
}
