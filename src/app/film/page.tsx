import type { Metadata } from "next";
import Link from "next/link";
import conceptsFile from "@/data/concepts.json";
import { Container } from "@/components/PageHeader";
import { FilmSample } from "@/components/FilmSample";
import { SectionHero } from "@/components/SectionHero";
import { TEAMS, readableOn } from "@/lib/teams";
import type { PlayConcept } from "@/lib/types";

export const metadata: Metadata = {
  title: "Film room",
  description: "Route concepts by team, drawn from scratch rather than clipped from a broadcast.",
};

interface ConceptsFile {
  schema_version: number;
  updated: string;
  data: (PlayConcept & { teams?: string[] })[];
}

const file = conceptsFile as unknown as ConceptsFile;

/**
 * The film room, currently a scaffold waiting on the operator's own concepts.
 *
 * **The index is built from the team list, not from the concepts.** It used to
 * be the other way round — a team appeared only because some concept named it —
 * which meant the page silently answered "which teams have I written about"
 * while looking like it answered "what does my team run". Nine cards showed and
 * twenty-three teams did not exist as far as a reader could tell. Driving it
 * from `TEAMS` makes the empty cards the honest part: every club is here, and
 * the ones with nothing in them are visibly waiting rather than missing.
 *
 * It also means adding a concept needs no change here. Tag it with a team in
 * `concepts.json` and the chip appears in that club's card.
 *
 * The concept library grid that sat below this was removed at the operator's
 * request — the machinery for it is untouched (`PlayDiagram`, the
 * `/film/[concept]` route and the `PlayConcept` shape all remain), so putting
 * it back is a layout job, not a rebuild.
 */
export default function FilmPage() {
  const concepts = file.data;

  // Team → concepts. Every club gets an entry whether or not anything is
  // tagged to it, which is what keeps the grid complete while it is empty.
  const byTeam = new Map<string, PlayConcept[]>();
  for (const team of TEAMS) byTeam.set(team.abbr, []);
  for (const concept of concepts) {
    for (const abbr of concept.teams ?? []) {
      byTeam.set(abbr, [...(byTeam.get(abbr) ?? []), concept]);
    }
  }

  // By city rather than abbreviation: a reader scanning thirty-two cards for
  // their own club is looking for "Green Bay", not "GB".
  const teams = [...TEAMS].sort((a, b) => a.city.localeCompare(b.city));
  const tagged = concepts.length;

  return (
    <>
      <SectionHero
        image="/img/bg/lombardi.jpg"
        objectPosition="center 40%"
        eyebrow="Concepts and diagrams"
        title="Film room"
        lede="A catalog of film analysis and breakdowns, and the future site of a work-in-progress statistical model."
      />

      <Container className="py-16 sm:py-24">
        {/* ---------- Sample breakdown ---------- */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
            >
              What a breakdown looks like
            </h2>
            <span
              className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                color: "var(--text-secondary)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              Sample
            </span>
          </div>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            One play, in the format every breakdown will use once the season
            starts: the alignment, the routes, and the situation the call has to
            be read against. This is a worked example of the layout rather than published analysis. The team cards below fill in with real ones week by week.
          </p>
          <div className="mt-6">
            <FilmSample />
          </div>
        </section>

        {/* ---------- By team ---------- */}
        <section className="mt-16">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
          >
            By team
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {tagged === 0 ? (
              <>
                Nothing is written up yet. Every concept on this page will be drawn
                from scratch and tagged to the teams that actually run it, so the
                cards below stay empty until there is something real to put in
                them.
              </>
            ) : (
              <>
                Which concepts each offense runs, and therefore which player
                profiles its passing game rewards.
              </>
            )}
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const list = byTeam.get(team.abbr) ?? [];
              return (
                <li
                  key={team.abbr}
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="px-4 py-2.5"
                    style={{
                      background: team.primary,
                      boxShadow: `inset 0 -3px 0 0 ${team.secondary}`,
                    }}
                  >
                    <span
                      className="text-base uppercase tracking-wide"
                      style={{
                        fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
                        color: readableOn(team.primary),
                      }}
                    >
                      {team.city} {team.nickname}
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      No concepts yet.
                    </p>
                  ) : (
                    <ul className="p-4 flex flex-wrap gap-2">
                      {list.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/film/${c.slug}`}
                            className="inline-block rounded px-2.5 py-1 text-sm font-semibold hover:underline"
                            style={{ boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </Container>
    </>
  );
}
