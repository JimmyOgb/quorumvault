"use client";

import React from "react";
import { FileText, CheckCircle2, Zap, ArrowRight, ArrowDown } from "lucide-react";

export const MechanismPreview: React.FC = () => {
  return (
    <div
      id="mechanism-preview"
      className="w-full max-w-3xl mx-auto mt-10 sm:mt-14 scroll-mt-24"
    >
      <div className="bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md rounded-2xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-neutral-800/80 gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Protocol Mechanism Flow
            </span>
          </div>

          <div className="inline-flex items-center space-x-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/70 text-xs font-mono text-neutral-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>2 of 3 approvals required</span>
          </div>
        </div>

        {/* 3 Steps: PROPOSE -> CONFIRM -> EXECUTE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 relative">
          {/* Step 1: PROPOSE */}
          <div className="relative bg-neutral-950/50 border border-neutral-800/70 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                  Step 01
                </span>
                <div className="w-7 h-7 rounded-lg bg-neutral-800/80 flex items-center justify-center text-neutral-300">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
                PROPOSE
              </h4>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Any authorized operator submits a withdrawal proposal subject to max single limits.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-850 flex items-center text-[11px] text-neutral-500 font-mono">
              <span>Balance untouched</span>
            </div>
          </div>

          {/* Desktop Arrow 1 */}
          <div className="hidden md:flex absolute top-1/2 left-[31.5%] -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-750 items-center justify-center text-neutral-400 pointer-events-none shadow-sm">
            <ArrowRight className="w-3 h-3" />
          </div>

          {/* Mobile Arrow 1 */}
          <div className="flex md:hidden justify-center py-0.5 text-neutral-600">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Step 2: CONFIRM */}
          <div className="relative bg-neutral-950/50 border border-indigo-900/40 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                  Step 02
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className="text-sm font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
                <span>CONFIRM</span>
              </h4>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Operators submit cryptographic confirmations. Daml contract tallies distinct signatories.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-850 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-500">Threshold:</span>
              <span className="text-indigo-300 font-semibold">2 of 3 met</span>
            </div>
          </div>

          {/* Desktop Arrow 2 */}
          <div className="hidden md:flex absolute top-1/2 left-[65%] -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-750 items-center justify-center text-neutral-400 pointer-events-none shadow-sm">
            <ArrowRight className="w-3 h-3" />
          </div>

          {/* Mobile Arrow 2 */}
          <div className="flex md:hidden justify-center py-0.5 text-neutral-600">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Step 3: EXECUTE */}
          <div className="relative bg-neutral-950/50 border border-neutral-800/70 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  Step 03
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-300">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
                EXECUTE
              </h4>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Ledger atomically debits vault balance and emits an immutable on-chain audit receipt.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-850 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-500">Artifact:</span>
              <span className="text-emerald-400 font-semibold">WithdrawReceipt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
