# Charted Roots — Brand Guidelines

![Charted Roots](./charted-roots-oxblood-on-cream.svg)

## Files

### Seal — vector sources

| Variant | File | Intended use |
|---------|------|--------------|
| Primary (color) | [`charted-roots-oxblood-on-cream.svg`](./charted-roots-oxblood-on-cream.svg) | Default logo. Use wherever a two-color treatment is appropriate: README headers, plugin listing, documentation covers, any cream or neutral field. |
| Alternate (color) | [`charted-roots-navy-on-cream.svg`](./charted-roots-navy-on-cream.svg) | Alternate palette for scholarly or professional contexts where navy better matches surrounding material. |
| Monochrome — oxblood | [`charted-roots-oxblood.svg`](./charted-roots-oxblood.svg) | Transparent-background mark in oxblood only. Use on cream, beige, or light-warm surfaces where the cream disc would compete with the surrounding field. |
| Monochrome — cream | [`charted-roots-cream.svg`](./charted-roots-cream.svg) | Transparent-background mark in cream only. Use on dark or saturated backgrounds where the two-color treatment feels heavy. |

All seal SVGs use `viewBox="0 0 200 200"` and are interchangeable at the same rendered dimensions.

### Seal — raster exports

| Variant | 1024 px | 512 px |
|---------|---------|--------|
| Primary (color) | [`charted-roots-oxblood-on-cream-1024.png`](./charted-roots-oxblood-on-cream-1024.png) | [`charted-roots-oxblood-on-cream-512.png`](./charted-roots-oxblood-on-cream-512.png) |
| Alternate (color) | [`charted-roots-navy-on-cream-1024.png`](./charted-roots-navy-on-cream-1024.png) | [`charted-roots-navy-on-cream-512.png`](./charted-roots-navy-on-cream-512.png) |
| Monochrome — oxblood | [`charted-roots-oxblood-1024.png`](./charted-roots-oxblood-1024.png) | [`charted-roots-oxblood-512.png`](./charted-roots-oxblood-512.png) |
| Monochrome — cream | [`charted-roots-cream-1024.png`](./charted-roots-cream-1024.png) | [`charted-roots-cream-512.png`](./charted-roots-cream-512.png) |

The monochrome PNGs (oxblood-only, cream-only) have transparent backgrounds.

### Social card

| Variant | File | Intended use |
|---------|------|--------------|
| Social card (vector) | [`charted-roots-social-card.svg`](./charted-roots-social-card.svg) | Master source at 1200 × 630. Live text, editable in Inkscape. |
| Social card (raster) | [`charted-roots-social-card.png`](./charted-roots-social-card.png) | Upload target for GitHub repo social preview (Settings → General → Social preview). GitHub does not accept SVG. |

### Favicons and PWA icons

| File | Size | Use |
|------|------|-----|
| [`favicon.ico`](./favicon.ico) | 16/32/48 multi | Browser tab favicon (legacy fallback) |
| [`favicon-32.png`](./favicon-32.png) | 32×32 | Modern browser favicon |
| [`favicon-180.png`](./favicon-180.png) | 180×180 | Apple touch icon (iOS home screen) |
| [`icon-192.png`](./icon-192.png) | 192×192 | Android / PWA standard icon |
| [`icon-512.png`](./icon-512.png) | 512×512 | PWA maskable icon / splash |

At favicon scales (32 px and below), the seal's inscription and contour detail fall below legibility. For the 32 / 16 px sizes, use a simplified icon variant (tree + outer ring only, no inscription, no contour lines) sourced from [`charted-roots-favicon-mark.svg`](./charted-roots-favicon-mark.svg). At 180 px and above, which is well past the 120 px minimum size, the full seal reads and can be used directly.

### Horizontal lockup

| File | Use |
|------|-----|
| [`charted-roots-horizontal.svg`](./charted-roots-horizontal.svg) | Website header and nav bars. Seal on the left, "Charted Roots" wordmark on the right, in landscape orientation. Target render height 40–60 px. |

The horizontal lockup is the right asset for narrow, wide contexts (navigation bars, email footers, sponsor logo strips) where the square seal would be awkwardly tall. Composition mirrors the social card's layout at a different aspect ratio.

## Color palette

