import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Application settings and preferences will be available here in the future.
        </p>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-muted-foreground">
        <Settings className="h-8 w-8 opacity-50" aria-hidden="true" />
        <p>No settings are currently available.</p>
        <p className="text-sm">Future configurations will be added here.</p>
      </div>
    </div>
  );
}
