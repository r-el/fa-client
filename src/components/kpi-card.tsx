import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function useCountUp(end: number) {
  const count = useRef(0);
  const motionValue = useSpring(0, {
    damping: 100,
    stiffness: 100,
  });

  useEffect(() => {
    motionValue.set(end);
  }, [end, motionValue]);

  useEffect(
    () =>
      motionValue.on("change", (latest) => {
        count.current = latest;
      }),
    [motionValue]
  );

  return useTransform(motionValue, (latest) => Math.round(latest));
}

interface KpiCardProps {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  trendDirection?: "up" | "down";
}

export function KpiCard({
  title,
  value,
  icon: IconComponent,
  description,
  trend,
  trendDirection = "up",
}: KpiCardProps) {
  const animatedValue = useCountUp(value || 0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Card className="relative overflow-hidden glass-panel border-white/5 bg-white/5">
      <div className="absolute right-0 top-0 -z-10 text-primary/10">
        {isClient && <IconComponent className="h-32 w-32 translate-x-4 -translate-y-4" />}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div className="text-4xl font-bold tracking-tighter text-foreground" suppressHydrationWarning>
          {animatedValue}
        </motion.div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && (
            <span
              className={`flex items-center gap-1 font-semibold ${
                trendDirection === "up" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <ArrowUpRight
                className={`h-3 w-3 ${
                  trendDirection === "down" ? "rotate-90" : ""
                }`}
              />
              {trend}
            </span>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
