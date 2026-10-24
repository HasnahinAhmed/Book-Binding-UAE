import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BACKGROUNDS, FORMATS, type BookConfig } from "./config";
import { buildBookModel, type BookModel } from "./book-model";

export type ViewName = "hero" | "front" | "spine" | "top" | "back";

export interface BookStudioOptions {
  /** fires ONCE the first config has been fully applied (fonts + geometry +
   *  textures) and a few frames have actually been rendered — i.e. the
   *  model is genuinely on the GPU. Loading veils should only lift then. */
  onReady?: () => void;
}

const VIEWS: Record<ViewName, { az: number; el: number; dist: number }> = {
  // distances tuned ~13% wider so the full book always fits inside embedded
  // portrait panels (hero half-screen / configurator side pane)
  hero: { az: 35, el: 13, dist: 3.0 },
  front: { az: 8, el: 4, dist: 2.95 },
  spine: { az: -82, el: 6, dist: 2.6 },
  top: { az: 38, el: 82, dist: 2.3 },
  back: { az: 187, el: 12, dist: 2.85 },
};

export class BookStudio {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private key: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private rim: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private hemi: THREE.HemisphereLight;
  private ground: THREE.Mesh;
  private glow: THREE.Mesh;
  private bookRoot = new THREE.Group();
  private book: BookModel | null = null;
  private geoKey = "";
  private raf = 0;
  private clock = new THREE.Clock();
  private floatEnabled = true;
  private bookRadius = 180;
  /** camera distance multiplier (cfg.zoom) — hero pulls back for overlays */
  private zoom = 1;
  private tween: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    tFrom: THREE.Vector3;
    tTo: THREE.Vector3;
    t: number;
    dur: number;
  } | null = null;
  private disposed = false;
  private resizeObs: ResizeObserver | null = null;
  private opts: BookStudioOptions;
  /** right-to-left binding — mirrors the book (spine right, fore-edge left)
   *  and flips the camera azimuths so the same views show the Arabic face */
  private rtl = false;
  /** last named view requested — lets a mid-session RTL flip re-seat the
   *  camera on the mirrored azimuth for the SAME view */
  private currentView: ViewName | null = null;
  /** armed on first build — the entrance tween waits for reveal() so it is
   *  never wasted (or glimpsed) behind a loading veil */
  private entranceArmed = false;
  private entranceTarget: THREE.Vector3 | null = null;
  /** frames rendered since the first full config applied; -1 = idle */
  private readyFrames = -1;
  private readyFired = false;
  fontsReady: Promise<void>;

  constructor(container: HTMLElement, opts: BookStudioOptions = {}) {
    this.container = container;
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    // VSM: three r186 dropped PCFSoftShadowMap; VSM gives the soft,
    // photographic shadow pool the references show
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUNDS["studio-grey"].color);

    // environment reflections (essential for the gold foil)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    pmrem.dispose();

    // moderate focal length (≈ 60mm equivalent) — product photography look,
    // avoids wide-angle stretch of the board proportions
    this.camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / Math.max(1, container.clientHeight),
      1,
      6000
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 200;
    this.controls.maxDistance = 1500;
    this.controls.maxPolarAngle = (Math.PI / 180) * 96;
    this.controls.autoRotateSpeed = 0.9;

    // studio lighting: large soft key (softbox character), gentle fill,
    // restrained rim — reads as product photography, not game-engine
    this.key = new THREE.DirectionalLight(0xfff6e8, 2.9);
    this.key.position.set(-210, 300, 330);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    // generous frustum so long cast shadows never clip into straight edges
    this.key.shadow.camera.left = -460;
    this.key.shadow.camera.right = 460;
    this.key.shadow.camera.top = 500;
    this.key.shadow.camera.bottom = -500;
    this.key.shadow.camera.near = 10;
    this.key.shadow.camera.far = 1600;
    this.key.shadow.bias = -0.0002;
    this.key.shadow.normalBias = 0.6;
    // broad VSM blur = large-source softbox shadow
    this.key.shadow.radius = 26;
    this.key.shadow.blurSamples = 20;
    this.scene.add(this.key);

    this.fill = new THREE.DirectionalLight(0xffffff, 0.55);
    this.fill.position.set(280, 90, 300);
    this.scene.add(this.fill);

    this.rim = new THREE.DirectionalLight(0xffffff, 1.05);
    this.rim.position.set(140, 170, -360);
    this.scene.add(this.rim);

    // sky/ground bounce: gentle vertical gradient instead of flat CG ambient
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x82868c, 0.5);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambient);

    // ground: shadow catcher + tight contact-shadow blob
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(900, 48),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.glow = new THREE.Mesh(
      new THREE.CircleGeometry(150, 48),
      new THREE.MeshBasicMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.scene.add(this.glow);

    this.scene.add(this.bookRoot);
    // nothing of the book is shown until the first reveal() — no half-built
    // geometry, no untextured flash, ever
    this.bookRoot.visible = false;

    // web fonts for canvas-rendered cover typography
    this.fontsReady = loadFonts();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);

    this.renderer.setAnimationLoop(() => this.tick());
  }

  /* ---------------------------------------------------------------- */

  async applyConfig(cfg: BookConfig) {
    await this.fontsReady;
    this.zoom = cfg.zoom ?? 1;

    // RTL binding: mirror the whole case around its vertical axis. Geometry,
    // UVs and lighting are all preserved by the reflection — only the facing
    // swaps — so the Arabic book shows its spine on the right and opens from
    // the left, exactly like the reference. The front-cover foil texture is
    // pre-mirrored in makeFoilMaps so the artwork still reads correctly.
    const rtl = !!cfg.rtl;
    if (rtl !== this.rtl) {
      this.rtl = rtl;
      this.bookRoot.scale.x = rtl ? -1 : 1;
      // re-seat the camera on the mirrored views (no tween snap)
      if (this.readyFired) this.setView(this.currentView ?? "hero", true);
    }

    const fmt = FORMATS[cfg.format];
    const geoKey = `${cfg.format}|${cfg.thickness}|${fmt.W}x${fmt.H}|${cfg.spineStyle}`;
    if (geoKey !== this.geoKey) {
      const firstBuild = this.geoKey === "";
      this.geoKey = geoKey;
      if (this.book) {
        this.bookRoot.remove(this.book.group);
        this.book.dispose();
        this.book = null;
      }
      this.book = buildBookModel(cfg);
      this.bookRoot.add(this.book.group);

      // fit camera & ground to new bounding size
      const box = new THREE.Box3().setFromObject(this.bookRoot);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      this.bookRadius = sphere.radius;
      this.controls.target.set(0, 0, 0);
      // the book RESTS on the studio surface (4mm clearance so the gentle
      // float bob never clips) — weight, not floating
      const groundY = box.min.y - 4;
      this.ground.position.y = groundY;
      this.glow.position.y = groundY + 0.4;
      // contact-shadow blob sized to the book footprint (not a giant pool)
      this.glow.scale.setScalar(
        Math.max(0.8, Math.min(1.6, this.bookRadius / 170))
      );
      if (firstBuild) {
        // cinematic swing-in ARMED: the camera is parked at the swing start;
        // the tween itself fires on reveal() so the entrance always plays in
        // front of the audience, never behind a loading veil
        const { pos } = this.viewPos("hero");
        const start = pos.clone().multiplyScalar(1.32).add(new THREE.Vector3(70, 90, 20));
        this.camera.position.copy(start);
        this.controls.target.set(0, 0, 0);
        this.entranceTarget = pos;
        this.entranceArmed = true;
      }
    }
    this.book?.update(cfg);

    // scene mood
    const bg = BACKGROUNDS[cfg.background];
    // transparent mode: no scene background → the page behind the canvas shows
    // through, so the 3D book sits directly on the website's own hero/backdrop
    this.scene.background =
      cfg.background === "transparent" ? null : new THREE.Color(bg.color);
    this.renderer.setClearColor(0x000000, cfg.background === "transparent" ? 0 : 1);
    this.glow.visible = !bg.dark;
    (this.glow.material as THREE.MeshBasicMaterial).opacity = bg.dark ? 0 : 0.5;
    this.hemi.intensity = bg.dark ? 0.3 : 0.5;
    this.ambient.intensity = bg.dark ? 0.11 : 0.15;
    this.rim.intensity = bg.dark ? 1.3 : 1.05;
    this.controls.autoRotate = cfg.autoRotate;
    this.floatEnabled = cfg.float;

    // input ownership: over the hero book the wheel must scroll the PAGE, so
    // zoom is disabled there (OrbitControls then skips preventDefault and the
    // browser handles the wheel natively). Configurator keeps wheel-zoom.
    this.controls.enableZoom = cfg.scrollZoom ?? true;
    // vertical touch swipes scroll the page when touchScroll is on; horizontal
    // drags still rotate — the standard embedded-viewer compromise
    this.renderer.domElement.style.touchAction = (cfg.touchScroll ?? false)
      ? "pan-y"
      : "none";

    // arm the readiness signal — it fires a few rendered frames later, once
    // the freshly built model and its canvas textures have hit the GPU
    if (!this.readyFired && this.readyFrames === -1) this.readyFrames = 0;
  }

  /** show the book and run the armed cinematic entrance (idempotent) */
  reveal() {
    this.bookRoot.visible = true;
    if (this.entranceArmed && this.entranceTarget) {
      this.entranceArmed = false;
      this.tween = {
        from: this.camera.position.clone(),
        to: this.entranceTarget,
        tFrom: this.controls.target.clone(),
        tTo: new THREE.Vector3(0, 0, 0),
        t: 0,
        dur: 1.4,
      };
    }
  }

  private viewPos(name: ViewName): { pos: THREE.Vector3; target: THREE.Vector3 } {
    const v = VIEWS[name];
    const d = this.bookRadius * v.dist * this.zoom;
    // mirrored book: the same named view must orbit to the mirrored azimuth,
    // otherwise "Spine" would frame the fore-edge and vice versa
    const az = THREE.MathUtils.degToRad(this.rtl ? -v.az : v.az);
    const el = THREE.MathUtils.degToRad(v.el);
    return {
      pos: new THREE.Vector3(
        d * Math.cos(el) * Math.sin(az),
        d * Math.sin(el),
        d * Math.cos(el) * Math.cos(az)
      ),
      target: new THREE.Vector3(0, 0, 0),
    };
  }

  setView(name: ViewName, instant = false) {
    this.currentView = name;
    const { pos, target } = this.viewPos(name);
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.controls.autoRotate = false;
    this.tween = {
      from: this.camera.position.clone(),
      to: pos,
      tFrom: this.controls.target.clone(),
      tTo: target,
      t: 0,
      dur: 0.85,
    };
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on;
  }

  /** smooth dolly toward/away from the target (factor <1 zooms in, >1 out),
   *  clamped to the OrbitControls distance range — powers the + / − buttons */
  zoomBy(factor: number) {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (dir.lengthSq() < 1e-6) return;
    const dist = THREE.MathUtils.clamp(
      dir.length() * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    dir.setLength(dist);
    this.tween = {
      from: this.camera.position.clone(),
      to: this.controls.target.clone().add(dir),
      tFrom: this.controls.target.clone(),
      tTo: this.controls.target.clone(),
      t: 0,
      dur: 0.45,
    };
  }

  /**
   * Capture the preview as a downloadable PNG. Per brief §19 the shared
   * preview carries a clearly visible Book Binding UAE watermark — it is
   * a visual mockup, never a production file.
   */
  screenshot(filename: string) {
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;

    // composite onto an offscreen canvas so the watermark never touches
    // the live WebGL buffer (preserves transparency where relevant)
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext("2d");
    if (!ctx) {
      // extremely defensive fallback — raw capture
      const a = document.createElement("a");
      a.href = src.toDataURL("image/png");
      a.download = filename;
      a.click();
      return;
    }
    ctx.drawImage(src, 0, 0);

    // watermark band
    const bandH = Math.max(44, Math.round(out.height * 0.07));
    ctx.fillStyle = "rgba(28,25,23,0.62)";
    ctx.fillRect(0, out.height - bandH, out.width, bandH);
    ctx.textBaseline = "middle";

    const nameSize = Math.max(13, Math.round(out.height * 0.021));
    ctx.font = `600 ${nameSize}px Georgia, serif`;
    ctx.fillStyle = "#f5efe1";
    ctx.fillText("Book Binding UAE — Visual Preview", Math.round(bandH * 0.6), out.height - bandH / 2);

    const tagSize = Math.max(11, Math.round(out.height * 0.017));
    ctx.font = `500 ${tagSize}px Georgia, serif`;
    ctx.fillStyle = "rgba(245,239,225,0.75)";
    const tag = "Not a production file · bookbindinguae.ae";
    const tagW = ctx.measureText(tag).width;
    ctx.fillText(tag, out.width - tagW - Math.round(bandH * 0.6), out.height - bandH / 2);

    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = filename;
    a.click();
  }

  resetCamera() {
    this.setView("hero");
  }

  /* ---------------------------------------------------------------- */

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w < 1 || h < 1) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tick() {
    if (this.disposed) return;
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;

    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.dur;
      const k = easeInOut(Math.min(1, tw.t));
      this.camera.position.lerpVectors(tw.from, tw.to, k);
      this.controls.target.lerpVectors(tw.tFrom, tw.tTo, k);
      if (tw.t >= 1) this.tween = null;
    }

    if (this.floatEnabled) {
      // subtle breathing bob (±2.2mm) — grounded, never a hover
      this.bookRoot.position.y = Math.sin(t * 0.9) * 2.2;
      this.bookRoot.rotation.z = Math.sin(t * 0.55) * 0.003;
      this.bookRoot.rotation.x = Math.cos(t * 0.42) * 0.0024;
    } else {
      this.bookRoot.position.y = 0;
      this.bookRoot.rotation.z = 0;
      this.bookRoot.rotation.x = 0;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // readiness: a handful of frames after the first full config — textures
    // are uploaded, shadow maps settled, a real image exists
    if (this.readyFrames >= 0 && !this.readyFired) {
      this.readyFrames++;
      if (this.readyFrames > 4) {
        this.readyFired = true;
        this.readyFrames = -1;
        this.opts.onReady?.();
      }
    }
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObs?.disconnect();
    this.book?.dispose();
    this.book = null;
    this.controls.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.glow.geometry.dispose();
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    gm.map?.dispose();
    gm.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

/* ------------------------------------------------------------------ */

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  // tight contact falloff: darkest directly under the book, gone by the rim
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.66)");
  g.addColorStop(0.42, "rgba(0,0,0,0.30)");
  g.addColorStop(0.75, "rgba(0,0,0,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function loadFonts(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  try {
    const load = (spec: string) =>
      (document as Document & { fonts: FontFaceSet }).fonts.load(spec);
    await Promise.race([
      Promise.all([
        load('400 80px "Tinos"'),
        load('700 80px "Tinos"'),
        load('italic 400 40px "Tinos"'),
        load('400 40px "Noto Naskh Arabic"'),
        load('700 40px "Noto Naskh Arabic"'),
      ]).then(() => (document as Document & { fonts: FontFaceSet }).fonts.ready),
      timeout,
    ]);
  } catch {
    // fall back to Georgia / Times / Liberation Serif
  }
}
