export const DEFAULT_FACE_MATCH_THRESHOLD = 0.45;
export const DEFAULT_APPEARANCE_MATCH_THRESHOLD = 0.75;

export interface SensitivityPreset {
  label: string;
  faceVal: string;
  appVal: string;
  description: string;
}

export const SENSITIVITY_PRESETS: readonly SensitivityPreset[] = [
  {
    label: "Strict",
    faceVal: "0.50",
    appVal: "0.80",
    description: "Lower false alarm rate; requires very clear face/appearance matches.",
  },
  {
    label: "Balanced",
    faceVal: "0.45",
    appVal: "0.75",
    description: "Recommended default balance between precision and recall.",
  },
  {
    label: "High Recall",
    faceVal: "0.35",
    appVal: "0.65",
    description: "Captures more matches in challenging lighting or angles; higher false positive rate.",
  },
];

/**
 * Formats a decimal threshold number or string (e.g. 0.45 or "0.45") into a percentage ("45%").
 * Returns an empty string if null, undefined, empty, or invalid.
 */
export function formatRatioAsPercent(ratio: string | number | null | undefined): string {
  if (ratio == null || ratio === "") return "";
  const numeric = typeof ratio === "number" ? ratio : Number(ratio);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) return "";
  return `${Math.round(numeric * 100)}%`;
}
