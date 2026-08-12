import type { Metadata } from "next";
import { Container, EmptyState, PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Injuries" };

export default function InjuriesPage() {
  return (
    <>
      <PageHeader eyebrow="Status and trend" title="Injuries" lede="Practice participation across the whole week. The Friday designation alone is not the signal — the trend across Wednesday, Thursday, and Friday is." />
      <Container className="py-10">
        <EmptyState
          title="No injury data loaded yet."
          direction="Add entries to src/data/injuries.json. This page will not predict return dates."
        />
      </Container>
    </>
  );
}
