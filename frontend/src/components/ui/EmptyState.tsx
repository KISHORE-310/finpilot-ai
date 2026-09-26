import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  secondaryActionText,
  secondaryActionHref,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-[#131622]/80 border border-slate-800/80 my-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        {icon || (
          <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionText && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {actionText}
          </Link>
        )}
        {actionText && onAction && !actionHref && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {actionText}
          </button>
        )}
        {secondaryActionText && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700/60 transition-all active:scale-[0.98]"
          >
            {secondaryActionText}
          </Link>
        )}
        {secondaryActionText && onSecondaryAction && !secondaryActionHref && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700/60 transition-all active:scale-[0.98]"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
}
