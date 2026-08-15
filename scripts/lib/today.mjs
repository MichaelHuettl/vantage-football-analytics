/**
 * The date to stamp on published data, in US Eastern rather than UTC.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, so any run after
 * 8pm Eastern stamps tomorrow. The site would then tell a reader its numbers
 * are newer than they are, which is the one thing DataFreshness exists to
 * prevent (§6). This is worse in CI than locally: Actions runners are UTC, so
 * every evening run would have been wrong.
 *
 * Eastern rather than the machine's zone, so a local run and a CI run agree.
 * en-CA formats as YYYY-MM-DD, which is the shape the data files already use.
 */
export const stampDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
