import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Rasterises public/favicon.svg into the PNG icons the manifest and iOS need.
// Run `npm run icons` after changing the SVG; the PNGs are committed.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#000000' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#000000' } },
  },
  images: ['public/favicon.svg'],
})
