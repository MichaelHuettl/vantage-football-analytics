import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage rankings: tiered by position and format, every row linked to the chart that justifies it.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Rankings",
    title: "Every row opens its chart",
    footnote: "Tiered by position and format.",
  });
}
