import type { Metadata } from "next";
import Link from "next/link";
import positionsFile from "@/data/positions.json";
import { Container } from "@/components/PageHeader";
import { SectionHero } from "@/components/SectionHero";
import { PositionBadge } from "@/components/PlayerLink";
import type { Envelope, Position } from "@/lib/types";

export const metadata: Metadata = { title: "Position analysis" };

interface PositionDoc {
  position: Position;
  chart_title: string;
  methodology: string;
}

export default function PositionsIndex() {
  const docs = (positionsFile as Envelope<PositionDoc[]>).data;

  return (
    <>
      <SectionHero
        image="/img/bg/field.jpg"
        objectPosition="center 40%"
        eyebrow="Framework"
        title="Positions"
        lede="How each position is evaluated here, and the one chart that carries the argument."
      />
      <Container className="py-10">
        <ul className="grid gap-4 sm:grid-cols-2">
          {docs.map((doc) => (
            <li key={doc.position}>
              <Link
                href={`/positions/${doc.position.toLowerCase()}`}
                className="flex h-full flex-col gap-3 rounded-lg border p-6 transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <PositionBadge position={doc.position} />
                <span
                  className="text-xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {doc.chart_title}
                </span>
                <span
                  className="text-sm line-clamp-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {doc.methodology}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
