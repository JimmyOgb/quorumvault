import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'QuorumVault — Canton Multi-Operator Treasury Custody',
  description: 'Threshold-governed multi-operator custody on Canton Network with Daml-enforced controls',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex flex-col min-h-screen bg-[#090a0f] text-neutral-100 font-sans antialiased selection:bg-neutral-800 selection:text-white">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-neutral-800/80 bg-[#090a0f]/90 py-8 px-4 text-xs text-neutral-400">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] text-neutral-400">
                QuorumVault &middot; Canton Network Native Architecture
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              HackCanton Season 3 &middot; BitSafe Decentralization Track
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
