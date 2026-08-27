import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage fantasy model: PPR projections measured against a three-game average.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Fantasy model",
    title: "It avoids bad calls",
    footnote: "PPR projections, measured against a three-game average.",
  });
}
