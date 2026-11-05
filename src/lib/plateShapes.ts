// Flower-edged .text-plate backgrounds: every plate gets its own random outline on each page load. The outline is a
// rounded rectangle whose edge is broken into petals (bumps of random width and height) and drawn as one smooth closed
// curve, so there are no straight runs and no sharp corners. The plate keeps its box; the shape is painted by its
// ::before (styles.css) from an SVG in --plate-shape, sized slightly larger than the box so the petals grow outward and
// never cut into the text.

/** How far the base outline sits outside the element's box (px). */
const PAD = 0;
/** Petal height range (px) and spacing range along the edge (px). */
const AMP = [2, 5] as const;
const SPACING = [16, 28] as const;
/** Extra room the SVG needs past the box on every side (handed to the ::before in styles.css as --plate-margin). */
export const PLATE_MARGIN = PAD + AMP[1];

type Pt = { x: number; y: number };

// Small seeded PRNG so a plate keeps its petals when it is only resized (mulberry32).
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Point and outward normal at arc length s along a rounded rect, clockwise from the top-left corner's end. */
function roundedRectWalker(x0: number, y0: number, x1: number, y1: number, r: number) {
  const w = x1 - x0 - 2 * r;
  const h = y1 - y0 - 2 * r;
  const arc = (Math.PI / 2) * r;
  const segs: { len: number; at: (t: number) => Pt & { nx: number; ny: number } }[] = [
    { len: w, at: (t) => ({ x: x0 + r + t, y: y0, nx: 0, ny: -1 }) },
    { len: arc, at: (t) => corner(x1 - r, y0 + r, -Math.PI / 2 + t / r) },
    { len: h, at: (t) => ({ x: x1, y: y0 + r + t, nx: 1, ny: 0 }) },
    { len: arc, at: (t) => corner(x1 - r, y1 - r, t / r) },
    { len: w, at: (t) => ({ x: x1 - r - t, y: y1, nx: 0, ny: 1 }) },
    { len: arc, at: (t) => corner(x0 + r, y1 - r, Math.PI / 2 + t / r) },
    { len: h, at: (t) => ({ x: x0, y: y1 - r - t, nx: -1, ny: 0 }) },
    { len: arc, at: (t) => corner(x0 + r, y0 + r, Math.PI + t / r) },
  ];
  function corner(cx: number, cy: number, a: number) {
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: cx + nx * r, y: cy + ny * r, nx, ny };
  }
  const total = segs.reduce((s, g) => s + g.len, 0);
  return {
    total,
    at(s: number) {
      s = ((s % total) + total) % total;
      for (const g of segs) {
        if (s <= g.len) return g.at(s);
        s -= g.len;
      }
      return segs[0].at(0);
    },
  };
}

/** Closed Catmull-Rom spline through pts as cubic Béziers: smooth everywhere, so no corners. */
function smoothClosedPath(pts: Pt[]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d += `C${f(b.x + (c.x - a.x) / 6)},${f(b.y + (c.y - a.y) / 6)} ${f(c.x - (e.x - b.x) / 6)},${f(c.y - (e.y - b.y) / 6)} ${f(c.x)},${f(c.y)}`;
  }
  return d + "Z";
}

function flowerPath(w: number, h: number, rand: () => number): string {
  const M = PLATE_MARGIN;
  const r = Math.min(10, (h + 2 * PAD) / 2, (w + 2 * PAD) / 2);
  const walk = roundedRectWalker(M - PAD, M - PAD, M + w + PAD, M + h + PAD, r);
  const spacing = SPACING[0] + rand() * (SPACING[1] - SPACING[0]);
  const petals = Math.max(6, Math.round(walk.total / spacing));
  const step = walk.total / petals;
  const start = rand() * step; // so the petals don't always line up with the top-left corner
  const pts: Pt[] = [];
  for (let i = 0; i < petals; i++) {
    // Valley on the base outline, then a petal tip pushed outward by a random height, both slightly jittered along the edge.
    const sv = start + i * step + (rand() - 0.5) * step * 0.2;
    const st = start + (i + 0.5) * step + (rand() - 0.5) * step * 0.3;
    const v = walk.at(sv);
    const t = walk.at(st);
    const amp = AMP[0] + rand() * (AMP[1] - AMP[0]);
    pts.push({ x: v.x, y: v.y }, { x: t.x + t.nx * amp, y: t.y + t.ny * amp });
  }
  return smoothClosedPath(pts);
}

function shape(el: HTMLElement, fill: string) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w || !h) return;
  if (!el.dataset.plateSeed) el.dataset.plateSeed = String((Math.random() * 2 ** 31) | 0);
  const d = flowerPath(w, h, rng(Number(el.dataset.plateSeed)));
  const W = w + 2 * PLATE_MARGIN;
  const H = h + 2 * PLATE_MARGIN;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="${fill}"/></svg>`;
  el.style.setProperty("--plate-shape", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  el.style.setProperty("--plate-margin", `${PLATE_MARGIN}px`);
  el.classList.add("plate-shaped");
}

let observer: ResizeObserver | undefined;

/** Shape every .text-plate on the page and keep them shaped as they resize. Call on each astro:page-load. */
export function initPlateShapes() {
  const fill = getComputedStyle(document.documentElement).getPropertyValue("--plate-bg").trim() || "rgba(11,54,91,0.96)";
  observer?.disconnect();
  observer = new ResizeObserver((entries) => {
    for (const e of entries) shape(e.target as HTMLElement, fill);
  });
  document.querySelectorAll<HTMLElement>(".text-plate").forEach((el) => {
    delete el.dataset.plateSeed; // new flowers on every page load
    observer!.observe(el); // fires once immediately, which does the first shaping
  });
}
