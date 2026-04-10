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
      <body
        className="min-h-screen antialiased"
        style={{ background: '#F0F4F8', color: '#1a2d45' }}
      >
        {children}
      </body>
    </html>
  );
}
