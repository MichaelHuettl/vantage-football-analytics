import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Next 16 rejects any `quality` the config does not list, with a 400 rather
     * than a fallback — an `<Image quality={85}>` returns
     * `"q" parameter (quality) of 85 is not allowed` and the image simply does
     * not load. 75 is the built-in default and stays the default here.
     *
     * 85 exists for the film plates. They are play diagrams: fine white and
     * amber line work and a lot of small text over a dark field, already JPEG
     * once from the slide render, and a second pass at 75 softens the labels
     * enough to see. Photographs on the rest of the site are fine at 75 and are
     * left there.
     */
    qualities: [75, 85],
  },
};

export default nextConfig;
