import type React from "react";

/**
 * The site's "conclusion before the evidence" panel.
 *
 * The device is good and stays: state the finding, then show the working. What
 * changed on 2026-08-26 is how it is drawn. Eleven copies of the same markup
 * had accumulated across eight components, every one of them a
 * `border-l-4` in amber, and a thick coloured rule down the left of a card is
 * the single most recognisable tell of a generated interface. It reads as a
 * framework default rather than a decision, which is the opposite of what this
 * page is arguing.
 *
 * Three things replace it, and none of them touch the palette or the type
 * (§7: the brand exists, implement it, do not redesign it):
 *
 *  - **A marker, not a rule.** The small amber square is already this site's
 *    own mark — the home page uses it on the section cards and again on the
 *    method band. Borrowing it here means a callout is flagged by something
 *    that belongs to Vantage rather than to Bootstrap.
 *  - **One amber element, not two.** The old panel spent amber on the border
 *    *and* the eyebrow. §7 reserves it for the focal thing, and a device that
 *    appears three times on a page was quietly spending it six times.
 *  - **A hairline mixed from the text colour**, not a flat grey border. It sits
 *    at 8% so the panel has an edge without a line drawn around it, and it
 *    follows the theme rather than needing a second value for dark mode.
 *
 * `note` is the quieter tone, for chart footnotes and asides: same shape, no
 * amber, because those are not findings and should not claim to be.
 */
export function Callout({
  as: Root = "div",
  tone = "finding",
  plain = false,
  label,
  labelAs: Label = "p",
  title,
  titleAs: Title = "h3",
  className = "",
  children,
}: {
  /** Kept semantic: several of these are genuinely an `aside`. */
  as?: "div" | "aside" | "section";
  /** `finding` earns the amber mark. `note` is an aside and does not. */
  tone?: "finding" | "note";
  /** Drop the panel and keep the marker, for a callout inside running text. */
  plain?: boolean;
  label: string;
  /** Some callouts carry the label as their heading rather than a title. */
  labelAs?: "p" | "h2" | "h3" | "h4";
  title?: string;
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
  children: React.ReactNode;
}) {
  const marker =
    tone === "finding" ? "var(--color-vantage-amber)" : "var(--color-ink-400)";

  return (
    <Root
      className={`${plain ? "" : "rounded-md p-5 sm:p-6"} ${className}`}
      style={
        plain
          ? undefined
          : {
              background: "var(--surface-sunken)",
              // Mixed from the text colour rather than a fixed grey, so the
              // edge is present without reading as a drawn box, and one value
              // covers both themes.
              boxShadow:
                "inset 0 0 0 1px color-mix(in oklab, var(--text-primary) 8%, transparent)",
            }
      }
    >
      <Label className="eyebrow flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 shrink-0"
          style={{ background: marker }}
        />
        {label}
      </Label>
      {title && (
        <Title
          className="mt-2 text-2xl uppercase tracking-wide leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </Title>
      )}
      <div className={title ? "mt-3" : "mt-2"}>{children}</div>
    </Root>
  );
}
