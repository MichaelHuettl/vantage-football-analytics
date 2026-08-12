import type { Metadata } from "next";
import Link from "next/link";
import conceptsFile from "@/data/concepts.json";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayDiagram } from "@/components/PlayDiagram";
import { FramedPhoto } from "@/components/FramedPhoto";
import { TeamChip } from "@/components/TeamChip";
import { getTeam, readableOn } from "@/lib/teams";
import type { PlayConcept } from "@/lib/types";

export const metadata: Metadata = {
  title: "Film room",
  description:
    "Route concepts drawn from scratch, organised by concept and by team.",
};

interface ConceptsFile {
  schema_version: number;
  updated: string;
  data: (PlayConcept & { teams?: string[] })[];
}

const file = conceptsFile as unknown as ConceptsFile;

export default function FilmPage() {
  const concepts = file.data;

  // Team → concepts, so a reader can arrive looking for their own team.
  const byTeam = new Map<string, PlayConcept[]>();
  for (const concept of concepts) {
    for (const abbr of concept.teams ?? []) {
      byTeam.set(abbr, [...(byTeam.get(abbr) ?? []), concept]);
    }
  }
  const teams = [...byTeam.keys()].sort();

  return (
    <>
      {/* Split rather than full-bleed: the archival frame is 680px wide and
          would be soft stretched across a band, but it is sharp at this size,
          and the grain reads as period rather than as compression. */}
      <header
        className="relative isolate overflow-hidden"
        style={{ background: "var(--color-vantage-panel)" }}
      >
        <div className="absolute inset-0 -z-10 yardlines-inverse opacity-15" />
        <Container className="relative pt-28 pb-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow flex items-center gap-2.5 mb-4">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5"
                  style={{ background: "var(--color-vantage-amber)" }}
                />
                <span style={{ color: "var(--color-ink-200)" }}>
                  Concepts and diagrams
                </span>
              </p>
              <h1
                className="text-5xl sm:text-7xl uppercase tracking-wide leading-[0.88]"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-vantage-white)",
                }}
              >
                Film room
              </h1>
              <p
                className="mt-6 max-w-xl text-lg"
                style={{ color: "var(--color-ink-300)" }}
              >
                Route concepts drawn from coordinates rather than clipped from a
                broadcast. Every diagram here is original work.
              </p>
            </div>

            <FramedPhoto
              src="/img/bg/lombardi.jpg"
              alt="Vince Lombardi on the sideline in an overcoat and fedora, speaking with players during a cold-weather game."
              caption="Vince Lombardi on the sideline. The concepts on this page are older than the data."
              ratio="680 / 451"
              priority
            />
          </div>
        </Container>
      </header>

      <Container className="py-10">
        <DataFreshness updated={file.updated} label="Diagrams updated" />

        {/* ---------- By team ---------- */}
        <section className="mt-10">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            By team
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Which concepts each offence runs, and therefore which player
            profiles its passing game rewards.
          </p>

          {teams.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No concepts tagged to a team yet."
                direction="Add a teams array to a concept in src/data/concepts.json."
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((abbr) => {
                const team = getTeam(abbr);
                const list = byTeam.get(abbr) ?? [];
                return (
                  <li
                    key={abbr}
                    className="rounded-lg border overflow-hidden"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div
                      className="px-4 py-2.5"
                      style={{
                        background: team?.primary,
                        boxShadow: team
                          ? `inset 0 -3px 0 0 ${team.secondary}`
                          : undefined,
                      }}
                    >
                      <span
                        className="text-base uppercase tracking-wide"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: team ? readableOn(team.primary) : undefined,
                        }}
                      >
                        {team ? `${team.city} ${team.nickname}` : abbr}
                      </span>
                    </div>
                    <ul className="p-4 flex flex-wrap gap-2">
                      {list.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/film/${c.slug}`}
                            className="inline-block rounded px-2.5 py-1 text-sm font-semibold hover:underline"
                            style={{
                              boxShadow: "inset 0 0 0 1px var(--border-strong)",
                            }}
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- Concept library ---------- */}
        <section className="mt-16">
          <h2
            className="text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Concept library
          </h2>

          <ul className="mt-6 grid gap-8 lg:grid-cols-3">
            {concepts.map((concept) => (
              <li key={concept.slug}>
                <Link href={`/film/${concept.slug}`} className="group block">
                  <PlayDiagram paths={concept.paths} title={concept.name} />
                  <div className="mt-4">
                    <p className="eyebrow">{concept.family}</p>
                    <h3
                      className="mt-1 text-2xl uppercase tracking-wide group-hover:underline"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {concept.name}
                    </h3>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {concept.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(concept.teams ?? []).map((t) => (
                        <TeamChip key={t} abbr={t} size="sm" />
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
