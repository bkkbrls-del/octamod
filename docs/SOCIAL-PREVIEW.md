# Social sharing preview

The static page metadata in `index.html` references `public/social-preview.jpg` at
`https://octamod.app/social-preview.jpg`. The production build copies this image
to `dist/social-preview.jpg`. Open Graph and Twitter cards can read the metadata
without running the app.

The image is a 1200 × 630 JPEG. It is original AI-generated artwork, created on 1 October 2026.
It uses Octamod's existing palette and eight-tile brand mark. The signal panels
are original generated illustrations; they are not hardware screenshots or
performance evidence. No firmware or third-party photograph was used.

If the public site moves, update the absolute URL and image URLs in
`index.html` along with the domain printed on the artwork. When replacing the
artwork, use a new image filename and update both metadata references so sharing
services can fetch the new asset.
