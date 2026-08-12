import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import conceptsFile from "@/data/concepts.json";
import { Container } from "@/components/PageHeader";
import { PlayDiagram } from "@/components/PlayDiagram";
import { TeamChip } from "@/components/TeamChip";
import { getTeam } from "@/lib/teams";
import type { PlayConcept } from "@/lib/types";

interface ConceptsFile {
  data: (PlayConcept & { teams?: string[] })[];
}

const concepts = (conceptsFile as unknown as ConceptsFile).data;

export function generateStaticParams() {
  return concepts.map((c) => ({ concept: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}): Promise<Metadata> {
  const { concept } = await params;
  const found = concepts.find((c) => c.slug === concept);
  return { title: found ? found.name : "Concept" };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const { concept: slug } = await params;
  const concept = concepts.find((c) => c.slug === slug);
  if (!concept) notFound();

  return (
    <>
      <header style={{ background: "var(--color-vantage-panel)" }}>
        <Container className="pt-28 pb-12">
          <Link
            href="/film"
            className="eyebrow hover:underline"
            style={{ color: "var(--color-ink-400)" }}
          >
            ← Film room
          </Link>
          <p className="eyebrow mt-4" style={{ color: "var(--color-vantage-amber)" }}>
            {concept.family}
          </p>
          <h1
            className="mt-2 text-6xl sm:text-8xl uppercase tracking-wide leading-[0.9]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-vantage-white)",
            }}
          >
            {concept.name}
          </h1>
        </Container>
      </header>

      <Container className="py-12">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <PlayDiagram paths={concept.paths} title={concept.name} />

          <div>
            <section>
              <h2 className="eyebrow mb-2">What it does</h2>
              <p className="text-lg leading-relaxed">{concept.summary}</p>
            </section>

            {concept.beneficiaries && (
              <section className="mt-8">
                <h2 className="eyebrow mb-2">Who it helps</h2>
                <p className="leading-relaxed">{concept.beneficiaries}</p>
              </section>
            )}

            {concept.teams && concept.teams.length > 0 && (
              <section className="mt-8">
                <h2 className="eyebrow mb-3">Who runs it</h2>
                <ul className="flex flex-wrap gap-2">
                  {concept.teams.map((abbr) => {
                    const team = getTeam(abbr);
                    return (
                      <li key={abbr}>
                        <Link
                          href={`/injuries/${abbr.toLowerCase()}`}
                          className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold"
                          style={{
                            boxShadow: "inset 0 0 0 1px var(--border-strong)",
                          }}
                        >
                          <TeamChip abbr={abbr} size="sm" />
                          {team?.nickname ?? abbr}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
