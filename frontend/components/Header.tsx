"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MobileMenu } from "./MobileMenu";
import { getNetworkDisplayLabel } from "@/lib/config";
import { checkNetworkStatus, NetworkStatus } from "@/lib/canton/network";
import { Shield, PlusCircle, LayoutDashboard, Cpu, Menu, X } from "lucide-react";

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const pathname = usePathname();
  const envLabel = getNetworkDisplayLabel();

  useEffect(() => {
    checkNetworkStatus().then(setNetwork).catch(() => {});
  }, []);

  return (
    <>
      <header className="relative z-30 w-full pt-4 sm:pt-6 px-4 animate-slideDown">
        {/* Desktop Container (max-w-5xl) */}
        <div className="hidden md:flex items-center justify-between max-w-5xl mx-auto">
          {/* Logo & Environment Badge */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2.5 group"
              aria-label="QuorumVault Home"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
                <Image
                  src="/assets/logo.webp"
                  alt="QuorumVault"
                  width={28}
                  height={28}
                  className="object-contain"
                  priority
                  onError={(e) => {
                    // Fallback to hidden if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight leading-tight">
                  QuorumVault
                </span>
                <span className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">
                  Canton Custody
                </span>
              </div>
            </Link>

            {/* Unobtrusive developer/environment indicator */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border shadow-sm ${
                network?.connected
                  ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                  : network?.authRequired
                  ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                  : network?.reachable
                  ? "bg-sky-950/60 border-sky-800/60 text-sky-300"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
              }`}
              title={
                network?.connected
                  ? `${envLabel} · Connected`
                  : network?.authRequired
                  ? `${envLabel} · Node Reachable (Authentication Required)`
                  : network?.reachable
                  ? `${envLabel} · Node Reachable`
                  : `${envLabel} · Offline`
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  network?.connected
                    ? "bg-emerald-400 animate-pulse"
                    : network?.authRequired
                    ? "bg-amber-400"
                    : network?.reachable
                    ? "bg-sky-400"
                    : "bg-rose-400"
                }`}
              />
              {network?.connected
                ? `${envLabel} · CONNECTED`
                : network?.authRequired
                ? `${envLabel} · NODE REACHABLE`
                : network?.reachable
                ? `${envLabel} · NODE REACHABLE`
                : network
                ? `${envLabel} · OFFLINE`
                : envLabel}
            </span>
          </div>

          {/* Navigation - Dark Glass Pill */}
          <nav
            className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800/90 rounded-full px-5 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex items-center space-x-6 text-xs font-medium"
            aria-label="Primary Navigation"
          >
            <Link
              href="/"
              className={`transition-colors flex flex-col items-center ${
                pathname === "/" ? "text-white font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Home</span>
              {pathname === "/" && (
                <div className="flex space-x-0.5 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-white" />
                  <span className="w-1 h-1 rounded-full bg-white" />
                  <span className="w-1 h-1 rounded-full bg-white" />
                </div>
              )}
            </Link>

            <Link
              href="/create"
              className={`transition-colors ${
                pathname === "/create"
                  ? "text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Create Vault
            </Link>

            <Link
              href="/vault"
              className={`transition-colors ${
                pathname === "/vault"
                  ? "text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Vault Dashboard
            </Link>

            <a
              href="/#mechanism-preview"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Mechanism
            </a>
          </nav>

          {/* Action CTA Button */}
          <div className="flex items-center space-x-3">
            <Link
              href="/create"
              className="inline-flex items-center space-x-1.5 bg-white text-neutral-950 px-4 py-2 rounded-full text-xs font-semibold hover:bg-neutral-100 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deploy Vault</span>
            </Link>
          </div>
        </div>

        {/* Mobile Header (<=768px) */}
        <div className="flex md:hidden items-center justify-between max-w-lg mx-auto">
          {/* Logo & Environment Badge */}
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.25)] overflow-hidden"
              aria-label="QuorumVault Home"
            >
              <Image
                src="/assets/logo.webp"
                alt="QuorumVault Logo"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </Link>

            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${
                network?.connected
                  ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                  : network?.authRequired
                  ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
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

          {/* Burger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-800 text-white flex items-center justify-center shadow-lg hover:bg-neutral-800 transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Modal Sheet */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} network={network} />
    </>
  );
};
