const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function generateSVG(size) {
  const dotSize = size * 0.04;
  const padding = size * 0.15;
  const cols = 5;
  const rows = 5;
  const gridW = size - padding * 2;
  const gridH = size - padding * 2;
  const gapX = gridW / (cols - 1);
  const gapY = gridH / (rows - 1);

  let dots = "";
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = padding + c * gapX;
      const cy = padding + r * gapY;
      const filled = count < 13;
      const current = count === 13;
      if (current) {
        dots += `<circle cx="${cx}" cy="${cy}" r="${dotSize * 1.4}" fill="#22d3ee" opacity="1"/>`;
        dots += `<circle cx="${cx}" cy="${cy}" r="${dotSize * 2.5}" fill="#22d3ee" opacity="0.2"/>`;
      } else if (filled) {
        dots += `<circle cx="${cx}" cy="${cy}" r="${dotSize}" fill="#71717a" opacity="0.8"/>`;
      } else {
        dots += `<circle cx="${cx}" cy="${cy}" r="${dotSize}" fill="none" stroke="#3f3f46" stroke-width="${size * 0.005}"/>`;
      }
      count++;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0a0a0a"/>
  ${dots}
</svg>`;
}

async function main() {
  const iconsDir = path.join(__dirname, "..", "public", "icons");

  for (const size of [192, 512]) {
    const svg = generateSVG(size);
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(svgPath, svg);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(pngPath);
    console.log(`Generated icon-${size}.png`);
  }
}

main().catch(console.error);