| Role | Name | Hex | Notes |
|------|------|-----|-------|
| Primary ink | Oxblood | `#6B1F1F` | Default ink. Heraldic red-brown, low saturation — heritage-forward without feeling aggressive. |
| Alternate ink | Deep navy | `#1E2B45` | Cool counterpoint to the cream ground. Use in scholarly or professional contexts where oxblood's warmth is less appropriate. |
| Ground | Warm cream | `#F4EBD5` | Standard ground for the two-color seal. Reads as paper or parchment. |

## Typography

| Role | Typeface | Weight | Treatment |
|------|----------|--------|-----------|
| Seal inscription, top (name) | Literata | 500 | Uppercase, `letter-spacing: 2.5` at 11px reference size |
| Seal inscription, bottom (context) | Literata | 400 | Uppercase, `letter-spacing: 2` at 11px reference size |
| Social card title | Literata | 600 | Title case, 68px |
| Social card subtitle | Literata | 400, italic | Sentence case, 26px |
| Website body copy | Literata | 400 | Sentence case, 18px, line-height 1.6 |
| Website section heading | Literata | 600 | Title case, 36–48px depending on hierarchy |
| Website small UI text (nav, metadata) | Literata | 500 | Uppercase for nav, sentence case for metadata |

Literata was chosen for its humanist literary character — warm, readable, unassuming. It suits the archival-genealogical subject matter without being overly formal.

**Font availability.** The source SVGs reference Literata via `@font-face` from jsDelivr. This renders correctly in any online context (GitHub, plugin listings, documentation sites). For rasterizing with Inkscape or other offline tools, Literata must be installed as a system font. To install: Google Fonts → Literata → Download family → right-click each `.ttf` → Install.

**Alternative: flatten text to paths.** For contexts where font reliability matters more than future editability (print, third-party embedding), convert text to outline paths:

- Inkscape (GUI): Open the SVG → <kbd>Ctrl+A</kbd> → <kbd>Path → Object to Path</kbd> → Save As.
- Inkscape (CLI): `inkscape --export-type=svg --export-text-to-path input.svg -o output.svg`

Keep the live-text versions as sources; produce flattened versions for distribution as needed.

## Web implementation

Guidance for the chartedroots.com site stylesheet.

**Color palette as CSS custom properties.** Expose the palette under `:root` so the rest of the stylesheet references token names rather than raw hex values:

```css
:root {
  --cr-oxblood:        #6B1F1F;
  --cr-navy:           #1E2B45;
  --cr-cream:          #F4EBD5;

  /* Derived — common UI states */
  --cr-oxblood-hover:  #8A2929;              /* ~12% lighter for hover */
  --cr-oxblood-muted:  rgba(107, 31, 31, 0.65);
  --cr-cream-darker:   #E8DBB8;              /* surface elevation on cream */
  --cr-cream-darkest:  #D9CA9F;              /* card borders on cream */
}
```

Tune the derived values against real rendered components before committing to the exact hex / alpha values; the above are reasonable starting points.

**Font loading.** Load Literata via `@fontsource/literata` (self-hosted) rather than a CDN, so the site has no external font dependency. Weights 400, 500, and 600 cover the typography table above; add 600 italic if the design calls for emphasis within titles.

```html
<!-- in document head -->
<link rel="stylesheet" href="/fonts/literata.css">
```

Font stack for fallbacks:

```css
font-family: 'Literata', Georgia, 'Times New Roman', serif;
```

**Accessibility note.** Oxblood `#6B1F1F` on cream `#F4EBD5` yields a contrast ratio of roughly 8.2:1 — passes WCAG AAA for normal text. Deep navy `#1E2B45` on cream is roughly 11:1. Both color pairs are safe for body copy and headings. Avoid oxblood text on pure white (`#FFFFFF`) — the red-brown loses warmth and reads harsher; use oxblood on cream, or swap to navy on white if a white ground is unavoidable.

## Clearspace and minimum size

**Clearspace.** Reserve a margin equivalent to half the mark's diameter on all sides when placing the logo next to other elements. At the reference size (170 pixel mark diameter, 194 pixel disc), that is roughly 85 pixels of clear space. No text, image, or interface element should enter this zone.

**Minimum size.** Do not render the mark below **120 pixels wide** on screen or roughly one inch in print. Below this threshold, the inscription becomes illegible and the interior details (contour lines, leaf dots) collapse into noise. The mark is designed as a logo-scale asset; there is no small-size companion icon.

## Do's and Don'ts

**Do:**

