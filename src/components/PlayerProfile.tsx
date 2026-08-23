import { TeamChip } from "@/components/TeamChip";
import {
  HEADLINE_KEYS, fantasyRange, formatStat, latestSeason,
} from "@/lib/profiles";
import type { PlayerProfile as Profile } from "@/lib/profiles";

/**
 * A player's recorded season, written the way an analyst would open a report.
 *
 * Four movements: what he did, what share of his offence that was, what the
 * tracking data says about how he did it, and how it has moved year to year.
 * Volume first because volume is what a ranking is usually arguing about, then
 * the rate stats that decide whether the volume was earned.
 *
 * Nothing here is projected. Every figure is something that happened in a game.
 */
export function PlayerProfileBody({ profile }: { profile: Profile }) {
  const season = latestSeason(profile);
  if (!season) return null;
  const headline = HEADLINE_KEYS[profile.position].filter((k) => k in season.stats);

  return (
    <div className="flex flex-col gap-14">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2
            className="text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The {season.season} season
          </h2>
          <p className="eyebrow" style={{ color: "var(--text-muted)" }}>
            {season.team && `${season.team} · `}
            {season.games !== null && `${season.games.toFixed(0)} games`}
            {profile.snap_share_2025 !== null &&
              ` · ${(profile.snap_share_2025 * 100).toFixed(0)}% of snaps`}
          </p>
        </div>

        <ul className="mt-6 grid gap-px sm:grid-cols-3" style={{ background: "var(--border-subtle)" }}>
          {headline.map((k) => (
            <li key={k} className="p-4 sm:p-5" style={{ background: "var(--surface-page)" }}>
              <span
                className="block leading-none tnum"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3.4vw, 2.5rem)" }}
              >
                {formatStat(k, season.stats[k], profile.decimals[k] ?? 1)}
              </span>
              <span className="eyebrow mt-2 block" style={{ color: "var(--text-muted)" }}>
                {profile.labels[k] ?? k}
              </span>
            </li>
          ))}
        </ul>

        {/* Everything else the season file carries, for a reader who wants it. */}
        <details className="mt-4">
          <summary className="eyebrow cursor-pointer" style={{ color: "var(--text-muted)" }}>
            Every figure on file for {season.season}
          </summary>
          <dl className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(season.stats).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                <dt style={{ color: "var(--text-secondary)" }}>{profile.labels[k] ?? k}</dt>
                <dd className="tnum">{formatStat(k, v, profile.decimals[k] ?? 1)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      {Object.keys(profile.next_gen).length > 0 && (
        <section>
          <h2
            className="text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What the tracking data says
          </h2>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Next Gen Stats measures the things a box score cannot: how much room he was given, how far the ball actually traveled, what he did with the yards
            nobody blocked for him.
          </p>
          <div className="mt-5 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(profile.next_gen).map(([group, vals]) => (
              <div key={group}>
                <p className="eyebrow capitalize">{group}</p>
                <dl className="mt-2 flex flex-col gap-1.5">
                  {Object.entries(vals).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                      <dt style={{ color: "var(--text-secondary)" }}>{k}</dt>
                      <dd className="tnum">{v.toFixed(2)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.seasons.length > 1 && <SeasonTrend profile={profile} />}
      {profile.game_log.length > 0 && <GameLog profile={profile} />}
    </div>
  );
}

/**
 * Year over year, on the figures that lead the page.
 *
 * A single season is an anecdote. The reason this table sits under the headline
 * numbers is that the interesting question about almost any ranked player is
 * whether last year was the trend or the exception.
 */
function SeasonTrend({ profile }: { profile: Profile }) {
  const keys = HEADLINE_KEYS[profile.position].filter((k) =>
    profile.seasons.some((s) => k in s.stats),
  );
  const seasons = profile.seasons.slice(-6);
  return (
    <section>
      <h2 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        Year to year
      </h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Season</th>
              <th className="py-2 text-left">Team</th>
              <th className="py-2 text-right">G</th>
              {keys.map((k) => (
                <th key={k} className="py-2 text-right">{profile.labels[k] ?? k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.season} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2 tnum">{s.season}</td>
                <td className="py-2">{s.team && <TeamChip abbr={s.team} size="sm" />}</td>
                <td className="py-2 text-right tnum">{s.games?.toFixed(0) ?? "n/a"}</td>
                {keys.map((k) => (
                  <td key={k} className="py-2 text-right tnum">
                    {k in s.stats
                      ? formatStat(k, s.stats[k], profile.decimals[k] ?? 1)
                      : <span style={{ color: "var(--text-muted)" }}>n/a</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Week by week, with the bar showing how the season was distributed.
 *
 * The distribution is the point. Two backs can finish on the same total, one by
 * being useful every week and one on two enormous afternoons, and only the
 * second is a problem for the person setting a lineup.
 */
function GameLog({ profile }: { profile: Profile }) {
  const range = fantasyRange(profile);
  const isPasser = profile.position === "QB";
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Week by week
        </h2>
        <p className="eyebrow" style={{ color: "var(--text-muted)" }}>
          PPR scoring · {profile.game_log.length} games
        </p>
      </div>
      <ul className="mt-5 flex flex-col gap-1.5">
        {profile.game_log.map((g) => {
          const pts = g.fantasy_ppr ?? 0;
          const width = range && range.max > 0 ? Math.max(0, (pts / range.max) * 100) : 0;
          const line = isPasser
            ? `${g.pass_yards?.toFixed(0) ?? 0} pass yds · ${g.pass_td?.toFixed(0) ?? 0} TD`
            : `${g.targets ? `${g.targets.toFixed(0)} tgt · ` : ""}${
                g.rec_yards ? `${g.rec_yards.toFixed(0)} rec yds · ` : ""
              }${g.carries ? `${g.carries.toFixed(0)} car · ` : ""}${
                g.rush_yards ? `${g.rush_yards.toFixed(0)} rush yds` : ""
              }`.replace(/ · $/, "");
          return (
            <li key={g.week} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="w-12 shrink-0 eyebrow" style={{ color: "var(--text-muted)" }}>
                Wk {g.week}
              </span>
              <span className="w-12 shrink-0">
                {g.opponent && <TeamChip abbr={g.opponent} size="sm" />}
              </span>
              <span
                className="relative h-3.5 flex-1 overflow-hidden rounded-sm"
                style={{ background: "var(--border-subtle)" }}
              >
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${width}%`,
                    background:
                      range && pts === range.max
                        ? "var(--color-vantage-amber)"
                        : "var(--border-strong)",
                  }}
                />
              </span>
              <span className="w-14 shrink-0 text-right tnum">{pts.toFixed(1)}</span>
              <span
                className="w-full text-xs sm:w-auto sm:flex-1"
                style={{ color: "var(--text-muted)" }}
              >
                {line || "did not record a touch"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
