import { AlertsTable } from "@/components/alerts-table";

export default function AlertsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Alerts Log</h1>
        <p className="text-muted-foreground">
          Review Specter identity matches and rule alerts, inspect protected evidence,
          and track acknowledgment and resolution.
        </p>
      </div>

      <AlertsTable />
    </div>
  );
}
