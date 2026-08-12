import type { Metadata } from "next";
import glossaryFile from "@/data/glossary.json";
import { Container, PageHeader } from "@/components/PageHeader";
import type { Envelope, GlossaryTerm } from "@/lib/types";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Every metric used on this site, defined in one sentence, with what a good value looks like.",
};

type Term = GlossaryTerm & { status?: "draft" | "ready" };

export default function GlossaryPage() {
  const terms = (glossaryFile as Envelope<Term[]>).data;

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Glossary"
        lede="Every metric on this site is defined here, in one sentence, alongside what a good value looks like. If a number appears on a chart and not on this page, that is a bug."
      />

      <Container className="py-10">
        <dl className="max-w-3xl divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {terms.map((t) => (
            <div key={t.slug} id={t.slug} className="scroll-mt-24 py-6">
              <dt className="flex flex-wrap items-baseline gap-3">
                <span
                  className="text-2xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t.term}
                </span>
                {t.status === "draft" && (
                  <span
                    className="eyebrow"
                    style={{ color: "var(--color-status-doubtful)" }}
                  >
                    Draft
                  </span>
                )}
              </dt>
              <dd className="mt-2">
                <p>{t.definition}</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span className="eyebrow mr-2">What good looks like</span>
                  {t.good}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}
