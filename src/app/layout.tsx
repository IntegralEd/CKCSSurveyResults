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
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-slate-800">
            CKCS Survey Results
          </span>
          <nav className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            <a
              href="/dashboard"
              className="hover:text-slate-800 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/admin/debug"
              className="hover:text-slate-800 transition-colors"
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
