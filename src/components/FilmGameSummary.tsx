import type React from "react";
import { Callout } from "@/components/Callout";
import { FILM_SUMMARY as S } from "@/lib/film";

/**
 * What Green Bay ran, above the play-by-play reel.
 *
 * Every value is read from `film-summary-gb-det-2025-w1.json`, which
 * `scripts/curated/film_summary.py` writes. **Nothing is computed here** (§11) —
 * the payload carries counts and their percentages side by side precisely so a
 * percentage is never taken at render time.
 *
 * ## What it does not say, and why
 *
 * **There is no offensive formation or personnel rate.** The deck charts what
 * the defense showed; no slide records what the offense lined up in. A formation
 * percentage would have to be invented, and inventing one on a page arguing that
 * a reader can audit the working is the wrong trade. The tendencies below come
 * from the outcome and the situation, which the deck does record.
 *
 * **These are charted plays, not every offensive snap.** The quarter counts are
 * lopsided — 18 in the first, 5 in the second — so the panel says "charted"
 * throughout rather than implying a complete game log.
 *
 * ## Amber
 *
 * Deliberately none, and the tone is `note` rather than `finding` (§7). This
 * section already spends amber three times: the Sneak peek badge above, and the
 * wash and the tick on the Coming soon panel. A fourth would be the exact
 * failure §7 describes, where amber marks everything and so marks nothing.
 * Hierarchy is carried by display weight on the numerals instead.
 */

const num: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: "var(--weight-display)",
  fontStretch: "var(--stretch-display)",
};

/** A label over a big number. The site's existing stat pattern. */
function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-1 text-2xl tnum" style={num}>
        {v}
      </dd>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/** A labelled row carrying a count and a share. */
function Row({
  label,
  count,
  pct,
  trail,
}: {
  label: string;
  count: string;
  pct: number;
  trail?: string;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span className="text-sm">{label}</span>
      <span className="flex items-baseline gap-2 tabular-nums">
        {trail && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {trail}
          </span>
        )}
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {count}
        </span>
        <span className="w-12 text-right text-sm tnum" style={num}>
          {pct}%
        </span>
      </span>
    </div>
  );
}

/** A term and its value, for the two play-type columns. */
function Line({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {k}
      </dt>
      <dd className="text-sm tnum" style={num}>
        {v}
      </dd>
    </div>
  );
}

export function FilmGameSummary() {
  const [first, second] = S.byHalf;

  return (
    <Callout as="section" tone="note" label="What Green Bay ran" className="mt-6">
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat k="Charted plays" v={String(S.charted)} />
        <Stat k="Yards" v={String(S.yards.total)} sub={`${S.yards.perPlay} a play`} />
        <Stat
          k="Plays with motion"
          v={`${S.motion.pct}%`}
          sub={`${S.motion.plays} of ${S.motion.of}`}
        />
        <Stat k="Touchdowns" v={String(S.yards.touchdowns)} />
      </dl>

      <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        <div>
          <h4 className="eyebrow">The call sheet</h4>
          <div className="mt-2">
            <Row
              label="Run"
              count={String(S.playType.rush.plays)}
              pct={S.playType.rush.pct}
              trail={`${S.playType.rush.perPlay} a carry`}
            />
            <Row
              label="Pass"
              count={String(S.playType.pass.plays)}
              pct={S.playType.pass.pct}
              trail={`${S.playType.pass.perPlay} a dropback`}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            An even split of calls, but not of yards: the pass produced{" "}
            {S.playType.pass.yardShare}% of the {S.yards.total} on{" "}
            {S.playType.pass.pct}% of the snaps.
          </p>
        </div>

        <div>
          <h4 className="eyebrow">And how it moved</h4>
          <div className="mt-2">
            {S.byHalf.map((h) => (
              <Row
                key={h.label}
                label={h.label}
                count={`${h.rush} of ${h.plays} run`}
                pct={h.rushPct}
                trail={`${h.yards} yds`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            They threw to build the lead and ran to hold it. The run rate went
            from {first.rushPct}% to {second.rushPct}% while the yards went the
            other way, {first.yards} to {second.yards}.
          </p>
        </div>
      </div>

      <div className="mt-7">
        <h4 className="eyebrow">Run rate by down</h4>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {S.byDown.map((d) => (
            <div key={d.down}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {d.label}
              </p>
              <p className="mt-0.5 text-lg tnum" style={num}>
                {d.rushPct}%
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {d.rush} run, {d.pass} pass
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        <div>
          <h4 className="eyebrow">Through the air</h4>
          <dl className="mt-2">
            <Line
              k="Completions"
              v={`${S.passing.completions} of ${S.passing.attempts}`}
            />
            <Line k="Completion rate" v={`${S.passing.completionPct}%`} />
            <Line k="Yards" v={String(S.passing.yards)} />
            <Line k="Yards an attempt" v={S.passing.perAttempt.toFixed(1)} />
            <Line k="Longest" v={`${S.passing.longest} yds`} />
          </dl>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            A short game with shots off it: {S.passing.short} of the{" "}
            {S.passing.completions} completions gained under{" "}
            {S.passing.shortThreshold} yards and {S.passing.explosive} went for{" "}
            {S.yards.explosiveThreshold} or more. The{" "}
            {S.passing.scrambles === 1 ? "one scramble counts" : "scrambles count"}{" "}
            as a dropback, not an attempt.
          </p>
        </div>

        <div>
          <h4 className="eyebrow">On the ground</h4>
          <dl className="mt-2">
            <Line k="Carries" v={String(S.rushing.carries)} />
            <Line k="Yards" v={String(S.rushing.yards)} />
            <Line k="Yards a carry" v={S.rushing.perCarry.toFixed(1)} />
            <Line
              k="Stuffed at or behind"
              v={`${S.rushing.stuffed} of ${S.rushing.carries}`}
            />
            <Line k="Longest" v={`${S.rushing.longest} yds`} />
          </dl>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            The carries were not being earned. Across the game{" "}
            {S.rushing.stuffedPct}% of them gained nothing or lost ground, and{" "}
            {S.rushing.explosive} of {S.rushing.carries} reached{" "}
            {S.yards.explosiveThreshold} yards.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        <div>
          <h4 className="eyebrow">Pre-snap motion</h4>
          <div className="mt-2">
            <Row
              label="On runs"
              count={`${S.motion.onRuns.motion} of ${S.motion.onRuns.plays}`}
              pct={S.motion.onRuns.pct}
            />
            <Row
              label="On passes"
              count={`${S.motion.onPasses.motion} of ${S.motion.onPasses.plays}`}
              pct={S.motion.onPasses.pct}
            />
            {S.motion.byHalf.map((h) => (
              <Row
                key={h.label}
                label={h.label}
                count={`${h.motion} of ${h.plays}`}
                pct={h.pct}
              />
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Motion ran at the same rate in both halves even as the run-pass
            balance flipped, and it did not move the ball further:{" "}
            {S.motion.yardsWith} yards a play with it against{" "}
            {S.motion.yardsWithout} without.
          </p>
        </div>

        <div>
          <h4 className="eyebrow">What they threw against</h4>
          <div className="mt-2">
            {S.coverage.families.map((f) => (
              <Row key={f.label} label={f.label} count={String(f.plays)} pct={f.pct} />
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Man on {S.coverage.man.pct}% of them, zone on {S.coverage.zone.pct}%,
            a robber on {S.coverage.robber} snaps. Shares are of the{" "}
            {S.coverage.charted} snaps whose coverage the deck names.
          </p>
        </div>
      </div>

    </Callout>
  );
}
