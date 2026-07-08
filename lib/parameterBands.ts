import type { ParameterBand } from "@/types/audio";

export const PARAMETER_BANDS: ParameterBand[] = [
  // Bass
  { id: "sub-bass",    label: "Sub-bass",    freqLow: 20,    freqHigh: 50,    category: "bass",    color: "rgba(120,40,180,0.15)" },
  { id: "bass",        label: "Bass",        freqLow: 50,    freqHigh: 160,   category: "bass",    color: "rgba(80,60,200,0.15)"  },
  { id: "bass-feel",   label: "Bass Feel",   freqLow: 20,    freqHigh: 75,    category: "bass",    color: "rgba(160,40,220,0.12)" },
  { id: "note-weight", label: "Note Weight", freqLow: 80,    freqHigh: 1000,  category: "bass",    color: "rgba(60,80,200,0.10)"  },
  // Mids
  { id: "lower-mids",    label: "Lower Mids",    freqLow: 160,  freqHigh: 400,   category: "mids",    color: "rgba(40,160,80,0.13)"  },
  { id: "upper-mids",    label: "Upper Mids",    freqLow: 400,  freqHigh: 1200,  category: "mids",    color: "rgba(40,180,60,0.11)"  },
  { id: "male-vocals",   label: "Male Vocals",   freqLow: 100,  freqHigh: 400,   category: "mids",    color: "rgba(60,140,180,0.13)" },
  { id: "female-vocals", label: "Female Vocals", freqLow: 350,  freqHigh: 3000,  category: "mids",    color: "rgba(40,200,160,0.10)" },
  // Treble
  { id: "lower-treble",    label: "Lower Treble",    freqLow: 1200,  freqHigh: 4000,  category: "treble",  color: "rgba(220,120,40,0.12)"  },
  { id: "upper-treble",    label: "Upper Treble",    freqLow: 4000,  freqHigh: 15000, category: "treble",  color: "rgba(240,80,40,0.12)"   },
  { id: "detail-sibilance",label: "Detail/Sibilance",freqLow: 4000,  freqHigh: 10000, category: "treble",  color: "rgba(220,60,80,0.12)"   },
  { id: "texture",         label: "Texture",         freqLow: 4000,  freqHigh: 15000, category: "treble",  color: "rgba(200,100,60,0.10)"  },
  // Quality
  { id: "soundstage", label: "Soundstage", freqLow: 150,   freqHigh: 15000, category: "quality", color: "rgba(60,180,220,0.08)"  },
  { id: "timbre",     label: "Timbre",     freqLow: 20,    freqHigh: 1300,  category: "quality", color: "rgba(180,200,60,0.10)"  },
  { id: "masking",    label: "Masking",    freqLow: 20,    freqHigh: 20000, category: "quality", color: "rgba(200,80,200,0.07)"  },
  { id: "layering",   label: "Layering",   freqLow: 20,    freqHigh: 20000, category: "quality", color: "rgba(80,200,200,0.07)"  },
  { id: "tonality",   label: "Tonality",   freqLow: 20,    freqHigh: 20000, category: "quality", color: "rgba(200,200,80,0.07)"  },
];

export const BAND_CATEGORIES: { id: string; label: string }[] = [
  { id: "bass",    label: "Bass"    },
  { id: "mids",    label: "Mids"    },
  { id: "treble",  label: "Treble"  },
  { id: "quality", label: "Quality" },
];
