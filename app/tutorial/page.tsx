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
  {
    title: "CSI-Zone",
    type: "graph-url",
    example: "https://csi-zone.squig.link/?share=Tanchjim_Nora",
    note: "This database often contains measurement files with severe formatting irregularities (e.g., unsorted frequency data causing jagged lines, or mislabeled headers). It is officially unsupported because the raw data is frequently malformed.",
  },
  {
    title: "Earphones Archive",
    type: "graph-url",
    example: "https://earphonesarchive.squig.link/?share=Tanchjim_Nora_(large_bore_tips)",
    note: "This database often contains measurement files with severe formatting irregularities (e.g., unsorted frequency data causing jagged lines, or mislabeled headers). It is officially unsupported because the raw data is frequently malformed.",
  },
];

const PARSE_ERRORS = [
  { code: "HTML_RESPONSE",              fix: "The URL points to a webpage, not a raw file. Find the direct download link for the measurement data." },
  { code: "NO_VALID_ROWS",              fix: "The file has no parseable frequency/dB rows. Check for encoding issues or an unexpected format." },
  { code: "TOO_FEW_POINTS",            fix: "Fewer than 10 valid data points were found. Ensure the file has complete frequency sweep data." },
  { code: "UNSUPPORTED_BINARY_CONTENT",fix: "The file is binary (e.g., REW .mdat). Export as .txt or .csv from REW first." },
  { code: "FETCH_ERROR",               fix: "Network or CORS error. Verify the URL is publicly accessible. Some sources block direct fetch." },
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
          A guide to understanding frequency response graphs, managing traces, and supported URL patterns.
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
              <strong style={{ color: "var(--text-primary)" }}>Parameter Bands:</strong> The colorful vertical zones on the graph (e.g., Sub Bass, Mid Bass, Lower Midrange) help you quickly identify which parts of the frequency spectrum correspond to specific musical characteristics. You can toggle these bands on and off in the sidebar once a frequency response has been imported.
              <br />
              <em style={{ color: "var(--text-muted)" }}>Interactive Selection: By default, hovering over the graph data previews the parameter bands for that frequency, and clicking locks them in. Tooltips stick close to your cursor so you can easily trace the curves. You can toggle this feature off in the sidebar using the "Graph Select" checkbox. To quickly reset your view, use the global "Clear All" button or the individual "Clear" buttons next to each category header.</em>
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Tuning Targets:</strong> Reference tuning curves (e.g., Harman IE 2019, IEF Neutral) that you can select from the sidebar to overlay on your graph, allowing you to compare your imported traces against industry standards.
              <br />
              <em style={{ color: "var(--text-muted)" }}>Compensate to Target: Once a target is selected, you can check this box in the sidebar to flatten the target into a perfectly straight line. The graph will instantly zoom in and convert all imported headphone traces into +/- dB Deltas. This makes it effortless to spot precise frequency deviations, calculate EQ filters, and identify hidden resonances.</em>
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>A/B Difference Table:</strong> When you have exactly two traces visible on the graph, a sleek A/B comparison table automatically appears below the chart. It calculates the precise decibel differences (Delta) between the two traces across key frequencies (20, 100, 1k, 3k, 5k, 10k Hz).
              <br />
              <em style={{ color: "var(--text-muted)" }}>This table is fully aware of your target compensation settings, meaning it will show absolute values in normal mode, and accurate Delta values relative to the target when compensation is enabled. You can quickly reverse the Delta calculation using the Swap button in the table header.</em>
            </li>
          </ul>
        </section>

        {/* Managing Traces */}
        <section id="managing-traces" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Managing Traces</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            Once traces are loaded, they appear in the sidebar where you can customize them to your liking:
          </p>
          <ul className="list-disc pl-5 text-sm space-y-2 mb-4" style={{ color: "var(--text-secondary)" }}>
            <li><strong>Visibility:</strong> Click the checkbox to temporarily hide a trace from the graph. (Keyboard shortcut: Press numbers <kbd>1</kbd>-<kbd>9</kbd>).</li>
            <li><strong>Color:</strong> Click the color swatch next to the trace name to open the color picker.</li>
            <li><strong>Rename:</strong> Click the text of the trace name and start typing to rename it. The new name will reflect instantly on the graph legend.</li>
            <li><strong>Notes (✎):</strong> Click the edit icon to add custom notes (e.g. "Foam mod applied").</li>
            <li><strong>Reorder:</strong> Drag and drop traces in the list to change their rendering order (Z-index). The bottom trace is drawn on top.</li>
            <li><strong>Undo/Redo:</strong> Made a mistake? Press <kbd>Ctrl+Z</kbd> to undo trace removals, color changes, or visibility toggles, and <kbd>Ctrl+Y</kbd> to redo!</li>
          </ul>
        </section>

        {/* Advanced Power Tools */}
        <section id="advanced-tools" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Advanced Power Tools</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            FreqRes is packed with tools for power users who compare multiple items daily.
          </p>
          <ul className="list-disc pl-5 text-sm space-y-2 mb-4" style={{ color: "var(--text-secondary)" }}>
            <li><strong>Autocomplete Search:</strong> Use the "Search Databases" box to instantly query Squiglink databases (like Jaytiss or Super*Review). Clicking an IEM automatically imports it.</li>
            <li><strong>Bulk Import:</strong> Paste multiple URLs separated by newlines directly into the Import URL box to fetch them all at once.</li>
            <li><strong>Workspaces:</strong> Have a set of traces, targets, and colors you use often? Type a name in the "Saved Workspaces" section and hit Save. Your entire state is persisted locally.</li>
            <li><strong>Zoom to Region & Scroll Zoom:</strong> Focus directly on specific frequency bands using the `Full`, `Bass`, `Mids`, and `Treble` preset buttons above the graph, or use your desktop mouse scroll wheel over the chart to smoothly zoom in and out centered on your cursor.</li>
            <li><strong>Export High-Res Graph:</strong> Want to share a screenshot? Click the "Export" button in the sidebar (next to the Share button) to instantly generate and download a clean, high-resolution PNG image of your graph with a professional watermark.</li>
            <li><strong>PWA Support:</strong> You can "Install" FreqRes as a standalone app via your browser's address bar for lightning fast access and offline support.</li>
          </ul>
        </section>

        {/* Supported Platforms & Imports */}
        <section id="supported-platforms" className="mb-10">
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Supported Graph URLs</h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            FreqRes natively supports sharing URLs from major graph viewers. Just copy the URL from their address bar and paste it into the import field. FreqRes will parse the URL, identify the models shared, and attempt to fetch the original measurement files from their respective databases.
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            If auto-resolution fails for a specific model (e.g. CORS restrictions or missing from the database), it will gracefully fall back to a metadata-only result. In that case, you can manually provide a direct raw file URL.
          </p>
          <div className="flex flex-col gap-2">
            <UrlPatternCard card={URL_CARDS[0]} />
            <div className="mt-2">
              <UrlPatternCard card={URL_CARDS[1]} />
            </div>
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
            <code className="text-xs px-1 rounded ml-2" style={{ background: "var(--bg-raised)" }}>csi-zone.squig.link</code>
            <code className="text-xs px-1 rounded ml-2" style={{ background: "var(--bg-raised)" }}>earphonesarchive.squig.link</code>
          </p>
          <div className="flex flex-col gap-2">
            <UrlPatternCard card={URL_CARDS[2]} />
            <UrlPatternCard card={URL_CARDS[6]} />
            <UrlPatternCard card={URL_CARDS[7]} />
          </div>
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
            {URL_CARDS.slice(3, 6).map((c) => <UrlPatternCard key={c.example} card={c} />)}
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
