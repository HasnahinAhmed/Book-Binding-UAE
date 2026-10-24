import * as THREE from "three";
import { FORMATS, FOIL_COLORS, type BookConfig } from "./config";
import {
  COVER_TILE_MM,
  makeCoverMaps,
  makeFoilMaps,
  makeFoilRoughnessMap,
  makeHeadbandTexture,
  makePageEdgeMaps,
  prepareLogoCanvas,
} from "./book-textures";

/* Physical constants (mm) */
const COVER_THK = 2.2;
const BOARD_GAP = 0.4;
const OVERHANG = 2.0;

/* Case construction detail (mm) — subtle manufacturing bevels & grooves */
const BEVEL = 0.95; // fore-edge board bevel (outer corners)
const BEVEL_IN = 1.3; // inner corner bevel (must stay > END_ROUND)
const END_ROUND = 0.7; // head/tail edge rounding
const GROOVE_DEPTH = 0.42; // hinge groove dip where cloth bridges board->spine
const GROOVE_HALF = 1.8; // groove half-width (straddles the board corner)

/* square-spine (flat back) construction */
const SPINE_FILLET = 1.5; // cloth-wrapped rounding at the spine/board corners

/* spine crease: the straight joint line every real hardcover shows on the
 * board faces near the spine (the hinge the covers open around). Reads via
 * geometric dip + baked AO darkening — like the shadowed French groove in
 * real case bindings */
const CREASE_OFF = 7.2; // mm from the board joint onto the face (rounded back)
const CREASE_OFF_SQ = 4.6; // closer to the flat spine (square back)
const CREASE_HALF = 1.1; // crease half-width
const CREASE_DEPTH = 1.2; // crease dip
const AO_STRENGTH = 0.55; // linear-space darkening at the deepest dip
const AO_REF_DIP = 1.0; // dip that maps to full AO darkening

/* text block <-> case interior clearance — the glue line / hollow that lets
 * the rounded case spine pivot like a tube over the rounded page block */
const PG_GAP = 0.4;

/* raised spine bands — the false-cord "spine tube" construction classic
 * library bindings show: transverse ribs across the rounded spine */
const BAND_LIFT = 0.9; // rib height above the spine arc (mm)
const BAND_HALF_W = 1.6; // rib half-width along the book height (mm)
const BAND_FRAC = 0.15; // rib centre distance from head/tail (fraction of H)

export interface BookModel {
  group: THREE.Group;
  /** swap textures / colors / visibility without rebuilding geometry */
  update(cfg: BookConfig): void;
  dispose(): void;
}

interface BookDims {
  W: number;
  H: number;
  T: number;
  pageW: number;
  pageH: number;
  T_total: number;
  bulge: number;
  R: number;
  /** inner radius of the rounded case spine */
  Ri: number;
  cx: number;
  /** spine arc angles: thetaBack < thetaFront, both in (-pi, 0) */
  thetaFront: number;
  thetaBack: number;
  arcLen: number;
  /** outer / inner faces of the boards */
  Zo: number;
  Zi: number;
  /** x where the inner spine arc meets the board inner faces */
  innerX: number;
  boardZ: number;
  /** flat-back (square spine) construction */
  square: boolean;
}

function computeDims(cfg: BookConfig): BookDims {
  const fmt = FORMATS[cfg.format];
  const W = fmt.W;
  const H = fmt.H;
  const T = cfg.thickness;
  const pageW = W - OVERHANG * 2;
  const pageH = H - OVERHANG * 2;
  const Zo = T / 2 + BOARD_GAP + COVER_THK;
  const Zi = T / 2 + BOARD_GAP;
  const T_total = 2 * Zo;
  const square = cfg.spineStyle === "square";

  if (square) {
    // flat back: boards + flat spine plate joined by small fillets. The
    // page block stays flush against the flat spine (no binding bulge).
    return {
      W, H, T, pageW, pageH, T_total,
      bulge: 1.7, // -> pages kiss the flat spine
      R: Zo, Ri: Zo, cx: -W / 2, // unused by the square profile
      thetaFront: 0, thetaBack: 0,
      arcLen: 2 * Zo - 2.6, // flat spine width (foil texture aspect)
      Zo, Zi,
      innerX: -W / 2 + COVER_THK,
      boardZ: Zo - COVER_THK / 2,
      square,
    };
  }

  // rounded spine: circle through the two board outer corners and a bulge
  // point beyond the spine edge. The rise is capped tight (~4.9mm): real
  // case binders keep the rounding subtle on thick blocks, and a deep arc
  // reads at the head/tail reveal as excess cover material overhanging the
  // page block (only visible at high thickness).
  const bulge = Math.min(4.9, Math.max(4.5, T_total * 0.16));
  const d = (Zo * Zo - bulge * bulge) / (2 * bulge);
  const R = d + bulge;
  const cx = -W / 2 + d;
  const thetaFront = Math.atan2(-d, Zo); // (-pi/2, 0) -> front board side
  const thetaBack = Math.atan2(-d, -Zo); // (-pi, -pi/2) -> back board side
  const arcLen = (thetaFront - thetaBack) * R;
  const Ri = R - COVER_THK;
  const innerX = cx - Math.sqrt(Math.max(1e-6, Ri * Ri - Zi * Zi));

  const boardZ = Zo - COVER_THK / 2;

  return {
    W, H, T, pageW, pageH, T_total, bulge, R, Ri, cx,
    thetaFront, thetaBack, arcLen, Zo, Zi, innerX, boardZ, square,
  };
}

/**
 * Spine-side boundary of the page block. For the rounded back this starts
 * from an arc CONCENTRIC with the case's inner spine arc (real "rounding":
 * the text block itself is hammered into the same curve as the spine),
 * offset inward by the glue line, then blends toward the chord — real
 * hollow-back construction: the case spine bridges the text block with a
 * hollow widest at the centre, so the text rounding reads shallower than
 * the case arc. Without this blend a thick block shows a deep dark
 * crescent at the head/tail reveal that reads as the cover overhanging
 * the pages. Near the boards the edge flares slightly toward the joint
 * (real "backing" shoulder). Square back: the pages kiss the flat spine
 * plate.
 */
