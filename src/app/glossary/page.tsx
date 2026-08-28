import type { Metadata } from "next";
import glossaryFile from "@/data/glossary.json";
import { Container, PageHeader } from "@/components/PageHeader";
import type { GlossaryGroup, GlossaryTerm } from "@/lib/types";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Every metric used on this site, defined in one sentence, with what a good value looks like and where the number comes from.",
};

interface GlossaryFile {
  updated: string;
  groups: GlossaryGroup[];
  data: GlossaryTerm[];
}

const file = glossaryFile as unknown as GlossaryFile;

/**
 * The reference the rest of the site promises.
 *
 * The home page says that if a number appears on a chart and not in the
 * glossary, that is a bug. That claim was made against six entries while the
 * site had grown to publish tracking data, licensed route columns, a nine-block
 * defense page and a calibrated prediction model — so the promise was false in
 * roughly sixty places. This is the inventory that makes it true again.
 *
 * **Grouped, not alphabetical.** An A-to-Z list is the right shape for a
 * dictionary a reader arrives at knowing the word. Most arrivals here are the
 * other way round — someone has just seen a scatter of tight ends and wants to
 * know what the axis means — so the terms are ordered the way the site presents
 * them, and the jump links let anyone who does know the word skip the reading.
 *
 * **Every entry names its source.** The site publishes numbers from six places
 * and they are not equivalent: play-by-play derivations, Next Gen tracking, a
 * licensed 4for4 column, the operator's workbook, the betting market, and the
 * model's own output. Two of them carry licence conditions and one is a
 * forecast rather than a record. A reader auditing a figure cannot do it
 * without knowing which produced it, and printing the source is cheaper than
 * expecting them to ask.
 *
 * Slugs are stable: `MetricValue` deep-links to `/glossary#slug`, and the six
 * original slugs all survive this rewrite.
 */
export default function GlossaryPage() {
  const { groups, data: terms } = file;
  const bySlug = (a: GlossaryTerm, b: GlossaryTerm) => a.term.localeCompare(b.term);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Glossary"
        lede="Every metric on this site, defined in one sentence, with what a good value looks like and where the number came from. If a figure appears on a chart and not on this page, that is a bug."
      />

      <Container className="py-16 sm:py-24">
        {/* ---- jump links ---- */}
        <nav aria-label="Sections" className="max-w-3xl">
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-block rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                    color: "var(--text-secondary)",
                    boxShadow: "inset 0 0 0 1px var(--border-strong)",
                  }}
                >
                  {g.name}
                  <span className="ml-2 tnum" style={{ color: "var(--text-muted)" }}>
                    {terms.filter((t) => t.group === g.id).length}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            {terms.length} terms · updated {file.updated}
          </p>
        </nav>

        {groups.map((group) => {
          const rows = terms.filter((t) => t.group === group.id).sort(bySlug);
          if (rows.length === 0) return null;

          return (
            <section key={group.id} id={group.id} className="mt-16 scroll-mt-24">
              <h2
                className="text-3xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
              >
                {group.name}
              </h2>
              <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                {group.blurb}
              </p>

              <dl
                className="mt-6 max-w-3xl divide-y"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {rows.map((t) => (
                  <div key={t.slug} id={t.slug} className="scroll-mt-24 py-6">
                    <dt>
                      <span
                        className="text-2xl uppercase tracking-wide"
                        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
                      >
                        {t.term}
                      </span>
                    </dt>
                    <dd className="mt-2">
                      <p>{t.definition}</p>
                      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="eyebrow mr-2">What good looks like</span>
                        {t.good}
                      </p>
                      <p
                        className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span>
                          <span className="eyebrow mr-2">Source</span>
                          {t.source}
                        </span>
                        <span>
                          <span className="eyebrow mr-2">Appears on</span>
                          {t.where}
                        </span>
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </Container>
    </>
  );
}
