import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InjuryTimeline, PracticeStrip, StatusPill } from "@/components/Injury";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { historyFor, rowsForTeam, teamsWithInjuries } from "@/lib/injuries";
import { getTeam, readableOn } from "@/lib/teams";

export function generateStaticParams() {
  return teamsWithInjuries().map((t) => ({ team: t.abbr.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ team: string }>;
}): Promise<Metadata> {
  const { team } = await params;
  const t = getTeam(team);
  return { title: t ? `${t.nickname} injuries` : "Team injuries" };
}

export default async function TeamInjuryPage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team: abbr } = await params;
  const team = getTeam(abbr);
  if (!team) notFound();

  const rows = rowsForTeam(team.abbr);
  const weeks = [...new Set(rows.map((r) => r.entry.week))].sort((a, b) => b - a);
  const players = [...new Set(rows.map((r) => r.entry.player_id))];

  return (
    <>
      {/* The team's colour pair is the page's identity. No logo needed. */}
      <header
        style={{
          background: team.primary,
          color: readableOn(team.primary),
          boxShadow: `inset 0 -6px 0 0 ${team.secondary}`,
        }}
      >
        <Container className="pt-28 pb-16 sm:pb-24">
          <Link
            href="/injuries"
            className="eyebrow hover:underline"
            style={{ color: "inherit", opacity: 0.75 }}
          >
            ← All injuries
          </Link>
          <h1
            className="mt-4 text-5xl sm:text-7xl uppercase tracking-wide leading-[0.9]"
            style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
          >
            {team.city}
            <br />
            {team.nickname}
          </h1>
          <p className="mt-4 text-sm" style={{ opacity: 0.8 }}>
            {team.conference} {team.division} · {players.length} players on the
            report across {weeks.length}{" "}
            {weeks.length === 1 ? "week" : "weeks"}
          </p>
        </Container>
      </header>

      <Container className="py-16 sm:py-24">
        {rows.length === 0 ? (
          <EmptyState
            title={`No designations filed for the ${team.nickname}.`}
            direction="Add rows to src/data/injuries.json with this team's abbreviation."
          />
        ) : (
          <>
            {/* ---------- Player histories ---------- */}
            <section>
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
              >
                Player history
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {players.map((id) => {
                  const first = rows.find((r) => r.entry.player_id === id)!;
                  const history = historyFor(id);
                  return (
                    <li
                      key={id}
                      className="rounded-lg border p-5"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <PlayerLink player={first.player} showTeam={false} />
                      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {first.entry.injury} · {history.length}{" "}
                        {history.length === 1 ? "week" : "weeks"} listed
                      </p>
                      <div className="mt-4">
                        <InjuryTimeline history={history} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ---------- Week by week ---------- */}
            <section className="mt-16">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
              >
                Week by week
              </h2>
              <div className="mt-6 flex flex-col gap-8">
                {weeks.map((week) => (
                  <div key={week}>
                    <h3 className="eyebrow mb-3">Week {week}</h3>
                    <div
                      className="overflow-x-auto rounded-lg border"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <table className="w-full text-sm">
                        <tbody>
                          {rows
                            .filter((r) => r.entry.week === week)
                            .map(({ entry, player }) => (
                              <tr
                                key={entry.player_id}
                                className="border-b last:border-b-0"
                                style={{ borderColor: "var(--border-subtle)" }}
                              >
                                <td className="px-4 py-3">
                                  <PlayerLink player={player} showTeam={false} />
                                </td>
                                <td className="px-4 py-3">{entry.injury}</td>
                                <td className="px-4 py-3">
                                  <PracticeStrip practice={entry.practice} />
                                </td>
                                <td className="px-4 py-3">
                                  <StatusPill status={entry.status} />
                                </td>
                                <td
                                  className="px-4 py-3 hidden md:table-cell"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {entry.note}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </Container>
    </>
  );
}
