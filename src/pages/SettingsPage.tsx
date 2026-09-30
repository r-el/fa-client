import { Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Application settings and preferences will be available here in the future.
        </p>
      </div>

      <EmptyState
        icon={Settings}
        title="No settings are currently available."
        description="Future configurations will be added here."
      />
    </div>
  );
}
