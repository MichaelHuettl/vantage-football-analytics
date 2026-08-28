import { getTeam, needsEdge, readableOn } from "@/lib/teams";

/**
 * A team, rendered as its colour pair plus abbreviation. §2 forbids logos,
 * wordmarks, and the shield; this is the replacement, and it sidesteps the
 * licensing question entirely.
 *
 * Text colour is computed from the primary's luminance rather than hardcoded,
 * because the league contains both PIT gold and LV black.
 */
export function TeamChip({
  abbr,
  size = "md",
}: {
  abbr: string;
  size?: "sm" | "md";
}) {
  const team = getTeam(abbr);
  if (!team) {
    return (
      <span
        className="inline-flex items-center rounded px-1.5 font-semibold uppercase"
        style={{
          fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
          background: "var(--surface-sunken)",
          color: "var(--text-muted)",
        }}
      >
        {abbr}
      </span>
    );
  }

  const dims =
    size === "sm"
      ? "text-micro h-4 min-w-[1.75rem] px-1"
      : "text-xs h-5 min-w-[2.25rem] px-1.5";

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold uppercase tracking-wide tnum ${dims}`}
      style={{
        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
        background: team.primary,
        color: readableOn(team.primary),
        boxShadow: needsEdge(team.primary)
          ? `inset 0 0 0 1px var(--border-strong)`
          : `inset 0 -2px 0 0 ${team.secondary}`,
      }}
      title={`${team.city} ${team.nickname}`}
    >
      {team.abbr}
    </span>
  );
}

/**
 * Where a TeamChip would go for a player who has no team. An unsigned player
 * is a fact worth stating, and it is not the same fact as a missing value: an
 * em dash reads as "we did not fill this in". Outlined rather than filled, so
 * it does not compete with the colour chips in the same column.
 */
export function FreeAgentChip({ size = "md" }: { size?: "sm" | "md" }) {
  const dims =
    size === "sm"
      ? "text-micro h-4 px-1"
      : "text-xs h-5 px-1.5";

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold uppercase tracking-wide ${dims}`}
      style={{
        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
        color: "var(--text-muted)",
        boxShadow: "inset 0 0 0 1px var(--border-strong)",
      }}
      title="Unsigned free agent"
    >
      FA
    </span>
  );
}
