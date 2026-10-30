# VN SHOP SEO publishing notes

## Product pages
- Product records stay in `merch.json`; each `slug` is the permanent URL key.
- The generator creates a static HTML page at `/products/{slug}/` for every active product.
- Preserve original display names, artist spellings, release titles, track names and VN terminology.
- `seoDescription` should describe the actual item without inventing materials, stock, edition size or performance claims.

## Collections
- Collection pages are generated only for categories with active products.
- Keep the original category key (for example, `XTRAS`) as the visible collection name.

## Multilingual SEO
- English is the currently published catalog language.
- Add a complete translation to `translations: { "fr": { "slug": "...", "name": "...", "description": "...", "seoDescription": "..." } }`.
- The generator creates a locale-specific static page and reciprocal hreflang links only when all translated fields exist.
- Preserve artist names, release names, track titles and VN's own category/brand terms unless an official localized form exists.
- Cookie-panel language choices are not treated as translated catalog pages.

## Automatic publishing
- GitHub Actions rebuilds product pages, collection pages and `sitemap.xml` when `merch.json`, templates or the generator changes.
- Generated pages are committed to `main` and published by GitHub Pages.