function pageSpineX(dims: BookDims, z: number): number {
  if (dims.square) {
    // flush against the flat plate (0.15mm interference = glued contact)
    return -dims.W / 2 + COVER_THK - 0.15;
  }
  const r = dims.Ri - PG_GAP;
  const arcX = dims.cx - Math.sqrt(Math.max(1e-6, r * r - z * z));
  // backing shoulder: outer signatures flare toward the joint, closing the
  // gap so the boards can ride on the back ridge
  const zt = Math.min(1, Math.abs(z) / (dims.T / 2));
  const shoulder = 0.25 * Math.pow(Math.max(0, (zt - 0.75) / 0.25), 1.6);
  // hollow back: blend the page edge toward the chord (zero at the
  // shoulders, full at mid-thickness). Grows with thickness so thick
  // blocks keep a tight head reveal; thin blocks (T <= 26mm) unchanged.
  const hollow = Math.max(0, dims.T - 26) * 0.055;
  return arcX - shoulder + hollow * (1 - zt * zt);
}

/* ------------------------------------------------------------------ */

function buildPageBlock(dims: BookDims, pageMats: THREE.Material[]) {
  // dense tessellation along the stacking axis so page waviness,
  // spine rounding and fore-edge bow resolve smoothly
  const geo = new THREE.BoxGeometry(dims.pageW, dims.pageH, dims.T, 72, 3, 168);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const foreC = 1.4; // fore-edge inward bow (top & bottom)
  const k1 = (Math.PI * 2) / 9.5; // page-group ripple across the stack
  const k2 = (Math.PI * 2) / 23;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);

    // spine rounding: the text block's spine-side edge follows the case's
    // inner spine arc (concentric, constant glue line) — exactly like a
    // real round-and-backed book, instead of a straight edge lurking
    // behind the curved cover
    const dx = pageSpineX(dims, z) - -dims.pageW / 2;
    const spineTaper = THREE.MathUtils.clamp(1 - (x + dims.pageW / 2) / 9, 0, 1);
    let nx = x + dx * spineTaper;

    // fore-edge bow: pages tuck in slightly at head & tail
    const fy = Math.abs(y) / (dims.pageH / 2);
    const foreTaper = THREE.MathUtils.clamp(1 - (dims.pageW / 2 - x) / 9, 0, 1);
    nx -= foreC * fy * fy * foreTaper;

    // page ripple: groups of sheets bow up/down unevenly (flat near the
    // gripped spine, stronger toward the fore-edge) — restrained so the
    // block still reads as compressed paper, not warped cardboard.
    // The ripple is pinned to ZERO on the head/tail face outlines
    // (|y| = pageH/2): those rows are the page-block silhouette the
    // boards frame, and they must stay perfectly straight — sheet
    // waviness is side-face texture character, never silhouette
    const endFade = 1 - Math.pow(fy, 6);
    const damp = (0.35 + 0.65 * (1 - spineTaper)) * endFade;
    const ripple =
      0.3 * Math.sin(z * k1 + x * 0.11) +
      0.15 * Math.sin(z * k2 + 1.7 + x * 0.05);
    y += ripple * damp;

    pos.setX(i, nx);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, pageMats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* continuous case geometry                                            */
/*                                                                     */
/* One watertight mesh replaces boards + spine cylinder + hinge tubes: */
/* a closed cross-section profile (front face -> fore-edge bevel ->    */
/* inner faces -> inner spine arc -> back face -> outer spine arc)     */
/* swept along the book height with rounded head/tail ends. The        */
/* profile carries:                                                    */
/*   - ~0.95mm bevels at every board edge (light-catching edges)       */
/*   - a concave hinge groove at each board/spine junction (cloth      */
/*     bridging the gap dips slightly)                                 */
/*   - continuous cloth UVs in millimetres, so the cover material      */
/*     wraps around the whole case like real turned-in book cloth      */
/* ------------------------------------------------------------------ */

interface ProfilePoint {
  x: number;
  z: number;
  /** outward 2D normal (unit) */
  nx: number;
  nz: number;
  /** baked ambient-occlusion shade (1 = none) — grooves read in soft light */
  ao: number;
}

