import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";

/**
 * Full-page Wind Waker style ocean, rendered as a three.js fullscreen triangle.
 * Started from "Wind Waker Ocean" by Polyflare (https://www.shadertoy.com/view/ltfGD7,
 * CC BY 4.0): camera, parallax waves and texture sway are still theirs.
 *
 * The foam is a cell network (jittered Voronoi), because its borders are always
 * connected: lines can thin but never break. What makes it move like the game:
 *  - cell points drift, so junctions slide and lines change angle;
 *  - a slow warp bends the whole network (the game's indirect-texture wobble);
 *  - band width breathes along each line between a min and max, never zero;
 *  - every junction is a rounded foam web, and some junctions open a small
 *    water "eye" in the middle that pulses open and shut. Eyes only ever
 *    appear at junctions.
 * Underneath runs a second, darker and softer network at a different scale.
 *
 * Edges are antialiased analytically with fwidth (no supersampling).
 */
const RENDER_SCALE = 0.75;

// Tunables. Network units: 1 = roughly one cell across.
const CELL_SCALE = 0.4; // cells per world unit (lower = bigger cells)
const LINE_WIDTH = 0.045; // half-width of a foam band
const LINE_BREATHE = 0.45; // band width swings +-45% (never below 55%: lines never break)
const JUNCTION_RADIUS = 0.085; // foam web at each junction
const JUNCTION_SMOOTH = 0.07; // how much the web fillets into the lines
const EYE_RADIUS = 0.04; // max radius of a junction eye
const EYE_CHANCE = 0.45; // fraction of junctions that grow an eye
const WARP = 0.35; // large-scale bend across several cells
const CURL = 0.2; // per-cell wobble that turns straight edges into curves
const MORPH_SPEED = 1.0; // overall animation speed (the storm footage is ~2-3)
const HORIZON_FROM_TOP = 0.05; // horizon height, as a fraction of the screen from the top
const MAX_DIST = 400.0; // how far the sea is drawn before it is all haze

const glslFloat = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;

// Palette measured from daytime HD footage of the game.
#define WATER_COL vec3(0.043, 0.396, 0.655)
#define UNDER_COL vec3(0.024, 0.353, 0.604)
#define FOAM_COL vec3(0.753, 0.910, 0.925)
#define FOG_COL vec3(0.498, 0.831, 0.867)
#define SKY_COL vec3(0.36, 0.74, 0.93)

#define M_2PI 6.283185307
#define M_6PI 18.84955592

#define CELL_SCALE ${glslFloat(CELL_SCALE)}
#define LINE_WIDTH ${glslFloat(LINE_WIDTH)}
#define LINE_BREATHE ${glslFloat(LINE_BREATHE)}
#define JUNCTION_RADIUS ${glslFloat(JUNCTION_RADIUS)}
#define JUNCTION_SMOOTH ${glslFloat(JUNCTION_SMOOTH)}
#define EYE_RADIUS ${glslFloat(EYE_RADIUS)}
#define EYE_CHANCE ${glslFloat(EYE_CHANCE)}
#define WARP ${glslFloat(WARP)}
#define CURL ${glslFloat(CURL)}
#define MORPH_SPEED ${glslFloat(MORPH_SPEED)}
#define HORIZON_FROM_TOP ${glslFloat(HORIZON_FROM_TOP)}
#define MAX_DIST ${glslFloat(MAX_DIST)}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Polynomial smooth max (iq): a rounded union of two "inside > 0" fields.
float smax(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return max(a, b) + h * h * k * 0.25;
}

