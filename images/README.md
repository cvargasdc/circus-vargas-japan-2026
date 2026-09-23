# Location photos

Downloaded for the Circus Vargas Japan trip companion. Each image is keyed by `mapsQuery` in `data/photos.json`. Tapping a photo in the app opens **Google Maps** for that place.

Images are resized (~800px JPEG) for GitHub Pages / phone loading. They live next to `companion.html` as relative `images/…` paths.

## Sources

| `source` in photos.json | Meaning |
|--------|---------|
| **wikimedia** | Page image from English Wikipedia / Wikimedia Commons (`credit` / `pageUrl`). |
| **osm** | Static map preview via Nominatim geocode + OpenStreetMap static map or tile. Map data © OpenStreetMap contributors (ODbL). |

We do **not** hotlink Google Maps / Places (`lh3`) URLs.

Regenerate: `node scripts/fetch-photos.js` then `node scripts/sync-data.js`.

Nominatim User-Agent contact: drchris@innatefamily.com
