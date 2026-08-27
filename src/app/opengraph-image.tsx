import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage Football Analytics: rankings are a conclusion, and the argument underneath them.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Vantage Football Analytics",
    title: "Rankings are a conclusion",
    footnote: "This site publishes the argument underneath them.",
  });
}
