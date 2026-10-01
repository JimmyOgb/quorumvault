"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { getNetworkDisplayLabel } from "@/lib/config";
import { NetworkStatus } from "@/lib/canton/network";
import { Shield, PlusCircle, Layers, Cpu, X, ArrowRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  network?: NetworkStatus | null;
}

export const MobileMenu: React.FC<Props> = ({ isOpen, onClose, network }) => {
  const envLabel = getNetworkDisplayLabel();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 768) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", handleResize);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end p-4 bg-black/75 backdrop-blur-md transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      <div
        className="w-full bg-[#12131a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              QuorumVault
            </span>
            {/* Unobtrusive developer/environment indicator */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${
                network?.connected
                  ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                  : network?.authRequired
                  ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                  : "bg-neutral-800/90 text-neutral-400 border-neutral-700/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  network?.connected
                    ? "bg-emerald-400 animate-pulse"
                    : network?.authRequired
                    ? "bg-amber-400"
                    : "bg-neutral-500"
                }`}
              />
              {network?.connected
                ? `${envLabel} · CONNECTED`
                : network?.authRequired
                ? `${envLabel} · NODE REACHABLE`
                : envLabel}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400 text-sm font-bold hover:bg-neutral-700 hover:text-white transition"
            aria-label="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex flex-col space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-white font-medium text-sm hover:bg-neutral-800/60 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Overview</span>
            </div>
            <div className="flex space-x-1">
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
            </div>
          </Link>

          <Link
            href="/create"
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-neutral-300 font-medium text-sm hover:bg-neutral-800/60 hover:text-white flex items-center space-x-3 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-neutral-400" />
            <span>Create Vault</span>
          </Link>

          <Link
            href="/vault"
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-neutral-300 font-medium text-sm hover:bg-neutral-800/60 hover:text-white flex items-center space-x-3 transition-colors"
          >
            <Layers className="w-4 h-4 text-neutral-400" />
            <span>Vault Dashboard</span>
          </Link>

          <a
            href="/#mechanism-preview"
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-neutral-300 font-medium text-sm hover:bg-neutral-800/60 hover:text-white flex items-center space-x-3 transition-colors"
          >
            <Cpu className="w-4 h-4 text-neutral-400" />
            <span>Core Mechanism</span>
          </a>
        </nav>

        <div className="pt-2">
          <Link
            href="/create"
            onClick={onClose}
            className="w-full py-3.5 bg-white hover:bg-neutral-100 text-neutral-950 text-sm font-semibold rounded-2xl flex items-center justify-center space-x-2 transition shadow-md"
          >
            <span>Create a Vault</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
