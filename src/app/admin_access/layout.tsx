/**
 * Admin access layout — used by /admin_access (direct browser access).
 * Renders the brand AppHeader above the page content.
 */
import AppHeader from '@/components/AppHeader';

export default function AdminAccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="px-4 py-6 max-w-screen-2xl mx-auto">
        {children}
      </main>
    </>
  );
}
