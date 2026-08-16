import Image from "next/image";
import Link from "next/link";
import { TeamChip } from "@/components/TeamChip";
import { PLAYERS } from "@/lib/content";
import { KICKERS, KICKER_SOURCE } from "@/lib/kickers";
import { teamByName } from "@/lib/teams";
import type { Advantage, ScoringRow } from "@/lib/kickers";

/**
 * The kicker page.
 *
 * A transport of the workbook's kicker block: which offenses kick, who scored,
 * the situational edges, and the operator's own shortlist in his own words.
 *
 * One thing computed and deliberately left off the page: how little either
 * ranked list persists year to year. The numbers are in `kicker-charts.json`
 * and the decision is recorded in docs/STATE.md, so a later session can render
 * them in minutes rather than rediscovering them.
 */
export function KickerAnalysis() {
  const { fg_attempts, scoring, advantages, favorites, value_picks, divisions_note } =
    KICKERS;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The evidence
        </h2>
        <span className="eyebrow">2021&ndash;2025</span>
      </div>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        A kicker scores when his offense stalls in range. So the useful question
        is not who kicks well &mdash; nearly all of them do &mdash; but whose
        offense will hand him the attempts.
      </p>

      {/* ==================== 1. Team FG attempts ==================== */}
      <Block n={1} title="Which offenses kick">
        <p className="max-w-3xl">
          Field goal attempts by team, ranked to sixteen, five seasons deep. A
          kicker inherits this column and almost nothing else &mdash; his own
          accuracy moves his scoring far less than the number of times he is
          sent out.
        </p>
        <RankGrid
          years={fg_attempts.years}
          rows={fg_attempts.top}
          heading="Top 16"
          startRank={1}
        />
        <RankGrid
          years={fg_attempts.years}
          rows={fg_attempts.bottom}
          heading="Bottom 5"
          startRank={28}
          muted
        />
      </Block>

      {/* ======================= 2. Scoring ========================== */}
      <Block n={2} title="Who actually scored">
        <p className="max-w-3xl">
          The top sixteen kickers of each of the last three seasons, with total
          points and points per game. Per game is the column to read: a kicker
          who missed three weeks can sit low on total points and still have been
          the better start every week he played.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {scoring.years.map((y) => (
            <ScoringTable key={y} year={y} rows={scoring.rows[y]} />
          ))}
        </div>
      </Block>

      {/* ====================== 3. Advantages ======================== */}
      <Block n={3} title="Where the edges are">
        <p className="max-w-3xl">
          The situational lists: who kicks indoors, whose offense settles for
          three, and who has the leg to be sent out from distance. A kicker
          appearing on several of these is not a coincidence &mdash; it is the
          same offense showing up in different columns.
        </p>
        <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {advantages.map((a) => (
            <AdvantageList key={a.label} advantage={a} />
          ))}
        </div>
        {divisions_note && (
          <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {divisions_note}
          </p>
        )}
      </Block>

      {/* ======================= 4. Favorites ======================== */}
      <Block n={4} title="The shortlist">
        <p className="max-w-3xl">
          Three kickers, and the case for each in the operator&rsquo;s own
          words.
        </p>
        <ul className="mt-6 flex max-w-3xl flex-col gap-4">
          {favorites.map((f) => (
            <li
              key={f.name}
              className="flex items-start gap-4 rounded-lg border p-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <Headshot name={f.name} size={56} />
              <div className="min-w-0">
                <p className="font-semibold">{resolve(f.name)?.name ?? f.name}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {f.reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Block>

      {/* ===================== 5. Value picks ======================== */}
      <Block n={5} title="Value picks">
        <p className="max-w-3xl">
          Later kickers worth the last pick rather than an early one. These are
          bets on situation rather than on record &mdash; a dome, a stalling
          offense, a leg &mdash; and two of them have yet to finish a season
          inside the top sixteen. That is the bet, stated plainly rather than
          dressed up as a projection.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-4">
          {value_picks.map((name) => (
            <li key={name} className="w-[76px] text-center">
              <Headshot name={name} size={56} centered />
              <span className="mt-1.5 block text-xs font-semibold leading-tight">
                {resolve(name)?.name ?? name}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <p className="mt-12 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
        {KICKER_SOURCE}
      </p>
    </section>
  );
}

/** Kickers are written by surname in the sheet. Scoped to the position, which
 *  is what keeps a surname from matching someone at another one. */
function resolve(surname: string) {
  const s = surname.trim().toLowerCase().replace(/[^a-z]/g, "");
  return PLAYERS.filter((p) => p.position === "K").find(
    (p) =>
      p.name
        .split(" ")
        .slice(1)
        .join("")
        .toLowerCase()
        .replace(/[^a-z]/g, "") === s,
  );
}

function Headshot({
  name,
  size,
  centered = false,
}: {
  name: string;
  size: number;
  centered?: boolean;
}) {
  const player = resolve(name);
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full ${centered ? "mx-auto" : ""}`}
      style={{ width: size, height: size, background: "var(--surface-sunken)" }}
    >
      {player ? (
        <Image
          src={`/img/headshots/${player.id}.png`}
          alt=""
          fill
          sizes={`${size}px`}
          style={{ objectFit: "cover", objectPosition: "top center" }}
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** A rank-by-year grid of teams, the shape the workbook keeps it in. */
function RankGrid({
  years,
  rows,
  heading,
  startRank,
  muted = false,
}: {
  years: string[];
  rows: Record<string, string[]>;
  heading: string;
  startRank: number;
  muted?: boolean;
}) {
  const depth = Math.max(...years.map((y) => rows[y]?.length ?? 0));
  return (
    <div className="mt-6">
      <p className="eyebrow mb-2">{heading}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 620 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <th
                scope="col"
                className="w-10 px-2 py-2 text-left text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                #
              </th>
              {years.map((y) => (
                <th
                  key={y}
                  scope="col"
                  className="px-2 py-2 text-left text-xs font-bold uppercase tracking-wider tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: depth }, (_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-2 py-1.5 tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {startRank + i}
                </td>
                {years.map((y) => {
                  const team = rows[y]?.[i];
                  const t = team ? teamByName(team) : undefined;
                  return (
                    <td key={y} className="px-2 py-1.5">
                      {team ? (
                        <span className="flex items-center gap-2">
                          {t && <TeamChip abbr={t.abbr} size="sm" />}
                          <span style={muted ? { color: "var(--text-muted)" } : undefined}>
                            {team}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoringTable({ year, rows }: { year: string; rows: ScoringRow[] }) {
  return (
    <div>
      <p className="eyebrow mb-2">{year}</p>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <Th className="w-8">#</Th>
            <Th>Kicker</Th>
            <Th className="text-right">Pts</Th>
            <Th className="text-right">/G</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const player = resolve(r.name);
            return (
              <tr key={r.rank} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-2 py-1.5 tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {r.rank}
                </td>
                <td className="px-2 py-1.5 font-semibold">
                  {player ? (
                    <Link href={`/players/${player.id}`} className="hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                </td>
                <td className="px-2 py-1.5 text-right tnum">{r.fpts}</td>
                <td className="px-2 py-1.5 text-right font-semibold tnum">{r.ppg}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdvantageList({ advantage }: { advantage: Advantage }) {
  const entry = (name: string) => {
    if (advantage.kind === "team") {
      const t = teamByName(name);
      return (
        <span className="flex items-center gap-2">
          {t && <TeamChip abbr={t.abbr} size="sm" />}
          {name}
        </span>
      );
    }
    const player = resolve(name);
    return player ? (
      <Link href={`/players/${player.id}`} className="hover:underline">
        {player.name}
      </Link>
    ) : (
      <span>{name}</span>
    );
  };

  return (
    <div>
      <h4 className="eyebrow mb-2">{advantage.label}</h4>
      {advantage.groups ? (
        <div className="flex flex-col gap-3">
          {advantage.groups.map((gr) => (
            <div key={gr.label}>
              <p
                className="text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {gr.label}
              </p>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {gr.entries.map((e) => (
                  <li key={e}>{entry(e)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {advantage.entries.map((e) => (
            <li key={e}>{entry(e)}</li>
          ))}
        </ul>
      )}
    </div>
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
      className={`px-2 py-2 text-left text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}

function Block({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h3 className="flex items-baseline gap-3">
        <span
          className="text-sm tnum"
          style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <span
          className="text-2xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </span>
      </h3>
      {/* Prose is capped for reading; the tables under it are not, so the
          width lives on the paragraphs rather than on this wrapper. */}
      <div className="mt-4 flex flex-col gap-4 leading-relaxed">{children}</div>
    </section>
  );
}
