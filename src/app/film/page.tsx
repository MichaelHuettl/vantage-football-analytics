import type { Metadata } from "next";
import { Container, EmptyState, PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Film room" };

export default function FilmPage() {
  return (
    <>
      <PageHeader eyebrow="Concepts and diagrams" title="Film room" lede="Route concepts and play diagrams drawn from scratch. Nothing here is clipped or re-hosted footage." />
      <Container className="py-10">
        <EmptyState
          title="No concepts published yet."
          direction="Add a concept to src/data/concepts.json and it will render through the PlayDiagram component."
        />
      </Container>
    </>
  );
}
