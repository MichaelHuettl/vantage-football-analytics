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
  searchParams: Promise<{ team?: string; category?: string }>;
}) {
  const params = await searchParams;
  const team = params.team?.toUpperCase();
  const category = params.category;

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

        <h2
          className="mt-10 text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {activeTeam ? `${activeTeam.city} ${activeTeam.nickname}` : "Latest"}
          {category ? ` · ${category}` : ""}
        </h2>

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
