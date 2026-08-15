import Link from "next/link";

/**
 * A filter pill. Lives here rather than on a page because news and injuries
 * both use it, and two copies would drift — the filter row is the same device
 * in both places and has to keep reading as one.
 *
 * The active state is a filled pill rather than a colour change, so it does not
 * depend on colour alone (§7), and carries aria-current for the same reason.
 */
export function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="inline-block rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
      style={{
        fontFamily: "var(--font-condensed)",
        background: active ? "var(--text-primary)" : "transparent",
        color: active ? "var(--surface-page)" : "var(--text-secondary)",
        boxShadow: active ? undefined : "inset 0 0 0 1px var(--border-strong)",
      }}
    >
      {children}
    </Link>
  );
}

/**
 * A team chip used as a filter. The amber ring marks the active team — §7
 * reserves amber for the focal thing on screen, and the one selected team is
 * exactly that. aria-current carries the same fact for anyone not seeing the
 * ring.
 */
export function TeamFilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="inline-flex items-center rounded p-0.5"
      style={{
        boxShadow: active
          ? "inset 0 0 0 2px var(--color-vantage-amber)"
          : "none",
      }}
    >
      {children}
    </Link>
  );
}
