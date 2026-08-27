import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage film room: route concepts and play diagrams, drawn rather than borrowed.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Film",
    title: "Drawn here, not borrowed",
    footnote: "Route concepts and play diagrams.",
  });
}
