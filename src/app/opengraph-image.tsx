import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage Football Analytics: what actually wins, and the numbers underneath it.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Vantage Football Analytics",
    title: "What actually wins",
    footnote: "The opportunity and efficiency underneath the result.",
  });
}