function buildCaseProfile(dims: BookDims): ProfilePoint[] {
  const { W, Zo, Zi, R, cx, innerX, thetaFront, thetaBack, square } = dims;
  const Ri = R - COVER_THK;
  const xFo = W / 2 - BEVEL; // fore bevel start on outer faces
  const xFi = W / 2 - BEVEL_IN; // inner bevel start on inner faces

  const pts: { x: number; z: number }[] = [];
  const line = (x0: number, z0: number, x1: number, z1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t });
    }
  };
  const arc = (
    cx0: number,
    cz0: number,
    r: number,
    a0: number,
    a1: number,
    n: number
  ) => {
    // point = center + r*(sin a, cos a); a0 -> a1
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push({ x: cx0 + r * Math.sin(a), z: cz0 + r * Math.cos(a) });
    }
  };

  // adaptive outer-face sampling: dense near the spine joint (resolves the
  // hinge groove + spine crease), coarse across the flat board
  const DENSE_HI = -W / 2 + 9.5;
  const faceXs = (from: number, to: number): number[] => {
    const xs: number[] = [];
    const dir = to > from ? 1 : -1;
    let x = from;
    while (dir > 0 ? x < to : x > to) {
      xs.push(x);
      const fine = x >= -W / 2 - 1 && x <= DENSE_HI;
      x += dir * (fine ? 0.4 : 9.5);
    }
    return xs;
  };

  // Traversal runs clockwise in the XZ plane so that tangent x +y = outward.
  if (square) {
    const r = SPINE_FILLET;
    // 1. front outer face (x increasing, dense near the spine joint)
    for (const x of faceXs(-W / 2 + r, xFo)) pts.push({ x, z: Zo });
    // 2. front fore-edge bevel
    arc(xFo, Zo - BEVEL, BEVEL, 0, Math.PI / 2, 8);
    // 3. front fore-edge side
    line(W / 2, Zo - BEVEL, W / 2, Zi + BEVEL_IN, 2);
    // 4. front inner bevel
    arc(xFi, Zi + BEVEL_IN, BEVEL_IN, Math.PI / 2, Math.PI, 8);
    // 5. front inner face (toward the flat spine)
    line(xFi, Zi, -W / 2 + COVER_THK, Zi, 12);
    // 6. inner spine plate (flat)
    line(-W / 2 + COVER_THK, Zi, -W / 2 + COVER_THK, -Zi, 26);
    // 7. back inner face
    line(-W / 2 + COVER_THK, -Zi, xFi, -Zi, 12);
    // 8. back inner bevel
    arc(xFi, -Zi - BEVEL_IN, BEVEL_IN, Math.PI / 2, 0, 8);
    // 9. back fore-edge side
    line(W / 2, -Zi - BEVEL_IN, W / 2, -Zo + BEVEL, 2);
    // 10. back fore-edge bevel
    arc(xFo, -Zo + BEVEL, BEVEL, Math.PI / 2, Math.PI, 8);
    // 11. back outer face (x decreasing, dense near the spine joint)
    for (const x of faceXs(xFo, -W / 2 + r)) pts.push({ x, z: -Zo });
    // 12. back spine fillet (cloth-wrapped corner)
    arc(-W / 2 + r, -Zo + r, r, Math.PI, Math.PI * 1.5, 8);
    // 13. flat spine
    line(-W / 2, -Zo + r, -W / 2, Zo - r, 26);
    // 14. front spine fillet
    arc(-W / 2 + r, Zo - r, r, -Math.PI / 2, 0, 8);
  } else {
    // 1. front outer face (x increasing, dense near the spine joint)
    for (const x of faceXs(-W / 2, xFo)) pts.push({ x, z: Zo });
    // 2. front fore-edge bevel: (xFo, Zo) -> (W/2, Zo - BEVEL)
    arc(xFo, Zo - BEVEL, BEVEL, 0, Math.PI / 2, 8);
    // 3. front fore-edge side
    line(W / 2, Zo - BEVEL, W / 2, Zi + BEVEL_IN, 2);
    // 4. front inner bevel: (W/2, Zi + BEVEL_IN) -> (xFi, Zi)
    arc(xFi, Zi + BEVEL_IN, BEVEL_IN, Math.PI / 2, Math.PI, 8);
    // 5. front inner face (x decreasing toward spine)
    line(xFi, Zi, innerX, Zi, 12);
    // 6. inner spine arc (front -> back via inner bulge)
    const thetaIF = Math.atan2(innerX - cx, Zi);
    const thetaIB = Math.atan2(innerX - cx, -Zi);
    arc(cx, 0, Ri, thetaIF, thetaIB, 42);
    // 7. back inner face (x increasing)
    line(innerX, -Zi, xFi, -Zi, 12);
    // 8. back inner bevel: (xFi, -Zi) -> (W/2, -Zi - BEVEL_IN)
    arc(xFi, -Zi - BEVEL_IN, BEVEL_IN, Math.PI / 2, 0, 8);
    // 9. back fore-edge side
    line(W / 2, -Zi - BEVEL_IN, W / 2, -Zo + BEVEL, 2);
    // 10. back fore-edge bevel: (W/2, -Zo + BEVEL) -> (xFo, -Zo)
    arc(xFo, -Zo + BEVEL, BEVEL, Math.PI / 2, Math.PI, 8);
    // 11. back outer face (x decreasing, dense near the spine joint)
    for (const x of faceXs(xFo, -W / 2)) pts.push({ x, z: -Zo });
    // 12. outer spine arc (back -> front via the bulge)
    arc(cx, 0, R, thetaBack, thetaFront, 64);
  }

  // ---- surface detailing --------------------------------------------
  const N = pts.length;
  const out: ProfilePoint[] = new Array(N);
  const creaseX = -W / 2 + (square ? CREASE_OFF_SQ : CREASE_OFF);
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const tPrev = pts[(i + N - 1) % N];
    const tNext = pts[(i + 1) % N];
    let tx = tNext.x - tPrev.x;
    let tz = tNext.z - tPrev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // outward normal for clockwise traversal in XZ
    const nx = -tz;
    const nz = tx;
    let x = p.x;
    let z = p.z;
    let dipTotal = 0;

    if (!square) {
      // hinge grooves: dip the surface where the cloth bridges the
      // board/spine gap, centred on the board corners (x = -W/2)
      const gt = (p.x + W / 2 + GROOVE_HALF) / (2 * GROOVE_HALF);
      if (gt > 0 && gt < 1) {
        const dip = GROOVE_DEPTH * Math.sin(Math.PI * gt) ** 2;
        x -= dip * nx;
        z -= dip * nz;
        dipTotal += dip;
      }
    }

    // spine crease: the straight hinge line real hardcovers show on the
    // board faces just inboard of the joint — full height, both covers
    if (Math.abs(p.z) >= Zo - 1e-6) {
      const cdt = Math.abs(p.x - creaseX);
      if (cdt < CREASE_HALF) {
        const dip = CREASE_DEPTH * Math.cos((cdt / CREASE_HALF) * (Math.PI / 2)) ** 2;
        x -= dip * nx;
        z -= dip * nz;
        dipTotal += dip;
      }
    }

    // baked AO: grooves stay shaded even under soft fill/ambient light
    const ao = 1 - AO_STRENGTH * Math.min(1, dipTotal / AO_REF_DIP);
    out[i] = { x, z, nx, nz, ao };
  }
  return out;
}

