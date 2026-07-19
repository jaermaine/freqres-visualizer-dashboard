import { Metadata } from 'next';
import { Redis } from '@upstash/redis';
import { redirect } from 'next/navigation';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

type Props = {
  params: { id: string };
};

function extractNames(urls: string[]): string[] {
  const names: string[] = [];
  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.searchParams.has('share')) {
        const share = parsed.searchParams.get('share');
        if (share) {
          const models = share.split(',');
          for (const m of models) {
            names.push(decodeURIComponent(m).replace(/_/g, ' '));
          }
        }
      } else {
        // Fallback to filename
        let filename = parsed.pathname.split('/').pop() || '';
        filename = decodeURIComponent(filename).replace(/\.txt|\.csv|\.tsv/gi, '').replace(/_/g, ' ');
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

  let title = 'FreqRes: Frequency Response Comparator';
  let description = 'Interactive frequency response comparison graph.';

  try {
    const data = await redis.get(`workspace:${id}`);
    if (data) {
      const workspace: any = typeof data === 'string' ? JSON.parse(data) : data;
      if (workspace && Array.isArray(workspace.urls) && workspace.urls.length > 0) {
        const names = extractNames(workspace.urls);
        if (names.length > 0) {
          title = `📊 FreqRes: ${names.join(' vs ')}`;
          description = `Interactive frequency response comparison of ${names.length} trace${names.length > 1 ? 's' : ''}. Target: ${workspace.target || 'Harman'}`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating metadata for shortlink:", error);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      // We will create a default banner image for the site
      images: ['/og-banner.png'], 
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-banner.png'],
    }
  };
}

export default function ShortLinkPage({ params }: Props) {
  // Instead of rendering a heavy client app, we instantly server-redirect the user
  // back to the root page, passing the short ID so AppShell can hydrate it!
  // Scrapers (Discord, Twitter) don't follow redirects immediately, they read the <head> tags above!
  redirect(`/?s=${params.id}`);
}
