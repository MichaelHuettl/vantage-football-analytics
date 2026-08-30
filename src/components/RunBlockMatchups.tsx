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

  // All read off the payload; nothing is worked out here (§11).
  const stalwarts = m.stalwarts;
  const lapsed = m.stalwarts_lapsed;
  const latest = m.overlap[0];

  return (
    <>
      <MatchupTable table={yards} seasons={m.seasons} />
      <MatchupTable table={rate} seasons={m.seasons} />

      <Callout
        as="aside"
        label="What this does to a running back's week"
        title="A defense decides the carries before it decides the yards"
        className="mt-10"
      >
        <div className="flex max-w-3xl flex-col gap-4">
          <p>
            A running back's fantasy week is volume times efficiency, and these
            two tables are one lever each. Opponent rushing rate is the volume
            half: it says how often the defense faces a run at all, which is the
            carry count before anyone measures a yard. Rushing yards allowed is
            the efficiency half, and it only pays out on carries that happen.
          </p>
          <p>
            That order matters more than the tables make it look. Carries are
            the part of a back's line that scores whether or not he is good that
            afternoon; yards per carry swings hard week to week on a dozen
            snaps. A defense that gets run at often hands a back the floor.
            A defense that gives up yards but is rarely run at hands him
            nothing he can count on, because the thing that unlocks it is a
            game script neither he nor you control. Chase the volume half and
            treat the efficiency half as the upside on top of it.
          </p>
          <p>
            Both lists carry from one season to the next, and both carry less
            than they appear to. Of the ten teams allowing the most rushing
            yards, <Stat>{yards.persistence.most.per_season}</Stat> are in the
            same ten a year later against a chance rate of{" "}
            <Stat>{yards.persistence.most.chance}</Stat>; rushing rate runs at{" "}
            <Stat>{rate.persistence.most.per_season}</Stat> on the same
            baseline. That is about one extra team in ten, so six of the ten
            turn over every year. Last season's list is a place to start in
            August and not a plan to hold through November.
          </p>
          <p>
            The clubs that never move are the exception worth knowing.{" "}
            {stalwarts.length > 0 && (
              <>
                {stalwarts.map((s, i) => (
                  <span key={s.abbr}>
                    {i > 0 && i === stalwarts.length - 1
                      ? " and "
                      : i > 0
                        ? ", "
                        : ""}
                    <TeamChip abbr={s.abbr} size="sm" />
                  </span>
                ))}{" "}
                sit in the top ten of both blocks in at least three of the five
                seasons and are still there: hard to run on, and then not run
                at, which is the profile of a defense nobody solves and nobody
                keeps trying.{" "}
              </>
            )}
            At the other end, teams in <em>both</em> bottom tens are giving up
            volume and yards at once, and there are{" "}
            <Stat>{m.overlap_per_season}</Stat> of them in an average season.
            {latest && latest.teams.length > 0 && (
              <>
                {" "}
                In {latest.season}:{" "}
                {latest.teams.map((tm, i) => (
                  <span key={tm.abbr}>
                    {i > 0 && i === latest.teams.length - 1
                      ? " and "
                      : i > 0
                        ? ", "
                        : ""}
                    <TeamChip abbr={tm.abbr} size="sm" />
                  </span>
                ))}
                .
              </>
            )}
          </p>
          {lapsed.length > 0 && (
            <p>
              One club shows how fast that can go.{" "}
              {lapsed.map((s, i) => (
                <span key={s.abbr}>
                  {i > 0 ? ", " : ""}
                  <TeamChip abbr={s.abbr} size="sm" />
                </span>
              ))}{" "}
              cleared the same bar on the five-year counts and then landed in
              both bottom tens in {m.latest_season}. A standing reputation is
              still last year's information, and this is what the{" "}
              <Stat>{yards.persistence.most.per_season}</Stat>-in-ten carry-over
              rate looks like when it happens to a team you thought was settled.
            </p>
          )}
          <p>
            What these two columns cannot tell you is <em>why</em> a defense
            holds up year after year. Scheme and personnel both produce the same
            row, and separating them needs coaching tenure this site does not
            carry. The only coordinator data here is the 2026 hiring round on the
            defense page, which says nothing about who has been good against the
            run for five years. Treat the standing names as a pattern to check,
            not as a claim about a coordinator.
          </p>
        </div>
      </Callout>
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