// Jittered cell network around p. Returns
//   x: distance to the nearest cell border (the foam line's centre)
//   y: distance to the nearest junction (where three cells meet)
//   z: a hash identifying that junction (same value from all three cells)
vec3 network(vec2 p, float t) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 64.0, d2 = 64.0, d3 = 64.0;
  vec2 v1 = vec2(0.0), v2 = vec2(0.0), v3 = vec2(0.0);
  vec2 i1 = vec2(0.0), i2 = vec2(0.0), i3 = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 h = hash22(n + g);
      vec2 v = g + 0.5 + 0.32 * sin(t * (0.6 + 0.5 * h.yx) + M_2PI * h) - f;
      float d = dot(v, v);
      if (d < d1) {
        d3 = d2; v3 = v2; i3 = i2;
        d2 = d1; v2 = v1; i2 = i1;
        d1 = d; v1 = v; i1 = n + g;
      } else if (d < d2) {
        d3 = d2; v3 = v2; i3 = i2;
        d2 = d; v2 = v; i2 = n + g;
      } else if (d < d3) {
        d3 = d; v3 = v; i3 = n + g;
      }
    }
  }
  // Exact distance to the bisector between the two nearest points.
  float edge = dot(0.5 * (v1 + v2), normalize(v2 - v1));
  // The junction is the circumcentre of the three nearest points (pixel at origin).
  vec2 ab = v2 - v1, ac = v3 - v1;
  float D = 2.0 * (ab.x * ac.y - ab.y * ac.x);
  float junc = 1e3;
  if (abs(D) > 1e-6) {
    vec2 cc = v1 + vec2(ac.y * dot(ab, ab) - ab.y * dot(ac, ac), ab.x * dot(ac, ac) - ac.x * dot(ab, ab)) / D;
    junc = length(cc);
  }
  return vec3(edge, junc, hash12(i1 + i2 + i3));
}

// Foam lines as a signed field: > 0 on foam.
float lines(vec2 p, float t, float width, float jRadius, float eyeRadius, float seed) {
  // Slow warp: bends the lines and makes them sway like the game's indirect texturing.
  vec2 w = vec2(vnoise(p * 0.3 + vec2(seed, t * 0.11)), vnoise(p * 0.3 + vec2(t * 0.09, 7.3 + seed))) - 0.5;
  p += w * WARP;
  // Finer wobble (about one per cell) so each edge curves instead of running straight.
  vec2 c = vec2(vnoise(p * 1.3 + vec2(3.1 + seed, t * 0.2)), vnoise(p * 1.3 + vec2(t * 0.17, 9.4 - seed))) - 0.5;
  p += c * CURL;
  vec3 nw = network(p, t * 0.9 + seed);

  // Band width breathes along each line but never drops below (1 - LINE_BREATHE).
  float breathe = vnoise(p * 0.9 + vec2(t * 0.35, -t * 0.27) + seed);
  float s = 1.0 + LINE_BREATHE * (2.0 * breathe - 1.0);
  float line = width * s - nw.x;
  float web = jRadius * s - nw.y;
  float f = smax(line, web, JUNCTION_SMOOTH * s);

  // Some junctions open an eye, pulsing between closed and fully open.
  float pick = step(1.0 - EYE_CHANCE, fract(nw.z * 13.7));
  float open = smoothstep(0.25, 0.85, 0.5 + 0.5 * sin(t * 0.8 + nw.z * M_2PI * 3.0));
  float er = eyeRadius * s * open * pick;
  return min(f, nw.y - er);
}

vec3 water(vec2 pos, vec3 cdir) {
  vec2 uv = pos * 0.25;
  float t = iTime * MORPH_SPEED;

  // Parallax height distortion with two directional waves (original).
  vec2 a = 0.025 * cdir.xz / cdir.y;
  float h = sin(uv.x + iTime);
  uv += a * h;
  h = sin(0.841471 * uv.x - 0.540302 * uv.y + iTime);
  uv += a * h;

  // Lateral texture sway (original).
  float d1 = mod(uv.x + uv.y, M_2PI);
  float d2 = mod((uv.x + uv.y + 0.25) * 1.3, M_6PI);
  d1 = iTime * 0.07 + d1;
  d2 = iTime * 0.5 + d2;
  vec2 sway = vec2(sin(d1) * 0.15 + sin(d2) * 0.05, cos(d1) * 0.15 + cos(d2) * 0.05);

  vec2 p = (uv + sway) * (CELL_SCALE / 0.25);

  // When a pixel spans more than a band width, fade to the average coverage
  // instead of letting the lines alias into noise.
  float px = fwidth(p.x) + fwidth(p.y);
  float far = smoothstep(LINE_WIDTH * 1.5, LINE_WIDTH * 8.0, px);

  // Under-layer: bigger, fainter, softer, its own drift.
  float u = lines(p * 0.7 + vec2(13.7, 4.1), t * 0.8, LINE_WIDTH * 1.4, JUNCTION_RADIUS * 1.3, 0.0, 5.0);
  // AA width from the pixel footprint, not fwidth(field): the field has seams where
  // the nearest cells switch, and fwidth there smears faint false lines.
  float uw = px * 0.7 + 0.01;
  vec3 col = mix(WATER_COL, UNDER_COL, mix(smoothstep(-uw, uw, u), 0.25, far));

  // Foam.
  float f = lines(p, t, LINE_WIDTH, JUNCTION_RADIUS, EYE_RADIUS, 0.0);
  float fw = px * 0.4;
  return mix(col, FOAM_COL, mix(smoothstep(-fw, fw, f), 0.2, far));
}

