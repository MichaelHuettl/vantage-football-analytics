/**
 * §5.1 is explicit that tiers are the actual product: the gap between RB14 and
 * RB17 is noise, the gap between tiers is not. So a tier is a visual grouping
 * with a heading that says what the group has in common — not a column of
 * numbers the reader has to interpret.
 */
export function TierBand({
  tier,
  label,
  count,
  children,
}: {
  tier: number;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <header
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 border-b"
        style={{
          background: "var(--surface-sunken)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <h2
          className="text-lg uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tier {tier}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        <p className="eyebrow ml-auto">
          {count} {count === 1 ? "player" : "players"}
        </p>
      </header>
      {children}
    </section>
  );
}
