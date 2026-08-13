import Image from "next/image";
import Link from "next/link";
import { TeamChip } from "./TeamChip";
import type { Player, Position } from "@/lib/types";

const POSITION_TOKEN: Record<Position, string> = {
  QB: "var(--color-pos-qb)",
  RB: "var(--color-pos-rb)",
  WR: "var(--color-pos-wr)",
  TE: "var(--color-pos-te)",
  K: "var(--color-pos-k)",
  DST: "var(--color-pos-dst)",
};

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A player's photo where one exists, initials in a position-coloured shape
 * where it doesn't. The initials treatment is a designed fallback rather than
 * a broken-image state, so a roster with partial photography still looks
 * deliberate.
 */
export function PlayerAvatar({
  name,
  position,
  photo,
  size = 32,
}: {
  name: string;
  position: Position;
  photo?: string;
  size?: number;
}) {
  if (photo) {
    return (
      <span
        aria-hidden="true"
        className="relative inline-block shrink-0 overflow-hidden rounded"
        style={{
          width: size,
          height: size,
          background: POSITION_TOKEN[position],
        }}
      >
        <Image
          src={photo}
          alt=""
          fill
          sizes={`${size}px`}
          style={{ objectFit: "cover", objectPosition: "center 18%" }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded font-bold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontFamily: "var(--font-condensed)",
        background: POSITION_TOKEN[position],
      }}
    >
      {initials(name)}
    </span>
  );
}

export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className="inline-flex h-5 items-center rounded px-1.5 text-xs font-bold uppercase text-white"
      style={{
        fontFamily: "var(--font-condensed)",
        background: POSITION_TOKEN[position],
      }}
    >
      {position}
    </span>
  );
}

/**
 * Every player reference anywhere on the site routes through here. §5.7 makes
 * player pages the connective tissue, which only works if nothing bypasses it.
 */
export function PlayerLink({
  player,
  showTeam = true,
  showAvatar = true,
}: {
  player: Player;
  showTeam?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group inline-flex items-center gap-2 min-w-0"
    >
      {showAvatar && (
        <PlayerAvatar
          name={player.name}
          position={player.position}
          photo={player.photo}
          size={36}
        />
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold group-hover:underline">
          {player.name}
        </span>
        {showTeam && (
          <span className="flex items-center gap-1.5 mt-0.5">
            {player.team && <TeamChip abbr={player.team} size="sm" />}
            <span
              className="text-xs font-semibold uppercase"
              style={{
                fontFamily: "var(--font-condensed)",
                color: "var(--text-muted)",
              }}
            >
              {player.position}
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}
