import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

const TAU = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (a: number, b: number, p: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Touch keeps moving through the reading positions instead of stopping there. */
export function collectionTurn(p: number, stacked = false) {
  if (stacked) {
    const phase = clamp((p - .29) / (.92 - .29)) * 3;
    // Positive velocity throughout: slower at each label, faster between them.
    return (phase - .65 * Math.sin(phase * TAU) / TAU) * TAU / 3;
  }
  return (ease(.40, .53, p) + ease(.64, .77, p) + ease(.88, .96, p)) * TAU / 3;
}

type FrameRect = { x: number; y: number; width: number; height: number };
type ProductLayout = { width: number; height: number; stacked: boolean; area: FrameRect; introArea: FrameRect; fit?: number; introFit?: number };
const envelopeWidths = new WeakMap<THREE.Vector3[], number>();

function envelopeWidth(points: THREE.Vector3[]) {
  let width = envelopeWidths.get(points);
  if (width === undefined) {
    let left = Infinity, right = -Infinity;
    points.forEach(point => { left = Math.min(left, point.x); right = Math.max(right, point.x); });
    width = right - left;
    envelopeWidths.set(points, width);
  }
  return width;
}

function frameAt(layout: ProductLayout, p: number): FrameRect {
  const t = ease(.115, .29, p);
  return {
    x: lerp(layout.introArea.x, layout.area.x, t), y: lerp(layout.introArea.y, layout.area.y, t),
    width: lerp(layout.introArea.width, layout.area.width, t), height: lerp(layout.introArea.height, layout.area.height, t),
  };
}

export function productEnvelope(root: THREE.Group): THREE.Vector3[] {
  // Actual convex silhouettes avoid the empty corners of a cylinder's box.
  const hull = new ConvexHull().setFromObject(root);
  const points = new Set<THREE.Vector3>();
  hull.faces.forEach(face => {
    let edge = face.edge;
    do { points.add(edge.vertex.point); edge = edge.next; } while (edge !== face.edge);
  });
  return [...points];
}

/** Project actual package bounds, including the lid, through the scene camera. */
export function projectedProductBounds(roots: THREE.Group[], corners: THREE.Vector3[][], camera: THREE.PerspectiveCamera, width: number, height: number) {
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const point = new THREE.Vector3();
  roots.forEach((root, i) => {
    if (!root.visible) return;
    root.updateMatrixWorld(true);
    corners[i].forEach(corner => {
      point.copy(corner).applyMatrix4(root.matrixWorld).project(camera);
      const x = (point.x + 1) * width / 2;
      const y = (1 - point.y) * height / 2;
      bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
    });
  });
  return bounds;
}

/** Keep the full orbit inside the space reserved by the responsive page layout. */
export function arrangeProductModels(roots: THREE.Group[], corners: THREE.Vector3[][], camera: THREE.PerspectiveCamera, layout: ProductLayout, p: number) {
  const { width, height, stacked, area } = layout;
  const reveal = ease(.16, .29, p);
  const entry = ease(0, .115, p);
  const settle = ease(.115, .29, p);
  const end = ease(stacked ? .92 : .96, .99, p);
  const turn = collectionTurn(p, stacked);
  const frame = frameAt(layout, p);
  const worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const unit = worldHeight / height;
  const cx = (frame.x + frame.width / 2 - width / 2) * unit;
  const cy = (height / 2 - frame.y - frame.height / 2) * unit;
  const radius = frame.width * unit * .38;
  const depth = stacked ? 1.35 : 2;
  const modelScale = Math.min(area.height * unit / 3.265, area.width * unit / 4.2);
  const weights = [.94, .85, .85];
  const fit = lerp(layout.introFit ?? 1, layout.fit ?? 1, settle);
  // Width-aware final spacing: the jar needs more room than either bottle.
  const finalWidths = corners.map((points, i) => envelopeWidth(points) * modelScale * weights[i] * (layout.fit ?? 1) * 1.12);
  const gap = area.width * unit * .12;
  const finalScale = Math.min(1, (area.width * unit - gap * 2 - unit * 24) / finalWidths.reduce((sum, v) => sum + v, 0));
  finalWidths.forEach((value, i) => { finalWidths[i] = value * finalScale; });
  const finalWidth = finalWidths.reduce((sum, v) => sum + v, 0) + gap * 2;
  let cursor = cx - finalWidth / 2;
  roots.forEach((root, i) => {
    const angle = i * TAU / 3 - turn;
    const front = (Math.cos(angle) + 1) / 2;
    const z = Math.cos(angle) * depth;
    const perspective = 1 - z / camera.position.z;
    root.visible = i === 0 || reveal > .001;
    root.position.set(cx * perspective + Math.sin(angle) * radius, cy * perspective, z);
    const scale = modelScale * weights[i];
    const prominence = i === 0 ? lerp(1, .8 + .2 * front, settle) : .75 + .25 * front;
    root.scale.setScalar((i === 0 ? lerp(modelScale * 1.5, scale, settle) : scale * reveal) * fit * lerp(prominence, 1, end));
    // Open the rear positions without forcing every package to shrink. This
    // rounded width limit follows depth smoothly and never changes the Y axis.
    const availableRadius = (frame.width / 2 - 12) * unit * perspective - root.scale.x * (i === 0 ? 1.36 : .67);
    const safeRadius = Math.max(0, (radius + availableRadius - Math.hypot(radius - availableRadius, unit * 12)) / 2);
    root.position.x = cx * perspective + Math.sin(angle) * safeRadius;
    // One continuous package revolution on touch; each active label faces front.
    const yaw = stacked ? i * TAU / 3 - turn : -turn * 3;
    root.rotation.set(i === 0 ? .32 : .035, yaw, i === 0 ? -.07 : (i === 1 ? -.07 : .07));
    if (i === 0) {
      const introZ = lerp(-2, 4, entry);
      root.position.x = lerp(cx * (1 - introZ / camera.position.z), root.position.x, settle);
      root.position.y = lerp(cy * (1 - introZ / camera.position.z), root.position.y, settle);
      root.position.z = lerp(introZ, z, settle);
      root.rotation.x = lerp(.50, .32, settle);
      root.rotation.y += lerp(-.32, 0, entry) * (1 - settle);
      root.rotation.z = lerp(-.14, -.07, settle);
    }
    root.position.x = lerp(root.position.x, cursor + finalWidths[i] / 2, end);
    root.position.y = lerp(root.position.y, cy, end);
    root.position.z = lerp(root.position.z, 0, end);
    root.scale.multiplyScalar(lerp(1, finalScale, end));
    root.rotation.y = lerp(root.rotation.y, stacked ? (i < 2 ? -TAU : 0) : -TAU * 3, end);
    root.rotation.y += Math.atan2(-root.position.x, camera.position.z - root.position.z);
    cursor += finalWidths[i] + gap;
  });
  // The radius stays independent of package scale, preserving breathing room
  // between products. Neither value changes during the reading revolutions.
}

/** Measure a complete turn only on resize, never while the user scrolls. */
export function fitProductLayout(roots: THREE.Group[], corners: THREE.Vector3[][], camera: THREE.PerspectiveCamera, layout: ProductLayout) {
  layout.fit = 1; layout.introFit = 1;
  for (let pass = 0; pass < 4; pass++) {
    let introFit = 1, orbitFit = 1, transitionFit = 1;
    for (let step = 0; step <= 200; step++) {
      const p = step / 200;
      arrangeProductModels(roots, corners, camera, layout, p);
      const frame = frameAt(layout, p);
      let fit = 1;
      roots.forEach((root, i) => {
        if (!root.visible) return;
        const bounds = projectedProductBounds([root], [corners[i]], camera, layout.width, layout.height);
        const origin = root.position.clone().project(camera);
        const cx = (origin.x + 1) * layout.width / 2, cy = (1 - origin.y) * layout.height / 2;
        fit = Math.max(.1, Math.min(fit,
          (cx - frame.x - 10) / Math.max(.001, cx - bounds.left),
          (frame.x + frame.width - 10 - cx) / Math.max(.001, bounds.right - cx),
          (cy - frame.y - 10) / Math.max(.001, cy - bounds.top),
          (frame.y + frame.height - 10 - cy) / Math.max(.001, bounds.bottom - cy)));
      });
      if (p <= .115) introFit = Math.min(introFit, fit);
      else if (p >= .29) orbitFit = Math.min(orbitFit, fit);
      else if (pass > 0) transitionFit = Math.min(transitionFit, fit);
    }
    layout.introFit *= introFit * transitionFit;
    layout.fit *= orbitFit * transitionFit;
  }
}

export async function mountProductScene(section: HTMLElement): Promise<() => void> {
  const host = section.querySelector<HTMLElement>('.ps-canvas')!;
  const stage = section.querySelector<HTMLElement>('.ps-stage')!;
  const intro = section.querySelector<HTMLElement>('.ps-intro')!;
  const label = section.querySelector<HTMLElement>('.ps-collection-label')!;
  const orbit = section.querySelector<HTMLElement>('.ps-orbit')!;
  const modelSpace = section.querySelector<HTMLElement>('.ps-model-space')!;
  const bottomline = section.querySelector<HTMLElement>('.ps-bottomline')!;
  const articles = [...section.querySelectorAll<HTMLElement>('.ps-product')];
  const articleStyles = articles.map(() => ({ opacity: '', transform: '' }));
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-product-target]')];
  const bars = buttons.map(button => button.querySelector<HTMLElement>('.ps-nav-track > span')!);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 1024 ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
  camera.position.set(0, 0, 11);
  camera.updateMatrixWorld();
  const environment = new THREE.Scene();
  environment.background = new THREE.Color(.15, .15, .15);
  function softbox(x: number, y: number, z: number, w: number, h: number, intensity: number) {
    const box = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide }));
    box.position.set(x, y, z); box.lookAt(0, 0, 0); environment.add(box);
  }
  softbox(-4, 2, 4, 2.2, 7, 5);
  softbox(4, 1, 2, .8, 6, 4);
  softbox(0, 6, 0, 5, 3, 3);
  softbox(0, 0, -5, 3, 5, 3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, .04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 1.1;
  environment.traverse((obj: any) => { obj.geometry?.dispose(); obj.material?.dispose(); });
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb5ab96, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 7); scene.add(key);
  const fill = new THREE.DirectionalLight(0xf3e6cb, 1);
  fill.position.set(4, 2, -2); scene.add(fill);

  const loader = new GLTFLoader();
  const names = ['dark-wax', 'sea-salt', 'beard-oil'];
  const roots: THREE.Group[] = [];
  const corners: THREE.Vector3[][] = [];
  let disposed = false;
  let raf = 0;
  let measureRaf = 0;
  let layoutKey = '';
  let progress = 0;
  let target = 0;
  let mobile = false;
  let width = 1;
  let height = 1;
  let layout: ProductLayout;
  let start = 0;
  let travel = 1;
  let visible = true;
  let lastFrame = 0;
  let active = -1;
  let intersection: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  const abort = new AbortController();

  function disposeModel(root: THREE.Object3D) {
    root.traverse((obj: any) => {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.filter(Boolean).forEach((m: any) => {
        for (const value of Object.values(m)) if ((value as any)?.isTexture) (value as THREE.Texture).dispose();
        m.dispose();
      });
    });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(measureRaf);
    abort.abort(); intersection?.disconnect(); resizeObserver?.disconnect();
    roots.forEach(disposeModel);
    environmentMap.dispose(); renderer.dispose(); renderer.domElement.remove();
    delete section.dataset.enhanced;
    [intro, label, orbit, ...articles, ...bars].forEach(el => el.removeAttribute('style'));
    articles.forEach(article => { article.removeAttribute('aria-hidden'); article.removeAttribute('inert'); delete article.dataset.active; });
    buttons.forEach(button => button.removeAttribute('aria-current'));
  }

  try {
    // allSettled ensures every downloaded model is disposed if one asset fails.
    const results = await Promise.allSettled(names.map(name => loader.loadAsync(`/models/private-studio/${name}.glb`)));
    results.forEach(result => { if (result.status === 'fulfilled') roots.push(result.value.scene); });
    if (results.some(result => result.status === 'rejected')) throw new Error('A product asset could not be loaded.');
    const stableHeight = section.querySelector<HTMLElement>('.ps-viewport-probe')?.clientHeight ?? innerHeight;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || stableHeight < (innerWidth < 768 ? 640 : 700)) { dispose(); return () => {}; }
    roots.forEach(root => {
      corners.push(productEnvelope(root));
      root.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.frustumCulled = false;
          // Thin transparent PET: alpha blending avoids transmission's opaque
          // offscreen background when composited over this transparent canvas.
          if (obj.material?.transmission > 0) {
            obj.material.transmission = 0;
            obj.material.transparent = true;
            obj.material.opacity = .16;
            obj.material.depthWrite = false;
            obj.material.roughness = .12;
            obj.material.envMapIntensity = .45;
          }
        }
      });
      scene.add(root);
    });
    host.append(renderer.domElement);
    section.dataset.enhanced = 'true';

    function measure() {
      if (disposed) return;
      width = stage.clientWidth; height = stage.clientHeight;
      mobile = width < 1024;
      const stageRect = stage.getBoundingClientRect();
      const modelRect = modelSpace.getBoundingClientRect();
      const area = { x: modelRect.left - stageRect.left, y: modelRect.top - stageRect.top, width: modelRect.width, height: modelRect.height };
      // offsetTop excludes the intro's animated translation.
      const introBottom = intro.offsetTop + intro.offsetHeight + 12;
      const bottom = bottomline.offsetTop - 20;
      const introArea = mobile
        ? { x: width * .07, y: introBottom, width: width * .86, height: Math.max(80, bottom - introBottom) }
        : { x: width * .56, y: height * .22, width: width * .38, height: height * .60 };
      // Mobile browser chrome fires resize while scrolling even though 100svh
      // and the reserved model space stay unchanged. Never refit for that case.
      const nextKey = [width, height, ...Object.values(area), ...Object.values(introArea)].map(value => Math.round(value * 2)).join(':');
      if (nextKey !== layoutKey) {
        layoutKey = nextKey;
        renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
        renderer.setSize(width, height);
        camera.aspect = width / height; camera.updateProjectionMatrix();
        layout = { width, height, stacked: mobile, area, introArea };
        fitProductLayout(roots, corners, camera, layout);
        orbit.style.left = `${area.x}px`; orbit.style.width = `${area.width}px`;
        orbit.style.top = `${area.y + area.height * .82}px`; orbit.style.height = `${area.height * .16}px`;
        render(progress);
      }
      start = section.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, section.offsetHeight - height);
      onScroll();
    }
    function scheduleMeasure() {
      if (disposed || measureRaf) return;
      measureRaf = requestAnimationFrame(() => { measureRaf = 0; measure(); });
    }
    function onScroll() {
      target = clamp((window.scrollY - start) / travel);
      if (!raf && visible && !document.hidden && !disposed) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function render(p: number) {
      const reveal = ease(.16, .29, p);
      const introOut = ease(.09, .16, p);
      const turn = collectionTurn(p, mobile);
      arrangeProductModels(roots, corners, camera, layout, p);

      intro.style.opacity = String(1 - introOut);
      intro.style.transform = `translateY(${-introOut * 35}px)`;
      label.style.opacity = String(ease(.255, .32, p) * .85);
      orbit.style.opacity = String(reveal * .48);
      const index = turn < Math.PI / 3 ? 0 : turn < Math.PI ? 1 : turn < Math.PI * 5 / 3 ? 2 : 0;
      const detailReveal = ease(.255, .32, p);
      // Fade copy through the fastest part of each change, leaving readable pauses.
      const distance = Math.abs(turn / (TAU / 3) - Math.round(turn / (TAU / 3)));
      const opacity = detailReveal * (1 - ease(mobile ? .40 : .25, .5, distance));
      articles.forEach((article, i) => {
        const shown = i === index && opacity > .05;
        const alpha = (shown ? opacity : 0).toFixed(3);
        const transform = `translateY(${(shown ? (1 - opacity) * 16 : 16).toFixed(2)}px)`;
        const previous = articleStyles[i];
        if (previous.opacity !== alpha) { article.style.opacity = alpha; previous.opacity = alpha; }
        if (previous.transform !== transform) { article.style.transform = transform; previous.transform = transform; }
        if (article.getAttribute('aria-hidden') !== String(!shown)) {
          article.toggleAttribute('data-active', shown);
          article.setAttribute('aria-hidden', String(!shown));
          article.inert = !shown;
        }
      });
      if (index !== active) {
        active = index;
        buttons.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
      }
      const ranges = mobile ? [[.29,.395],[.395,.605],[.605,.815]] : [[.29,.46],[.46,.70],[.70,.94]];
      bars.forEach((bar, i) => bar.style.transform = `scaleX(${clamp((p - ranges[i][0]) / (ranges[i][1] - ranges[i][0]))})`);
      renderer.render(scene, camera);
    }
    function frame(time: number) {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min((time - lastFrame) / 1000 || .016, .1);
      lastFrame = time;
      progress = lerp(progress, target, 1 - Math.exp(-dt * 13));
      if (Math.abs(target - progress) < .0001) progress = target;
      render(progress);
      if (progress !== target) raf = requestAnimationFrame(frame);
    }
    buttons.forEach((button, index) => button.addEventListener('click', () => {
      const stops = mobile ? [.32, .50, .71] : [.34, .575, .815];
      window.scrollTo({ top: start + stops[index] * travel, behavior: 'smooth' });
    }, { signal: abort.signal }));
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); dispose(); }, { signal: abort.signal });
    window.addEventListener('scroll', onScroll, { passive: true, signal: abort.signal });
    window.addEventListener('resize', scheduleMeasure, { passive: true, signal: abort.signal });
    document.addEventListener('visibilitychange', onScroll, { signal: abort.signal });
    intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) onScroll();
      else { cancelAnimationFrame(raf); raf = 0; }
    });
    intersection.observe(section);
    resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(stage);
    resizeObserver.observe(intro);
    resizeObserver.observe(modelSpace);
    articles.forEach(article => resizeObserver!.observe(article));
    measure(); progress = target; render(progress);
    return dispose;
  } catch (error) { dispose(); throw error; }
}
