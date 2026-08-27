import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage game prediction model: a win probability for every game, its record, and every call it got wrong.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Game prediction model",
    title: "Every call it got wrong",
    footnote: "A win probability for every game, and its record.",
  });
}
