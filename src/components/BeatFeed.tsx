import Link from "next/link";
import { PositionBadge } from "@/components/PlayerLink";
import { TeamChip } from "@/components/TeamChip";
import { getPlayer } from "@/lib/content";
import { TOPIC_BLURB } from "@/lib/beat";
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
      style={{ fontFamily: "var(--font-condensed)", background: TOPIC_TOKEN[topic] }}
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
      <time
        dateTime={post.timestamp}
        className="eyebrow w-20 shrink-0 pt-1"
      >
        {new Date(post.timestamp).toLocaleDateString("en-US", {
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
          {post.via !== post.author && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              via {post.via}
            </span>
          )}
        </div>

        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block leading-relaxed hover:underline"
        >
          {post.text}
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
