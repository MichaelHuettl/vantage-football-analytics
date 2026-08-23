import { TeamChip } from "@/components/TeamChip";
import type { LeaderColumn, TeamRef } from "@/lib/defense";

/**
 * The defense reference blocks.
 *
 * Nine blocks of different shapes sit in this part of the sheet, so the job is
 * to give each the treatment it actually needs — a scored table where there are
 * numbers, ranked columns where there is only an order — rather than flatten
 * them into one component that fits none of them.
 */

/** A club, chipped. The one device every block on the page shares. */
export function Team({ team }: { team: TeamRef }) {
  return (
    <span className="flex items-center gap-2">
      {team.abbr && <TeamChip abbr={team.abbr} size="sm" />}
      <span className="whitespace-nowrap">{team.name}</span>
    </span>
  );
}

/**
 * A set of ranked columns rendered as cards.
 *
 * These lists carry an order and nothing else — no values — so the rank number
 * is the only quantity on show and the card does not pretend otherwise.
 */
export function RankedColumns({
  columns,
  caption,
}: {
  columns: LeaderColumn[];
  caption?: string;
}) {
  return (
    <>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {columns.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              {c.label}
            </h3>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm">
              {c.entries.map((e, i) => (
                <li key={e.label} className="flex items-baseline gap-2">
                  <span
                    className="w-4 shrink-0 text-xs tnum"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {/* A tie names two clubs in one cell; both get a chip. */}
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {e.teams.map((t) => (
                      <Team key={t.name} team={t} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {caption && (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {caption}
        </p>
      )}
    </>
  );
}

/**
 * The same ranked columns, but thirty-two deep rather than ten.
 *
 * A card per column would run the page to five screens, so these go side by
 * side in one scrolling table where a reader can read across a rank instead of
 * down five separate lists.
 */
export function RankedTable({ columns }: { columns: LeaderColumn[] }) {
  const depth = Math.max(...columns.map((c) => c.entries.length));
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 780 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <th
              scope="col"
              className="w-10 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              #
            </th>
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: depth }, (_, i) => (
            <tr key={i} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <td
                className="px-3 py-1.5 tnum"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {i + 1}
              </td>
              {columns.map((c) => {
                const e = c.entries[i];
                return (
                  <td key={c.label} className="px-3 py-1.5">
                    {e ? (
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {e.teams.map((t) => (
                          <Team key={t.name} team={t} />
                        ))}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>n/a</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
