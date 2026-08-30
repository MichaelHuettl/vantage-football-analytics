import { TeamChip } from "@/components/TeamChip";
import { RankedColumns, Team } from "@/components/DefenseData";
import { DefenseCoordinators } from "@/components/DefenseCoordinators";
import { DefenseFindings } from "@/components/DefenseFindings";
import { HistoricFinishes, MeasureVsFinish } from "@/components/DefenseHistory";
import { DEFENSE, DEFENSE_SOURCE } from "@/lib/defense";
import type { TeamRef } from "@/lib/defense";

/**
 * The defense page.
 *
 * Same shape as the kicker page: what the position is worth, then the record it
 * is argued from, then what changed over the offseason and what the schedule
 * does about it. Every number comes from `defense-charts.json` (§11).
 */
export function DefenseAnalysis() {
  const {
    fantasy,
    spread,
    leaders,
    leaders_source,
    pass_rush,
    coverage,
    success,
    dvoa,
    offseason,
    verdict,
    strong_schedules,
    schedules,
  } = DEFENSE;

  // The sheet keeps its columns in two blocks that split by where they came
  // from. These regroup them by what they measure, which is how a reader thinks
  // about a defense: who gets to the quarterback, and who covers.
  const pick = (label: string) =>
    [...leaders, ...coverage].find((c) => c.label === label);
  const rush = [
    "Sacks",
    "Pressure Rate",
    "Down Conversion Rate Allowed",
    "Rush Stuff Rate",
  ]
    .map(pick)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const secondary = [
    "Interceptions",
    "EPA/Pass Allowed",
    "Pass Success Rate Allowed",
    "Middle Open Rate",
    "Middle Closed Rate",
  ]
    .map(pick)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <section className="mt-16">
      {/* ==================== what it is worth ==================== */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          What a defense is worth
        </h2>
        <span className="eyebrow">2025 scoring</span>
      </div>

      {spread && (
        <div className="mt-5 flex flex-col gap-4 max-w-3xl">
          <p>
            {spread.top.team} scored <Stat>{spread.top.fpts}</Stat> points last
            season and the tenth-best defense scored{" "}
            <Stat>{spread.tenth.fpts}</Stat>, a spread of{" "}
            <Stat>{spread.points}</Stat> across the startable tier, or{" "}
            <Stat>{spread.per_game}</Stat> a week. That is the gap inside the
            top ten, not the gap to a waiver-wire defense, which the sheet does
            not record.
          </p>
          <p>
            Two ways to read it. Three points a week is roughly what separates a
            good kicker from a replaceable one, so the position deserves the same
            answer: do not pay much, and do not stream blindly either. The
            more useful read is underneath: the columns below say which of these
            finishes were built on something repeatable.
          </p>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm tnum" style={{ minWidth: 460 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="w-10 text-left">#</Th>
              <Th className="text-left">Defense</Th>
              <Th>Points</Th>
              <Th>Per game</Th>
            </tr>
          </thead>
          <tbody>
            {fantasy.map((f) => (
              <tr key={f.team} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-3 py-2"
                  style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
                >
                  {f.rank}
                </td>
                <td className="px-3 py-2">
                  <Team team={{ name: f.team, abbr: f.abbr }} />
                </td>
                <td className="px-3 py-2 text-right font-bold">{f.fpts}</td>
                <td className="px-3 py-2 text-right" style={{ color: "var(--text-secondary)" }}>
                  {f.ppg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ==================== the record ==================== */}
      <div className="mt-20 border-t-4 pt-6" style={{ borderColor: "var(--text-primary)" }}>
        <p className="eyebrow">The workbook</p>
        <p className="mt-2 max-w-3xl text-lg" style={{ color: "var(--text-secondary)" }}>
          Everything above is the argument. Everything below is the record it
          comes from, kept as it is kept in the sheet.
        </p>
      </div>

      <HistoricFinishes />

      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          The measures against the finish
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Three ways of grading a defense, each kept beside the fantasy finish it
          actually produced. That pairing is the only place in the sheet where a
          measure can be seen getting a season wrong.
        </p>

        <MeasureVsFinish
          title="Success rate allowed"
          intro="The share of opponent plays that gained what the down and distance asked for. Lower is better."
          blocks={success}
          valueKey="success_rate"
          format={(n) => `${(n * 100).toFixed(1)}%`}
        />

        <MeasureVsFinish
          title="DVOA"
          intro="Defensive value over average, adjusted for opponent. More negative is better."
          blocks={dvoa}
          valueKey="dvoa"
          format={(n) => n.toFixed(3)}
        />
      </section>

      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          Pass rush
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Getting to the quarterback and getting off the field. Simulated
          pressure is the only block here with values rather than an order:
          how often a defense fakes pressure, and how often it works.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm tnum" style={{ minWidth: 460 }}>
            <caption
              className="mt-3 text-left text-sm"
              style={{ captionSide: "bottom", color: "var(--text-secondary)" }}
            >
              Simulated pressures: frequency is the share of dropbacks, efficiency
              the share that produced pressure.
            </caption>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <Th className="text-left">Defense</Th>
                <Th>Frequency</Th>
                <Th>Efficiency</Th>
              </tr>
            </thead>
            <tbody>
              {pass_rush.simulated.map((s) => (
                <tr key={s.team} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="px-3 py-2">
                    <Team team={{ name: s.team, abbr: s.abbr }} />
                  </td>
                  <td className="px-3 py-2 text-right">{pct(s.frequency)}</td>
                  <td className="px-3 py-2 text-right font-bold">{pct(s.efficiency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <RankedColumns
          columns={rush}
          caption={leaders_source ? `2025 columns from ${leaders_source}` : undefined}
        />
      </section>

      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          Secondary
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Taking the ball away, and what the offense was allowed to do through
          the air. The two middle-of-the-field rates describe coverage shell
          rather than quality. They say how a defense plays, not how well.
        </p>
        <RankedColumns columns={secondary} />
      </section>

      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          Box rates
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          How many defenders a unit keeps near the line, and how well it does
          rushing four. Descriptive rather than predictive. See the
          findings at the foot of the page.
        </p>
        <RankedColumns columns={pass_rush.box} />
      </section>

      {/* ==================== the offseason ==================== */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          What changed
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Movement on the ten defenses worth tracking, with the role each player
          held rather than just the name. A rotational departure and a starting
          one are not the same loss.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {offseason.map((o) => (
            <div
              key={o.team}
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <header
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ background: "var(--surface-sunken)" }}
              >
                {o.abbr && <TeamChip abbr={o.abbr} size="sm" />}
                <span className="font-semibold">{o.team}</span>
              </header>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Movement label="Out" names={o.departures} />
                <Movement label="In" names={o.additions} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Verdict label="Improved units" teams={verdict.improved} focus />
          <Verdict label="Regressed units" teams={verdict.regressed} />
        </div>
      </section>

      <DefenseCoordinators />

      {/* ==================== schedule ==================== */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
        >
          Schedule
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          A defense is streamed against opponents, so the weeks matter as much as
          the unit. These are the favorable stretches, and then three views of
          the season as a whole.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {strong_schedules.map((s) => (
            <div
              key={s.team}
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                {s.abbr && <TeamChip abbr={s.abbr} size="sm" />}
                <span className="font-semibold">{s.team}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {s.weeks.map((w) => (
                  <li key={w.week} className="flex items-center gap-2">
                    <span
                      className="w-8 shrink-0 text-xs tnum"
                      style={{
                        fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                        color: "var(--text-muted)",
                      }}
                    >
                      W{w.week}
                    </span>
                    <Team team={{ name: w.opponent, abbr: w.abbr }} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {schedules.map((s) => (
            <div
              key={s.source}
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
              >
                {s.source}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <SosColumn label="Easiest" teams={s.easiest} />
                <SosColumn label="Hardest" teams={s.hardest} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The findings close the page rather than opening it: they argue from
          every table above, so they read better after them than before. */}
      <DefenseFindings />

      <p className="mt-14 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
        {DEFENSE_SOURCE}
      </p>
    </section>
  );
}

function Movement({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <p
        className="text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      {names.length ? (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {names.map((n) => (
            <li key={n} style={{ color: "var(--text-secondary)" }}>
              {n}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Nobody of note.
        </p>
      )}
    </div>
  );
}

function Verdict({
  label,
  teams,
  focus = false,
}: {
  label: string;
  teams: TeamRef[];
  focus?: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: focus ? "var(--color-vantage-amber)" : "var(--border-subtle)",
      }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
          color: focus ? "var(--color-vantage-amber)" : "var(--text-muted)",
        }}
      >
        {label}
      </h3>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {teams.map((t) => (
          <li key={t.name}>
            <Team team={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SosColumn({ label, teams }: { label: string; teams: TeamRef[] }) {
  return (
    <div>
      <p
        className="text-xs font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
        {teams.map((t, i) => (
          <li key={t.name} className="flex items-baseline gap-2">
            <span
              className="w-3 shrink-0 text-xs tnum"
              style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
            >
              {i + 1}
            </span>
            <Team team={t} />
          </li>
        ))}
      </ol>
    </div>
  );
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Stat({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold tnum">{children}</span>;
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
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