vec3 pixtoray(vec2 uv) {
  vec3 pixpos;
  pixpos.xy = uv - 0.5;
  pixpos.y *= iResolution.y / iResolution.x;
  pixpos.z = -0.6; // focal length
  return normalize(pixpos);
}

vec3 quatmul(vec4 q, vec3 v) {
  vec3 qvec = q.xyz;
  vec3 uv = cross(qvec, v);
  vec3 uuv = cross(qvec, uv);
  uv *= (2.0 * q.w);
  uuv *= 2.0;
  return v + uv + uuv;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 cpos = vec3(0.0, 4.0, 10.0);
  vec3 cdir = pixtoray(uv);

  // Tilt down just enough that the horizon sits HORIZON_FROM_TOP below the top
  // edge, whatever the window's aspect ratio.
  float halfH = 0.5 * iResolution.y / iResolution.x;
  float tilt = atan((1.0 - 2.0 * HORIZON_FROM_TOP) * halfH / 0.6);
  cdir = quatmul(vec4(-sin(0.5 * tilt), 0.0, 0.0, cos(0.5 * tilt)), cdir);

  // Rotating camera
  float cost = cos(iTime * -0.05);
  float sint = sin(iTime * -0.05);
  cdir.xz = cost * cdir.xz + sint * vec2(-cdir.z, cdir.x);
  cpos.xz = cost * cpos.xz + sint * vec2(-cpos.z, cpos.x);

  // Water is evaluated for every pixel (no branch) so fwidth stays valid;
  // above the horizon the ray is clamped and the result discarded.
  vec3 wdir = vec3(cdir.x, min(cdir.y, -1e-4), cdir.z);
  float dist = min(cpos.y / -wdir.y, MAX_DIST);
  vec3 pos = cpos + dist * wdir;
  float fog = pow(dist / MAX_DIST, 0.8);
  vec3 sea = mix(water(pos.xz, wdir), FOG_COL, fog);
  vec3 sky = mix(FOG_COL, SKY_COL, clamp(cdir.y * 4.0, 0.0, 1.0));
  gl_FragColor = vec4(cdir.y < 0.0 ? sea : sky, 1.0);
}`;

export default function OceanBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" });
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);
    // Fade in once the first frame is on screen (the html gradient is under it).
    let fadeRaf = requestAnimationFrame(() => {
      fadeRaf = requestAnimationFrame(() => {
        mount.style.opacity = "1";
      });
    });

    const uniforms = {
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iTime: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    // One oversized triangle covers the screen; the vertex shader ignores the camera.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    const camera = new THREE.Camera();

    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * RENDER_SCALE));
      const h = Math.max(1, Math.floor(window.innerHeight * RENDER_SCALE));
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      uniforms.iResolution.value.set(w, h, 1);
    };
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();
    let raf = 0;
    const frame = () => {
      uniforms.iTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    if (reducedMotion.matches) {
      uniforms.iTime.value = 0;
      renderer.render(scene, camera);
      window.addEventListener("resize", () => renderer.render(scene, camera));
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fadeRaf);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" style="position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity 2.5s ease-out;" />;
}
