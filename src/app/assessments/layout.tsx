/**
 * Embed layout — used by /assessments (Softr iframe).
 * No header: Softr provides its own top-nav.
 * Minimal padding so content fills the iframe cleanly.
 */
export default function AssessmentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 py-5 max-w-screen-2xl mx-auto">
      {children}
    </main>
  );
}
