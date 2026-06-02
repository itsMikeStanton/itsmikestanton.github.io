# art/ — image storage + manifests

The gallery is data-driven. Two kinds of JSON drive it; drop images alongside.

## 1. `art/index.json` — the collection registry (landing grid)

One entry per collection. Loaded when ART opens.

```json
{
  "title": "[ ART ]",
  "sub": "Visual work exploring systems, noise...",
  "collections": [
    { "id": "noise-studies", "label": "noise studies",
      "desc": "digital · 2023–2024", "path": "art/noise-studies",
      "cover": "cover.jpg", "count": 3 }
  ]
}
```

- `path` — folder for this collection's images + its `meta.json`
- `cover` — thumbnail shown on the collection card (optional)
- `count` — works count shown on the card (optional, cosmetic)

## 2. `art/<id>/meta.json` — that collection's works

Loaded only when the collection is opened (lazy). `file` is relative to the
collection folder; grid order follows array order.

```json
{
  "label": "noise studies",
  "desc": "digital · 2023–2024",
  "items": [
    { "file": "01.jpg", "label": "noise study #1", "tag": "digital", "year": "2024" }
  ]
}
```

## Images

- `art/<id>/cover.jpg` — collection thumbnail
- `art/<id>/01.jpg, 02.jpg, ...` — the works (any filename; must match `meta.json`)

Thumbnails lazy-load on scroll; the detail view streams the full image with a
live progress bar. Missing files degrade gracefully (`[ ? ]` / `[ NO SIGNAL ]`),
and a collection with no `meta.json` shows `[ collection unavailable ]`.

To add a collection: add an entry to `index.json`, create the folder with a
`meta.json`, drop the images in.