function buildCase(dims: BookDims, mat: THREE.Material): THREE.Mesh {
  const { H } = dims;
  const prof = buildCaseProfile(dims);
  const N = prof.length;

  // raised spine bands ("spine tube" / false-cord construction): transverse
  // ribs on the rounded spine at BAND_FRAC of the height from each end.
  // The lift is applied along the profile normal only where the profile is
  // on the outer spine arc, fading out before the joint grooves.
  const bandYs: number[] = [];
  if (!dims.square) {
    bandYs.push(H / 2 - H * BAND_FRAC, -(H / 2 - H * BAND_FRAC));
  }
  const bandLift = (y: number): number => {
    let lift = 0;
    for (const by of bandYs) {
      const dy = Math.abs(y - by);
      if (dy < BAND_HALF_W) {
        lift += BAND_LIFT * Math.cos((dy / BAND_HALF_W) * (Math.PI / 2)) ** 2;
      }
    }
    return lift;
  };
  // min distance from this row to any band centre (for the baked rib-base AO)
  const bandRowDy = (y: number): number => {
    let d = Infinity;
    for (const by of bandYs) d = Math.min(d, Math.abs(y - by));
    return d;
  };
  // profile points on the outer spine arc (distance from the arc centre
  // matches R within the groove-dip tolerance, clear of the board faces)
  const onSpineArc = (p: ProfilePoint): boolean => {
    if (dims.square) return false;
    const dist = Math.hypot(p.x - dims.cx, p.z);
    return Math.abs(dist - dims.R) < 1.6 && Math.abs(p.z) < dims.Zo - 2;
  };

  // cumulative profile length for UVs
  const cum = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) {
    const a = prof[i];
    const b = prof[(i + 1) % N];
    cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.z - a.z);
  }
  const totalLen = cum[N];
  // stretch u by <=~2.5% so the seam lands on an exact texture tile period
  const tiles = Math.max(1, Math.round(totalLen / COVER_TILE_MM));
  const uScale = (tiles * COVER_TILE_MM) / totalLen;

  // rows along the height: body + rounded head/tail ends. The body rows
  // merge with extra samples across each spine band so the rib profile
  // resolves (a uniform 6.7mm grid would straddle the 3.2mm rib window)
  const bodyRows = 44;
  const endRows = 9;
  const bodyYs: number[] = [];
  for (let i = 0; i <= bodyRows; i++) {
    bodyYs.push(-(H / 2 - END_ROUND) + (2 * (H / 2 - END_ROUND) * i) / bodyRows);
  }
  for (const by of bandYs) {
    for (let f = -1; f <= 1.001; f += 0.25) {
      bodyYs.push(by + f * BAND_HALF_W);
    }
  }
  bodyYs.sort((a, b) => a - b);
  const rows: { y: number; off: number }[] = [];
  for (let k = endRows; k >= 1; k--) {
    const phi = (k / endRows) * (Math.PI / 2);
    rows.push({ y: -(H / 2 - END_ROUND) - END_ROUND * Math.sin(phi), off: END_ROUND * (1 - Math.cos(phi)) });
  }
  let prevY = -Infinity;
  for (const y of bodyYs) {
    if (y - prevY < 0.15) continue; // dedupe near-identical rows
    rows.push({ y, off: 0 });
    prevY = y;
  }
  for (let k = 1; k <= endRows; k++) {
    const phi = (k / endRows) * (Math.PI / 2);
    rows.push({ y: H / 2 - END_ROUND + END_ROUND * Math.sin(phi), off: END_ROUND * (1 - Math.cos(phi)) });
  }
  const M = rows.length;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = []; // baked groove AO (linear)
  const indices: number[] = [];

  // side surface (N+1 columns: the last column duplicates the seam vertex so
  // u can wrap continuously around the closed profile)
  for (let r = 0; r < M; r++) {
    const { y, off } = rows[r];
    const lift = bandLift(y);
    const rowDy = bandRowDy(y);
    const nearBand = rowDy < BAND_HALF_W * 2;
    for (let c = 0; c <= N; c++) {
      const p = prof[c % N];
      let px = p.x - off * p.nx;
      let pz = p.z - off * p.nz;
      let ao = p.ao;
      if ((lift > 0 || nearBand) && onSpineArc(p)) {
        // fade the rib out before it reaches the joint grooves
        const fade = THREE.MathUtils.clamp((dims.Zo - 3 - Math.abs(p.z)) / 2, 0, 1);
        px += lift * fade * p.nx;
        pz += lift * fade * p.nz;
        // baked crease shading at the rib base — reads even under soft
        // fill/ambient light like the shadowed foot of a raised cord
        const crease = Math.exp(
          -(((rowDy - BAND_HALF_W * 1.05) / (BAND_HALF_W * 0.55)) ** 2)
        );
        ao *= 1 - 0.28 * crease * fade;
      }
      positions.push(px, y, pz);
      uvs.push(cum[c] * uScale, y + H / 2); // UVs in millimetres
      colors.push(ao, ao, ao);
    }
  }
  for (let r = 0; r < M - 1; r++) {
    for (let c = 0; c < N; c++) {
      const a = r * (N + 1) + c;
      const b = a + 1;
      const cc = a + (N + 1) + 1;
      const dd = a + (N + 1);
      indices.push(a, b, cc, a, cc, dd);
    }
  }

  /* ---- head / tail caps: flat faces closing the shrunken profile ---- */
  for (const end of [1, -1] as const) {
    const y = (end * H) / 2;
    // ring = profile shrunk by END_ROUND (same points as the last side row)
    const ring: THREE.Vector2[] = prof.map((p) =>
      new THREE.Vector2(p.x - END_ROUND * p.nx, p.z - END_ROUND * p.nz)
    );
    const baseIndex = positions.length / 3;
    for (let c = 0; c < N; c++) {
      const p = prof[c];
      positions.push(p.x - END_ROUND * p.nx, y, p.z - END_ROUND * p.nz);
      uvs.push(cum[c] * uScale, y + H / 2);
      colors.push(p.ao, p.ao, p.ao);
    }
    const tris = THREE.ShapeUtils.triangulateShape(ring, []);
    // orientation guard: ensure the cap faces away from the book body
    if (tris.length > 0) {
      const [i0, i1, i2] = tris[0];
      const ax = ring[i1].x - ring[i0].x;
      const az = ring[i1].y - ring[i0].y;
      const bx = ring[i2].x - ring[i0].x;
      const bz = ring[i2].y - ring[i0].y;
      // 3D y-component of (a x b) for triangles in the y = H/2 plane
      const ny = az * bx - ax * bz;
      const flip = end === 1 ? ny < 0 : ny > 0;
      for (const t of tris) {
        if (flip) indices.push(baseIndex + t[2], baseIndex + t[1], baseIndex + t[0]);
        else indices.push(baseIndex + t[0], baseIndex + t[1], baseIndex + t[2]);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // average seam normals so the wrap point shades continuously
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  for (let r = 0; r < M; r++) {
    const i0 = r * (N + 1);
    const iN = i0 + N;
    const nx = (nrm.getX(i0) + nrm.getX(iN)) / 2;
    const ny = (nrm.getY(i0) + nrm.getY(iN)) / 2;
    const nz = (nrm.getZ(i0) + nrm.getZ(iN)) / 2;
    nrm.setXYZ(i0, nx, ny, nz);
    nrm.setXYZ(iN, nx, ny, nz);
  }
  nrm.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildHeadbands(
  dims: BookDims,
  mat: THREE.Material
): { meshes: THREE.Mesh[]; setRepeat(arcLen: number): void } {
  const meshes: THREE.Mesh[] = [];
  let curve: THREE.CatmullRomCurve3;
  // the cord is the visible end-cap of the spine tube: it hugs the page
  // block's rounded spine edge (concentric with the case arc) and fills the
  // head/tail reveal between the page face and the case edge — trimmed
  // short of the grooves so it never pokes through the board faces
  const cordY = dims.H / 2 - 1.15;
  if (dims.square) {
    // flat back: straight cord nestled against the flat spine plate,
    // sitting on the page head
    const x = -dims.W / 2 + COVER_THK + 0.85;
    const zA = -(dims.Zo - 1.4);
    const zB = dims.Zo - 1.4;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      pts.push(new THREE.Vector3(x, 0, zA + ((zB - zA) * i) / 12));
    }
    curve = new THREE.CatmullRomCurve3(pts);
  } else {
    // tube centre rides the page-block spine edge via pageSpineX, so the
    // cord follows the hollow-back flattening (not the raw case arc) and
    // never floats away from the pages it caps
    const RADIAL = dims.Ri - PG_GAP;
    const zA = RADIAL * Math.cos(dims.thetaBack + 0.07);
    const zB = RADIAL * Math.cos(dims.thetaFront - 0.07);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i++) {
      const z = zA + ((zB - zA) * i) / 26;
      pts.push(new THREE.Vector3(pageSpineX(dims, z), 0, z));
    }
    curve = new THREE.CatmullRomCurve3(pts);
  }
  // slim woven cord (real headbands are ~1.5-1.8mm cotton braid)
  const geo = new THREE.TubeGeometry(curve, 56, 0.88, 8, false);
  const arcLen = curve.getLength();
  for (const s of [1, -1]) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = s * cordY;
    mesh.castShadow = true;
    meshes.push(mesh);
  }
  const setRepeat = (len: number) => {
    const tex = (mat as THREE.MeshStandardMaterial).map;
    if (tex) {
      tex.repeat.set(len / 5.2, 1);
    }
  };
  setRepeat(arcLen);
  return { meshes, setRepeat };
}

