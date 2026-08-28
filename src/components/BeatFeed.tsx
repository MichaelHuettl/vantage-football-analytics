import Link from "next/link";
import { PositionBadge } from "@/components/PlayerLink";
import { TeamChip } from "@/components/TeamChip";
import { getPlayer } from "@/lib/content";
import { TOPIC_BLURB, splitOnTakeaway } from "@/lib/beat";
import type { BeatPost, BeatTopic } from "@/lib/beat";

const TOPIC_TOKEN: Record<BeatTopic, string> = {
  Injury: "var(--color-status-out)",
  Role: "var(--color-pos-qb)",
  Scheme: "var(--color-pos-te)",
  Transaction: "var(--color-pos-rb)",
  Evaluation: "var(--color-ink-600)",
};

export function TopicTag({ topic }: { topic: BeatTopic }) {
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center rounded px-1.5 text-xs font-bold uppercase tracking-wider text-white"
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", background: TOPIC_TOKEN[topic] }}
      title={TOPIC_BLURB[topic]}
    >
      {topic}
    </span>
  );
}

/**
 * A beat post.
 *
 * The reporter's handle leads rather than the account it was reshared through:
 * @32BeatWriters is a conduit, and the credit belongs to whoever filed it. The
 * text is quoted rather than paraphrased, and every post links to the original
 * on X, because a post is short enough that the text is the headline (§2).
 */
export function BeatItem({ post }: { post: BeatPost }) {
  const players = (post.player_ids ?? []).flatMap((id) => {
    const p = getPlayer(id);
    return p ? [p] : [];
  });

  return (
    <article className="flex flex-wrap items-start gap-x-5 gap-y-3 py-5">
      {/* An approximate post carried a relative stamp ("23h") on a screenshot
          taken at an unrecorded moment, so the day is genuinely unknown. It
          says so rather than showing a date it cannot support. */}
      <time
        dateTime={post.approx_date ? post.timestamp.slice(0, 7) : post.timestamp}
        className="eyebrow w-20 shrink-0 pt-1"
        title={post.approx_date ? "Exact date unknown" : undefined}
      >
        {post.approx_date
          ? "Jun–Jul"
          : new Date(post.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
      </time>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TopicTag topic={post.topic} />
          <a
            href={`https://x.com/${post.author.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline"
          >
            {post.author}
          </a>
          {post.curated ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              collected
            </span>
          ) : (
            post.via !== post.author && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                via {post.via}
              </span>
            )
          )}
        </div>

        {/* The takeaway is marked rather than the post being trimmed: the
            reader's eye lands on the meaning, and the surrounding text stays
            there as context. Amber is correct here — §7 reserves it for the
            highlighted thing on screen, and once per post is exactly that. */}
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block"
        >
          {(() => {
            const { before, mark, after } = splitOnTakeaway(post);
            if (!mark) return <span>{post.text}</span>;
            return (
              <>
                <span style={{ color: "var(--text-muted)" }}>{before}</span>
                <mark
                  className="rounded px-1 py-0.5 font-medium"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-vantage-amber) 26%, transparent)",
                    color: "var(--text-primary)",
                    boxShadow:
                      "inset 0 -2px 0 0 color-mix(in oklab, var(--color-vantage-amber) 70%, transparent)",
                  }}
                >
                  {mark}
                </mark>
                <span style={{ color: "var(--text-muted)" }}>{after}</span>
              </>
            );
          })()}
        </a>

        {(players.length > 0 || (post.team_abbrs ?? []).length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(post.team_abbrs ?? []).map((abbr) => (
              <TeamChip key={abbr} abbr={abbr} size="sm" />
            ))}
            {players.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                <PositionBadge position={p.position} />
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
