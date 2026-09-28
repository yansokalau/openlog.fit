import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Rasterises public/icon.png into the PNG icons the manifest and iOS need.
// The tab favicon is a separate design drawn for 16px (public/favicon.svg), so
// favicon.ico is built from that by scripts/icons.mjs, not from here.
// Run `npm run icons` after changing either; the outputs are committed.
const YELLOW = '#F5E401'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    // Android crops maskable icons to a circle of 80% width; the pencil runs
    // nearly edge to edge, so shrink it onto the same yellow.
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: { background: YELLOW } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: YELLOW } },
  },
  images: ['public/icon.png'],
})
