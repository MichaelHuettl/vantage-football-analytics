import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Vantage glossary: every metric on the site defined in one sentence.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Glossary",
    title: "Every metric, defined",
    footnote: "One sentence, and what a good value looks like.",
  });
}
