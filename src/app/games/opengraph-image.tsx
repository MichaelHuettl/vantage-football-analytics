import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage game tracker: implied team totals, weather, and the designations that move a lineup.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Game tracker",
    title: "What moves a lineup",
    footnote: "Implied team totals, weather, and the designations.",
  });
}
