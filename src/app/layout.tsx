import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CKCS Survey Results',
  description: 'Pivot-table dashboard for CKCS survey data from Airtable',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ background: '#F0F4F8', color: '#1a2d45' }}>
        <header
          className="px-6 py-3 flex items-center gap-3"
          style={{ background: '#17345B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Logo mark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/noun-compiler-8277230-17345B.svg"
            alt=""
            width={26}
            height={26}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
          />
          <span className="text-base font-semibold tracking-tight text-white">
            CKCS Survey Results
          </span>
          <nav className="ml-auto flex items-center gap-5 text-sm">
            <a
              href="/dashboard"
              className="text-white/70 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/admin/debug"
              className="text-white/50 hover:text-white/80 transition-colors text-xs"
            >
              Debug
            </a>
          </nav>
        </header>
        <main className="px-4 py-6 max-w-screen-2xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
