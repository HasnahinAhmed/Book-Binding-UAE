import * as THREE from "three";
import { fontStackFor, type BookConfig, type MaterialKind } from "./config";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function makeCanvas(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  return ctx;
}

function canvasTexture(
  ctx: CanvasRenderingContext2D,
  srgb = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

/** deterministic pseudo random */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* cover material: albedo + normal (leather / cloth)                   */
/* ------------------------------------------------------------------ */

function valueNoise(
  size: number,
  cell: number,
  rng: () => number,
  octaves = 4
): Float32Array {
  const field = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = Math.max(2, Math.round(size / (cell / Math.pow(2, o))));
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * cells;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const y1 = (y0 + 1) % cells;
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const x1 = (x0 + 1) % cells;
        const v =
          grid[y0 * cells + x0] * (1 - sx) * (1 - sy) +
          grid[y0 * cells + x1] * sx * (1 - sy) +
          grid[y1 * cells + x0] * (1 - sx) * sy +
          grid[y1 * cells + x1] * sx * sy;
        field[y * size + x] += v * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < field.length; i++) field[i] /= total;
  return field;
}

/** height field -> tangent-space normal map canvas (w × h, wrapped) */
function normalMapCanvas(
  height: Float32Array,
  w: number,
  h: number,
  strength: number
): CanvasRenderingContext2D {
  const ctx = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const at = (x: number, y: number) =>
    height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // normal = normalize(-dx, -dy, 1)
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

export interface CoverMaps {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Tileable Worley/cellular noise (grid-accelerated, torus metric).
 * Returns F1 & F2 distances plus the nearest-cell id (for per-cell tinting).
 */
function worleyTiled(
  size: number,
  cells: number,
  seed: number
): { f1: Float32Array; f2: Float32Array; id: Int32Array } {
  const rng = makeRng(seed);
  const cell = size / cells;
  const n = cells * cells;
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    px[i] = (i % cells) * cell + rng() * cell;
    py[i] = Math.floor(i / cells) * cell + rng() * cell;
  }
  const f1 = new Float32Array(size * size);
  const f2 = new Float32Array(size * size);
  const id = new Int32Array(size * size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell);
      let d1 = Infinity;
      let d2 = Infinity;
      let best = 0;
      for (let oy = -1; oy <= 1; oy++) {
        let cy = gy + oy;
        cy = ((cy % cells) + cells) % cells;
        for (let ox = -1; ox <= 1; ox++) {
          let cx = gx + ox;
          cx = ((cx % cells) + cells) % cells;
          const ci = cy * cells + cx;
          let dx = x - px[ci];
          if (dx > half) dx -= size;
          else if (dx < -half) dx += size;
          let dy = y - py[ci];
          if (dy > half) dy -= size;
          else if (dy < -half) dy += size;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            best = ci;
          } else if (d < d2) {
            d2 = d;
          }
        }
      }
      const i = y * size + x;
      f1[i] = d1;
      f2[i] = d2;
      id[i] = best;
    }
  }
  return { f1, f2, id };
}

/**
 * Realistic pebbled leather: two Worley octaves (pebbles ~3mm + micro grain
 * ~1.4mm) plus fine pore noise. Height domes in cell centres, creases at
 * cell borders, per-pebble tone variation for the albedo.
 */
function leatherFields(size: number): { height: Float32Array; tone: Float32Array } {
  const COARSE = 26; // pebbles per tile -> ~3.2mm at cover scale
  const FINE = 58;
  const coarse = worleyTiled(size, COARSE, 91101);
  const fine = worleyTiled(size, FINE, 4242);
  const micro = valueNoise(size, 3, makeRng(777), 2);
  // broad macro undulation: skin-stretch creases & tone patches that break
  // up the otherwise uniform grain
  const macro = valueNoise(size, 44, makeRng(5150), 3);

  const nCoarse = COARSE * COARSE;
  const toneRng = makeRng(13579);
  const tones = new Float32Array(nCoarse);
  for (let i = 0; i < nCoarse; i++) tones[i] = 0.94 + toneRng() * 0.08;

  const creaseC = (size / COARSE) * 0.42;
  const creaseF = (size / FINE) * 0.5;
  const height = new Float32Array(size * size);
  const cellTone = new Float32Array(size * size);

  for (let i = 0; i < height.length; i++) {
    const domeC = smoothstep(0, creaseC, coarse.f2[i] - coarse.f1[i]);
    const domeF = smoothstep(0, creaseF, fine.f2[i] - fine.f1[i]);
    // pebble dome with slightly rounded plateau + micro pores,
    // modulated by the macro field for natural unevenness
    const h =
      Math.pow(domeC, 1.25) * 0.6 + domeF * 0.26 + micro[i] * 0.14;
    height[i] = h * (0.84 + macro[i] * 0.16);
    cellTone[i] = tones[coarse.id[i]] * (0.92 + macro[i] * 0.1);
  }
  return { height, tone: cellTone };
}

/**
 * Fine book cloth (library buckram / linen), built as restrained layers:
 *   1. low-frequency macro tone & undulation patches (cloth panels)
 *   2. fine plain weave — warp/weft alternating over/under
 *   3. micro fibre fuzz noise
 * The weave reads through grazing highlights and sheen, NOT as visible
 * bumps: thread relief amplitude is deliberately small. Threads ~0.7mm.
 */
