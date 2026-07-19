import { Metadata } from 'next';
import { Redis } from '@upstash/redis';
import { Redirector } from '@/components/Redirector';

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
          title = `FreqRes: ${names.join(' vs ')}`;
          description = `Interactive frequency response comparison of ${names.length} trace${names.length > 1 ? 's' : ''}. Target: ${workspace.target || 'Harman'}`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating metadata for shortlink:", error);
  }

  // Use dynamic OG image from the database
  const ogImageUrl = `https://freqres.vercel.app/api/og-image?id=${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImageUrl], 
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    }
  };
}

export default function ShortLinkPage({ params }: Props) {
  // We use a client-side redirect so that Discord/Twitter scrapers
  // (which don't run JS) hit a 200 OK and read our beautiful <head> tags!
  return <Redirector id={params.id} />;
}