function buildCornerGuards(
  dims: BookDims,
  mat: THREE.Material
): THREE.Mesh[] {
  const arm = 16;
  const w = 4.6;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(arm, 0);
  shape.lineTo(arm, w);
  shape.lineTo(w, w);
  shape.lineTo(w, arm);
  shape.lineTo(0, arm);
  shape.closePath();
  const depth = COVER_THK + 2.2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.35,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);

  const out: THREE.Mesh[] = [];
  // 0.15mm inset keeps the guard side faces from coinciding with the (now
  // beveled) case fore-edge sides — prevents z-fighting, invisible gap
  const GUARD_INSET = 0.15;
  // real library bindings protect only the four corners on the opening
  // (fore-edge) side — the spine-side corners are never capped
  for (const s of [1, -1]) {
    const zBase = s * dims.boardZ;
    for (const cy of [1, -1]) {
      const mesh = new THREE.Mesh(geo, mat);
      // L corner sits at origin with arms along +x/+y; arms must point
      // toward the board centre, i.e. along (-1, -cy) from the corner
      const rotZ = cy > 0 ? Math.PI : Math.PI / 2;
      mesh.rotation.z = rotZ;
      // outer L corner on the fore-edge board corner (inset) so the arms
      // hug the opening-side edges
      mesh.position.set(
        dims.W / 2 - GUARD_INSET,
        cy * (dims.H / 2 - GUARD_INSET),
        zBase
      );
      mesh.castShadow = true;
      out.push(mesh);
    }
  }
  return out;
}

