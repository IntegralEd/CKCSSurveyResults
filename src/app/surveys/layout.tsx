/**
 * Embed layout — used by /surveys (Softr iframe).
 * Same as /dashboard layout; kept separate for independent route control.
 */
export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 py-5 max-w-screen-2xl mx-auto">
      {children}
    </main>
  );
}
