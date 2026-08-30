import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EmptyState } from "@/components/PageHeader";
import { FilterLink, TeamFilterLink } from "@/components/FilterLink";
import { TeamChip } from "@/components/TeamChip";
import { relativeAge, shortDate } from "@/lib/dates";
import type { LiveTeamFeed } from "@/lib/live-team-feed";

/**
 * All 32 club newsrooms, pulled live.
 *
 * **The label is doing real work.** This is club PR, not beat reporting, and
 * calling it the latter would claim a byline it does not have. A team will
 * announce that a player was activated; it will not tell you he looked a step
 * slow. The heading, the badge and the standfirst all say "clubs" so a reader
 * weighs it accordingly, and the beat archive below keeps its own name.
 *
 * Headline, source, timestamp and link only, straight through from each club's
 * own RSS. No body text (§2).
 */
export function TeamNewsroom({
  feed,
  team,
  href,
  limit = 40,
}: {
  feed: LiveTeamFeed;
  team?: string;
  href: (over: { teamNews?: string }) => string;
  limit?: number;
}) {
  const teams = [...new Set(feed.items.map((i) => i.team_abbr))].sort();
  const shown = feed.items
    .filter((i) => !team || i.team_abbr === team)
    .slice(0, limit);

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-display)",
              fontStretch: "var(--stretch-display)",
            }}
          >
            Around the clubs
          </h2>
          <span
            className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-condensed)",
              fontStretch: "var(--stretch-condensed)",
              background: feed.live ? "var(--text-primary)" : "var(--surface-sunken)",
              color: feed.live ? "var(--surface-page)" : "var(--text-muted)",
              boxShadow: feed.live ? undefined : "inset 0 0 0 1px var(--border-strong)",
            }}
          >
            {feed.live ? "Live" : "No answer"}
          </span>
          <AutoRefresh />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {feed.answered} of 32 clubs answered
        </p>
      </div>

      <p className="mt-2 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Every club&rsquo;s own newsroom, pulled as you load the page. These are
        official team sources rather than beat writers, so read them as
        announcements: a club will tell you who was activated, not who looked a
        step slow. Follow a headline for the story.
      </p>

      {/* §10 wants a pipeline failure visible rather than the page quietly
          serving less than it claims. */}
      {feed.failures.length > 0 && (
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
          No answer this render from {feed.failures.join(", ")}.
        </p>
      )}

      {teams.length > 0 && (
        <nav aria-label="Club" className="mt-5">
          <ul className="flex flex-wrap items-center gap-2">
            <li className="eyebrow mr-1">Club</li>
            <li>
              <FilterLink href={href({ teamNews: undefined })} active={!team}>
                All
              </FilterLink>
            </li>
            {teams.map((abbr) => (
              <li key={abbr}>
                <TeamFilterLink href={href({ teamNews: abbr })} active={abbr === team}>
                  <TeamChip abbr={abbr} />
                </TeamFilterLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              feed.live
                ? "Nothing from that club right now."
                : "No club answered on this render."
            }
            direction={
              feed.live
                ? "Pick another club, or choose All to see every newsroom."
                : "The feeds are polled again on the next load; nothing needs running by hand."
            }
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col">
          {shown.map((item) => (
            <li
              key={item.id}
              className="border-t py-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <TeamChip abbr={item.team_abbr} size="sm" />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {item.headline}
                </a>
              </div>
              <p
                className="mt-1 text-xs uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontStretch: "var(--stretch-condensed)",
                  color: "var(--text-muted)",
                }}
              >
                {item.source} · {relativeAge(new Date(item.timestamp)) ?? shortDate(item.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {feed.items.length > shown.length && !team && (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Showing {shown.length} of {feed.items.length}. Filter by club to see a
          single newsroom in full.
        </p>
      )}

      <p className="mt-6 text-sm">
        <Link href="/injuries" className="font-semibold underline">
          The injury tracker
        </Link>{" "}
        <span style={{ color: "var(--text-secondary)" }}>
          carries the same clubs&rsquo; designations, reconciled against the wire.
        </span>
      </p>
    </section>
  );
}
