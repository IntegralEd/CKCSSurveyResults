/**
 * AppHeader — brand nav bar used on direct-access routes (e.g. /admin_access).
 * NOT rendered in the Softr embed route (/dashboard) — Softr provides its own nav.
 */
export default function AppHeader() {
  return (
    <header
      className="px-6 py-3 flex items-center gap-3"
      style={{ background: '#17345B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
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
          href="/admin_access"
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
  );
}
