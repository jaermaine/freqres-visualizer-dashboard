import type { Metadata } from "next";
import Link from "next/link";
import { TutorialSidebar } from "@/components/TutorialSidebar";
import { UrlPatternCard } from "@/components/UrlPatternCard";
import type { UrlPatternCardData } from "@/components/UrlPatternCard";

export const metadata: Metadata = {
  title: "FreqRes – Tutorial & Help",
  description: "Learn how to import frequency response data from Squig.link, Hangout Audio, and raw measurement files.",
};

const URL_CARDS: UrlPatternCardData[] = [
  {
    title: "Squig.link Share URL",
    type: "graph-url",
    example: "https://precog.squig.link/?share=Precog_Target,TruthEars_Gate",
    note: "Graph viewer page. FreqRes automatically resolves the models from the `share` parameter, fetches the underlying measurement files, and plots the curves.",
  },
  {
    title: "AudioAmigo Squig Share",
    type: "graph-url",
    example: "https://audioamigo.squig.link/?share=Truthear_Gate",
    note: "Same as any *.squig.link URL — automatically resolves and plots the shared models.",
  },
  {
    title: "Hangout Audio Graph URL",
    type: "graph-url",
    example: "https://graph.hangout.audio/iem/5128/?share=JM-1_Target,Rockies&bass=7&tilt=-0.6",
    note: "Graph viewer with optional EQ adjustments. FreqRes parses models and adjustment parameters but cannot fetch raw curves from this URL format.",
  },
  {
    title: "Direct .txt Measurement File",
    type: "raw-file",
    example: "https://raw.githubusercontent.com/orgs/crinacle/measurements/Truthear_Gate.txt",
    note: "A direct link to a plain-text measurement file. FreqRes fetches, parses, normalizes, and plots the curve automatically.",
  },
  {
    title: "Direct .csv Measurement File",
    type: "raw-file",
    example: "https://example.com/measurements/headphone_fr.csv",
    note: "CSV format with a frequency column and a dB/SPL column (or left/right columns which are averaged).",
  },
  {
    title: "Direct .tsv Measurement File",
    type: "raw-file",
    example: "https://example.com/measurements/headphone_fr.tsv",
    note: "Tab-separated values. Same parsing rules as CSV.",
  },
];

const PARSE_ERRORS = [
  { code: "HTML_RESPONSE",              fix: "The URL points to a webpage, not a raw file. Find the direct download link for the measurement data." },
  { code: "NO_VALID_ROWS",              fix: "The file has no parseable frequency/dB rows. Check for encoding issues or an unexpected format." },
  { code: "TOO_FEW_POINTS",            fix: "Fewer than 10 valid data points were found. Ensure the file has complete frequency sweep data." },
  { code: "UNSUPPORTED_BINARY_CONTENT",fix: "The file is binary (e.g., REW .mdat). Export as .txt or .csv from REW first." },
  { code: "FETCH_ERROR",               fix: "Network or CORS error. Verify the URL is publicly accessible. Some sources block direct fetch." },
];

// GitHub raw file examples — these are illustrative only.
// The most reliable way to get a working URL is the DevTools Network tab method (Method 1).
// Repo paths and file names vary; always verify via the Network tab or by browsing the repo.
const GITHUB_RAW_EXAMPLES = [
  {
    reviewer: "AutoEq aggregated measurements",
    repo: "jaakkopasanen/AutoEq",
    example: "https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/measurements/crinacle/GRAS%2043AG-7%20711%20C%20w%20MBA%20adapter/Truthear%20Gate/Truthear%20Gate.txt",
    note: "AutoEq aggregates data from many reviewers. Browse github.com/jaakkopasanen/AutoEq/tree/master/measurements to find models. URL-encode spaces as %20.",
  },
  {
    reviewer: "KopijaElias / oratory1990 community mirrors",
    repo: "varies by reviewer",
    example: "https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/measurements/oratory1990/over-ear/Sennheiser%20HD%20650/Sennheiser%20HD%20650.txt",
    note: "Other reviewers (oratory1990, etc.) are also in AutoEq. Same URL pattern, different measurements/ subfolder.",
  },
];

// Model token → expected filename convention used by most squig.link databases.
const TOKEN_EXAMPLES = [
  { token: "Truthear_Gate",        filename: "Truthear Gate.txt"        },
  { token: "Moondrop_Aria",        filename: "Moondrop Aria.txt"        },
  { token: "Precog_Target",        filename: "Precog Target.txt"        },
  { token: "JM-1_Target",          filename: "JM-1 Target.txt"          },
  { token: "Harman_IEM_2019v2",    filename: "Harman IEM 2019v2.txt"    },
];

