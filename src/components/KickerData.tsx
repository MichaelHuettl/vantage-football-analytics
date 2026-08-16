import { TeamChip } from "@/components/TeamChip";
import { KICKERS } from "@/lib/kickers";
import type { AdvantageEntry } from "@/lib/kickers";
import { teamByName } from "@/lib/teams";

const abbr = (team: string) => teamByName(team)?.abbr;

/**
 * The workbook's three reference blocks, rendered as they are kept.
 *
 * These are lookup tables, not arguments — a reader comes to them with a team
 * or a name already in mind. So the job is legibility and completeness rather
 * than a takeaway: five years of attempt ranks, three years of scoring, and
 * every situational list, with nothing summarised away.
 */

/* ==================== field goal attempts ==================== */

export function FieldGoalAttempts() {
  const { years, top, bottom } = KICKERS.fg_attempts;

  return (
    <section className="mt-16">
      <h2
        className="text-3xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Team field goal attempts
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Where every team ranked for field goal attempts, five years deep. Read
        across a row to see how little a rank holds from one season to the next.
      </p>

      <h3 className="eyebrow mt-8">Top 16</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 620 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="w-12 text-left">Rank</Th>
              {years.map((y) => (
                <Th key={y} className="text-left">
                  {y}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }, (_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-3 py-1.5 tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {i + 1}
                </td>
                {years.map((y) => (
                  <TeamCell key={y} team={top[y][i]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="eyebrow mt-10">Bottom 5</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 620 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="w-12 text-left">Rank</Th>
              {years.map((y) => (
                <Th key={y} className="text-left">
                  {y}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-3 py-1.5 tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {28 + i}
                </td>
                {years.map((y) => (
                  <TeamCell key={y} team={bottom[y][i]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamCell({ team }: { team?: string }) {
  const a = team ? abbr(team) : undefined;
  return (
    <td className="px-3 py-1.5">
      {team ? (
        <span className="flex items-center gap-2">
          {a && <TeamChip abbr={a} size="sm" />}
          <span className="whitespace-nowrap">{team}</span>
        </span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
      )}
    </td>
  );
}

/* ======================== kicker scoring ======================== */

export function KickerScoring() {
  const { years, rows } = KICKERS.scoring;

  return (
    <section className="mt-16">
      <h2
        className="text-3xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Kicker scoring
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        The top sixteen by total points in each of the last three seasons, with
        the per-game rate beside it. The two disagree whenever a kicker missed
        time, and that gap is usually the more interesting number.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {years.map((y) => (
          <div key={y}>
            <h3 className="eyebrow mb-3">{y}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tnum" style={{ minWidth: 260 }}>
                <thead>
                  <tr style={{ background: "var(--surface-sunken)" }}>
                    <Th className="w-8 text-left">#</Th>
                    <Th className="text-left">Kicker</Th>
                    <Th>Pts</Th>
                    <Th>/G</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows[y].map((k) => (
                    <tr
                      key={k.name}
                      className="border-t"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <td
                        className="px-2 py-1.5"
                        style={{
                          fontFamily: "var(--font-condensed)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {k.rank}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {k.team && <TeamChip abbr={k.team} size="sm" />}
                          <span className="font-semibold">{k.full}</span>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">{k.fpts}</td>
                      <td
                        className="px-2 py-1.5 text-right"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {k.ppg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ====================== kicker advantages ====================== */

export function KickerAdvantages() {
  const { advantages, divisions_note } = KICKERS;

  return (
    <section className="mt-16">
      <h2
        className="text-3xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Kicker advantages
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        The situational lists: the roofs, the coaches who kick rather than go for
        it, the offenses that stall in the red zone, and the legs that reach from
        sixty. Some columns name kickers and some name teams — the label says which.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {advantages.map((a) => (
          <div
            key={a.label}
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              {a.label}
            </h3>

            {a.groups ? (
              <div className="mt-3 flex flex-col gap-3">
                {a.groups.map((g) => (
                  <div key={g.label}>
                    <p className="text-xs font-semibold">{g.label}</p>
                    <List entries={g.entries} />
                  </div>
                ))}
              </div>
            ) : (
              <List entries={a.entries} />
            )}
          </div>
        ))}
      </div>

      {divisions_note && (
        <p className="mt-5 text-sm" style={{ color: "var(--text-muted)" }}>
          Noted alongside: {divisions_note}.
        </p>
      )}
    </section>
  );
}

/**
 * A column's entries. Every one carries its club chip — a kicker's as much as a
 * team's — so the six columns read as one device and a reader scanning for
 * their own team finds it by colour whichever list it is in. A kicker without a
 * job this year gets no chip rather than a stale one.
 */
function List({ entries }: { entries: AdvantageEntry[] }) {
  if (!entries.length) {
    return (
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        Nothing listed.
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {entries.map((e) => (
        <li key={e.name} className="flex items-center gap-2">
          {e.team ? (
            <TeamChip abbr={e.team} size="sm" />
          ) : (
            <span
              className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)",
                color: "var(--text-muted)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              FA
            </span>
          )}
          <span>{e.name}</span>
        </li>
      ))}
    </ul>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-right text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
