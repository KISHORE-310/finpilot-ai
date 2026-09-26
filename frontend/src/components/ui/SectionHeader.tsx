import React from "react";
import { cn } from "@/lib/utils";
import { PeriodOption } from "@/types";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  period?: PeriodOption;
  onPeriodChange?: (p: PeriodOption) => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

const periodTabs: { id: PeriodOption; label: string }[] = [
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "3M" },
  { id: "last_6_months", label: "6M" },
  { id: "this_year", label: "This Year" },
];

export function SectionHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  actions,
  children,
  badge,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-400 font-normal">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
        {period && onPeriodChange && (
          <div className="flex items-center gap-1 bg-[#0a0c14] p-1 rounded-xl border border-slate-800/90">
            {periodTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPeriodChange(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                  period === tab.id
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {actions || children}
      </div>
    </div>
  );
}