export default function TutorialPage() {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--bg-base)]">
      <TutorialSidebar />

      <main className="flex-1 overflow-y-auto scroll-smooth px-8 py-8 max-w-3xl">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          FreqRes — Guide
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          A guide to understanding frequency response graphs, supported URL patterns, and import behavior.
        </p>

        {/* What is FreqRes? */}
        <section id="what-is-freqres" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>What is FreqRes?</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            FreqRes is a lightweight, responsive web tool designed to instantly plot and compare frequency response graphs for headphones and in-ear monitors (IEMs). 
            Instead of navigating complex databases, you can simply paste a squiglink share URL or a direct raw data file, and FreqRes will automatically parse, normalize, and visualize the audio curves.
          </p>
        </section>

        {/* Inspiration & Credits */}
        <section id="credits" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Inspiration & Credits</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            The original inspiration for creating this small project came from{" "}
            <a href="https://www.youtube.com/watch?v=nLe_J_LQOwE&pp=ygUhY29tcGFyaW5nIGllbXMgd2l0aCAxNyBwYXJhbWV0ZXJz" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              DucBloke's YouTube video on comparing IEMs
            </a>. Huge thanks to him for the analytical deep-dive into audio parameters that sparked the idea to build an accessible graph viewer!
          </p>
        </section>

        {/* Understanding the Graph */}
        <section id="understanding-graphs" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Understanding the Graph</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            The plotted graph visually represents how an audio device reproduces sound across the human hearing spectrum.
          </p>
          <ul className="text-sm flex flex-col gap-2 pl-4 list-disc" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>X-Axis (Frequencies / Hz):</strong> Represents the pitch of the sound, from sub-bass on the far left (20 Hz) to upper-treble on the far right (20,000 Hz). The axis is logarithmic, mimicking how human ears perceive pitch intervals.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Y-Axis (Decibels / dB):</strong> Represents the loudness or amplitude of the sound at each specific frequency. A higher line means that specific frequency is louder.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Parameter Bands:</strong> The colorful vertical zones on the graph (e.g., Sub Bass, Mid Bass, Lower Midrange) help you quickly identify which parts of the frequency spectrum correspond to specific musical characteristics. You can toggle these bands on and off in the sidebar.
            </li>
          </ul>
        </section>

        {/* Squig.link */}
        <section id="squiglink" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Squig.link</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            Any URL whose host ends in{" "}
            <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>.squig.link</code>{" "}
            is a graph viewer. The{" "}
            <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>?share=</code>{" "}
            parameter lists the comma-separated model tokens. FreqRes now automatically searches the host's database to resolve these models and fetches the underlying curve data for you!
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            If auto-resolution fails for a specific model, it will gracefully fall back to a metadata-only result. In that case, you can manually provide a direct raw file URL.
          </p>
          <UrlPatternCard card={URL_CARDS[0]} />
          <div className="mt-2">
            <UrlPatternCard card={URL_CARDS[1]} />
          </div>
        </section>

        {/* Getting Raw URLs Manually */}
        <section id="getting-raw-urls" className="mb-10">
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Getting Raw URLs Manually
          </h2>
          
          <div className="panel p-4 mb-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              To get a link to a graph, just go to any Squig.link viewer, select an IEM, and click the copy URL button or copy the URL from the browser's address bar.
            </p>
          </div>

        </section>

        {/* Unsupported Platforms */}
        <section id="unsupported" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--error)" }}>Unsupported Platforms</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>graph.hangout.audio</code>
          </p>
          <UrlPatternCard card={URL_CARDS[2]} />
        </section>

        {/* Raw files */}
        <section id="raw-files" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Raw Measurement Files</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            FreqRes can parse any URL whose path ends in <strong>.txt</strong>, <strong>.csv</strong>, or <strong>.tsv</strong>.
            The parser is resilient and supports:
          </p>
          <ul className="text-sm mb-4 flex flex-col gap-1 pl-4 list-disc" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <li>Comma, tab, semicolon, or whitespace-delimited columns</li>
            <li>Header rows with <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>frequency</code> / <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>raw</code> / <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>db</code> / <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>spl</code> column names</li>
            <li>Two-column headerless data (frequency, dB)</li>
            <li>Stereo columns (left + right averaged automatically)</li>
            <li>Comment lines starting with <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>#</code>, <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>*</code>, or <code className="text-xs px-1 rounded" style={{ background: "var(--bg-raised)" }}>//</code></li>
            <li>BOM and mixed line endings</li>
          </ul>
          <div className="flex flex-col gap-2">
            {URL_CARDS.slice(3).map((c) => <UrlPatternCard key={c.example} card={c} />)}
          </div>
        </section>

        {/* Parse failures */}
        <section id="parse-failures" className="mb-10">
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Parse Failures & Troubleshooting</h2>
          <div className="flex flex-col gap-2">
            {PARSE_ERRORS.map((e) => (
              <div key={e.code} className="panel p-3 flex flex-col gap-1">
                <span className="tag tag-error w-fit">{e.code}</span>
                <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{e.fix}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback */}
        <section id="feedback" className="mb-10">
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Feedback & Bug Reports</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            Since FreqRes is entirely stateless and operates without a backend database, we process all feedback, feature requests, and bug reports through our public GitHub repository.
          </p>
          <a
            href="https://github.com/jaermaine/freqres-visualizer-dashboard/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Submit Feedback on GitHub
          </a>
        </section>

        <div className="pb-8">
          <Link href="/" className="btn-primary inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
