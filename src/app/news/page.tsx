import type { Metadata } from "next";
import { Container, EmptyState, PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <>
      <PageHeader eyebrow="What happened" title="News" lede="Headlines, source, and timestamp, tagged to players. Follow the link for the article — no body text is reproduced here." />
      <Container className="py-10">
        <EmptyState
          title="No items in the feed."
          direction="Add entries to src/data/news.json."
        />
      </Container>
    </>
  );
}
