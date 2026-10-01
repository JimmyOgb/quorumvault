"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrustRow } from "./TrustRow";
import { MechanismPreview } from "./MechanismPreview";
import { ArrowRight, BookOpen, X, Shield, Lock, FileCheck } from "lucide-react";

export const Hero: React.FC = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleExploreMechanism = () => {
    const el = document.getElementById("mechanism-preview");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowHowItWorks(true);
    }
  };

  return (
    <section className="relative z-10 w-full pt-8 pb-12 sm:pt-14 sm:pb-16 px-4 flex flex-col items-center justify-center text-center">
      {/* Background Video with Reduced-Motion Support & Institutional Radial Gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-[1px] motion-reduce:hidden"
        >
          <source src="/assets/background.mp4" type="video/mp4" />
        </video>
        {/* Deep ambient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a0f]/40 via-[#090a0f]/90 to-[#090a0f]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
        {/* Network Trust & Controls Row */}
        <TrustRow />

        {/* Main Headline - Clearly Two Lines with Strong Visual Hierarchy & Intentional Spacing */}
        <div className="mt-8 sm:mt-10 mb-4 sm:mb-6 select-none max-w-3xl">
          <h1 className="tracking-tight text-white font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.12]">
            <span className="block animate-headline-1 text-white">
              Shared Control
            </span>
            <span className="block animate-headline-2 text-neutral-300 font-medium sm:font-semibold mt-2.5 sm:mt-4">
              For Canton Assets
            </span>
          </h1>
        </div>

        {/* Subhead - Polished Width, Line Height, and Readability */}
        <p className="animate-reveal-subhead max-w-xl text-neutral-300 text-sm sm:text-base md:text-lg leading-relaxed font-normal px-2">
          Hold and govern treasury assets with threshold authorization,
          withdrawal limits, and on-ledger auditability.
        </p>

        {/* CTA Hierarchy - Primary Dominant & Secondary Mechanism Action */}
        <div className="animate-reveal-cta mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5 w-full max-w-md">
          {/* Primary CTA: Visually dominant, links to real /create */}
          <Link
            href="/create"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-4 rounded-full bg-white text-neutral-950 font-bold text-sm tracking-tight transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,255,255,0.28)] active:translate-y-0 shadow-lg"
          >
            <span>Create a Vault</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Secondary CTA: Subtler, triggers smooth scroll to mechanism */}
          <button
            type="button"
            onClick={handleExploreMechanism}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-sm font-medium text-neutral-300 hover:text-white bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-neutral-700 transition-all duration-200"
          >
            <span>Explore the mechanism</span>
            <span className="text-neutral-400">&rarr;</span>
          </button>
        </div>

        {/* Mechanism Preview: PROPOSE -> CONFIRM -> EXECUTE with 2 of 3 approvals */}
        <MechanismPreview />
      </div>

      {/* "How It Works" Deep-Dive Modal */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-reveal"
          onClick={() => setShowHowItWorks(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-left text-white shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold tracking-tight">How QuorumVault Works</h3>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
              <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/70">
                <div className="flex items-center space-x-2 text-white font-semibold mb-1">
                  <Lock className="w-4 h-4 text-neutral-400" />
                  <span>1. Multi-Operator Threshold Definition</span>
                </div>
                <p className="text-neutral-400">
                  A vault is deployed with <span className="text-white font-mono">n</span> authorized Canton party operators and an approval threshold of <span className="text-white font-mono">m</span> (where <span className="text-white font-mono">1 &le; m &le; n</span>). Outflow ceilings are bounded by a strict maximum single withdrawal limit.
                </p>
              </div>

              <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/70">
                <div className="flex items-center space-x-2 text-white font-semibold mb-1">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>2. Outflow Proposal &amp; Daml Signatories</span>
                </div>
                <p className="text-neutral-400">
                  Any authorized operator can propose a withdrawal. Treasury funds remain protected in the vault. Other operators inspect the on-ledger proposal terms and sign independent confirmations via Canton transactions.
                </p>
              </div>

              <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/70">
                <div className="flex items-center space-x-2 text-white font-semibold mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Atomic Execution &amp; Ledger Audit Receipt</span>
                </div>
                <p className="text-neutral-400">
                  Once the required <span className="text-white font-mono">m</span> distinct confirmations are collected, any operator executes the proposal. The Daml contract atomically debits the treasury and mints an immutable <span className="text-white font-mono">WithdrawReceipt</span> on the Canton ACS.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500 font-mono">
                Daml Smart Contract Enforced
              </span>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Close
                </button>
                <Link
                  href="/create"
                  onClick={() => setShowHowItWorks(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white text-neutral-950 font-semibold text-xs rounded-full hover:bg-neutral-100 transition shadow text-center"
                >
                  Proceed to Create Vault &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
