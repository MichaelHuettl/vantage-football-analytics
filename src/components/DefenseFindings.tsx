import { Callout } from "./Callout";
import { Team } from "@/components/DefenseData";
import { TeamChip } from "@/components/TeamChip";
import { DEFENSE } from "@/lib/defense";
import type { Measure } from "@/lib/defense";

/**
 * What the sheet's own columns turn out to be worth.
 *
 * These three sections are argument rather than record, so they sit above the
 * workbook divider with the reference tables below it. Every number is read
 * from `analysis` in the JSON, which the Python settles against an explicit
 * chance baseline (§11) — including which measures are worth ignoring.
 */
export function DefenseFindings() {
  const { analysis } = DEFENSE;
  const { measures, support, spotlight, scorers, league } = analysis;
  const chance = Math.round((scorers / league) * 100);

  return (
    <>
      {/* ============ per-play quality against event counting ============ */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Which numbers actually carry
        </h2>

        <div className="mt-5 flex flex-col gap-4 max-w-3xl leading-relaxed">
          <p>
            Only the top ten scoring defenses are recorded, so the question a
            measure can be asked is narrow but clean: do its leaders turn out to
            be the teams that scored? A ten-team list drawn at random from
            thirty-two would share about <Stat>{chance}%</Stat> of its names with
            the scoring top ten. That is the line everything below is judged
            against.
          </p>
          <p>
            Sorted that way, the split is not subtle. The measures describing{" "}
            <em>how efficiently an offense was allowed to play</em> sit at the
            top. The measures counting things that happened sit at the bottom, including interceptions, which are among the most directly rewarded
            events in scoring and are still no better than a coin flip at
            picking out the defenses that finished well. Turnovers pay when they
            come and barely repeat, which is what a rate near chance looks like.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm tnum" style={{ minWidth: 620 }}>
            <caption
              className="mt-3 text-left text-sm"
              style={{ captionSide: "bottom", color: "var(--text-secondary)" }}
            >
              Leaders of each measure that also finished top ten in scoring.
              Coverage columns are read from their good end, which is not the top
              of the column for three of the five.
            </caption>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <Th className="text-left">Measure</Th>
                <Th>Hits</Th>
                <Th>Rate</Th>
                <Th className="text-left">&nbsp;</Th>
                <Th className="text-left">Verdict</Th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m) => (
                <tr
                  key={`${m.block}-${m.label}`}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <td className="px-3 py-2">
                    <span style={{ color: tone(m) }}>{m.label}</span>
                    {m.direction === "worst-first" && (
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        read from the bottom
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: tone(m) }}>
                    {m.hits} / {m.size}
                  </td>
                  <td
                    className="px-3 py-2 text-right font-bold"
                    style={{ color: tone(m) }}
                  >
                    {Math.round(m.rate * 100)}%
                  </td>
                  <td className="px-3 py-2">
                    {/* The bar is a second encoding of the same number, so the
                        ranking survives without colour (§7). */}
                    <span
                      aria-hidden="true"
                      className="block h-2 rounded-sm"
                      style={{
                        width: `${Math.max(4, m.rate * 100)}px`,
                        background: tone(m),
                        opacity: m.tier === "none" ? 0.45 : 1,
                      }}
                    />
                  </td>
                  <td
                    className="px-3 py-2 text-xs uppercase tracking-wider"
                    style={{ fontFamily: "var(--font-condensed)", color: tone(m) }}
                  >
                    {m.tier === "none" ? "at chance" : m.tier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          The four at the bottom are worth keeping and worth ignoring at the same
          time. Heavy box rate lands below chance because stacking the box is a
          response to the opponent&rsquo;s run game rather than a property of a
          good defense. Those columns describe how a defense plays. They do not
          say whether to roster it.
        </p>
      </section>

      {/* ============ what each top-ten finish was built on ============ */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What each finish was built on
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          The same seven leaderboards, read the other way round: for each defense
          that scored, how many of them does it appear in? A finish supported
          across the board came from the way the team played. A finish supported
          by nothing came from somewhere else.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm tnum" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <Th className="w-10 text-left">#</Th>
                <Th className="text-left">Defense</Th>
                <Th>Points</Th>
                <Th>Leaderboards</Th>
                <Th className="text-left">&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {support.map((s) => {
                const bare = s.appears.length === 0;
                return (
                  <tr
                    key={s.team}
                    className="border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td
                      className="px-3 py-2"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {s.rank}
                    </td>
                    <td className="px-3 py-2">
                      <Team team={{ name: s.team, abbr: s.abbr }} />
                    </td>
                    <td className="px-3 py-2 text-right">{s.fpts}</td>
                    <td
                      className="px-3 py-2 text-right font-bold"
                      style={{
                        color: bare
                          ? "var(--color-vantage-amber)"
                          : "var(--text-primary)",
                      }}
                    >
                      {s.appears.length} / {s.of}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        aria-hidden="true"
                        className="block h-2 rounded-sm"
                        style={{
                          width: `${Math.max(4, (s.appears.length / s.of) * 100)}px`,
                          background: bare
                            ? "var(--color-vantage-amber)"
                            : "var(--text-primary)",
                          opacity: bare ? 1 : 0.75,
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {support
          .filter((s) => s.appears.length === 0)
          .map((s) => (
            <Callout key={s.team} plain className="mt-6 max-w-3xl" label="The exception">
              <p className="leading-relaxed">
                {s.team} scored <Stat>{s.fpts}</Stat> points and appear in{" "}
                <strong>none of the seven</strong>: not sacks, interceptions, forced fumbles, pressure rate, EPA per pass, pass success rate or
                EPA per play. Every other defense on this list appears in at
                least three.
              </p>
              <p className="mt-3 leading-relaxed">
                A scoring finish with no per-play support behind it usually came
                from return touchdowns or the sequencing of turnovers, and
                neither carries into a new season. Worth holding in mind against
                the offseason section below, which has them among the improved
                units: the personnel case may be right, but it is being added to
                a starting point lower than tenth.
              </p>
            </Callout>
          ))}
      </section>

      {/* ============ the buy ============ */}
      {spotlight && (
        <section className="mt-16">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The defense the data likes and the scoreboard did not
          </h2>

          <div className="mt-6 rounded-lg border p-6" style={{ borderColor: "var(--color-vantage-amber)" }}>
            <div className="flex flex-wrap items-center gap-3">
              {spotlight.abbr && <TeamChip abbr={spotlight.abbr} />}
              <span className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                {spotlight.team}
              </span>
              <span className="eyebrow">outside the 2025 top ten</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-5">
              <Figure
                value={`${spotlight.appears.length}/${spotlight.of}`}
                label="advanced leaderboards"
                focus
              />
              {Object.entries(spotlight.coverage_ranks)
                .filter(([label]) =>
                  ["Pressure Rate", "Down Conversion Rate Allowed"].includes(label),
                )
                .map(([label, rank]) => (
                  <Figure key={label} value={ordinal(rank)} label={label} />
                ))}
            </div>

            <p className="mt-6 max-w-3xl leading-relaxed">
              The mirror image of the row above. The {spotlight.team} appear in{" "}
              <Stat>{spotlight.appears.length}</Stat> of the {spotlight.of}{" "}
              advanced leaderboards, everything except{" "}
              {spotlight.missing.join(" and ").toLowerCase()}, and rank{" "}
              <Stat>
                {ordinal(spotlight.coverage_ranks["Down Conversion Rate Allowed"])}
              </Stat>{" "}
              of thirty-two at keeping offenses off the sticks. They did not
              finish in the scoring top ten at all.
            </p>
            <p className="mt-3 max-w-3xl leading-relaxed">
              A defense playing that well without the points is the cleanest case
              of positive regression in this sheet, and the only one that will
              not be priced like it. The teams above them all have a top-ten
              finish attached to their name; this one has the play without the
              reputation.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

/** Tier to ink. The bar and the printed rate carry the same fact, so colour is
 *  never doing the work alone (§7). */
function tone(m: Measure) {
  if (m.tier === "strong") return "var(--color-vantage-amber)";
  if (m.tier === "none") return "var(--text-muted)";
  return "var(--text-primary)";
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function Figure({
  value,
  label,
  focus = false,
}: {
  value: string;
  label: string;
  focus?: boolean;
}) {
  return (
    <div>
      <div
        className="text-3xl tnum"
        style={{
          fontFamily: "var(--font-display)",
          color: focus ? "var(--color-vantage-amber)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
      <div
        className="mt-1 text-xs uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </div>
    </div>
  );
}

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
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
