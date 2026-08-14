import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartFigure } from "@/components/ChartFigure";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerAvatar, PositionBadge } from "@/components/PlayerLink";
import { FreeAgentChip, TeamChip } from "@/components/TeamChip";
import { PLAYERS, getBye, getPlayer, getRankingList } from "@/lib/content";
import { getTeam } from "@/lib/teams";

export function generateStaticParams() {
  return PLAYERS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = getPlayer(id);
  return { title: player?.name ?? "Player" };
}

/**
 * §5.7: not one of the six tabs, but the connective tissue. Every player
 * reference on the site links here, so this page has to hold everything known
 * about him — ranking and note, charts, injury history, tagged news, film.
 */
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = getPlayer(id);
  if (!player) notFound();

  const team = player.team ? getTeam(player.team) : undefined;
  const list = getRankingList(player.position);
  const entry = list.entries.find((e) => e.player_id === player.id);
  const rank = entry?.rank;
  const bye = getBye(player.team);

  return (
    <>
      <div
        className="border-b"
        style={{
          background: "var(--surface-inverse)",
          borderColor: "var(--border-inverse)",
        }}
      >
        <Container className="py-10">
          <div className="flex flex-wrap items-center gap-5">
            <PlayerAvatar
              name={player.name}
              position={player.position}
              size={72}
            />
            <div>
              <h1
                className="text-4xl sm:text-5xl uppercase tracking-wide leading-none"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-on-inverse)",
                }}
              >
                {player.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {player.team ? (
                  <TeamChip abbr={player.team} />
                ) : player.status === "fa" ? (
                  <FreeAgentChip />
                ) : null}
                <PositionBadge position={player.position} />
                <span
                  className="text-sm"
                  style={{ color: "var(--color-ink-400)" }}
                >
                  {team
                    ? `${team.city} ${team.nickname}`
                    : player.team ?? (player.status === "fa" ? "Free agent" : "")}
                  {player.age ? ` · Age ${player.age}` : ""}
                  {player.draft ? ` · ${player.draft}` : ""}
                </span>
              </div>
            </div>

            {rank !== undefined && (
              <div className="ml-auto text-right">
                <p className="eyebrow">{list.format} rank</p>
                <p
                  className="text-5xl tnum leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-vantage-amber)",
                  }}
                >
                  {player.position}
                  {rank}
                </p>
                {bye && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--color-ink-400)" }}
                  >
                    Bye week {bye}
                  </p>
                )}
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div>
            {entry?.note && (
              <section className="mb-10">
                <h2 className="eyebrow mb-2">The note</h2>
                <p className="text-xl leading-relaxed">{entry.note}</p>
              </section>
            )}

            <section>
              <h2
                className="text-2xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Opportunity
              </h2>
              <ChartFigure
                src={entry?.chart || undefined}
                featured
                caption={`${player.name}'s opportunity profile. Replace this caption with the single takeaway once the chart is in.`}
              />
            </section>

            <section className="mt-10">
              <h2
                className="text-2xl uppercase tracking-wide mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Film
              </h2>
              <EmptyState
                title="No diagrams for this player yet."
                direction="Diagrams featuring him will appear here once added to the film data."
              />
            </section>
          </div>

          <aside className="flex flex-col gap-10">
            <section>
              <h2
                className="text-2xl uppercase tracking-wide mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Injury
              </h2>
              <EmptyState
                title="No designation on file."
                direction="Practice participation appears here during the season."
              />
            </section>

            <section>
              <h2
                className="text-2xl uppercase tracking-wide mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                News
              </h2>
              <EmptyState
                title="No tagged items."
                direction="Headlines tagged to this player will collect here."
              />
            </section>
          </aside>
        </div>
      </Container>
    </>
  );
}
