import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";

export interface MetadataFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

/**
 * Reusable metadata JSON editor with real-time format validation and accessibility cues.
 */
export function MetadataField({
  id,
  value,
  onChange,
  disabled = false,
  label = "Metadata (JSON object)",
  description = "Optional JSON configuration.",
  className,
}: MetadataFieldProps) {
  const jsonError = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return "Must be a JSON object.";
      }
      return null;
    } catch {
      return "Invalid JSON syntax.";
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {jsonError && (
          <span className="text-xs text-amber-400 font-mono" role="status">
            {jsonError}
          </span>
        )}
      </div>
      <Textarea
        id={id}
        disabled={disabled}
        aria-invalid={Boolean(jsonError)}
        aria-describedby={`${id}-desc`}
        className={`min-h-24 font-mono text-sm ${jsonError ? "border-amber-400/50 focus-visible:ring-amber-400/60" : ""} ${className ?? ""}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-desc`} className="text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
