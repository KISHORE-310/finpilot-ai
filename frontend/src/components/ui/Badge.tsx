import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "danger" | "warning" | "info" | "purple" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  neutral: "bg-slate-800/80 text-slate-300 border-slate-700/60",
};

export function Badge({ variant = "default", size = "sm", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-md tracking-wide shrink-0",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
