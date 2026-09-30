import { SENSITIVITY_PRESETS, type SensitivityPreset } from "@/features/watchlists/constants";

export interface WatchlistSensitivityPresetsProps {
  onSelect: (preset: SensitivityPreset) => void;
  disabled?: boolean;
}

export function WatchlistSensitivityPresets({ onSelect, disabled = false }: WatchlistSensitivityPresetsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">Match Sensitivity Presets:</span>
      <div className="flex gap-1.5">
        {SENSITIVITY_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={disabled}
            title={preset.description}
            onClick={() => onSelect(preset)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
