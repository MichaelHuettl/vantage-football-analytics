import Image from "next/image";
import Link from "next/link";
import { TeamChip } from "@/components/TeamChip";
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
          <Stat>{latest.points}</Stat> points last season &mdash;{" "}
          <Stat>{latest.per_game}</Stat> a week. That is not nothing, and it has
          widened three years running:{" "}
          {scoring.spread.map((s) => s.points).join(", ")} points.
        </p>
        <p>
          The honest version is narrower. Getting from a top-twelve kicker to the
          best one is worth about three points a week; getting from a top-six
          kicker to the best one is worth between{" "}
          <Stat>1.4</Stat> and <Stat>2.2</Stat>. So the decision that pays is
          not picking the right kicker out of the good ones &mdash; it is not
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
                  {s.k1.name} <Muted>{s.k1.fpts}</Muted>
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
            year&rsquo;s ninth through sixteenth &mdash; and within that eight,
            the exact order carries nothing. Rank correlates from one year to the
            next at roughly zero.
          </p>
        </div>
      </section>

      {/* ==================== 3. the board ==================== */}
      <section className="mt-16">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Top three
        </h2>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          All three cleared the top eight last season, which is the only filter
          that has predicted anything.
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
          these has a specific reason attached &mdash; a rate the ranking hid, a
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

      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {CASE[pick.surname]}
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
 * The one-line case for each pick. Prose, so it lives with the component
 * rather than in the data file — the numbers above it are the data.
 */
const CASE: Record<string, string> = {
  Aubrey:
    "Three seasons inside a tenth of a point of each other. Nothing else at the position repeats like that.",
  Dicker:
    "Top eight all three years, never missed a game, and his floor rose after 2023 and stayed up.",
  Fairbairn:
    "The best per-game rate in the sample. He finished second on total points only because he played fifteen games.",
  McLaughlin:
    "The only other kicker to make the top 16 all three years, and the only one improving every season.",
  Pineiro:
    "K14 on points, but the sixth-best rate in the league. The ranking is measuring his availability, not his kicking.",
  Boswell:
    "Was the top kicker in football two years ago. Rank does not carry, but having been that good once is on the record.",
  Lutz: "Denver thins the air, which is the one environmental edge with real physics behind it rather than a correlation.",
  Smyth:
    "A dome and a starting job. There is no production here yet — this is a situation bet and should be priced as one.",
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
