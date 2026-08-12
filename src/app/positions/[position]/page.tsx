import type { Metadata } from "next";
import { notFound } from "next/navigation";
import positionsFile from "@/data/positions.json";
import { ChartFigure } from "@/components/ChartFigure";
import { DataFreshness } from "@/components/DataFreshness";
import { Container, PageHeader } from "@/components/PageHeader";
import { getRankingList } from "@/lib/content";
import { POSITIONS } from "@/lib/types";
import type { Envelope, Position } from "@/lib/types";

interface PositionDoc {
  position: Position;
  chart_title: string;
  chart_x: string;
  chart_y: string;
  caption: string;
  methodology: string;
  chart?: string;
}

const docs = (positionsFile as Envelope<PositionDoc[]>).data;

export function generateStaticParams() {
  return POSITIONS.map((p) => ({ position: p.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ position: string }>;
}): Promise<Metadata> {
  const { position } = await params;
  return { title: `${position.toUpperCase()} analysis` };
}

export default async function PositionPage({
  params,
}: {
  params: Promise<{ position: string }>;
}) {
  const { position } = await params;
  const upper = position.toUpperCase() as Position;
  const doc = docs.find((d) => d.position === upper);
  if (!doc) notFound();

  const list = getRankingList(upper);

  return (
    <>
      <PageHeader
        eyebrow="Position analysis"
        title={`${upper} framework`}
        lede={doc.chart_title}
      />

      <Container className="py-10">
        <div className="max-w-3xl">
          <DataFreshness updated={list.updated} />

          <section className="mt-8">
            <h2 className="eyebrow mb-3">Methodology</h2>
            <p className="text-lg leading-relaxed">{doc.methodology}</p>
          </section>

          {/* The featured chart for the page — the one place the goalpost
              frame is used here, per §7's warning against wallpapering it. */}
          <ChartFigure
            src={doc.chart || undefined}
            featured
            caption={doc.caption}
            source={`x: ${doc.chart_x} · y: ${doc.chart_y}`}
          />
        </div>
      </Container>
    </>
  );
}
