# Social sharing preview

The static page metadata in `index.html` references `public/social-preview.jpg` at
`https://octamod.app/social-preview.jpg`. The production build copies this image
to `dist/social-preview.jpg`. Open Graph and Twitter cards can read the metadata
without running the app.

The image is a 1200 × 630 JPEG. It was created on 1 October 2026 using the built-in
Codex image generation tool, then resized and exported with macOS `sips`.
It uses Octamod's existing palette and eight-tile brand mark. The signal panels
are original generated illustrations; they are not hardware screenshots or
performance evidence. No firmware or third-party photograph was used.

If the public site moves, update the absolute URL and image URLs in
`index.html` along with the domain printed on the artwork. When replacing the
artwork, use a new image filename and update both metadata references so sharing
services can fetch the new asset.

## Initial generation prompt

```text
Use case: ads-marketing
Asset type: one finished Open Graph social link-preview thumbnail for the existing Octamod website, wide landscape, EXACT 1200 x 630 pixels, full bleed.
Primary request: A beautiful, restrained, premium cover for an independent Octatrack firmware module configurator. Match the app's charcoal surfaces and muted lavender signal graphics. Make the project name highly legible in a small messaging-app thumbnail.
Scene/backdrop: matte near-black charcoal #19191c with a very fine, almost invisible technical grid, subtle vignette. No room or hardware photograph.
Composition: clean editorial two-column layout with generous margins around all important elements (at least 70 px). Left 55 percent is mostly calm negative space and bold typography; right 45 percent contains a compact, artfully staggered arrangement of three floating dark audio-module panels. Balance intentional hierarchy and clear readability. Everything fits inside the canvas. No outer frame.
Text, exactly and only: large title "Octamod" in white, a crisp contemporary sans serif, roughly 100 px, in the left middle area. Below in two lines, medium-size warm gray: "Choose your" then "Octatrack modules." Bottom left small understated lavender domain: "octamod.app".
Right-side illustration: three beautiful dark graphite rounded audio-module panels at a very slight perspective, with subtle surface depth, fine lavender borders, refined shadows. Their artwork references the app's actual signal drawings: a lilac resonant filter curve on a faint grid, a pale blue stereo sine wave, and a muted lavender sixteen-step Euclidean rhythm ring with five bright steps. Only very small panel labels "SPECTRUM", "MODULATION", "EUCLID". These are stylized illustrations, not screenshots. Keep them substantial enough to see at thumbnail scale. No knobs, device photo or invented hardware.
Small existing brand symbol above the main title: a lavender rounded square with eight small white rounded squares arranged on a 3x3 grid with the bottom right position empty, exactly eight tiles.
Style/medium: meticulously composed digital editorial artwork, understated music-software aesthetic, sharp typography, precise signal linework, clean corners. Dimensional module panels, otherwise minimal flat background. Lavender #929bff, lilac #b5a0ff, pale blue #79b5f8, charcoal, off-white.
Constraints: one complete image. All text must be spelled exactly. No firmware file, code, technical claims, download promise, logos of other companies, people, watermark, stock product images, tiny dense UI, neon cyberpunk glow, excessive gradients, decorative clutter. The large title and sentence must dominate; modules are supporting artwork.
```

## Final edit prompt

The final artwork replaces the paused Spectrum and Modulation panels with Tape
Echo and Mini Verb. The original thumbnail served as the edit target in the
built-in image generation tool.

```text
Use case: precise-object-edit
Asset type: finished 1200 x 630 landscape Open Graph social sharing thumbnail for Octamod.
Input image: the existing Octamod sharing thumbnail is the edit target.
Primary request: Preserve the excellent existing composition, exact Octamod eight-tile logo, all large typography, wordmark, charcoal background, faint grid, the domain, and the palette. Change ONLY the two top audio-module illustration panels on the right to represent the modules currently offered by the website.
Top panel: replace the label "SPECTRUM" with exact text "TAPE ECHO". Replace the filter curve artwork with a beautiful minimal twin tape-reel diagram joined by a short tape path, inspired by a single-head tape echo. Use refined muted gold #d5bd96 strokes on the same dark graphite panel. Keep the panel's existing placement, size, perspective, corner shape, fine border and shadow.
Middle panel: replace the label "MODULATION" with exact text "MINI VERB". Replace the stereo sine artwork with a diffused-reverb impulse response: a series of thin vertical lines whose heights decay smoothly left to right, on a subtle grid. Use restrained seafoam #83c7bc signal lines on the same dark graphite panel. Keep the panel's existing placement, size, perspective, corner shape, fine border and shadow.
Bottom right panel: keep the "EUCLID" label and the Euclidean rhythm ring exactly as they are.
Keep ALL left-side text exactly unchanged: "Octamod", "Choose your", "Octatrack modules.", and "octamod.app".
Constraints: do not include Spectrum or Modulation text or graphics. No new words, slogans, hardware photograph, logos of other companies, watermark, firmware or code. One complete clean artwork, same wide 1200:630 aspect ratio, all margins and typographic hierarchy unchanged. These are stylized illustrations, not hardware screenshots.
```
