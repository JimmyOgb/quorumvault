"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export const TrustRow: React.FC = () => {
  return (
    <div className="flex items-center justify-center animate-reveal-trust w-full">
      <div className="inline-flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 bg-neutral-900/80 backdrop-blur-md border border-neutral-800/90 px-3.5 sm:px-4 py-1.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        {/* Item 1: Canton mark / Canton-native */}
        <div className="flex items-center space-x-1.5">
          <div className="w-4 h-4 rounded-full bg-neutral-800 border border-neutral-700/80 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            {/* Minimalist geometric Canton sync node diamond */}
            <svg
              className="w-2.5 h-2.5 text-neutral-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 22 12 12 22 2 12" />
              <line x1="12" y1="7" x2="12" y2="17" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-neutral-300 tracking-tight">
            Canton-native
          </span>
        </div>

        {/* Separator dot */}
        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-neutral-700" aria-hidden="true" />

        {/* Item 2: shield/check / Daml-enforced controls */}
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] sm:text-xs font-medium text-neutral-300 tracking-tight">
            Daml-enforced controls
          </span>
        </div>

        {/* Separator dot */}
        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-neutral-700" aria-hidden="true" />

        {/* Item 3: 2-of-3 / Threshold governance */}
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700/80 text-[10px] font-mono font-semibold text-neutral-200">
            2-of-3
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-neutral-300 tracking-tight">
            Threshold governance
          </span>
        </div>
      </div>
    </div>
  );
};
