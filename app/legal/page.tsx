import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FreqRes – Legal & Privacy",
  description: "Terms of Use and Privacy Policy for FreqRes.",
};

export default function LegalPage() {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <nav className="md:w-48 flex-shrink-0 flex md:flex-col pt-0 md:pt-2 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] md:bg-transparent overflow-x-auto md:overflow-visible">
        <div className="flex md:flex-col min-w-max md:min-w-0">
          <div className="px-4 py-3 md:pb-3 flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs hover:underline text-[var(--text-muted)]"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="px-4 py-3 md:pb-3 flex items-center">
            <Link
              href="/tutorial"
              className="flex items-center gap-1.5 text-xs hover:underline text-[var(--text-muted)]"
            >
              ← Guide
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl">
        <h1 className="text-xl font-semibold mb-6">Terms of Use & Privacy Policy</h1>
        
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-2">1. No Warranty & Limitation of Liability</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            FreqRes is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, either express or implied. 
            The developers and maintainers of FreqRes shall not be held legally liable or responsible for any damages, hardware failure (including blown drivers, hearing damage, or amplifier faults), data loss, or inaccuracies resulting from the use of this tool.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-2">2. Third-Party Data & Fair Use</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            FreqRes acts strictly as a data visualization client. It does not host, own, or distribute the audio measurement data plotted on its graphs. 
            All imported measurement data belongs to their respective original creators and copyright holders (e.g., specific reviewers or database maintainers).
            Users are solely responsible for ensuring they have the right to access and visualize the data they import via URLs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-2">3. Privacy Policy</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            FreqRes respects your privacy. The application is completely stateless:
          </p>
          <ul className="text-sm text-[var(--text-secondary)] flex flex-col gap-2 pl-4 list-disc">
            <li><strong>No Tracking:</strong> We do not use tracking cookies, analytics trackers, or user profiling.</li>
            <li><strong>No Database:</strong> We do not operate a backend database. Your imported traces, custom labels, and color preferences are stored strictly locally in your browser memory and are lost when you refresh the page.</li>
            <li><strong>Proxy Requests:</strong> When you import a URL, our proxy server briefly processes the URL to fetch the raw data on your behalf. This is done purely in-memory to bypass CORS restrictions. No logs of your specific URL imports or IP addresses are permanently retained by our application logic.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-2">4. Credits & Acknowledgments</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            FreqRes owes its capabilities to the hard work of the audio community. We would like to explicitly acknowledge:
          </p>
          <ul className="text-sm text-[var(--text-secondary)] flex flex-col gap-2 pl-4 list-disc">
            <li><strong>AutoEq Project:</strong> Many of the standard tuning targets (such as Diffuse Field, B&K 5128, and Harman OE 2018) are sourced from Jaakko Pasanen's excellent <a href="https://github.com/jaakkopasanen/AutoEq" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">AutoEq repository</a>.</li>
            <li><strong>Squig.link & Reviewers:</strong> The frequency response traces imported into this app are hosted by independent audio reviewers across various Squig.link databases (such as Crinacle, Precogvision, Super*Review, Jaytiss, and others). All rights to these measurements belong to their original creators.</li>
          </ul>
        </section>

        <div className="pb-8 mt-10">
          <Link href="/" className="btn-primary inline-block">
            I Understand — Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
