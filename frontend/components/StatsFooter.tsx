"use client";

import React from "react";

interface FactItem {
  value: string;
  label: string;
  sublabel: string;
}

const FACTS: FactItem[] = [
  {
    value: "02 / 03",
    label: "Approval threshold",
    sublabel: "Configurable m-of-n quorum",
  },
  {
    value: "CANTON",
    label: "Private ledger infrastructure",
    sublabel: "Sub-transaction privacy & ACS",
  },
  {
    value: "MAX",
    label: "Single-withdrawal limit",
    sublabel: "Policy-enforced outflow ceiling",
  },
  {
    value: "LEDGER",
    label: "Withdrawal receipt",
    sublabel: "Cryptographic proof of disbursement",
  },
];

export const StatsFooter: React.FC = () => {
  return (
    <section className="relative z-10 w-full py-10 px-4 animate-reveal-stats">
      <div className="max-w-5xl mx-auto border-t border-neutral-800/80 pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {FACTS.map((fact, idx) => (
            <div
              key={idx}
              className="bg-neutral-900/40 border border-neutral-800/70 rounded-2xl p-4 sm:p-5 backdrop-blur-sm hover:border-neutral-700/80 transition-all text-left flex flex-col justify-between"
            >
              <div>
                {/* Large typography for primary value */}
                <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
                  {fact.value}
                </div>

                {/* Smaller descriptive label */}
                <div className="text-[11px] sm:text-xs font-semibold text-neutral-300 uppercase tracking-wider mt-2 sm:mt-2.5">
                  {fact.label}
                </div>
              </div>

              {/* Product mechanics explanation */}
              <div className="text-[11px] font-sans text-neutral-500 mt-2 pt-2 border-t border-neutral-850">
                {fact.sublabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
