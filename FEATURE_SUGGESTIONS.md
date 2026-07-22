# FreqRes — Feature Suggestions & Implementation Roadmap

This document tracks the 10-feature power-user expansion for **FreqRes**.

---

## Completed Features

### 1. Export to PNG with Watermark
- **Status:** ✅ Completed
- **Details:** Custom "Export" button in the sidebar generates high-resolution PNG graph screenshots with dynamically formatted filenames (e.g. `Moondrop Aria vs Truthear Gate Comparison.png`) and superimposes a clean "FreqRes" watermark.

### 2. A/B Difference Table
- **Status:** ✅ Completed
- **Details:** Automatically renders below the graph when exactly 2 traces are visible. Calculates precise decibel deltas across key frequency intervals (20, 100, 1k, 3k, 5k, 10k Hz). Fully supports target compensation mode and includes a "Swap A/B" toggle.

### 3. Expanded Tuning Targets
- **Status:** ✅ Completed
- **Details:** Added high-resolution target curves derived from official datasets (Diffuse Field ISO 11904-1, B&K 5128 Diffuse Field, and Harman OE 2018) into the Tuning Targets menu.

### 7. Zoom to Region & Scroll Zoom
- **Status:** ✅ Completed
- **Details:** Added quick-region zoom preset buttons (`Full`, `Bass`, `Mids`, `Treble`) above the chart, along with smooth desktop mouse wheel scroll zooming centered on the cursor, strict frequency bounds clamping (20 Hz – 20 kHz), fixed Y-axis scale stability, and 4-directional plot borders.

### 8. Cursor Crosshair & Unified Tooltip
- **Status:** ✅ Completed
- **Details:** Enabled vertical dashed crosshair spike lines that follow the mouse cursor across the frequency spectrum, paired with a theme-styled unified hover tooltip displaying exact dB SPL or Delta values for all active traces at the hovered frequency.

### 9. Enhanced PNG Export Studio & Watermark Themes
- **Status:** ✅ Completed
- **Details:** Lightweight customization modal with live image preview, aspect ratio selection (`16:9`, `1:1`, `4:3`), theme style rendering (`Dark Mode` vs `Light Mode` export backgrounds), custom reviewer watermark fields, and reviewer attribution credits (e.g., `Measured by Precogvision`).

---

## Remaining Feature Suggestions

### 4. Channel Imbalance View
- **Status:** ⏳ Pending
- **Details:** Ability to load Left (`L`) and Right (`R`) channel measurement traces for a single IEM/headphone to visually evaluate channel matching, seal consistency, and driver variance.

### 5. Custom Normalization Options
- **Status:** ⏳ Pending
- **Details:** Allow users to customize the reference normalization frequency (e.g. 500 Hz, 1 kHz, 2.5 kHz) or toggle raw absolute dB SPL mode without baseline shifting.

### 6. Smoothing Control
- **Status:** ⏳ Pending
- **Details:** Provide mathematical smoothing options (e.g. Raw, 1/6 Octave, 1/12 Octave, 1/24 Octave) to filter out high-frequency measurement noise and reveal underlying acoustic trends.

### 9. Average / Mean Trace Calculation
- **Status:** ⏳ Pending
- **Details:** Calculate and generate a synthetic "Average (Calculated)" trace from all currently visible curves across frequency bins.

### 10. Drag & Drop Local File Uploads
- **Status:** ⏳ Pending
- **Details:** HTML5 drag-and-drop zone allowing users to drop local `.txt`, `.csv`, or `.tsv` raw measurement files directly onto the app for instant client-side parsing without server roundtrips.