function clothFields(size: number): { height: Float32Array; tone: Float32Array } {
  const P = 5.2; // thread pitch in px -> ~0.71mm threads, fine buckram
  const cols = Math.ceil(size / P) + 1;
  const rngA = makeRng(20461);
  const rngT = makeRng(20462);
  const ampX = new Float32Array(cols);
  const ampY = new Float32Array(cols);
  const toneX = new Float32Array(cols);
  const toneY = new Float32Array(cols);
  for (let i = 0; i < cols; i++) {
    // restrained per-thread thickness / tone variation
    ampX[i] = 0.86 + rngA() * 0.28;
    ampY[i] = 0.86 + rngA() * 0.28;
    toneX[i] = 0.952 + rngT() * 0.066;
    toneY[i] = 0.952 + rngT() * 0.066;
  }
  // micro fibres: near-pixel frequency, tiny amplitude
  const fuzz = valueNoise(size, 2, makeRng(3141), 2);
  // macro cloth patches: broad tone/undulation that breaks tiling
  const macro = valueNoise(size, 148, makeRng(5926), 3);
  const macro2 = valueNoise(size, 57, makeRng(7717), 2);

  const height = new Float32Array(size * size);
  const threadTone = new Float32Array(size * size);
  const bump = (t: number) => Math.sin(Math.PI * t);

  for (let y = 0; y < size; y++) {
    const cy = Math.floor(y / P);
    const tv = (y - cy * P) / P;
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / P);
      const tu = (x - cx * P) / P;
      const i = y * size + x;
      // plain weave: vertical & horizontal threads alternate over/under.
      // gentle crests; the under-thread still shows as a shallow valley
      const verticalOnTop = (cx + cy) % 2 === 0;
      const ax = ampX[cx % cols];
      const ay = ampY[cy % cols];
      let h: number;
      if (verticalOnTop) {
        h = bump(tu) * 0.6 * ax + bump(tv) * 0.34 * ay;
      } else {
        h = bump(tv) * 0.6 * ay + bump(tu) * 0.34 * ax;
      }
      // fuzz sits in the interstices; macro waves the whole panel
      h = h * 0.82 + fuzz[i] * 0.18 + macro[i] * 0.1;
      height[i] = h;
      const w = verticalOnTop ? 0.72 : 0.28;
      threadTone[i] =
        toneX[cx % cols] * w + toneY[cy % cols] * (1 - w) - 0.01 + macro2[i] * 0.02;
    }
  }
  return { height, tone: threadTone };
}

/** physical tile size (mm) each cover texture represents on the book.
 *  The case mesh authors UVs in millimetres, so this must stay in sync
 *  with the UV units used by book-model.ts. */
export const COVER_TILE_MM = 68;

