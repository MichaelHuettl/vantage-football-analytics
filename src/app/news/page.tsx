import type { Metadata } from "next";
import Link from "next/link";
import newsFile from "@/data/news.json";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { SectionHero } from "@/components/SectionHero";
import { TeamChip } from "@/components/TeamChip";
import { getPlayer } from "@/lib/content";
import { getTeam } from "@/lib/teams";
import { BEAT_POSTS, BEAT_TOPICS, BEAT_UPDATED, CURATED_COUNT, TOPIC_BLURB } from "@/lib/beat";
import { BeatItem } from "@/components/BeatFeed";
import type { BeatTopic } from "@/lib/beat";
import type { NewsEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "News",
  description:
    "Headlines tagged to players and teams. Source, timestamp, and a link out.",
};

interface NewsFile {
  updated: string;
  data: NewsEntry[];
}

const file = newsFile as unknown as NewsFile;

const CATEGORIES = [
  "injury",
  "transaction",
  "practice",
  "camp",
  "breaking",
] as const;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; category?: string; topic?: string; beatTeam?: string }>;
}) {
  const params = await searchParams;
  const team = params.team?.toUpperCase();
  const category = params.category;
  const topic = BEAT_TOPICS.includes(params.topic as BeatTopic)
    ? (params.topic as BeatTopic)
    : undefined;

  // Its own team param: the two sections cover different periods, so filtering
  // one to a team should not silently filter the other.
  const beatTeam = params.beatTeam?.toUpperCase();
  const beat = BEAT_POSTS.filter(
    (p) =>
      (!topic || p.topic === topic) &&
      (!beatTeam || (p.team_abbrs ?? []).includes(beatTeam)),
  );
  const beatTeams = [
    ...new Set(BEAT_POSTS.flatMap((p) => p.team_abbrs ?? [])),
  ].sort();
  const beatQ = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { topic, beatTeam, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const str = q.toString();
    return str ? `/news?${str}` : "/news";
  };

  const all = [...file.data].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  const items = all.filter(
    (n) =>
      (!team || (n.team_abbrs ?? []).includes(team)) &&
      (!category || n.category === category),
  );

  const teams = [...new Set(all.flatMap((n) => n.team_abbrs ?? []))].sort();
  const activeTeam = team ? getTeam(team) : undefined;

  return (
    <>
      <SectionHero
        image="/img/bg/lambeau.jpg"
        objectPosition="center 38%"
        eyebrow="What happened"
        title="News"
        lede="Headline, source, and timestamp, tagged to the players it affects. Follow the link for the article — no body text is reproduced here."
      />

      <Container className="py-10">
        {/* ==================== Beat reports ==================== */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Beat reports
              </h2>
              <span
                className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)",
                  background: "var(--text-primary)",
                  color: "var(--surface-page)",
                }}
              >
                Preseason
              </span>
              <span
                className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)",
                  color: "var(--text-secondary)",
                  boxShadow: "inset 0 0 0 1px var(--border-strong)",
                }}
              >
                From X
              </span>
            </div>
            <DataFreshness updated={BEAT_UPDATED} label="Beat feed" staleAfterDays={2} />
          </div>

          <p className="mt-2 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            Camp and preseason reporting from team beat writers, covering OTAs
            in June through to the preseason games. Live posts are filtered to
            what changes a decision — role, scheme, availability and roster
            moves — rather than every rep of every practice. The {CURATED_COUNT}{" "}
            June and July entries were collected by hand and are shown as
            gathered. This section winds down once the season starts.
          </p>

          <nav aria-label="Topic" className="mt-5">
            <ul className="flex flex-wrap items-center gap-2">
              <li className="eyebrow mr-1">Topic</li>
              <li>
                <FilterLink href={beatQ({ topic: undefined })} active={!topic}>
                  All
                </FilterLink>
              </li>
              {BEAT_TOPICS.map((t) => (
                <li key={t} title={TOPIC_BLURB[t]}>
                  <FilterLink href={beatQ({ topic: t })} active={t === topic}>
                    {t}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Beat team" className="mt-3">
            <ul className="flex flex-wrap items-center gap-2">
              <li className="eyebrow mr-1">Team</li>
              <li>
                <FilterLink href={beatQ({ beatTeam: undefined })} active={!beatTeam}>
                  All
                </FilterLink>
              </li>
              {beatTeams.map((abbr) => (
                <li key={abbr}>
                  <Link
                    href={beatQ({ beatTeam: abbr })}
                    aria-current={abbr === beatTeam ? "page" : undefined}
                    className="inline-flex items-center rounded p-0.5"
                    style={{
                      boxShadow:
                        abbr === beatTeam
                          ? "inset 0 0 0 2px var(--color-vantage-amber)"
                          : "none",
                    }}
                  >
                    <TeamChip abbr={abbr} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {beat.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No beat reports match that filter."
                direction="Clear the topic or team filter to see the full feed."
              />
            </div>
          ) : (
            <ul className="mt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              {beat.map((post) => (
                <li key={post.id} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <BeatItem post={post} />
                </li>
              ))}
            </ul>
          )}
        </section>

      </Container>

      {/* A ruled break, the same device that separates sections on the home
          page. The two feeds cover different periods and should not read as
          one continuous list. */}
      <div className="yard-rule" />

      <Container className="py-14">
        {/* ==================== Headline feed ==================== */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Headlines
          </h2>
          <span
            className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-condensed)",
              background: "var(--text-primary)",
              color: "var(--surface-page)",
            }}
          >
            Season long
          </span>
        </div>
        <p className="mb-6 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Published reporting from national outlets, running now and through the
          season. Headline, source and timestamp only — follow the link to read
          the piece.
        </p>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-4">
            <nav aria-label="Team">
              <ul className="flex flex-wrap items-center gap-2">
                <li className="eyebrow mr-1">Team</li>
                <li>
                  <FilterLink
                    href={category ? `/news?category=${category}` : "/news"}
                    active={!team}
                  >
                    All
                  </FilterLink>
                </li>
                {teams.map((abbr) => (
                  <li key={abbr}>
                    <Link
                      href={`/news?team=${abbr}${category ? `&category=${category}` : ""}`}
                      aria-current={abbr === team ? "page" : undefined}
                      className="inline-flex items-center rounded p-0.5"
                      style={{
                        boxShadow:
                          abbr === team
                            ? "inset 0 0 0 2px var(--color-vantage-amber)"
                            : "none",
                      }}
                    >
                      <TeamChip abbr={abbr} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Category">
              <ul className="flex flex-wrap items-center gap-2">
                <li className="eyebrow mr-1">Type</li>
                <li>
                  <FilterLink
                    href={team ? `/news?team=${team}` : "/news"}
                    active={!category}
                  >
                    All
                  </FilterLink>
                </li>
                {CATEGORIES.map((c) => (
                  <li key={c}>
                    <FilterLink
                      href={`/news?category=${c}${team ? `&team=${team}` : ""}`}
                      active={c === category}
                    >
                      {c}
                    </FilterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <DataFreshness updated={file.updated} label="Feed updated" staleAfterDays={2} />
        </div>

        <p className="mt-8 eyebrow">
          {activeTeam ? `${activeTeam.city} ${activeTeam.nickname}` : "Latest"}
          {category ? ` · ${category}` : ""}
        </p>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Nothing matches that filter."
              direction="Clear the team or type filter to see the full feed."
            />
          </div>
        ) : (
          <ul
            className="mt-6 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <article className="flex flex-wrap items-start gap-x-6 gap-y-3 py-5">
                  <time
                    dateTime={item.timestamp}
                    className="eyebrow w-24 shrink-0 pt-1"
                  >
                    {new Date(item.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>

                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold hover:underline"
                    >
                      {item.headline}
                    </a>
                    <p
                      className="mt-1.5 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.source} ·{" "}
                      <span className="uppercase">{item.category}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {(item.team_abbrs ?? []).map((abbr) => (
                        <TeamChip key={abbr} abbr={abbr} size="sm" />
                      ))}
                      {(item.player_ids ?? []).flatMap((id) => {
                        const p = getPlayer(id);
                        return p ? (
                          <PlayerLink key={id} player={p} showTeam={false} />
                        ) : (
                          []
                        );
                      })}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="inline-block rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
      style={{
        fontFamily: "var(--font-condensed)",
        background: active ? "var(--text-primary)" : "transparent",
        color: active ? "var(--surface-page)" : "var(--text-secondary)",
        boxShadow: active ? undefined : "inset 0 0 0 1px var(--border-strong)",
      }}
    >
      {children}
    </Link>
  );
}
