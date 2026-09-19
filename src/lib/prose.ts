/**
 * Em dash removal for prose this repo does not author.
 *
 * The prediction pipeline's payloads are *copied* into `src/data/`, so their
 * wording is not ours to edit at source: an edit to the copy is undone the next
 * time it is re-exported. The house style has no em dashes, so they are
 * rewritten where the payload enters, the same place and for the same reason
 * that `canonTeams` rewrites `LA` into `LAR`.
 *
 * The replacement is chosen from what follows the dash rather than applied
 * flat, because one punctuation mark does not fit every use:
 *
 *  - an independent clause becomes its own sentence
 *  - a conjunction or a relative pronoun takes a comma
 *  - a figure takes a colon, which is how a stat line reads
 *  - anything else takes a comma, which is right for an appositive
 *
 * A *pair* of dashes around an aside is handled first, since that is a
 * parenthetical and both marks have to become commas together.
 */
const CLAUSE = /\s*—\s*(it|they|that|this|he|she|there)\s+(is|are|was|were|comes|came|has|have|had|does|do|did)\b/gi;
const JOIN = /\s*—\s*(and|but|so|though|yet|which|whose|where|because|while)\b/gi;
const FIGURE = /\s*—\s*(?=[0-9])/g;
const PAIRED = /\s*—\s*([^—]{1,60}?)\s*—\s*/g;
const REST = /\s*—\s*/g;

export function normalizeDashes(text: string): string {
  return text
    .replace(PAIRED, (_m, inner) => `, ${inner}, `)
    .replace(CLAUSE, (_m, subj: string, verb: string) =>
      `. ${subj[0].toUpperCase()}${subj.slice(1)} ${verb}`)
    .replace(JOIN, ", $1")
    .replace(FIGURE, ": ")
    .replace(REST, ", ");
}

/**
 * Spelling in copied prose.
 *
 * The site's copy is American (docs/STATE.md), and the prediction pipeline
 * writes "defence". Same reasoning as the dashes: their file, our page.
 *
 * Extended on 2026-09-19 after a spelling audit of every rendered page, and
 * now also applied to the workbook payloads (defense.ts, kickers.ts), whose
 * text is the operator's own shorthand. Re-running their extractors writes the
 * workbook's wording back, so a fix to the JSON would not last; a fix here
 * does. Compound words are corrected alongside the British spellings.
 */
const SPELLINGS: [RegExp, string][] = [
  [/\bdefence\b/g, "defense"],
  [/\bDefence\b/g, "Defense"],
  [/\boffence\b/g, "offense"],
  [/\bOffence\b/g, "Offense"],
  [/\bneighbour/g, "neighbor"],
  [/\btravelled\b/g, "traveled"],
  [/\bmodell(ing|ed)\b/g, "model$1"],
  [/\bModell(ing|ed)\b/g, "Model$1"],
  // Catches "misjudgement" as well as "judgement".
  [/([Jj])udgement/g, "$1udgment"],
  [/\b[Ss]uper ?[Bb]owl\b/g, "Super Bowl"],
  [/\bredzone\b/g, "red zone"],
  [/\bRedzone\b/g, "Red zone"],
];

/**
 * Player names the source text misspells or shortens, corrected to the name the
 * rest of the site uses.
 *
 * Each was found by comparing every name on the rendered site with the
 * nflverse player register, and confirmed there before being added. Scoped to
 * the full name, so a correction cannot touch a different player who shares a
 * surname.
 */
const NAMES: [RegExp, string][] = [
  [/\bNnamdi Madubike\b/g, "Nnamdi Madubuike"], // BAL DT
  [/\bMadubike\b/g, "Madubuike"],
  [/\bRashaan Gary\b/g, "Rashan Gary"], // one A
  [/\bMiles Garrett\b/g, "Myles Garrett"],
  // Not a misspelling: the workbook's short form, where every other page says
  // Kenneth Walker. Charts label him from a separate `short` field
  // ("K. Walker"), so this lengthens no chart label.
  [/\bKen Walker\b/g, "Kenneth Walker"],
];

/** Every string in a copied payload, rewritten. Keys are left alone. */
export function normalizeProse<T>(node: T): T {
  if (typeof node === "string") {
    let s = normalizeDashes(node);
    for (const [rx, to] of SPELLINGS) s = s.replace(rx, to);
    for (const [rx, to] of NAMES) s = s.replace(rx, to);
    return s as unknown as T;
  }
  if (Array.isArray(node)) return node.map(normalizeProse) as unknown as T;
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = normalizeProse(v);
    }
    return out as T;
  }
  return node;
}