export function makeCoverMaps(material: MaterialKind): CoverMaps {
  const size = 512;
  const isLeather = material === "leather";
  const fields = isLeather ? leatherFields(size) : clothFields(size);
  const height = fields.height;

  // normal map: heavily restrained — cloth thread relief must read through
  // grazing highlights only, leather creases stay shallow
  const normalCtx = normalMapCanvas(height, size, size, isLeather ? 3.6 : 2.6);
  const normal = new THREE.CanvasTexture(normalCtx.canvas);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  // UVs on the case mesh are authored in millimetres; the repeat converts
  // mm -> texture tiles so the weave density is physically correct
  normal.repeat.set(1 / COVER_TILE_MM, 1 / COVER_TILE_MM);
  normal.anisotropy = 8;

  // albedo: quiet tone variation (creases/gaps only slightly darkened)
  const ctx = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  // roughness: polished full-grain leather ~0.34 domes / ~0.5 creases;
  // coated buckram ~0.52 thread crowns / ~0.64 gaps (map range, multiplied
  // by material.roughness = 1)
  const rCtx = makeCanvas(size, size);
  const rImg = rCtx.createImageData(size, size);
  const rBase = isLeather ? 0.34 : 0.52;
  const rRange = isLeather ? 0.18 : 0.13;
  for (let i = 0; i < height.length; i++) {
    const h = height[i];
    const shade = isLeather
      ? fields.tone[i] * (0.88 + 0.12 * smoothstep(0.1, 0.6, h))
      : fields.tone[i] * (0.93 + 0.07 * smoothstep(0.05, 0.5, h));
    const v = Math.max(0, Math.min(255, Math.round(shade * 255)));
    const j = i * 4;
    img.data[j] = v;
    img.data[j + 1] = v;
    img.data[j + 2] = v;
    img.data[j + 3] = 255;

    const r = Math.max(0, Math.min(255, Math.round((rBase + (1 - h) * rRange) * 255)));
    rImg.data[j] = r;
    rImg.data[j + 1] = r;
    rImg.data[j + 2] = r;
    rImg.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const albedo = new THREE.CanvasTexture(ctx.canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(1 / COVER_TILE_MM, 1 / COVER_TILE_MM);
  albedo.anisotropy = 8;

  rCtx.putImageData(rImg, 0, 0);
  const roughness = new THREE.CanvasTexture(rCtx.canvas);
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(1 / COVER_TILE_MM, 1 / COVER_TILE_MM);
  roughness.anisotropy = 8;

  return { albedo, normal, roughness };
}

/* ------------------------------------------------------------------ */
/* page edges: visible stacked page lines + normal grooves             */
/* ------------------------------------------------------------------ */

export interface PageEdgeMaps {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
}

/**
 * Stacked-page block texture. Lines run across the page width and repeat
 * along the page-thickness axis ("fore" = fore-edge face, lines vertical;
 * "flat" = head/tail faces, lines horizontal). Includes per-page tone
 * variation, section-gathering bands, wavering lines and a normal map whose
 * grooves catch oblique light -> micro-shadows between pages.
 */
export function makePageEdgeMaps(kind: "fore" | "flat"): PageEdgeMaps {
  const S = 1024;
  const ctx = makeCanvas(S, S);
  const rng = makeRng(kind === "fore" ? 4242 : 9292);
  const vertical = kind === "fore";

  // paper base (warm cream — real paper blocks never glow pure white)
  ctx.fillStyle = "#ECE5D3";
  ctx.fillRect(0, 0, S, S);

  // per-page tone strips: cream mottling + occasional yellowed page
  const pitch = 3;
  const pages = Math.floor(S / pitch);
  for (let i = 0; i < pages; i++) {
    const p = i * pitch;
    const yellowed = rng() < 0.05;
    const a = 0.03 + rng() * 0.05;
    ctx.fillStyle = yellowed
      ? `rgba(198, 178, 132, ${(a + 0.035).toFixed(3)})`
      : `rgba(184, 176, 158, ${a.toFixed(3)})`;
    if (vertical) ctx.fillRect(p, 0, pitch, S);
    else ctx.fillRect(0, p, S, pitch);
  }

  // section-gathering bands (groups of pages slightly darker)
  for (let g = 0; g < 30; g++) {
    const a = 0.04 + rng() * 0.05;
    const len = 6 + rng() * 26;
    const at = rng() * S;
    ctx.fillStyle = `rgba(120, 110, 90, ${a.toFixed(3)})`;
    if (vertical) ctx.fillRect(at, 0, len, S);
    else ctx.fillRect(0, at, S, len);
  }

  // broad tonal mottling: soft blotches of uneven paper ageing that
  // remain visible at normal viewing distance (per-page strips do not)
  for (let b = 0; b < 45; b++) {
    const cx = rng() * S;
    const cy = rng() * S;
    const r = 20 + rng() * 90;
    const warm = rng() < 0.45;
    const a = 0.018 + rng() * 0.038;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, warm ? `rgba(186, 164, 118, ${a.toFixed(3)})` : `rgba(150, 142, 124, ${a.toFixed(3)})`);
    grad.addColorStop(1, "rgba(150, 142, 124, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // page-edge lines: every sheet, wavering, uneven darkness; every 16th
  // line sits in a darker gathering band (sewn section boundary) whose
  // block-level brightness varies -> visible depth difference between sections
  const SAMPLES = 16;
  for (let i = 0; i < pages; i++) {
    const block = Math.floor(i / 16);
    const blockRng = makeRng(6000 + block);
    const blockBase = 0.14 + blockRng() * 0.16;
    const base = i * pitch + rng() * 0.9;
    const gathering = i % 16 === 0;
    if (gathering) {
      // visible section band (a few sheets tall)
      const bandA = 0.07 + rng() * 0.07;
      ctx.fillStyle = `rgba(120, 108, 88, ${bandA.toFixed(3)})`;
      if (vertical) ctx.fillRect(base - 1.5, 0, 4, S);
      else ctx.fillRect(0, base - 1.5, S, 4);
    }
    const alpha = (gathering ? 0.34 : blockBase) + rng() * 0.13;
    ctx.strokeStyle = `rgba(96, 86, 70, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.1 + rng() * 0.6;
    // slow wander along the line -> real stacks are never perfectly straight
    const wA = 0.5 + rng() * 1.4;
    const wF = (Math.PI * 2) / (70 + rng() * 260);
    const wP = rng() * Math.PI * 2;
    const w2A = 0.3 + rng() * 0.6;
    const w2F = (Math.PI * 2) / (30 + rng() * 80);
    const w2P = rng() * Math.PI * 2;
    ctx.beginPath();
    for (let s = 0; s <= SAMPLES; s++) {
      const along = (s / SAMPLES) * S;
      const off =
        wA * Math.sin(along * wF + wP) + w2A * Math.sin(along * w2F + w2P);
      if (vertical) {
        const x = base + off;
        if (s === 0) ctx.moveTo(x, 0);
        else ctx.lineTo(x, along);
      } else {
        const y = base + off;
        if (s === 0) ctx.moveTo(0, y);
        else ctx.lineTo(along, y);
      }
    }
    ctx.stroke();
  }

  // spine-side shading: pages darken as they curve into the binding
  // (glue block / binding shadow reads as a soft gradient, not a hard edge)
  if (!vertical) {
    const grad = ctx.createLinearGradient(0, 0, S, 0);
    grad.addColorStop(0, "rgba(66, 58, 46, 0.26)");
    grad.addColorStop(0.1, "rgba(66, 58, 46, 0.16)");
    grad.addColorStop(0.28, "rgba(66, 58, 46, 0.05)");
    grad.addColorStop(0.55, "rgba(66, 58, 46, 0)");
    grad.addColorStop(1, "rgba(66, 58, 46, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  } else {
    const g1 = ctx.createLinearGradient(0, 0, 0, S);
    g1.addColorStop(0, "rgba(66, 58, 46, 0.12)");
    g1.addColorStop(0.15, "rgba(66, 58, 46, 0)");
    g1.addColorStop(0.85, "rgba(66, 58, 46, 0)");
    g1.addColorStop(1, "rgba(66, 58, 46, 0.12)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, S, S);
  }

  // derive a normal map from the albedo luminance so the page grooves
  // receive directional light (restrained: grooves, not canyon walls)
  const data = ctx.getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    lum[i] =
      (data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722) / 255;
  }
  const normalCtx = normalMapCanvas(lum, S, S, 12);

  const albedo = new THREE.CanvasTexture(ctx.canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 16;
  const normal = new THREE.CanvasTexture(normalCtx.canvas);
  normal.anisotropy = 16;
  return { albedo, normal };
}

/* ------------------------------------------------------------------ */
/* headband stripes                                                    */
/* ------------------------------------------------------------------ */

export function makeHeadbandTexture(base: string): THREE.CanvasTexture {
  const w = 256;
  const h = 64;
  const ctx = makeCanvas(w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // woven core stripe (silk core wrapped by coloured thread)
  ctx.fillStyle = "#E8E2D2";
  for (let x = 0; x < w; x += 24) {
    ctx.fillRect(x, 6, 8, h - 12);
  }
  // fine warp shading — tight weave, not rubber tubing
  ctx.fillStyle = "rgba(0,0,0,0.13)";
  for (let x = 0; x < w; x += 5) {
    ctx.fillRect(x, 0, 2, h);
  }
  // subtle highlight ridge along the crown
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(0, 0, w, 8);
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(0, h - 8, w, 8);

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ */
/* user-uploaded logo preparation                                      */
/* ------------------------------------------------------------------ */

/**
 * Prepare an uploaded logo for foil stamping:
 *  - downsample to <= 512px (keeps the data light & crisp at book scale)
 *  - force RGB to white so the stamping takes the single selected foil
 *    colour (real foil dies are one colour)
 *  - opaque images (JPG-style): flood-fill the white background out from
 *    the borders so interior white details survive, then feather halos
 */
export function prepareLogoCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const MAX = 512;
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const s = Math.min(1, MAX / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * s));
  const h = Math.max(1, Math.round(ih * s));
  const ctx = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;

  // does the image carry real transparency?
  let transparent = false;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 250) {
      transparent = true;
      break;
    }
  }

  if (!transparent) {
    // opaque image: key out the white background, flooding from the
    // borders only (so white enclosed inside the mark stays stamped)
    const nearWhite = (p: number) =>
      d[p] > 228 && d[p + 1] > 228 && d[p + 2] > 228;
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    const visit = (p: number) => {
      if (!visited[p]) {
        visited[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < w; x++) {
      if (nearWhite(x * 4)) visit(x);
      if (nearWhite(((h - 1) * w + x) * 4)) visit((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      if (nearWhite(y * w * 4)) visit(y * w);
      if (nearWhite((y * w + w - 1) * 4)) visit(y * w + w - 1);
    }
    while (stack.length > 0) {
      const p = stack.pop()!;
      d[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0 && !visited[p - 1] && nearWhite((p - 1) * 4)) visit(p - 1);
      if (x < w - 1 && !visited[p + 1] && nearWhite((p + 1) * 4)) visit(p + 1);
      if (y > 0 && !visited[p - w] && nearWhite((p - w) * 4)) visit(p - w);
      if (y < h - 1 && !visited[p + w] && nearWhite((p + w) * 4)) visit(p + w);
    }
    // feather the anti-aliased halo next to the keyed area
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (d[p * 4 + 3] === 0) continue;
        const touches =
          (x > 0 && d[(p - 1) * 4 + 3] === 0) ||
          (x < w - 1 && d[(p + 1) * 4 + 3] === 0) ||
          (y > 0 && d[(p - w) * 4 + 3] === 0) ||
          (y < h - 1 && d[(p + w) * 4 + 3] === 0);
        if (touches) {
          const lum = (d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2]) / 3;
          if (lum > 170) {
            const k = Math.max(0, Math.min(1, (245 - lum) / 75));
            d[p * 4 + 3] = Math.round(d[p * 4 + 3] * k);
          }
        }
      }
    }
  }

  // stamping is single-colour: flatten RGB to white, keep the alpha mask
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return ctx.canvas;
}

/** contain-fit the prepared logo inside a box, centred at (cx, cy) */
function drawLogoInto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  boxW: number,
  boxH: number,
  logo: HTMLCanvasElement
) {
  const s = Math.min(boxW / logo.width, boxH / logo.height);
  const w = logo.width * s;
  const h = logo.height * s;
  ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
}

/** render the drawn university seal to a PNG data URL — the white-paper
 * editor uses it to preview the seal exactly as it will stamp */
export function sealDataUrl(px: number, color = "#C9A24B"): string {
  const ctx = makeCanvas(px, px);
  drawUniversitySeal(ctx, px / 2, px / 2, px * 0.96, color);
  return ctx.canvas.toDataURL("image/png");
}

/* ------------------------------------------------------------------ */
/* gold foil cover art (alpha textures)                                */
/* ------------------------------------------------------------------ */

// Academic serif stack: Tinos = metric clone of Times New Roman (Google
// Fonts), Liberation Serif substitutes 1:1 offline, then native Times.
const TITLE_FONT = '"Tinos", "Times New Roman", "Liberation Serif", Georgia, serif';
const BODY_FONT = '"Tinos", "Times New Roman", "Liberation Serif", Georgia, serif';
const ARABIC_FONT =
  '"Noto Naskh Arabic", "Amiri", "Traditional Arabic", "Geeza Pro", "Times New Roman", serif';

function setSpacing(ctx: CanvasRenderingContext2D, px: number | string) {
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  spaced.letterSpacing = px === 0 ? "0px" : `${px}px`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  minSize: number,
  font: string,
  weight = "400"
): { lines: string[]; size: number } {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight} ${Math.round(size)}px ${font}`;
    const lines = wrapText(ctx, text, maxWidth);
    const lineH = size * 1.28;
    if (lines.length * lineH <= maxHeight && lines.length <= 5) {
      return { lines, size };
    }
    size -= 3;
  }
  ctx.font = `${weight} ${Math.round(minSize)}px ${font}`;
  const lines = wrapText(ctx, text, maxWidth).slice(0, 5);
  return { lines, size: minSize };
}

/** single-line auto-fit (shrinks font until the text fits maxWidth) */
function fitOneLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  font: string,
  weight = "700"
): number {
  let size = startSize;
  ctx.font = `${weight} ${Math.round(size)}px ${font}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 0.25;
    ctx.font = `${weight} ${Math.round(size)}px ${font}`;
  }
  return size;
}

/**
 * Circular university seal in fine gold line art — after the Ajman / AUS
 * crests: double outer rings, cogwheel band (engineering), battlement
 * tower, open book, and small founding-year marks flanking the emblem.
 */
function drawUniversitySeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  d: number,
  stroke: string,
  opts: { left?: string; right?: string } = {}
) {
  const R = d / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // outer ring
  const lw1 = Math.max(1.8, d * 0.044);
  ctx.lineWidth = lw1;
  ctx.beginPath();
  ctx.arc(0, 0, R - lw1 / 2, 0, Math.PI * 2);
  ctx.stroke();

  // inner ring
  const r2 = R * 0.88;
  ctx.lineWidth = Math.max(1.2, d * 0.02);
  ctx.beginPath();
  ctx.arc(0, 0, r2, 0, Math.PI * 2);
  ctx.stroke();

  // cogwheel ring with teeth (the engineering motif)
  const r3 = R * 0.5;
  ctx.lineWidth = Math.max(1.2, d * 0.024);
  ctx.beginPath();
  ctx.arc(0, 0, r3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, d * 0.028);
  const teeth = 28;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(c * (r3 - d * 0.03), s * (r3 - d * 0.03));
    ctx.lineTo(c * (r3 + d * 0.026), s * (r3 + d * 0.026));
    ctx.stroke();
  }

  // battlement tower (upper emblem)
  const bw = R * 0.5;
  const merlon = bw / 5;
  const ty = -R * 0.42;
  const th = R * 0.34;
  ctx.lineWidth = Math.max(1.4, d * 0.026);
  ctx.beginPath();
  ctx.moveTo(-bw / 2, ty + th);
  ctx.lineTo(-bw / 2, ty + merlon);
  ctx.lineTo(-bw / 2 + merlon, ty + merlon);
  ctx.lineTo(-bw / 2 + merlon, ty);
  ctx.lineTo(-bw / 2 + 2 * merlon, ty);
  ctx.lineTo(-bw / 2 + 2 * merlon, ty + merlon);
  ctx.lineTo(bw / 2 - 2 * merlon, ty + merlon);
  ctx.lineTo(bw / 2 - 2 * merlon, ty);
  ctx.lineTo(bw / 2 - merlon, ty);
  ctx.lineTo(bw / 2 - merlon, ty + merlon);
  ctx.lineTo(bw / 2, ty + merlon);
  ctx.lineTo(bw / 2, ty + th);
  ctx.closePath();
  ctx.stroke();
  // arched doorway
  ctx.beginPath();
  ctx.moveTo(-bw * 0.14, ty + th);
  ctx.lineTo(-bw * 0.14, ty + th - R * 0.16);
  ctx.quadraticCurveTo(0, ty + th - R * 0.24, bw * 0.14, ty + th - R * 0.16);
  ctx.lineTo(bw * 0.14, ty + th);
  ctx.stroke();

  // open book (lower emblem)
  const bookW = R * 0.74;
  const by = R * 0.38;
  ctx.lineWidth = Math.max(1.6, d * 0.032);
  ctx.beginPath();
  ctx.moveTo(-bookW / 2, by - R * 0.11);
  ctx.quadraticCurveTo(-bookW / 4, by - R * 0.19, 0, by - R * 0.09);
  ctx.quadraticCurveTo(bookW / 4, by - R * 0.19, bookW / 2, by - R * 0.11);
  ctx.lineTo(bookW / 2, by + R * 0.09);
  ctx.quadraticCurveTo(bookW / 4, by + R * 0.02, 0, by + R * 0.11);
  ctx.quadraticCurveTo(-bookW / 4, by + R * 0.02, -bookW / 2, by + R * 0.09);
  ctx.closePath();
  ctx.stroke();
  // page split + a few text rules on the pages
  ctx.beginPath();
  ctx.moveTo(0, by - R * 0.09);
  ctx.lineTo(0, by + R * 0.11);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, d * 0.016);
  for (const s of [-1, 1]) {
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(s * bookW * 0.14, by - R * 0.05 + k * R * 0.07);
      ctx.lineTo(s * bookW * 0.36, by - R * 0.05 + k * R * 0.07);
      ctx.stroke();
    }
  }

  // founding-year marks flanking the emblem (Ajman: 1988 / ١٤٠٨)
  if (opts.left || opts.right) {
    ctx.font = `700 ${Math.round(d * 0.115)}px ${BODY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (opts.left) ctx.fillText(opts.left, -R * 0.71, 0);
    if (opts.right) ctx.fillText(opts.right, R * 0.71, 0);
  }

  ctx.restore();
}

export interface FoilMaps {
  front: THREE.CanvasTexture;
  spine: THREE.CanvasTexture;
  /** shallow deboss relief derived from the stamping alpha (edge shading) */
  frontNormal: THREE.CanvasTexture;
  spineNormal: THREE.CanvasTexture;
}

/** extract the alpha channel of a paint-on-transparent canvas as height */
function alphaHeight(ctx: CanvasRenderingContext2D): Float32Array {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const field = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) field[i] = data[i * 4 + 3] / 255;
  return field;
}

/**
 * Hot-stamp micro-relief: the stamping presses the foil slightly into the
 * cloth, so letter edges get a very shallow bevel. Derived from the art
 * alpha; strength stays low so the typography itself is untouched.
 */
function foilNormalTexture(ctx: CanvasRenderingContext2D, strength = 2.4): THREE.CanvasTexture {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const nctx = normalMapCanvas(alphaHeight(ctx), w, h, strength);
  const tex = new THREE.CanvasTexture(nctx.canvas);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Fine directional streak noise as the foil roughness map — real stamped
 * foil has micro-abrasion, so the metallic reflection breaks up slightly
 * instead of behaving like a perfect mirror decal.
 */
export function makeFoilRoughnessMap(): THREE.CanvasTexture {
  const S = 256;
  const ctx = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const rng = makeRng(8844);
  // 1D per-row streaks (vertical rubbing direction) + pixel dust
  const rows = new Float32Array(S);
  for (let y = 0; y < S; y++) rows[y] = rng();
  const dust = valueNoise(S, 2, makeRng(2266), 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const v = 0.5 + (rows[y] - 0.5) * 0.24 + (dust[i] - 0.5) * 0.1;
      const c = Math.max(0, Math.min(255, Math.round(v * 255)));
      const j = i * 4;
      img.data[j] = c;
      img.data[j + 1] = c;
      img.data[j + 2] = c;
      img.data[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeFoilMaps(
  cfg: BookConfig,
  arcLenMm?: number,
  logo?: HTMLCanvasElement | null
): FoilMaps {
  const fmtW = cfg.format === "a4" ? 210 : cfg.format === "textbook" ? 170 : 180;
  const fmtH = cfg.format === "a4" ? 297 : cfg.format === "textbook" ? 240 : 235;

  /* ---------------- front cover ---------------- */
  const fw = 1280;
  const fh = Math.round((fw / fmtW) * fmtH);
  const ctx = makeCanvas(fw, fh);
  const u = fw / fmtW; // px per mm
  const paint = "#ffffff";
  const centerX = fw / 2;
  const textWidth = fw - 48 * u;

  const hasArabic = cfg.universityArabic.trim().length > 0;
  const hasCollege = cfg.college.trim().length > 0;
  const hasDepartment = cfg.department.trim().length > 0;
  const hasCompany = cfg.company.trim().length > 0;
  const hasSupervisor = cfg.supervisor.trim().length > 0;
  const hasId = cfg.authorId.trim().length > 0;
  // full academic-report layout (per the user's cover reference) vs the
  // classic centered thesis layout
  const fullReport =
    hasArabic || hasCollege || hasDepartment || hasCompany || hasSupervisor;

  // freehand mode: the white-paper editor's blocks are stamped EXACTLY as
  // the user placed them — no template, no auto spacing. Positions are mm
  // on the physical cover, identical to the editor's coordinate system.
  // An empty document stamps a clean blank cover (still valid to order).
  const freehand = cfg.coverMode === "freehand";

  // RTL binding: the 3D model is mirrored (spine on the right, opens from
  // the left — Arabic convention), so the cover art is pre-mirrored here.
  // The reflected mesh un-mirrors it and the typography reads correctly,
  // while the corner logo lands top-RIGHT — the Arabic letterhead corner.
  if (cfg.rtl) {
    ctx.translate(fw, 0);
    ctx.scale(-1, 1);
  }

  const borderInset = cfg.goldBorder ? 14 * u : 0;
  if (cfg.goldBorder) {
    ctx.strokeStyle = paint;
    ctx.lineWidth = 2.4 * (u / 4);
    ctx.strokeRect(borderInset, borderInset, fw - borderInset * 2, fh - borderInset * 2);
    ctx.lineWidth = 1.2 * (u / 4);
    ctx.strokeRect(borderInset + 5 * u, borderInset + 5 * u, fw - (borderInset + 5 * u) * 2, fh - (borderInset + 5 * u) * 2);
  }

  const write = (
    text: string,
    yMm: number,
    sizeMm: number,
    weight = "400",
    font = BODY_FONT,
    italic = false
  ) => {
    ctx.fillStyle = paint;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${italic ? "italic " : ""}${weight} ${Math.round(sizeMm * u)}px ${font}`;
    ctx.fillText(text, centerX, yMm * u, textWidth);
  };

  /* flowing-cursor helpers for the real-product stacked layout: a mm
     cursor `flowY` (top edge of the next block) advanced by every line,
     so optional fields never leave fixed-position gaps.

     TWO-PASS SPACING: pass 1 (`measurePass`) walks the layout without
     painting and counts the stretchable section gaps; the spare room
     between the content and the anchored year is then shared across those
     gaps (capped) in pass 2 — so the cover fills evenly instead of pooling
     blank space at the foot. */
  let flowY = 0;
  const flowBottom = fmtH - 24; // keep clear of the anchored year
  let measurePass = true;
  const sectionGapBases: number[] = [];
  // per-gap share of the spare room, set after the measure pass: each
  // section gap grows in proportion to its base size, capped so the final
  // gap never exceeds 32mm (sparse covers stretch gracefully, full covers
  // fill right down to the year)
  let gapExtraFn: (mm: number) => number = () => 0;
  const flowGap = (mm: number, sectional = false) => {
    if (measurePass && sectional) sectionGapBases.push(mm);
    if (flowY < flowBottom - 46) {
      flowY += mm + (!measurePass && sectional ? gapExtraFn(mm) : 0);
    }
  };
  const flowLine = (
    text: string,
    sizeMm: number,
    opts: { weight?: string; font?: string; lh?: number; maxW?: number } = {}
  ) => {
    const { weight = "400", font = BODY_FONT, lh = 1.32, maxW = textWidth } = opts;
    if (!measurePass) {
      ctx.fillStyle = paint;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${weight} ${Math.round(sizeMm * u)}px ${font}`;
      ctx.fillText(text, centerX, (flowY + (sizeMm * lh) / 2) * u, maxW);
    }
    flowY += sizeMm * lh;
  };
  const flowBlock = (
    lines: string[],
    sizeMm: number,
    font: string,
    weight: string,
    lh = 1.3
  ) => {
    if (!measurePass) {
      ctx.fillStyle = paint;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${weight} ${Math.round(sizeMm * u)}px ${font}`;
    }
    const lineH = sizeMm * lh;
    for (const ln of lines) {
      if (!measurePass) ctx.fillText(ln, centerX, (flowY + lineH / 2) * u, textWidth);
      flowY += lineH;
    }
  };

  if (freehand) {
    /* ============ freehand white-paper editor layout ============
     * Every block the user dragged/edited on the white paper is stamped
     * at its exact mm position — the paper IS the proof. Same wrap +
     * font stacks as the editor so it lands identically on the cloth. */
    for (const el of cfg.coverElements!) {
      if (el.kind === "logo") {
        const box = el.size * u;
        if (logo) {
          drawLogoInto(ctx, el.x * u, (el.y + el.size / 2) * u, box, box, logo);
        } else {
          drawUniversitySeal(ctx, el.x * u, (el.y + el.size / 2) * u, box, paint);
        }
        continue;
      }
      ctx.fillStyle = paint;
      ctx.font = `${el.italic ? "italic " : ""}${el.weight} ${Math.round(el.size * u)}px ${fontStackFor(el.family, el.text)}`;
      ctx.textAlign = el.align;
      ctx.textBaseline = "top";
      const lineH = el.size * el.lineHeight * u;
      let ly = el.y * u;
      for (const para of el.text.split("\n")) {
        const lines = para.length ? wrapText(ctx, para, el.width * u) : [""];
        for (const ln of lines) {
          if (ln) ctx.fillText(ln, el.x * u, ly);
          ly += lineH;
        }
      }
    }
  } else if (fullReport) {
    /* ============ real-product stacked layout (reference photos) ============
     * Mirrors the bound theses: logo at the head — centred, stacked ABOVE
     * the bilingual name block (Arabic over English) — then college →
     * title (the largest line) → Arabic title → submission line → student →
     * supervisor, with the year anchored at the foot. `logoPosition: "corner"`
     * tucks a small government-style mark into the top-left (top-right in
     * RTL), inset 22mm so it never crowds the border or the board edge. */

    // "Submitted by" / "Supervised by" captions in the cover language(s)
    const LABELS = {
      submittedBy: { en: "Submitted by", ar: "إعداد" },
      supervisedBy: { en: "Supervised by", ar: "إشراف" },
    } as const;
    const coverLabel = (key: keyof typeof LABELS) => {
      const lang = cfg.labelLang ?? "en";
      if (lang !== "en") flowLine(LABELS[key].ar, 4.8, { weight: "400", font: ARABIC_FONT, lh: 1.3 });
      if (lang !== "ar") flowLine(LABELS[key].en, 4.6, { weight: "400" });
    };

    const layout = () => {
      /* width available to a line about to flow: while the cursor is still
         inside the corner-mark's horizontal band, the centred text must stay
         clear of the mark (46mm from the left edge), matching the real
         government covers where the name block sits beside the emblem */
      const lineMaxW = () =>
        cfg.logoPosition === "corner" && flowY < 44
          ? Math.min(textWidth, (fmtW - 92) * u)
          : textWidth;

      // ---- logo at the head ----
      if (cfg.logoPosition === "corner") {
        if (!measurePass) {
          const box = 20 * u;
          if (logo) {
            drawLogoInto(ctx, 22 * u + box / 2, 21 * u + box / 2, box, box, logo);
          } else {
            drawUniversitySeal(ctx, 32 * u, 31 * u, 20 * u, paint);
          }
        }
        flowY = 21; // name block starts level with the mark — letterhead look
      } else {
        if (!measurePass) {
          if (logo) {
            drawLogoInto(ctx, centerX, 20 * u + 16 * u, 32 * u, 32 * u, logo);
          } else {
            drawUniversitySeal(ctx, centerX, 20 * u + 15 * u, 30 * u, paint);
          }
        }
        flowY = 20 + (logo ? 32 : 30) + 6;
      }

      // ---- bilingual university block: Arabic over letterspaced English ----
      if (hasArabic) {
        const s =
          fitOneLine(ctx, cfg.universityArabic, lineMaxW(), 12.5 * u, 7.5 * u, ARABIC_FONT, "700") / u;
        flowLine(cfg.universityArabic, s, {
          weight: "700",
          font: ARABIC_FONT,
          lh: 1.22,
          maxW: lineMaxW(),
        });
        flowGap(1.5);
      }
      if (cfg.university.trim()) {
        const caps = cfg.university.toUpperCase();
        const s = fitOneLine(ctx, caps, lineMaxW(), 7.4 * u, 4.6 * u, BODY_FONT, "700") / u;
        setSpacing(ctx, Math.round(0.7 * u));
        flowLine(caps, s, { weight: "700", lh: 1.25, maxW: lineMaxW() });
        setSpacing(ctx, 0);
      }

      // ---- college & department ----
      flowGap(3.5, true);
      if (hasCollege) {
        const s = fitOneLine(ctx, cfg.college, lineMaxW(), 6.2 * u, 4.2 * u, BODY_FONT, "400") / u;
        flowLine(cfg.college, s, { maxW: lineMaxW() });
      }
      if (hasDepartment) {
        const s = fitOneLine(ctx, cfg.department, lineMaxW(), 5.6 * u, 4 * u, BODY_FONT, "400") / u;
        flowLine(cfg.department, s, { maxW: lineMaxW() });
      }

      // ---- thesis title — the visual anchor, multi-line, largest text ----
      flowGap(6.5, true);
      if (cfg.title.trim()) {
        const zone = Math.min(58, fmtH * 0.21);
        const t = fitLines(ctx, cfg.title, textWidth, zone * u, 11.5 * u, 6.2 * u, TITLE_FONT, "700");
        flowBlock(t.lines, t.size / u, TITLE_FONT, "700", 1.24);
      }
      if (cfg.titleArabic.trim()) {
        const zone = Math.min(30, fmtH * 0.11);
        const t = fitLines(ctx, cfg.titleArabic, textWidth, zone * u, 9.5 * u, 5.2 * u, ARABIC_FONT, "700");
        flowBlock(t.lines, t.size / u, ARABIC_FONT, "700", 1.35);
        flowGap(1);
      }

      // ---- degree-requirement submission line (wrapped, small) ----
      if (cfg.subtitle.trim()) {
        flowGap(5, true);
        const zone = Math.min(30, fmtH * 0.11);
        const sub = fitLines(ctx, cfg.subtitle, textWidth * 0.94, zone * u, 5.2 * u, 3.8 * u, BODY_FONT);
        flowBlock(sub.lines, sub.size / u, BODY_FONT, "400", 1.42);
      }

      // ---- company block (internship reports) ----
      if (hasCompany) {
        flowGap(5, true);
        flowLine("Company Name", 5, { weight: "400" });
        flowGap(1);
        const s = fitOneLine(ctx, cfg.company, textWidth, 6.6 * u, 4.6 * u, BODY_FONT, "700") / u;
        flowLine(cfg.company, s, { weight: "700" });
      }

      // ---- student block ----
      if (cfg.author.trim() || cfg.authorArabic.trim()) {
        flowGap(6, true);
        coverLabel("submittedBy");
        flowGap(1.5);
        if (cfg.author.trim()) {
          const s = fitOneLine(ctx, cfg.author, textWidth * 0.86, 6.8 * u, 4.8 * u, BODY_FONT, "600") / u;
          flowLine(cfg.author, s, { weight: "600" });
        }
        if (cfg.authorArabic.trim()) {
          const s =
            fitOneLine(ctx, cfg.authorArabic, textWidth * 0.86, 6.4 * u, 4.6 * u, ARABIC_FONT, "600") / u;
          flowLine(cfg.authorArabic, s, { weight: "600", font: ARABIC_FONT, lh: 1.3 });
        }
        if (hasId) {
          flowGap(0.5);
          flowLine(cfg.authorId, 4.6, { weight: "400" });
        }
      }

      // ---- supervisor block ----
      if (hasSupervisor) {
        flowGap(5.5, true);
        coverLabel("supervisedBy");
        flowGap(1.5);
        const supFont = /[\u0600-\u06FF]/.test(cfg.supervisor) ? ARABIC_FONT : BODY_FONT;
        const s = fitOneLine(ctx, cfg.supervisor, textWidth * 0.86, 6.2 * u, 4.4 * u, supFont, "600") / u;
        flowLine(cfg.supervisor, s, { weight: "600", font: supFont });
      }
    };

    // pass 1 — measure the stacked content with the base gaps
    layout();
    // share the spare room above the anchored year across the section
    // gaps, each growing in proportion to its base size and capped at
    // 32mm total; anything left over stays as natural foot breathing room
    const contentBottom = fmtH - 27;
    const slack = contentBottom - flowY;
    const totalBase = sectionGapBases.reduce((a, b) => a + b, 0);
    if (slack > 0 && totalBase > 0) {
      gapExtraFn = (mm) => Math.min(Math.max(0, 32 - mm), (slack * mm) / totalBase);
    }
    // pass 2 — paint with the distributed spacing
    measurePass = false;
    layout();

    // ---- year anchored at the foot ----
    if (cfg.year.trim()) {
      write(cfg.year, fmtH - 15, 6.2, "600");
    }
  } else {
    /* ============ classic centered thesis layout (AUS reference) ============ */

    // centred user logo or circular seal
    const sealD = 30 * u;
    if (logo) {
      drawLogoInto(ctx, centerX, 42 * u, 32 * u, 32 * u, logo);
    } else {
      drawUniversitySeal(ctx, centerX, 42 * u, sealD, paint, {
        left: cfg.year.trim() ? cfg.year : undefined,
      });
    }

    // university name (letterspaced caps)
    ctx.fillStyle = paint;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(6.2 * u)}px ${BODY_FONT}`;
    setSpacing(ctx, Math.round(0.9 * u));
    ctx.fillText(cfg.university.toUpperCase(), centerX, 72 * u, textWidth);
    setSpacing(ctx, 0);

    // thin rule under the university
    const ruleY = 82 * u;
    ctx.strokeStyle = paint;
    ctx.lineWidth = Math.max(1.2, 0.4 * u);
    ctx.beginPath();
    ctx.moveTo(centerX - 30 * u, ruleY);
    ctx.lineTo(centerX + 30 * u, ruleY);
    ctx.stroke();

    // title (auto-fit, all caps)
    const titleTop = ruleY + 14 * u;
    const titleZoneBottom = fh * 0.7;
    const { lines, size } = fitLines(
      ctx,
      cfg.title.toUpperCase(),
      textWidth,
      titleZoneBottom - titleTop,
      14 * u,
      6 * u,
      TITLE_FONT,
      "700"
    );
    ctx.font = `700 ${Math.round(size)}px ${TITLE_FONT}`;
    const lineH = size * 1.34;
    let ty = titleTop + (titleZoneBottom - titleTop - lines.length * lineH) / 2 + lineH / 2;
    for (const ln of lines) {
      ctx.fillText(ln, centerX, ty, textWidth + 10 * u);
      ty += lineH;
    }

    // "by" + author
    let byY = titleZoneBottom + 14 * u;
    if (cfg.author.trim()) {
      ctx.font = `italic 400 ${Math.round(4.6 * u)}px ${BODY_FONT}`;
      ctx.fillText("by", centerX, byY, textWidth);
      byY += 9 * u;
      ctx.font = `600 ${Math.round(6.4 * u)}px ${BODY_FONT}`;
      ctx.fillText(cfg.author, centerX, byY, textWidth);
    }

    // thesis statement (sentence case)
    if (cfg.subtitle.trim()) {
      const subZoneTop = byY + 12 * u;
      const sub = fitLines(ctx, cfg.subtitle, textWidth * 0.88, fh * 0.94 - subZoneTop - 30 * u, 5.4 * u, 4 * u, BODY_FONT);
      ctx.font = `400 ${Math.round(sub.size)}px ${BODY_FONT}`;
      let sy = subZoneTop;
      for (const ln of sub.lines) {
        ctx.fillText(ln, centerX, sy, textWidth);
        sy += sub.size * 1.5;
      }
    }

    // footer: location line + date
    if (cfg.year.trim()) {
      ctx.font = `600 ${Math.round(6 * u)}px ${BODY_FONT}`;
      ctx.fillText(cfg.year, centerX, fh - 22 * u, textWidth);
    }
  }

  const front = canvasTexture(ctx);
  const frontNormal = foilNormalTexture(ctx, 2.4);

  /* ---------------- spine ---------------- */
  // spine texture: u = arc length direction (~thickness), v = book height
  const sw = 512;
  const sh = 2048;
  const sctx = makeCanvas(sw, sh);
  // RTL: pre-mirror the spine art so the mirrored mesh shows it exactly as
  // the LTR binding does — title still reads head -> tail, seal stays round
  if (cfg.rtl) {
    sctx.translate(sw, 0);
    sctx.scale(-1, 1);
  }
  const su = sh / fmtH; // px per mm along height
  const cxDark = "#ffffff";

  if (cfg.showFoil && cfg.spineText !== false) {
    // small circular seal at the head of the spine. The spine texture packs
    // different px/mm on the two axes (x = thickness arc, y = height), so
    // pre-distort the circle to land round on the mesh. Sits clear of the
    // raised spine band at 15% of the height from the head.
    const arcLen = arcLenMm ?? (cfg.thickness + 5.2) * 1.06;
    const pxmmX = sw / arcLen;
    const aspect = su / pxmmX;
    const sealMm = Math.min(13, arcLen * 0.34);
    sctx.save();
    sctx.translate(sw / 2, 25 * su);
    sctx.scale(1, aspect);
    if (logo) {
      const box = sealMm * pxmmX * 1.08;
      drawLogoInto(sctx, 0, 0, box, box, logo);
    } else {
      drawUniversitySeal(sctx, 0, 0, sealMm * pxmmX, cxDark);
    }
    sctx.restore();

    // title reading top->bottom (rotated glyphs), auto fit
    const maxLen = sh * 0.62;
    let tsize = 12 * su;
    let text = cfg.title;
    sctx.font = `700 ${Math.round(tsize)}px ${TITLE_FONT}`;
    while (sctx.measureText(text).width > maxLen && tsize > 5 * su) {
      tsize -= 0.5 * su;
      sctx.font = `700 ${Math.round(tsize)}px ${TITLE_FONT}`;
    }
    if (sctx.measureText(text).width > maxLen) {
      while (text.length > 4 && sctx.measureText(`${text}…`).width > maxLen) {
        text = text.slice(0, -1);
      }
      text = `${text}…`;
    }
    sctx.save();
    sctx.translate(sw / 2, sh * 0.5 - sctx.measureText(text).width / 2);
    sctx.rotate(Math.PI / 2);
    sctx.fillStyle = cxDark;
    sctx.fillText(text, 0, 0);
    sctx.restore();

    // university (small, top, rotated)
    sctx.save();
    sctx.font = `600 ${Math.round(4.4 * su)}px ${BODY_FONT}`;
    const uniSpine = cfg.university.toUpperCase();
    sctx.translate(sw / 2, 50 * su);
    sctx.rotate(Math.PI / 2);
    sctx.fillText(uniSpine, 0, 0, maxLen * 0.5);
    sctx.restore();

    // year at bottom (rotated) — drawn top->bottom ENDING 4mm above the
    // tail, auto-shrunk so it clears the raised spine band at 15%H
    if (cfg.year.trim()) {
      sctx.save();
      let ysize = 5.6;
      sctx.font = `600 ${Math.round(ysize * su)}px ${BODY_FONT}`;
      // keep the year clear of the raised spine band at 15% of the height
      const maxYearMm = Math.max(10, fmtH * 0.15 - 9);
      while (
        sctx.measureText(cfg.year).width > maxYearMm * su &&
        ysize > 3.4
      ) {
        ysize -= 0.3;
        sctx.font = `600 ${Math.round(ysize * su)}px ${BODY_FONT}`;
      }
      const yw = sctx.measureText(cfg.year).width;
      sctx.translate(sw / 2, sh - 4 * su - yw);
      sctx.rotate(Math.PI / 2);
      sctx.fillText(cfg.year, 0, 0);
      sctx.restore();
    }
  }

  const spine = canvasTexture(sctx);
  const spineNormal = foilNormalTexture(sctx, 2.2);
  return { front, spine, frontNormal, spineNormal };
}
