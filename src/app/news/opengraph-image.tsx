import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage news: headlines tagged to players, with source and timestamp.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "News",
    title: "Tagged to players",
    footnote: "Source and timestamp, then a link out.",
  });
}
