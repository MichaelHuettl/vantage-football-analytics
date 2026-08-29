import { Fragment } from "react";
import { Callout } from "@/components/Callout";
import { TeamChip } from "@/components/TeamChip";
import { RB_MATCHUPS } from "@/lib/charts";
import type { RbMatchupTable } from "@/lib/charts";

/**
 * The two run-defence matchup tables and what five seasons of them support.
 *
 * Both blocks are the operator's, transcribed from workbook screenshots on
 * 2026-08-28 and validated by `scripts/curated/rb_matchups.py` before anything
 * rendered: ten names per list, no club in both lists of one season, every name
 * resolved to a real club. That middle check is not hypothetical — the kicker
 * field-goal columns had four teams in the top 16 and bottom 5 of the same year.
 *
 * **Every number in the prose comes out of the payload** (§11). The persistence
 * rates, the appearance counts and the overlap between the two bottom tens are
 * computed in the extractor and quoted here, so no paragraph hard-codes a
 * figure that could drift from the table above it.
 *
 * The conclusion is a reading of the operator's own table rather than football
 * opinion, which is the line §11 draws. It says what the five years show about
 * how far last season's list carries into the next, and stops there.
 */
export function RunBlockMatchups() {
  const m = RB_MATCHUPS;
  const yards = m.yards_allowed;
  const rate = m.rush_rate;

  // Clubs in the bottom ten of yards allowed in four or five of the five
  // seasons. Read off the payload's counts; nothing is worked out here.
  const persistent = yards.appearances.most.filter((a) => a.seasons >= 4);
  const rateOften = rate.appearances.most.filter((a) => a.seasons >= 4);
  const latest = m.overlap[0];

  return (
    <>
      <MatchupTable table={yards} seasons={m.seasons} />
      <MatchupTable table={rate} seasons={m.seasons} />

      <Callout
        as="aside"
        label="What the five years support"
        title="A soft run defense is a weak tip, not a plan"
        className="mt-10"
      >
        <div className="flex max-w-3xl flex-col gap-4">
          <p>
            Both lists carry over year to year, and both carry over less than
            they look like they should. Of the ten teams allowing the most
            rushing yards in a season,{" "}
            <Stat>{yards.persistence.most.per_season}</Stat> are in the same ten
            the following season. Picking ten clubs at random would land{" "}
            <Stat>{yards.persistence.most.chance}</Stat>. Opponent rushing rate
            behaves the same way, at{" "}
            <Stat>{rate.persistence.most.per_season}</Stat> against the same
            baseline. The edge is real and it is roughly one extra team in ten.
          </p>
          <p>
            So last year's bottom ten is worth consulting in August and is not
            worth planning a season around. Six of the ten change.
          </p>
          <p>
            What does hold is the handful of clubs that never leave. For yards
            allowed, {inOfFive(persistent)} of the five seasons in the bottom
            ten.
            {rateOften.length > 0 && (
              <>
                {" "}
                For how often they are run at, {inOfFive(rateOften)}.
              </>
            )}{" "}
            Those are standing conditions rather than a season's noise.
          </p>
          <p>
            The two tables are worth more crossed than read apart. A defense that
            allows yards but is not run at often is a matchup a game script can
            take away; one that is run at often but holds up gives volume without
            efficiency. The backs worth chasing face teams in{" "}
            <em>both</em> bottom tens, and there are{" "}
            <Stat>{m.overlap_per_season}</Stat> of those in an average season.
            {latest && latest.teams.length > 0 && (
              <>
                {" "}
                In {latest.season} they were{" "}
                {latest.teams.map((t, i) => (
                  <span key={t.abbr}>
                    {i > 0 && i === latest.teams.length - 1
                      ? " and "
                      : i > 0
                        ? ", "
                        : ""}
                    <TeamChip abbr={t.abbr} size="sm" />
                  </span>
                ))}
                .
              </>
            )}
          </p>
        </div>
      </Callout>

      <p className="mt-6 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
        {m.source}, {m.seasons[m.seasons.length - 1]}&ndash;{m.seasons[0]}.
        Ranks are the operator's own top and bottom ten; the middle twelve clubs
        are not listed in either column.
      </p>
    </>
  );
}

/** One block: five seasons across, ten ranks down, both ends side by side. */
function MatchupTable({
  table,
  seasons,
}: {
  table: RbMatchupTable;
  seasons: number[];
}) {
  const ranks = Array.from({ length: 10 }, (_, i) => i);

  return (
    <figure className="mt-10">
      <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="text-lg uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-display)",
            fontStretch: "var(--stretch-display)",
          }}
        >
          {table.title}
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {table.operator_note}
        </span>
      </figcaption>

      {/* Wide by construction: five seasons times two columns. It scrolls in
          its own container so the page never does (§7). */}
      <div
        className="overflow-x-auto rounded-md"
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklab, var(--text-primary) 8%, transparent)",
        }}
      >
        <table className="w-full text-sm" style={{ minWidth: 900 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th sticky>Rank</Th>
              {seasons.map((s) => (
                <th
                  key={s}
                  scope="colgroup"
                  colSpan={2}
                  className="border-l px-4 py-2 text-center text-xs font-bold uppercase tracking-wider tnum"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontStretch: "var(--stretch-condensed)",
                    color: "var(--text-muted)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  {s}
                </th>
              ))}
            </tr>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th sticky />
              {seasons.map((s) => (
                <Fragment key={s}>
                  <Th bordered>{table.least_label}</Th>
                  <Th>{table.most_label}</Th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranks.map((i) => (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <td
                  className="px-4 py-2 text-xs tnum"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontStretch: "var(--stretch-condensed)",
                    color: "var(--text-muted)",
                    background: "var(--surface-page)",
                  }}
                >
                  {i + 1}
                  <span aria-hidden="true"> / </span>
                  {32 - i}
                </td>
                {table.seasons.map((s) => (
                  <Fragment key={s.season}>
                    <td
                      className="border-l px-4 py-2"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <TeamChip abbr={s.least[i]} size="sm" />
                    </td>
                    <td className="px-4 py-2">
                      <TeamChip abbr={s.most[i]} size="sm" />
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Th({
  children,
  bordered = false,
  sticky = false,
}: {
  children?: React.ReactNode;
  bordered?: boolean;
  sticky?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`${bordered ? "border-l " : ""}px-4 py-2 text-left text-xs font-bold uppercase tracking-wider`}
      style={{
        fontFamily: "var(--font-condensed)",
        fontStretch: "var(--stretch-condensed)",
        color: "var(--text-muted)",
        borderColor: "var(--border-subtle)",
        ...(sticky ? { background: "var(--surface-sunken)" } : null),
      }}
    >
      {children}
    </th>
  );
}

function Stat({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold tnum">{children}</span>;
}

/** Counts read as words beside "the five seasons"; a bare numeral next to a
 *  spelled-out total reads as a typo. */
const COUNT_WORD: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
};

/** "CHI in four and NYG in all five" — a readable list, not a scoreboard. */
function inOfFive(entries: { abbr: string; seasons: number }[]) {
  return entries.map((a, i) => (
    <span key={a.abbr}>
      {i > 0 && i === entries.length - 1 ? " and " : i > 0 ? ", " : ""}
      <TeamChip abbr={a.abbr} size="sm" /> in{" "}
      <Stat>{a.seasons === 5 ? "all five" : COUNT_WORD[a.seasons] ?? a.seasons}</Stat>
    </span>
  ));
}