/** saddle stitches along an inset rounded rectangle */
function buildStitching(
  dims: BookDims,
  mat: THREE.Material
): THREE.Mesh[] {
  const inset = 7.5;
  const r = 9;
  const x0 = -dims.W / 2 + inset;
  const x1 = dims.W / 2 - inset;
  const y0 = -dims.H / 2 + inset;
  const y1 = dims.H / 2 - inset;

  // dense path sampling: 4 lines + 4 arcs
  const path: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => path.push({ x, y });
  const perSeg = 24;
  // bottom edge (left -> right)
  for (let i = 0; i <= perSeg; i++) push(x0 + r + ((x1 - x0 - 2 * r) * i) / perSeg, y0);
  // bottom-right corner arc
  for (let i = 1; i <= perSeg / 2; i++) {
    const a = (Math.PI / 2) * (i / (perSeg / 2));
    push(x1 - r + r * Math.sin(a), y0 + r - r * Math.cos(a));
  }
  // right edge (bottom -> top)
  for (let i = 0; i <= perSeg; i++) push(x1, y0 + r + ((y1 - y0 - 2 * r) * i) / perSeg);
  // top-right corner arc
  for (let i = 1; i <= perSeg / 2; i++) {
    const a = (Math.PI / 2) * (i / (perSeg / 2));
    push(x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a));
  }
  // top edge (right -> left)
  for (let i = 0; i <= perSeg; i++) push(x1 - r - ((x1 - x0 - 2 * r) * i) / perSeg, y1);
  // top-left corner arc
  for (let i = 1; i <= perSeg / 2; i++) {
    const a = (Math.PI / 2) * (i / (perSeg / 2));
    push(x0 + r - r * Math.cos(a), y1 - r + r * Math.sin(a));
  }
  // left edge (top -> bottom)
  for (let i = 0; i <= perSeg; i++) push(x0, y1 - r - ((y1 - y0 - 2 * r) * i) / perSeg);
  // bottom-left corner arc
  for (let i = 1; i <= perSeg / 2; i++) {
    const a = (Math.PI / 2) * (i / (perSeg / 2));
    push(x0 + r - r * Math.sin(a), y0 + r - r * Math.cos(a));
  }

  // cumulative arc-length table
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  const totalLen = cum[cum.length - 1];

  const sampleAt = (s: number) => {
    const target = Math.max(0, Math.min(s, totalLen - 0.001));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    const p = path[i - 1];
    const q = path[i];
    const segLen = Math.max(1e-6, cum[i] - cum[i - 1]);
    const t = (target - cum[i - 1]) / segLen;
    return {
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      ux: (q.x - p.x) / segLen,
      uy: (q.y - p.y) / segLen,
    };
  };

  // walk path placing stitches
  const stitchLen = 3.6;
  const pitch = 7.8;
  const geo = new THREE.CapsuleGeometry(0.42, stitchLen, 3, 8);
  geo.rotateZ(Math.PI / 2); // axis along X

  const mats: THREE.Matrix4[] = [];
  let nextStart = pitch / 2;
  while (nextStart + stitchLen <= totalLen) {
    const s = nextStart + stitchLen / 2;
    const pt = sampleAt(s);
    const m = new THREE.Matrix4();
    m.makeRotationZ(Math.atan2(pt.uy, pt.ux));
    m.setPosition(pt.x, pt.y, 0);
    mats.push(m);
    nextStart += pitch;
  }

  const out: THREE.Mesh[] = [];
  if (mats.length > 0) {
    for (const side of [1, -1]) {
      const inst = new THREE.InstancedMesh(geo, mat, mats.length);
      for (let i = 0; i < mats.length; i++) {
        inst.setMatrixAt(i, mats[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.position.z = side * (dims.boardZ + COVER_THK / 2 + 0.22);
      out.push(inst);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */

export function buildBookModel(cfg: BookConfig): BookModel {
  const dims = computeDims(cfg);
  const group = new THREE.Group();

  /* -------- materials -------- */
  const coverMaps = makeCoverMaps(cfg.material);
  const isLeather = cfg.material === "leather";
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(cfg.coverColor),
    map: coverMaps.albedo,
    normalMap: coverMaps.normal,
    // baked groove AO lives in vertex colors (linear space)
    vertexColors: true,
    // double-sided: the head/tail reveal looks into the case interior —
    // the cloth-backed inner faces must shade, not vanish
    side: THREE.DoubleSide,
    // heavily restrained: the weave reads via grazing light + sheen only
    normalScale: new THREE.Vector2(isLeather ? 0.38 : 0.28, isLeather ? 0.38 : 0.28),
    // roughness values live in the map (polished leather ~0.34-0.52,
    // coated buckram ~0.52-0.65); material.roughness multiplies it
    roughnessMap: coverMaps.roughness,
    roughness: 1.0,
    metalness: 0,
    // polished full-grain leather: subtle aniline-type coat
    clearcoat: isLeather ? 0.1 : 0,
    clearcoatRoughness: 0.5,
    // fabric sheen: cloth fibres scatter light at grazing angles
    sheen: isLeather ? 0 : 0.4,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(cfg.coverColor).lerp(new THREE.Color(0xffffff), 0.32),
    envMapIntensity: isLeather ? 0.6 : 0.42,
  });

  // pages: 6 materials [+x, -x, +y, -y, +z, -z]
  const pageFore = makePageEdgeMaps("fore");
  const pageFlat = makePageEdgeMaps("flat");
  const cream = new THREE.Color("#F0EAD9");
  const white = new THREE.Color("#FFFFFF");
  const mkPage = (maps: { albedo: THREE.CanvasTexture; normal: THREE.CanvasTexture } | null) =>
    new THREE.MeshStandardMaterial({
      // map already carries the cream tone; untextured faces use cream
      color: (maps ? white : cream).clone(),
      map: maps?.albedo ?? null,
      normalMap: maps?.normal ?? null,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughness: 0.97,
      metalness: 0,
      envMapIntensity: 0.16,
      // RTL binding mirrors the whole model (scale.x = -1), which flips
      // triangle winding — every case/page/foil material must be double
      // sided or the mirrored faces get backface-culled
      side: THREE.DoubleSide,
    });
  const pageMats: THREE.Material[] = [
    mkPage(pageFore), // +x fore-edge
    mkPage(null), // -x spine side (mostly hidden)
    mkPage(pageFlat), // +y top
    mkPage(pageFlat), // -y bottom
    mkPage(null), // +z
    mkPage(null), // -z
  ];

  const fp = foilParams(cfg.textColor, cfg.coverColor, cfg.textBrightness);
  const foilColor = fp.color;
  // initial stamping: the user logo (if any) is loaded async by update()
  const foilMaps = makeFoilMaps(cfg, dims.arcLen, null);
  // shared micro-abrasion roughness map: reflections break up slightly like
  // real stamped foil instead of a perfect mirror decal
  const foilRough = makeFoilRoughnessMap();
  foilRough.repeat.set(6, 6);
  const foilRoughSpine = makeFoilRoughnessMap();
  foilRoughSpine.repeat.set(2, 10);
  // hot-stamped foil: metallic response driven by reflections, near-zero
  // emissive, shallow deboss normals, restrained champagne sheen
  const foilFrontMat = new THREE.MeshStandardMaterial({
    color: foilColor.clone(),
    map: foilMaps.front,
    transparent: true,
    depthWrite: false,
    metalness: fp.metalness,
    roughness: fp.roughness,
    roughnessMap: foilRough,
    normalMap: foilMaps.frontNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    emissive: foilColor.clone().multiplyScalar(fp.emissive),
    envMapIntensity: fp.env,
    side: THREE.DoubleSide,
  });
  const foilSpineMat = new THREE.MeshStandardMaterial({
    color: foilColor.clone(),
    map: foilMaps.spine,
    transparent: true,
    depthWrite: false,
    metalness: fp.metalness,
    roughness: fp.roughness,
    roughnessMap: foilRoughSpine,
    normalMap: foilMaps.spineNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    emissive: foilColor.clone().multiplyScalar(fp.emissive),
    envMapIntensity: fp.env,
    side: THREE.DoubleSide,
  });

  const guardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(FOIL_COLORS[cfg.foil].hex),
    // brushed brass: full metal with a slightly worn roughness
    metalness: 1,
    roughness: 0.36,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });

  const stitchMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#D9C7A0"),
    roughness: 0.72,
    metalness: 0.1,
    envMapIntensity: 0.35,
    side: THREE.DoubleSide,
  });

  const headTex = makeHeadbandTexture(cfg.headband);
  const headMat = new THREE.MeshStandardMaterial({
    map: headTex,
    roughness: 0.85,
    metalness: 0,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
  });

  /* -------- meshes -------- */
  const pages = buildPageBlock(dims, pageMats);
  // continuous cloth-wrapped case (boards + spine + grooves + bevels)
  const bookCase = buildCase(dims, coverMat);
  const headbands = buildHeadbands(dims, headMat);
  const guards = buildCornerGuards(dims, guardMat);
  const stitches = buildStitching(dims, stitchMat);

  // foil overlays
  const foilFront = new THREE.Mesh(
    new THREE.PlaneGeometry(dims.W - 0.6, dims.H - 0.6),
    foilFrontMat
  );
  foilFront.position.z = dims.boardZ + COVER_THK / 2 + 0.09;
  foilFront.renderOrder = 2;

  // spine stamping: follows the case construction — arc cylinder for the
  // rounded back, flat plate for the square back
  let foilSpine: THREE.Mesh;
  if (dims.square) {
    // u (texture arc axis) maps to world +z — same convention as the
    // cylinder, so the rotated spine text stays un-mirrored
    const spineGeo = new THREE.PlaneGeometry(dims.arcLen, dims.H - 0.6);
    spineGeo.rotateY(-Math.PI / 2);
    foilSpine = new THREE.Mesh(spineGeo, foilSpineMat);
    foilSpine.position.x = -dims.W / 2 - 0.09;
  } else {
    foilSpine = new THREE.Mesh(
      new THREE.CylinderGeometry(
        dims.R + 0.09,
        dims.R + 0.09,
        dims.H - 0.6,
        128,
        1,
        true,
        dims.thetaBack + 0.004,
        dims.thetaFront - dims.thetaBack - 0.008
      ),
      foilSpineMat
    );
    foilSpine.position.x = dims.cx;
  }
  foilSpine.renderOrder = 2;

  group.add(
    pages,
    bookCase,
    ...headbands.meshes,
    ...guards,
    ...stitches,
    foilFront,
    foilSpine
  );

  /* -------- update & dispose -------- */
  let textKey = foilKey(cfg);
  let matKind = cfg.material;
  let headbandColor = cfg.headband;
  // user logo: async-loaded -> prepared canvas; "" keeps the drawn seal
  let logoUrl = "";
  let logoCanvas: HTMLCanvasElement | null = null;
  let latest = cfg;

  const disposeTexture = (t: THREE.Texture | null | undefined) => t?.dispose();

  const regenFoil = () => {
    const oldFront = foilFrontMat.map;
    const oldSpine = foilSpineMat.map;
    const oldFrontNormal = foilFrontMat.normalMap;
    const oldSpineNormal = foilSpineMat.normalMap;
    const maps = makeFoilMaps(latest, dims.arcLen, logoCanvas);
    foilFrontMat.map = maps.front;
    foilSpineMat.map = maps.spine;
    foilFrontMat.normalMap = maps.frontNormal;
    foilSpineMat.normalMap = maps.spineNormal;
    foilFrontMat.needsUpdate = true;
    foilSpineMat.needsUpdate = true;
    disposeTexture(oldFront);
    disposeTexture(oldSpine);
    disposeTexture(oldFrontNormal);
    disposeTexture(oldSpineNormal);
  };

  const setLogo = (url: string) => {
    if (!url) {
      logoCanvas = null;
      regenFoil();
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoCanvas = prepareLogoCanvas(img);
      regenFoil();
    };
    img.onerror = () => {
      logoCanvas = null;
      regenFoil();
    };
    img.src = url;
  };

  const model: BookModel = {
    group,
    update(next: BookConfig) {
      latest = next;

      // cover color
      coverMat.color.set(next.coverColor);
      coverMat.sheenColor
        .set(next.coverColor)
        .lerp(new THREE.Color(0xffffff), 0.32);

      // material kind swap
      if (next.material !== matKind) {
        matKind = next.material;
        const oldAlbedo = coverMat.map;
        const oldNormal = coverMat.normalMap;
        const oldRoughness = coverMat.roughnessMap;
        const maps = makeCoverMaps(next.material);
        coverMat.map = maps.albedo;
        coverMat.normalMap = maps.normal;
        coverMat.roughnessMap = maps.roughness;
        const leather = next.material === "leather";
        coverMat.normalScale.set(leather ? 0.38 : 0.28, leather ? 0.38 : 0.28);
        coverMat.clearcoat = leather ? 0.1 : 0;
        coverMat.sheen = leather ? 0 : 0.4;
        coverMat.envMapIntensity = leather ? 0.6 : 0.42;
        coverMat.needsUpdate = true;
        disposeTexture(oldAlbedo);
        disposeTexture(oldNormal);
        disposeTexture(oldRoughness);
      }

      // foil art (text or logo)
      const key = foilKey(next);
      if (key !== textKey) {
        textKey = key;
        regenFoil();
      }
      // user-uploaded logo swap (async image load, then re-stamp)
      if (next.logoDataUrl !== logoUrl) {
        logoUrl = next.logoDataUrl;
        setLogo(logoUrl);
      }

      // stamping material: driven by the user-selected text colour and
      // brightness (adapted to cover luminance — light covers get deeper
      // base + stronger reflections so the stamping reads metallic)
      const fp = foilParams(next.textColor, next.coverColor, next.textBrightness);
      foilFrontMat.color.copy(fp.color);
      foilSpineMat.color.copy(fp.color);
      foilFrontMat.emissive.copy(fp.color).multiplyScalar(fp.emissive);
      foilSpineMat.emissive.copy(fp.color).multiplyScalar(fp.emissive);
      foilFrontMat.envMapIntensity = fp.env;
      foilSpineMat.envMapIntensity = fp.env;
      foilFrontMat.roughness = fp.roughness;
      foilSpineMat.roughness = fp.roughness;
      foilFrontMat.metalness = fp.metalness;
      foilSpineMat.metalness = fp.metalness;
      guardMat.color.copy(new THREE.Color(FOIL_COLORS[next.foil].hex));

      // headband color
      if (next.headband !== headbandColor) {
        headbandColor = next.headband;
        const old = headMat.map;
        headMat.map = makeHeadbandTexture(next.headband);
        headMat.needsUpdate = true;
        disposeTexture(old);
        headbands.setRepeat(dims.arcLen);
      }

      // visibility
      foilFront.visible = next.showFoil;
      foilSpine.visible = next.showFoil;
      for (const g of guards) g.visible = next.cornerGuards;
      for (const st of stitches) st.visible = next.stitching;
    },
    dispose() {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
        }
      });
      coverMat.map?.dispose();
      coverMat.normalMap?.dispose();
      coverMat.roughnessMap?.dispose();
      coverMat.dispose();
      for (const m of pageMats) {
        const mm = m as THREE.MeshStandardMaterial;
        mm.map?.dispose();
        mm.normalMap?.dispose();
        mm.dispose();
      }
      foilFrontMat.map?.dispose();
      foilFrontMat.normalMap?.dispose();
      foilFrontMat.roughnessMap?.dispose();
      foilFrontMat.dispose();
      foilSpineMat.map?.dispose();
      foilSpineMat.normalMap?.dispose();
      foilSpineMat.roughnessMap?.dispose();
      foilSpineMat.dispose();
      guardMat.dispose();
      stitchMat.dispose();
      headMat.map?.dispose();
      headMat.dispose();
    },
  };

  model.update(cfg);
  return model;
}

