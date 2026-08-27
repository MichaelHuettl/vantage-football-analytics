import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage positional data: the evaluation framework for each position, applied to the current pool.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Positional data",
    title: "The framework, applied",
    footnote: "How each position is evaluated, against the current pool.",
  });
}
