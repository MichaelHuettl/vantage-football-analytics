import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage injury database: practice participation across the week, pulled live.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Injury database",
    title: "The trend is the signal",
    footnote: "Practice participation across the week, pulled live.",
  });
}