/* ------------------------------------------------------------------ */

/**
 * Stamping material parameters, driven by the user-selected text colour,
 * cover colour and brightness. The metallic read comes almost entirely
 * from environment reflections; emissive is kept near zero so the
 * stamping never glows. Dark inks read as printed ink (low metalness);
 * light covers get a slightly deeper base with stronger reflections —
 * the reflection contrast is what reads as "metal", exactly like real
 * stamping foil on light buckram.
 */
function foilParams(
  textColor: string,
  coverHex: string,
  brightness: number
): { color: THREE.Color; emissive: number; env: number; roughness: number; metalness: number } {
  const base = new THREE.Color(textColor);
  const b = THREE.MathUtils.clamp(brightness, 0.55, 1.6);
  base.multiplyScalar(b);
  const textLum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;

  if (textLum < 0.3) {
    // dark ink (black / deep brown stamping): matte, printed look
    return { color: base, emissive: 0.03, env: 0.55, roughness: 0.52, metalness: 0.2 };
  }

  const cover = new THREE.Color(coverHex);
  const coverLum = 0.2126 * cover.r + 0.7152 * cover.g + 0.0722 * cover.b;
  // brightness leans on reflections as well as the base colour
  const envScale = 1 + 0.3 * (b - 1);
  if (coverLum > 0.45) {
    return {
      color: base.multiplyScalar(0.88),
      emissive: 0,
      env: 2.1 * envScale,
      roughness: 0.62, // map-modulated -> effective ~0.31 ± 0.06
      metalness: 1,
    };
  }
  return { color: base, emissive: 0.04, env: 1.7 * envScale, roughness: 0.62, metalness: 1 };
}

function foilKey(cfg: BookConfig): string {
  return [
    cfg.university,
    cfg.universityArabic,
    cfg.college,
    cfg.department,
    cfg.title,
    cfg.titleArabic,
    cfg.subtitle,
    cfg.company,
    cfg.author,
    cfg.authorArabic,
    cfg.authorId,
    cfg.supervisor,
    cfg.year,
    cfg.foil,
    cfg.goldBorder,
    cfg.format,
    cfg.thickness,
    // logo placement + Arabic fields + RTL all re-stamp the cover art —
    // leaving any of these out made the preview stick on the OLD layout
    // until some other text changed (the "updates late" bug)
    cfg.logoPosition,
    cfg.rtl ? "rtl" : "ltr",
    cfg.spineText === false ? "nospine" : "spine",
    cfg.labelLang ?? "en",
    cfg.showFoil ? "foil" : "nofoil",
    // freehand white-paper editor: every drag/size/text edit re-stamps
    cfg.coverMode ?? "guided",
    cfg.coverMode === "freehand" ? JSON.stringify(cfg.coverElements ?? []) : "",
  ].join("|");
}
