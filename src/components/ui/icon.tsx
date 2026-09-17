import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconProps extends React.HTMLAttributes<SVGSVGElement> {
  icon: LucideIcon;
}

export function Icon({ icon: LucideIcon, className, ...props }: IconProps) {
  return <LucideIcon className={cn("shrink-0", className)} {...props} />;
}
