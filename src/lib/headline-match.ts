/**
 * Joining headlines to the players they are about, by name.
 *
 * The tracker knows a player is hurt and what the wire calls it. What it cannot
 * say is *what happened* — "Knee" is the field Sleeper publishes, "hyperextended
 * it and expects to be fine" is the part a reader wants, and that only ever
 * exists in someone's headline. This is the join that puts the second beside
 * the first.
 *
 * Two feeds go in. The live Draft Sharks sitemap is small and current, a rolling
 * window of about thirty items; `news.json` is larger and committed, refreshed
 * by `npm run news`. Neither substitutes for the other, so both are matched and
 * the results merged newest first.
 *
 * **Headline, source, link and date only, never body text** (§2). Nothing here
 * writes a sentence. A matched headline is published as its publisher wrote it,
 * with the publisher named: §11 bars auto-generated analysis under the
 * operator's name, and a paraphrase would be exactly that.
 *
 * ## Matching, and why it compares tokens rather than strings
 *
 * A player matches only when his **full name** appears in the headline as
 * consecutive whole words. Surname alone is tempting and wrong: the league has
 * two Kenneth Walkers and two Josh Allens, "Chase" is both Ja'Marr Chase and
 * Chase Brown, and this project has already shipped a bug where a loose anchor
 * filed a Panthers post under Arizona. A missed headline costs a reader a
 * detail; a wrong one puts another man's injury on a player's row.
 *
 * The first attempt folded both sides to bare letters and required a substring,
 * which fails in both directions and was caught by measuring rather than
 * reading. It needed a length floor to stop `bonix` matching inside "turbo
 * nixed", and any floor high enough to do that also threw out `jamarrchase` at
 * eleven characters — silently dropping half the league, Ja'Marr Chase
 * included. Comparing token sequences removes the collision without a floor,
 * because "Bo Nix" can then only match the literal words *Bo Nix*.
 *
 * Three details do the real work:
 *
 *  - **Apostrophes are deleted, not treated as separators**, so "Ja'Marr",
 *    "Ja’Marr" and "JaMarr" all reduce to `jamarr`. `news.json` carries 19
 *    headlines with a curly apostrophe and 32 with a straight one, and a filter
 *    written with one quote character silently misses the other. That exact
 *    mistake has been made on this project before.
 *  - **A trailing `s` is allowed on the last name token**, because a possessive
 *    loses its apostrophe to the rule above and "Ashton Jeanty's Week 1 Status"
 *    would otherwise not match Ashton Jeanty.
 *  - **Generational suffixes are dropped from the player's name**, so Marvin
 *    Harrison Jr. matches a headline whichever way it styles him.
 */
import newsFile from "@/data/news.json";
import type { NewsEntry } from "./types";

const committed = (newsFile as unknown as { data: NewsEntry[] }).data;

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Lowercased alphanumeric words, diacritics folded, apostrophes removed. */
export function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ`']/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** The player's name as words worth matching on, suffix removed. */
function nameTokens(name: string): string[] {
  const parts = tokens(name).filter((t) => !SUFFIXES.has(t));
  return parts.length >= 2 ? parts : [];
}

/** Does this headline name this player, as consecutive whole words? */
export function headlineNames(headline: string, name: string): boolean {
  const needle = nameTokens(name);
  if (!needle.length) return false;
  const hay = tokens(headline);
  const last = needle.length - 1;

  outer: for (let i = 0; i + needle.length <= hay.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      const h = hay[i + j];
      const n = needle[j];
      // The final word may carry a possessive `s`, the apostrophe having
      // already been removed: "Jeanty's" arrives here as "jeantys".
      if (h !== n && !(j === last && h === `${n}s`)) continue outer;
    }
    return true;
  }
  return false;
}

/** Newest first, de-duplicated by URL across the two feeds. */
function merge(entries: NewsEntry[]): NewsEntry[] {
  const byUrl = new Map<string, NewsEntry>();
  for (const e of entries) {
    const existing = byUrl.get(e.url);
    if (!existing || e.timestamp > existing.timestamp) byUrl.set(e.url, e);
  }
  return [...byUrl.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Every headline naming this player, newest first.
 *
 * `live` is the current pull; the committed file is always consulted as well,
 * so a wire outage costs freshness rather than the whole column.
 */
export function headlinesFor(
  name: string,
  live: NewsEntry[],
  limit = 3,
): NewsEntry[] {
  const hit = (e: NewsEntry) => headlineNames(e.headline, name);
  return merge([...live.filter(hit), ...committed.filter(hit)]).slice(0, limit);
}