- Preserve the two-color palette exactly as specified above.
- Maintain the internal proportions — the tree, contours, text band, rings, and inscriptions are tuned together.
- Prefer the primary (oxblood on cream) wherever the ground permits it. The two-color treatment is the default.
- Use the monochrome variants for contexts where the cream disc would compete with the surrounding field.
- Pair with Literata, or a similar humanist serif, when the logo appears alongside the product name in body text.

**Don't:**

- Recolor the mark outside the approved palette. No substituting other reds, blues, browns, or background tones.
- Stretch, skew, rotate, or distort the mark on any axis.
- Add effects: drop shadows, glows, gradients, bevels, outer strokes.
- Place on busy, high-contrast, or photographic backgrounds that compete with the ground.
- Separate the inscription text from the seal. The wordmark is part of the mark, not a detachable element.
- Render below the minimum size, or upscale a rasterized export — always render the SVG directly, or use an appropriately-sized PNG.
- Modify the inscription text. "Charted Roots" and "for Obsidian" are fixed.

## Where the logo appears

| Surface | Asset | Notes |
|---------|-------|-------|
| GitHub README (top banner) | Primary SVG or 1024 PNG | Centered. 240–320 px display width. |
| GitHub Wiki Home | Primary SVG or 1024 PNG | Top of page. Similar treatment to README banner. |
| GitHub repo social preview | `charted-roots-social-card.png` | Settings → General → Social preview. PNG only. |
| Obsidian plugin listing | Primary SVG or 1024 PNG | At whatever size the listing accepts. |
| Documentation site | Primary or alternate SVG | Context-dependent; navy when surrounding material is cool-toned. |
| Social posts | `charted-roots-social-card.png` or primary PNG | Card format for link previews; square for avatars. |
| Dark-themed headers or banners | Monochrome — cream | Transparent mark on the existing dark field. |
| Light or cream-toned surfaces without disc | Monochrome — oxblood | When the cream disc would create a visible rectangle against a similar-toned field. |
| Website — header / nav | Horizontal lockup SVG | 40–60 px tall. Links to the homepage. |
| Website — footer | Horizontal lockup SVG or primary seal | Smaller than the header; context-dependent sizing. |
| Website — favicon | `favicon.ico` + PNG icon set | Served from the site root. Simplified mark for 32 / 16 px sizes. |
| Website — Open Graph meta | `charted-roots-social-card.png` | Share preview when links to chartedroots.com are posted elsewhere. |
| Website — hero / landing | Primary SVG (seal) or 1024 PNG | Generous size with clearspace preserved. |

Update this table whenever the logo is added to a new surface, so future revisions know where re-deployment is needed.

## Third-party use

Community members writing about Charted Roots (blog posts, videos, tutorials, meetups) may use the logo under these conditions:

- Use the unmodified vector or PNG files from this directory — don't redraw, recolor, or regenerate the mark.
- Maintain the clearspace and minimum-size rules above.
- Don't imply endorsement or official affiliation with the project unless that relationship actually exists.
- If you're unsure whether a specific use is appropriate, open a [discussion](https://github.com/banisterious/obsidian-charted-roots/discussions) — we're happy to chat.

The plugin itself is MIT-licensed, but the logo and brand assets in this directory are governed by the usage rules in this document, not by the plugin license. Practically: the code can be forked freely; the brand identity stays with the project.

## Revision history

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-22 | Initial release. Cartographic seal design, inscribed "Charted Roots" on the top arc and "for Obsidian" on the bottom arc. Typeface: Literata. Palette: oxblood, navy, cream. |
| 1.1 | 2026-04-23 | Added 1200 × 630 social card (SVG source + PNG for GitHub repo social preview). Added 1024 and 512 PNG exports for all four seal variants. |
| 1.2 | 2026-04-23 | Website-focused extensions for the chartedroots.com site. Added favicon and PWA icon set, horizontal lockup placeholder for nav bars, web-specific typography rows (body copy, section headings, small UI text), a Web implementation section with CSS custom properties and font-loading guidance, accessibility contrast notes, five website-specific rows in "Where the logo appears," and a Third-party use section covering community usage rules. |
| 1.3 | 2026-04-23 | Produced the assets previously placeholdered in v1.2: `charted-roots-favicon-mark.svg`, `charted-roots-horizontal.svg`, `favicon.ico`, and the PNG set (`favicon-32.png`, `favicon-180.png`, `icon-192.png`, `icon-512.png`). Corrected the navy-on-cream contrast ratio (actual ~11:1) and aligned the favicon threshold wording with the 120 px minimum size rule. |
