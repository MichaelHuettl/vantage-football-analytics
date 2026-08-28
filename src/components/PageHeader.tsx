export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="border-b"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--surface-sunken)",
      }}
    >
      {/* `pt-28`, not `py-10`. The site header is absolutely positioned over
          the top of the page — 80px at desktop, 84px with the wrapped nav row
          on a phone — so 40px of top padding put the eyebrow and the first
          line of the title underneath it. Every other header on the site
          clears it with `pt-28`; this one did not, because it is the only page
          that uses this component and nothing else exercised the bug. */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-28 pb-16 sm:pb-24">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1
          className="text-4xl sm:text-5xl leading-[0.9] tracking-wide uppercase"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          {title}
        </h1>
        {lede && (
          <p
            className="mt-4 max-w-2xl text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            {lede}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

export function Container({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`mx-auto max-w-[1400px] px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * §8: empty states are directions, not apologies. This one takes an action
 * rather than expressing regret.
 */
export function EmptyState({
  title,
  direction,
}: {
  title: string;
  direction: string;
}) {
  return (
    <div
      className="rounded-lg border border-dashed px-6 py-14 text-center"
      style={{ borderColor: "var(--border-strong)" }}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {direction}
      </p>
    </div>
  );
}
