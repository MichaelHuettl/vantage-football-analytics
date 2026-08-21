"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the server render on a timer so an open page keeps up with the feeds.
 *
 * `router.refresh()` rather than a client-side fetch, so the news list is still
 * rendered once, on the server, by the same code as on first load. A parallel
 * client renderer would be a second implementation of the same markup and the
 * two would drift.
 *
 * It deliberately does not invalidate the server cache: publishers are polled
 * at most once per FEED_REVALIDATE_SECONDS however often this fires, so a page
 * left open overnight is not a scraper.
 *
 * Only ticks while the tab is visible — a background tab does not need to poll.
 *
 * The catch is getting back. Browsers freeze timers in a tab that has been
 * hidden for a while, so a page left open overnight has no live interval to
 * resume, and the first thing the reader sees on returning is yesterday's
 * render. The original version listened for `focus` alone, which is not
 * dependable: switching tabs raises `visibilitychange` and need not raise
 * `focus` at all. Both are handled now, and the tick fires immediately on
 * becoming visible rather than waiting out an interval — the moment someone
 * looks at the page is exactly the moment it should be current.
 *
 * Refreshing on every return is cheap: the server render is bounded by the
 * five-minute TTL cache, so an over-eager reader re-renders a page rather than
 * re-hitting a publisher.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    // A page restored from the back/forward cache is served exactly as it was
    // left, timers and all, so it needs the same nudge.
    window.addEventListener("pageshow", tick);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [router, seconds]);

  return null;
}
