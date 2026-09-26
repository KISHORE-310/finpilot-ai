import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string | React.ReactNode;
  trendBadge?: React.ReactNode;
  icon?: React.ReactNode;
  accentColor?: "default" | "emerald" | "rose" | "blue" | "amber" | "purple";
  className?: string;
  footer?: React.ReactNode;
}

const accentGradients = {
  default: "from-blue-500/10 via-transparent to-transparent",
  emerald: "from-emerald-500/10 via-transparent to-transparent",
  rose: "from-rose-500/10 via-transparent to-transparent",
  blue: "from-blue-500/10 via-transparent to-transparent",
  amber: "from-amber-500/10 via-transparent to-transparent",
  purple: "from-purple-500/10 via-transparent to-transparent",
};

const valueColors = {
  default: "text-white",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
};

export function StatCard({
  label,
  value,
  subtitle,
  trendBadge,
  icon,
  accentColor = "default",
  className,
  footer,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between group",
        className
      )}
    >
      {/* Subtle top gradient accent */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none", accentGradients[accentColor])} />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400/90 flex items-center gap-1.5">
            {icon}
            {label}
          </span>
          {trendBadge}
        </div>
        <div className={cn("text-2xl sm:text-3xl font-bold tracking-tight mt-1", valueColors[accentColor])}>
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1.5 font-normal leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>

      {footer && (
        <div className="relative z-10 pt-3.5 mt-3.5 border-t border-slate-800/80 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
}
