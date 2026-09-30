import { useState, type ButtonHTMLAttributes } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
  copiedDurationMs?: number;
}

export function CopyButton({
  value,
  label = "Copy to clipboard",
  copiedDurationMs = 2000,
  className,
  onClick,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), copiedDurationMs);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied!" : label}
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}

export interface CopyableTextProps {
  value: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function CopyableText({
  value,
  label,
  truncate = false,
  className,
}: CopyableTextProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 font-mono text-xs", className)}>
      <span className={cn("select-all", truncate && "truncate max-w-[200px]")}>{value}</span>
      <CopyButton value={value} label={label ? `Copy ${label}` : "Copy"} />
    </div>
  );
}
