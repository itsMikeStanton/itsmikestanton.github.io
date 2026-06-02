'use strict';

// ── ART SECTION ───────────────────────────────────────────────────────────────
// Data-driven from JSON manifests (no item data baked in here):
//   art/index.json              ← collection registry (landing grid)
//   art/<collection-id>/meta.json  ← that collection's item list (loaded on open)
//   art/<collection-id>/cover.jpg  ← optional collection thumbnail
//   art/<collection-id>/NN.jpg     ← the works themselves
// See art/README.md for the manifest shapes.
registerSection('ART', {
  type: 'panel',
  index: 'art/index.json',
});
