# Curated X posts from the workbook

The workbook's **Offseason News** sheet holds screenshots of X posts, collected
by hand and laid out in 32 team columns. They cover June and July, which the
live feed cannot reach: X has no free read API, Nitter's RSS returns only the
last ~20 posts per account, and its HTML timeline returns nothing at all.

These are read off the images with OCR rather than retyped, and they skip the
signal filter — the selection already happened when they were collected.

## Running it

```
cd scripts/curated
swiftc -O ocr.swift -o ocr          # once; needs Xcode command line tools
python3 extract.py                  # pulls images out of the .xlsx
./ocr images/* > ocr_out.tsv        # Apple Vision, local, no API
python3 parse_curated.py            # OCR text -> structured records
node emit.mjs                       # -> src/data/curated-posts.json
```

## What it is careful about

- **Every post in a screenshot**, not just the first — several hold a thread or
  a quote-tweet.
- **Team comes from the post's text**, never from the spreadsheet column the
  image sat in. Those columns are unreliable: a Schefter post about the
  Panthers was anchored under Arizona, as was a post about Michael Penix, an
  Atlanta quarterback. A missing chip is honest; a wrong one is not.
- **Relative timestamps are not given a fabricated day.** A post stamped "23h"
  is only meaningful against the moment the screenshot was taken, which nothing
  records. Those are flagged `approx_date` and render as "Jun–Jul".
