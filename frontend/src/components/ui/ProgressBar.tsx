import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  variant?: "default" | "success" | "danger" | "warning" | "auto";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  percentage,
  variant = "auto",
  size = "md",
  className,
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));

  let activeColor = "bg-blue-500";
  if (variant === "success") activeColor = "bg-emerald-500";
  else if (variant === "danger") activeColor = "bg-rose-500";
  else if (variant === "warning") activeColor = "bg-amber-500";
  else if (variant === "auto") {
    if (clamped >= 100) activeColor = "bg-rose-500";
    else if (clamped >= 80) activeColor = "bg-amber-500";
    else activeColor = "bg-emerald-500";
  }

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className={cn("w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40", heightClasses[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", activeColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Progress</span>
          <span className="font-semibold text-slate-200">{clamped.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
