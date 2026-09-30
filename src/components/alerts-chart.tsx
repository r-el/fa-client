import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { useGetStatsOverTime } from "@/features/dashboard/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    const date = new Date(label);
    const formattedDate = isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
      <div className="rounded-xl border border-white/10 bg-background/80 p-3 shadow-xl backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <span className="font-semibold text-foreground">
              {formattedDate}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Alerts
            </span>
            <span className="font-semibold text-primary">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AlertsChart() {
  const { theme } = useTheme();
  const { data: chartData, isLoading } = useGetStatsOverTime(7);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const colors = useMemo(() => ({
    light: { text: "hsl(var(--muted-foreground))", fill: "hsl(var(--primary))", stroke: "hsl(var(--primary))" },
    dark: { text: "hsl(var(--muted-foreground))", fill: "hsl(var(--primary))", stroke: "hsl(var(--primary))" },
  }), []);

  const currentColors = colors[theme === "dark" ? "dark" : "dark"]; // Default to dark for this design

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full rounded-2xl bg-white/5" />;
  }

  const hasAlerts = Boolean(chartData && chartData.length > 0 && chartData.some((d) => d.count > 0));

  if (!chartData || chartData.length === 0 || !hasAlerts) {
    return (
      <div className="flex h-[350px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
        <p className="text-sm font-medium text-foreground">No alerts recorded</p>
        <p className="text-xs text-muted-foreground">Alert activity will appear here once events are detected by cameras.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={currentColors.fill} stopOpacity={0.4} />
            <stop offset="95%" stopColor={currentColors.fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="timeBucket"
          stroke={currentColors.text}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDate}
          dy={10}
        />
        <YAxis
          stroke={currentColors.text}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={currentColors.stroke}
          fill="url(#colorFill)"
          fillOpacity={1}
          strokeWidth={3}
          isAnimationActive={true}
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
