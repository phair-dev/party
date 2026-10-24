// Usage: node scripts/make-qr.mjs [url]
// Writes print/qr.png, print/qr.svg and print/poster.html (open the poster in a browser and print it).
import { writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const url = process.argv[2] ?? 'https://party.phair.app'

await QRCode.toFile('print/qr.png', url, { width: 1200, margin: 2, errorCorrectionLevel: 'H' })
const svg = await QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'H' })
writeFileSync('print/qr.svg', svg)
writeFileSync(
  'print/poster.html',
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Costume Contest QR</title>
<style>
  @page { margin: 0.5in }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; text-align: center; color: #1a1a2e; }
  h1 { font-size: 56px; margin: 24px 0 0; }
  p { font-size: 28px; margin: 8px 0; }
  svg { width: 6.5in; height: 6.5in; }
  .url { font-size: 34px; font-weight: 700; }
</style></head><body>
<h1>🎃 Costume Contest 🎃</h1>
<p>Scan to vote!</p>
${svg}
<p class="url">${url.replace('https://', '')}</p>
</body></html>
`,
)
console.log(`QR for ${url} written to print/`)
