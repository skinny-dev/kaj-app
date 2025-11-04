import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

// Config
const BASE_URL = process.env.QR_BASE_URL?.trim() || 'https://cafe-kaj.ir/menu';
const COUNT = Number(process.env.QR_TABLE_COUNT || 25);
const OUT_DIR = join(process.cwd(), 'docs', 'qrcodes');
const WIDTH = Number(process.env.QR_SIZE || 512);

mkdirSync(OUT_DIR, { recursive: true });

const csvLines = [
  'qrName,hostname,scanLimit,url',
];

console.log(`Generating ${COUNT} QR codes to ${OUT_DIR}...`);

for (let i = 1; i <= COUNT; i++) {
  const url = `${BASE_URL}?dinein=1&table=${i}`;
  const filename = `table-${i}.png`;
  const filePath = join(OUT_DIR, filename);
  // Add to CSV manifest
  csvLines.push(`"میز ${i}",,,"${url}"`);
  // Generate PNG buffer
  const opts = { width: WIDTH, margin: 2, errorCorrectionLevel: 'M' };
  const pngBuffer = await QRCode.toBuffer(url, opts);
  writeFileSync(filePath, pngBuffer);
  console.log(`  ✔ ${filename}`);
}

// Write a manifest CSV next to the images for convenience
writeFileSync(join(OUT_DIR, 'manifest.csv'), csvLines.join('\n'), 'utf8');

// Readme with quick info
const readme = `# Table QR Codes\n\n- Count: ${COUNT}\n- Base URL: ${BASE_URL}\n- Size: ${WIDTH}px\n- Files: table-1.png ... table-${COUNT}.png\n\nCSV manifest is included for quick import.\n`;
writeFileSync(join(OUT_DIR, 'README.md'), readme, 'utf8');

console.log('Done.');
