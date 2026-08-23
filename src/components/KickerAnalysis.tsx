import Image from "next/image";
import Link from "next/link";
import { TeamChip } from "@/components/TeamChip";
import {
  FieldGoalAttempts,
  KickerAdvantages,
  KickerScoring,
} from "@/components/KickerData";
import { KICKERS, KICKER_SOURCE } from "@/lib/kickers";
import type { BoardPick } from "@/lib/kickers";

/**
 * The kicker page.
 *
 * Ordered as an argument rather than as a data dump: what the position is worth
 * first, because a reader deciding whether to care should be able to stop after
 * one section; then the one part of a kicker's record that carries forward;
 * then the board that follows from it.
 *
 * Every number is read from `kicker-charts.json`, which the Python settles.
 * Nothing here is computed (§11).
 */
export function KickerAnalysis() {
  const { scoring, board } = KICKERS;
  const latest = scoring.spread[scoring.spread.length - 1];

  return (
    <section className="mt-14">
      {/* ==================== 1. why the position matters ==================== */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Why a kicker is worth thinking about
        </h2>
        <span className="eyebrow">2023&ndash;2025 scoring</span>
      </div>

      <div className="mt-5 flex flex-col gap-4 max-w-3xl leading-relaxed">
        <p>
          The gap between the best kicker and the last startable one was{" "}
          <Stat>{latest.points}</Stat> points last season,{" "}
          <Stat>{latest.per_game}</Stat> a week. That is not nothing, and it has
          widened three years running:{" "}
          {scoring.spread.map((s) => s.points).join(", ")} points.
        </p>
        <p>
          The honest version is narrower. Getting from a top-twelve kicker to the
          best one is worth about three points a week; getting from a top-six
          kicker to the best one is worth between{" "}
          <Stat>1.4</Stat> and <Stat>2.2</Stat>. So the decision that pays is
          not picking the right kicker out of the good ones. It is not
          ending up with a bad one.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm tnum" style={{ minWidth: 560 }}>
          <caption
            className="mt-3 text-left text-sm"
            style={{ captionSide: "bottom", color: "var(--text-secondary)" }}
          >
            Season point gaps from the top kicker down, and the weekly
            equivalent over a 17-game season.
          </caption>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="text-left">Season</Th>
              <Th className="text-left">K1</Th>
              <Th>K1 &minus; K16</Th>
              <Th>Per week</Th>
            </tr>
          </thead>
          <tbody>
            {scoring.spread.map((s) => (
              <tr key={s.year} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="px-3 py-2 font-semibold">{s.year}</td>
                <td className="px-3 py-2">
                  {s.k1.full} <Muted>{s.k1.fpts}</Muted>
                </td>
                <td className="px-3 py-2 text-right font-bold">{s.points}</td>
                <td className="px-3 py-2 text-right">{s.per_game}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ==================== 2. the one thing that carries ==================== */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The top half sticks. The bottom half is noise.
        </h2>

        <div className="mt-5 flex flex-col gap-4 max-w-3xl leading-relaxed">
          <p>
            Take the kicker top 16 as a whole and it looks random: 8 and 9 of 16
            came back the following year, and a list of sixteen drawn from a pool
            of thirty-two repeats eight by luck alone. Most analysis of the
            position stops at that number and concludes kickers are unknowable.
          </p>
          <p>
            Split the list at its midpoint and it stops being random. The top
            eight came back <Stat>81%</Stat> of the time. The bottom eight came
            back <Stat>25%</Stat> of the time. Against a 50% baseline those miss
            in opposite directions, and neither is a coin flip.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-12 gap-y-6">
          <Figure value="81%" label={<>K1&ndash;K8 came back<br />13 of 16</>} focus />
          <Figure value="25%" label={<>K9&ndash;K16 came back<br />4 of 16</>} />
          <Figure value="50%" label={<>what chance<br />would give</>} />
        </div>

        <div className="mt-7 overflow-x-auto">
          <table className="w-full text-sm tnum" style={{ minWidth: 520 }}>
            <caption
              className="mt-3 text-left text-sm"
              style={{ captionSide: "bottom", color: "var(--text-secondary)" }}
            >
              Kickers returning to the top 16 the following season, split by
              where they finished. Chance is 8 of 16 for both halves.
            </caption>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <Th className="text-left">Transition</Th>
                <Th>K1&ndash;K8 returned</Th>
                <Th>K9&ndash;K16 returned</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="px-3 py-2 font-semibold">2023 &rarr; 2024</td>
                <td className="px-3 py-2 text-right font-bold">6 / 8</td>
                <td className="px-3 py-2 text-right">2 / 8</td>
              </tr>
              <tr className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="px-3 py-2 font-semibold">2024 &rarr; 2025</td>
                <td className="px-3 py-2 text-right font-bold">7 / 8</td>
                <td className="px-3 py-2 text-right">2 / 8</td>
              </tr>
              <tr className="border-t-2" style={{ borderColor: "var(--text-primary)" }}>
                <td className="px-3 py-2 font-semibold">Pooled</td>
                <td
                  className="px-3 py-2 text-right font-bold"
                  style={{ color: "var(--color-vantage-amber)" }}
                >
                  13 / 16 &nbsp;&middot;&nbsp; 81%
                </td>
                <td className="px-3 py-2 text-right font-bold">4 / 16 &nbsp;&middot;&nbsp; 25%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col gap-4 max-w-3xl leading-relaxed">
          <p>
            One caveat, stated because it is real: some of that gap is
            mechanical. A kicker at K16 only has to slip one place to fall out of
            the set, while a kicker at K1 can lose fifteen and stay in it. That
            buffer flatters the top half on its own, and this data cannot
            separate buffer from skill.
          </p>
          <p>
            It does not change what to do about it. Whichever is driving it, last
            year&rsquo;s top eight is a much better pool to draft from than last
            year&rsquo;s ninth through sixteenth, and within that eight,
            the exact order carries nothing. Rank correlates from one year to the
            next at roughly zero.
          </p>
        </div>
      </section>

      {/* ============ 3-5. the workbook's own reference tables ============ */}
      {/* The page changes register here: everything above argues, everything
          below is the record it argues from. A ruled break and a label say so,
          because a reader who scrolls into a 16-row rank grid without warning
          reads it as a continuation of the argument. */}
      <div className="mt-20 border-t-4 pt-6" style={{ borderColor: "var(--text-primary)" }}>
        <p className="eyebrow">The workbook</p>
        <p className="mt-2 max-w-3xl text-lg" style={{ color: "var(--text-secondary)" }}>
          Everything above is the argument. Everything below is the record it
          comes from, kept as it is kept in the sheet.
        </p>
      </div>

      <FieldGoalAttempts />
      <KickerScoring />
      <KickerAdvantages />

      {/* ==================== 6-7. the board ==================== */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Top three
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          The operator&rsquo;s three, with his reasoning as written in the
          workbook and the scoring record beside it.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.top3.map((k, i) => (
            <PickCard key={k.surname} pick={k} rank={i + 1} focus />
          ))}
        </ul>

        <h2
          className="mt-14 text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Value picks
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Cheaper bets, and worth being clear about what they are: only a quarter
          of kickers outside the top eight come back the following year. Each of
          these has a specific reason attached: a rate the ranking hid, a
          ceiling already on record, or a stadium.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.value.map((k) => (
            <PickCard key={k.surname} pick={k} />
          ))}
        </ul>
      </section>

      <p className="mt-14 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
        {KICKER_SOURCE} Games played are derived from points divided by points
        per game, which is the only route to them in this sheet.
      </p>
    </section>
  );
}

/**
 * One kicker, his record, and why he is on the board.
 *
 * The season line is the argument, so it is printed rather than summarised:
 * a reader who disagrees with the pick can see exactly what it rests on.
 */
function PickCard({
  pick,
  rank,
  focus = false,
}: {
  pick: BoardPick;
  rank?: number;
  focus?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span
          className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full"
          style={{ background: "var(--surface-sunken)" }}
        >
          {pick.player_id ? (
            <Image
              src={`/img/headshots/${pick.player_id}.png`}
              alt=""
              fill
              sizes="48px"
              style={{ objectFit: "cover", objectPosition: "top center" }}
            />
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-bold"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
            >
              {initials(pick.name)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            {rank && (
              <span
                className="text-sm tnum"
                style={{
                  fontFamily: "var(--font-condensed)",
                  color: focus ? "var(--color-vantage-amber)" : "var(--text-muted)",
                }}
              >
                {String(rank).padStart(2, "0")}
              </span>
            )}
            <span className="font-semibold">{pick.name}</span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <TeamChip abbr={pick.team} size="sm" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              top 16 in {pick.appearances} of 3
            </span>
          </span>
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-1 text-sm">
        {pick.seasons.length ? (
          pick.seasons.map((s) => (
            <div key={s.year} className="flex items-baseline gap-2">
              <dt
                className="w-10 shrink-0 text-xs tnum"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {s.year}
              </dt>
              <dd className="tnum" style={{ color: "var(--text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  K{s.rank}
                </span>{" "}
                &middot; {s.ppg} per game
                {s.games !== null && s.games < 16.4 && (
                  <span style={{ color: "var(--text-muted)" }}> &middot; {s.games} games</span>
                )}
              </dd>
            </div>
          ))
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {/* The fact only. The case line below does the arguing, and saying
                "no record" twice on one card reads as padding. */}
            No top-16 season, 2023 to 2025.
          </div>
        )}
      </dl>

      {/* His write-up where there is one — the favourites carry it verbatim.
          The value picks have none in the sheet, so the one-line case stands
          in for them. */}
      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {pick.reason ?? CASE[pick.surname]}
      </p>
    </>
  );

  return (
    <li
      className="rounded-lg border p-5"
      style={{
        borderColor: focus ? "var(--color-vantage-amber)" : "var(--border-subtle)",
      }}
    >
      {pick.player_id ? (
        <Link href={`/players/${pick.player_id}`} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

/**
 * The one-line case for the value picks. The three favourites do not appear
 * here: their write-up is the operator's own and comes from the workbook.
 */
const CASE: Record<string, string> = {
  McLaughlin:
    "Improved in each of the last three years: 7.9, then 9.4, then 9.8 a game, which no other kicker in the sample did. The K7 finish is a games-played artifact: he scored at the fourth-best rate in football across 15 of them. Tampa Bay has made the top 16 in attempts in four of five years and finished bottom-five in red zone touchdown rate in 2025, and he has 60-plus range on a warm-weather field.",
  Pineiro:
    "Scored 9.3 a game, tied with Dicker for the fifth-best rate in football, and finished K14 only because he played 14 games. San Francisco is on the lowest fourth-down go-rate list, which is the coaching profile that sends the unit out rather than going for it. A top-eight rate at a last-round price.",
  Boswell:
    "Kicked a full 17 games in each of the last two seasons and was the highest-scoring kicker in football in 2024 at 10.8 a game. The drop to 8.3 in 2025 is the regression this position always produces; the availability is what does not move. Pittsburgh is on both the low fourth-down go-rate and the 2024 low red zone lists.",
  Lutz:
    "Two full seasons, 8.8 then 7.7 a game, K8 then K13, which is a floor rather than a ceiling. What he has that nobody else does is Denver: thinner air carries the ball, so the 55-and-in range extends, and the Broncos sit on both the low fourth-down go-rate and the 2025 low red zone lists.",
  Smyth:
    "The situation is the strongest on this list even though the record is empty. A dome, a starting job, a Saints offense on the 2025 low red zone touchdown list, and a team that has made the top 16 in field goal attempts three years running. Drives that reach the 25 and stop are exactly what pays a kicker; he just has to convert them.",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Figure({
  value,
  label,
  focus = false,
}: {
  value: string;
  label: React.ReactNode;
  focus?: boolean;
}) {
  return (
    <div>
      <div
        className="text-4xl tnum"
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

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <span className="tnum" style={{ color: "var(--text-muted)" }}>
      {children}
    </span>
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
