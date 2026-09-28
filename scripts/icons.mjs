// Builds the assets pwa-assets-generator doesn't: favicon.ico from the
// small-size favicon design, and the Open Graph share image.
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SIZES = [16, 32, 48]

// An .ico is a directory of embedded PNGs: a 6-byte header, a 16-byte entry
// per image, then the image data.
const pngs = await Promise.all(
  SIZES.map((size) =>
    sharp('public/favicon.svg', { density: 72 * (size / 16) }).resize(size, size).png().toBuffer(),
  ),
)
const header = Buffer.alloc(6)
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(pngs.length, 4)
let offset = 6 + 16 * pngs.length
const entries = pngs.map((png, i) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(SIZES[i], 0)
  entry.writeUInt8(SIZES[i], 1)
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += png.length
  return entry
})
await writeFile('public/favicon.ico', Buffer.concat([header, ...entries, ...pngs]))

await sharp('scripts/og.svg').png().toFile('public/og.png')
