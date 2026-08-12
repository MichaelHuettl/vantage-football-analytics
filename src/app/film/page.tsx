import type { Metadata } from "next";
import Link from "next/link";
import conceptsFile from "@/data/concepts.json";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, EmptyState } from "@/components/PageHeader";
import { PlayDiagram } from "@/components/PlayDiagram";
import { SectionHero } from "@/components/SectionHero";
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
      <SectionHero
        image="/img/bg/lombardi.jpg"
        objectPosition="center 40%"
        eyebrow="Concepts and diagrams"
        title="Film room"
        lede="Route concepts drawn from coordinates rather than clipped from a broadcast. Every diagram here is original work."
      />

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
