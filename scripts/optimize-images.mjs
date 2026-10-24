// Builds optimised web copies of the original photos/logos.
// Originals are never modified. Usage:
//   IMAGES_SRC=/path/to/originals npm run images
// Output: public/images/<name>-<width>.webp (+ trimmed transparent padding)
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.env.IMAGES_SRC ?? path.resolve("../assets-original");
const OUT = path.resolve("public/images");
const WIDTHS = [480, 960, 1600];

await mkdir(OUT, { recursive: true });
const manifest = {};
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));

for (const file of files) {
  const name = file.replace(/\.(png|jpe?g)$/i, "");
  // Product cut-outs have lots of transparent padding; trim it so cards can
  // frame the book consistently, then add a small even margin back.
  const base = sharp(path.join(SRC, file)).trim({ threshold: 1 });
  const buf = await base.toBuffer();
  const meta = await sharp(buf).metadata();
  for (const w of WIDTHS) {
    if (meta.width && w > meta.width * 1.05 && w !== WIDTHS[0]) continue;
    await sharp(buf)
      .resize({ width: Math.min(w, meta.width ?? w), withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90, effort: 5 })
      .toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  const largest = [...WIDTHS].reverse().find((w) => !(meta.width && w > meta.width * 1.05 && w !== WIDTHS[0]));
  const outW = Math.min(largest, meta.width);
  manifest[name] = { src: `/images/${name}-${largest}.webp`, width: outW, height: Math.round((meta.height / meta.width) * outW) };
  console.log(`${name}: ${meta.width}x${meta.height}`);
}

await writeFile(path.resolve("src/lib/image-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// Favicon / app icons from the round logo mark.
const mark = path.join(SRC, "logo-mark.png");
await sharp(mark).resize(512, 512).png().toFile(path.resolve("src/app/icon.png"));
await sharp(mark).resize(180, 180).flatten({ background: "#ffffff" }).png().toFile(path.resolve("src/app/apple-icon.png"));
console.log("icons written");
