# FreqRes

**FreqRes** is a lightweight, responsive, and entirely stateless web application designed to instantly plot and compare frequency response graphs for headphones and in-ear monitors (IEMs). 

Instead of navigating complex proprietary databases or downloading text files manually, FreqRes allows you to simply paste a Squig.link share URL or a direct raw `.txt` file link. The app automatically fetches the raw data, normalizes it, and visualizes the audio curves in a highly interactive, responsive chart.

## ✨ Features

- **Auto-Resolution Engine:** Paste a Squig.link `?share=` URL, and FreqRes will dynamically fetch the host's manifest, score and match the model tokens, and seamlessly fetch the underlying raw data files.
- **Trace Comparison & Management:** Stack multiple frequency curves at once. An intelligent color algorithm ensures high-contrast traces without duplicates. You can easily rename, recolor, toggle visibility, and drag-and-drop traces to reorder their Z-index.
- **Tuning Targets:** Overlay industry-standard tuning targets (e.g., Harman IE 2019, IEF Neutral) directly onto your graph to evaluate IEMs against established benchmarks.
- **Interactive Parameter Bands:** Semantic frequency zones (e.g., Sub Bass, Mid Bass, "Air") render as beautiful, semi-transparent overlays. Hover directly over the graph to preview these zones, and click anywhere to lock them in place.
- **Smart Normalization:** Raw frequency data is normalized around the 1kHz range, ensuring multiple IEM traces align intuitively on the exact same baseline for accurate comparison.
- **Frictionless Onboarding:** First-time users are greeted with a quick 3-step feature highlight modal that automatically remembers dismissal state via local storage.
- **Mobile Responsive:** Features a premium UI with a sleek off-canvas Hamburger drawer and fully responsive charts that look stunning on both desktop and mobile devices.
- **Dynamic Export:** One-click export for high-resolution PNG graph screenshots with dynamically generated, descriptive filenames (e.g., `Moondrop Aria | Truthear Gate A-B Comparison.png`).

## 🛡️ Security & Privacy

FreqRes operates strictly as a **stateless visualization client**. There is no backend database, and user data is processed entirely in the browser memory.

The backend proxy (`/api/import`) is heavily fortified against abuse:
- **Anti-SSRF:** Enforces a strict domain allowlist and performs proactive DNS resolution to block malicious routing to private IP networks (e.g., localhost, AWS IMDS).
- **Rate Limiting:** An in-memory rate limiter strictly caps endpoints to 30 requests per IP per minute.
- **DoS Protection:** Utilizes custom chunked stream readers that immediately abort and drop connections if incoming payloads exceed 2MB, completely preventing memory exhaustion attacks.

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/FreqRes.git
   cd FreqRes
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## 🌍 Deployment

FreqRes is optimized for deployment on serverless platforms like **Vercel** or **Netlify**. No environment variables or databases are required. 

*Recommendation for public deployment:* While the app includes a software rate limiter, it is highly recommended to enable a Web Application Firewall (WAF) rate limit via your hosting provider to completely protect your serverless quota from malicious bot spam.

## 🙏 Inspiration & Credits

The core inspiration for creating this project came from [DucBloke's YouTube video on comparing IEMs with 17 parameters](https://www.youtube.com/watch?v=nLe_J_LQOwE&pp=ygUhY29tcGFyaW5nIGllbXMgd2l0aCAxNyBwYXJhbWV0ZXJz). Huge thanks to him for his analytical deep-dive into audio parameters that sparked the idea for a more accessible graph viewer!

---
*Disclaimer: FreqRes acts strictly as a data visualization proxy. It does not host, own, or distribute the audio measurement data plotted on its graphs.*
