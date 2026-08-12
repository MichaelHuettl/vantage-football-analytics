import type { Metadata } from "next";
import { Container, EmptyState, PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Game tracker" };

export default function GamesPage() {
  return (
    <>
      <PageHeader eyebrow="Week by week" title="Game tracker" lede="Every matchup with its implied team totals, roof, weather, and the designations that matter. Implied totals are computed from the spread and the game total." />
      <Container className="py-10">
        <EmptyState
          title="No games loaded for this week."
          direction="Add entries to src/data/schedule.json."
        />
      </Container>
    </>
  );
}
