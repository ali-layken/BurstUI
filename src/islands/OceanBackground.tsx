import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { createSpinController } from "../lib/oceanSpin";

/**
 * Full-page background: the "Wind Waker Ocean" shader by Polyflare
 * (https://www.shadertoy.com/view/ltfGD7, CC BY 4.0), ported to a three.js
 * fullscreen triangle. The foam texture is still Polyflare's 75 circles
 * (fitted to the game's texture; its ~16% foam coverage matches the footage).
 *
 * Changes from the original, each matched against gameplay footage:
 *  - Indirect warp: the game samples the foam through a scrolling offset map
 *    (GameCube indirect texturing), so the lines bend and thicken/thin locally
 *    instead of the whole texture sliding as one piece. Modelled as three
 *    travelling sine waves offsetting the texture lookup. The offset is smooth
 *    and never folds (max stretch < 1), so lines can never break and no new
 *    holes can appear.
 *  - Junction eyes: small water holes at the 12 foam junctions of the texture
 *    (the local maxima of the foam's distance field), sized to sit inside the
 *    foam and pulsing slowly. Nowhere else.
 *  - Palette measured from daytime HD footage; horizon held near the top of
 *    the screen; sea drawn further out.
 *
 * Rendering: full resolution at the display's pixel density (capped at
 * MAX_PIXEL_RATIO), one sample per pixel with analytic antialiasing (each edge
 * pixel gets its exact coverage from the line field's screen-space gradient).
 * If the frame rate drops below MIN_FPS the resolution steps down, and back up
 * when there is headroom, so slower machines stay smooth.
 */
const MAX_PIXEL_RATIO = 2;
const MIN_FPS = 45;

// Indirect warp (texture-tile units). Max stretch = 2*pi*WARP_FREQ*WARP_AMP, keep < 1.
const WARP_AMP = 0.022; // how far the lookup is pushed around (band width swings ~+-35%)
const WARP_FREQ = 5.0; // waves per texture tile (about one per cell edge)
const WARP_SPEED = 2.5; // morph speed. 2.5 moves band edges ~5-10% of a band width per 30fps frame, as measured in the game footage
const TEXTURE_SCALE = 0.13; // texture tiles per world unit (original 0.25): lower = bigger cells
// Camera: looks down CAMERA_TILT_DEG from CAMERA_HEIGHT with a vertical half
// field of view of HALF_FOV_DEG. The top edge of the screen is at
// (CAMERA_TILT_DEG - HALF_FOV_DEG) below the horizon: negative = horizon on screen.
const CAMERA_HEIGHT = 30.0; // above the water (original 4.0)
const CAMERA_TILT_DEG = 55.0; // how steeply the screen centre looks down
const HALF_FOV_DEG = 20.0; // vertical half field of view: lower = more zoomed in
const MAX_DIST = 400.0; // how far the sea is drawn before it is all haze

// Colour sets (0..255). "windwaker" is measured from daytime HD footage of the
// game; "burst" uses the site's own colours. Keep styles.css's html fallback
// gradient in sync with whichever is active.
type Rgb = [number, number, number];
const PALETTES: Record<string, { water: Rgb; under: Rgb; foam: Rgb; fog: Rgb; sky: Rgb }> = {
  windwaker: { water: [11, 101, 167], under: [6, 90, 154], foam: [192, 232, 236], fog: [127, 212, 221], sky: [92, 189, 237] },
  burst: { water: [45, 6, 102], under: [35, 30, 135], foam: [240, 208, 236], fog: [128, 82, 196], sky: [197, 138, 249] },
};
const PALETTE = PALETTES.burst;
const glslRgb = ([r, g, b]: Rgb) => `vec3(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)})`;

// Slow swell: a broad, slow extra warp so whole regions of lines thicken and
// thin over several seconds (on top of the fast WARP_* shimmer). Combined warp
// verified offline not to fold (min stretch determinant 0.19 > 0).
const SWELL_AMP = 0.03;
const SWELL_FREQ = 1.0; // waves per texture tile

// Junction eyes: holes baked permanently into the texture at the 2 biggest
// junctions (most junctions in the game have none), like the rest of the pattern. They move and morph only through the
// same warp as every other line. Shape: the part of the junction deeper than
// (1 - EYE_OPEN) of its peak in a smooth-min distance field (globular, no
// points), pulled toward a circle by EYE_ROUND. Verified offline (up to 0.9
// open, roundness >= 0.2): foam stays one piece, each eye is one hole.
const EYE_SMOOTH = 0.012; // smooth-min radius (texture units)
// Cell outlines: the circles of one cell meet in sharp notches, which showed as
// spikes and pointed kinks in the foam. Lines are drawn from a smooth-min of the
// circle distances instead (plus k*ln2 so line widths stay the same), which rounds
// every notch. Verified offline: 0.008 keeps every line connected; 0.01 already
// pinches one shut.
const CELL_SMOOTH = 0.008;
const EYE_OPEN = 0.85; // eye size, as a share of the junction's depth (verified up to 0.9)
const EYE_ROUND = 0.22; // lower = follows the junction's shape, higher = rounder (verified >= 0.2)
// Eyed junctions on the smooth field: x, y, peak depth (found offline): the two
// biggest. Others that could take one: [0.908, 0.372, 0.0324], [0.698, 0.842, 0.0296].
const EYES: [number, number, number][] = [
  [0.248, 0.054, 0.0412], [0.762, 0.137, 0.0329],
];

// x, y, radius^2 (the shader compares dot(d, d) < s)
const CIRCLES: [number, number, number][] = [
  [0.37378, 0.277169, 0.0268181], [0.0317477, 0.540372, 0.0193742], [0.430044, 0.882218, 0.0232337],
  [0.641033, 0.695106, 0.0117864], [0.0146398, 0.0791346, 0.0299458], [0.43871, 0.394445, 0.0289087],
  [0.909446, 0.878141, 0.028466], [0.310149, 0.686637, 0.0128496], [0.928617, 0.195986, 0.0152041],
  [0.0438506, 0.868153, 0.0268601], [0.308619, 0.194937, 0.00806102], [0.349922, 0.449714, 0.00928667],
  [0.0449556, 0.953415, 0.023126], [0.117761, 0.503309, 0.0151272], [0.563517, 0.244991, 0.0292322],
  [0.566936, 0.954457, 0.00981141], [0.0489944, 0.200931, 0.0178746], [0.569297, 0.624893, 0.0132408],
  [0.298347, 0.710972, 0.0114426], [0.878141, 0.771279, 0.00322719], [0.150995, 0.376221, 0.00216157],
  [0.119673, 0.541984, 0.0124621], [0.629598, 0.295629, 0.0198736], [0.334357, 0.266278, 0.0187145],
  [0.918044, 0.968163, 0.0182928], [0.965445, 0.505026, 0.006348], [0.514847, 0.865444, 0.00623523],
  [0.710575, 0.0415131, 0.00322689], [0.71403, 0.576945, 0.0215641], [0.748873, 0.413325, 0.0110795],
  [0.0623365, 0.896713, 0.0236203], [0.980482, 0.473849, 0.00573439], [0.647463, 0.654349, 0.0188713],
  [0.651406, 0.981297, 0.00710875], [0.428928, 0.382426, 0.0298806], [0.811545, 0.62568, 0.00265539],
  [0.400787, 0.74162, 0.00486609], [0.331283, 0.418536, 0.00598028], [0.894762, 0.0657997, 0.00760375],
  [0.525104, 0.572233, 0.0141796], [0.431526, 0.911372, 0.0213234], [0.658212, 0.910553, 0.000741023],
  [0.514523, 0.243263, 0.0270685], [0.0249494, 0.252872, 0.00876653], [0.502214, 0.47269, 0.0234534],
  [0.693271, 0.431469, 0.0246533], [0.415, 0.884418, 0.0271696], [0.149073, 0.41204, 0.00497198],
  [0.533816, 0.897634, 0.00650833], [0.0409132, 0.83406, 0.0191398], [0.638585, 0.646019, 0.0206129],
  [0.660342, 0.966541, 0.0053511], [0.513783, 0.142233, 0.00471653], [0.124305, 0.644263, 0.00116724],
  [0.99871, 0.583864, 0.0107329], [0.894879, 0.233289, 0.00667092], [0.246286, 0.682766, 0.00411623],
  [0.0761895, 0.16327, 0.0145935], [0.949386, 0.802936, 0.0100873], [0.480122, 0.196554, 0.0110185],
  [0.896854, 0.803707, 0.013969], [0.292865, 0.762973, 0.00566413], [0.0995585, 0.117457, 0.00869407],
  [0.377713, 0.00335442, 0.0063147], [0.506365, 0.531118, 0.0144016], [0.408806, 0.894771, 0.0243923],
  [0.143579, 0.85138, 0.00418529], [0.0902811, 0.181775, 0.0108896], [0.780695, 0.394644, 0.00475475],
  [0.298036, 0.625531, 0.00325285], [0.218423, 0.714537, 0.00157212], [0.658836, 0.159556, 0.00225897],
  [0.987324, 0.146545, 0.0288391], [0.222646, 0.251694, 0.00092276], [0.159826, 0.528063, 0.00605293],
];

const glslFloat = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const circleArray = CIRCLES.map(([x, y, s]) => `vec3(${glslFloat(x)}, ${glslFloat(y)}, ${glslFloat(s)})`).join(",\n  ");

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;


const eyeArray = EYES.map(([x, y, r]) => `vec3(${glslFloat(x)}, ${glslFloat(y)}, ${glslFloat(r)})`).join(",\n  ");

const FRAGMENT = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;
uniform float uYaw; // camera spin, driven from JS (see lib/oceanSpin.ts)
uniform float uPitch; // extra downward tilt from dragging (0 = default view)


// Active palette (see PALETTES).
#define WATER_COL ${glslRgb(PALETTE.water)}
#define WATER2_COL ${glslRgb(PALETTE.under)}
#define FOAM_COL ${glslRgb(PALETTE.foam)}
#define FOG_COL ${glslRgb(PALETTE.fog)}
#define SKY_COL ${glslRgb(PALETTE.sky)}

#define M_2PI 6.283185307
#define M_6PI 18.84955592

#define WARP_AMP ${glslFloat(WARP_AMP)}
#define WARP_FREQ ${glslFloat(WARP_FREQ)}
#define WARP_SPEED ${glslFloat(WARP_SPEED)}
#define SWELL_AMP ${glslFloat(SWELL_AMP)}
#define SWELL_FREQ ${glslFloat(SWELL_FREQ)}
#define EYE_SMOOTH ${glslFloat(EYE_SMOOTH)}
#define CELL_SMOOTH ${glslFloat(CELL_SMOOTH)}
#define EYE_OPEN ${glslFloat(EYE_OPEN)}
#define EYE_ROUND ${glslFloat(EYE_ROUND)}
#define TEXTURE_SCALE ${glslFloat(TEXTURE_SCALE)}
#define MAX_DIST ${glslFloat(MAX_DIST)}
#define CAMERA_HEIGHT ${glslFloat(CAMERA_HEIGHT)}
#define CAMERA_TILT ${glslFloat((CAMERA_TILT_DEG * Math.PI) / 180)}
#define HALF_FOV ${glslFloat((HALF_FOV_DEG * Math.PI) / 180)}

const vec3 CIRCLES[${CIRCLES.length}] = vec3[${CIRCLES.length}](
  ${circleArray}
);

const vec3 EYES[${EYES.length}] = vec3[${EYES.length}](
  ${eyeArray}
);

// Line pattern constructed out of a series of circles, as a signed field: > 0 on
// the lines (the gaps between circles), < 0 inside the cells, in texture units.
// Cell outlines use a smooth-min of the circle distances (online log-sum-exp) so
// they have no sharp notches.
float waterlayer(vec2 uv) {
  uv = mod(uv, 1.0); // Clamp to [0..1]
  float m = 1e3, s = 0.0;
  for (int i = 0; i < ${CIRCLES.length}; i++) {
    vec2 c = abs(uv - CIRCLES[i].xy);
    c = min(c, 1.0 - c);
    float x = length(c) - sqrt(CIRCLES[i].z);
    if (x < m) { s = s * exp((x - m) / CELL_SMOOTH) + 1.0; m = x; }
    else { s += exp((m - x) / CELL_SMOOTH); }
  }
  return m - CELL_SMOOTH * log(s) + CELL_SMOOTH * 0.693147;
}

// Same foam as waterlayer(), plus the permanent eyes. One pass over the circles
// gives both the plain distance (foam boundary, unchanged) and a smooth-min
// distance (online log-sum-exp) that the eyes are cut from.
float foamlayer(vec2 uv) {
  uv = mod(uv, 1.0);
  // Two smooth-mins in one pass: CELL_SMOOTH for the line outlines, EYE_SMOOTH for the eyes.
  float m = 1e3, s = 0.0, se = 0.0;
  for (int i = 0; i < ${CIRCLES.length}; i++) {
    vec2 c = abs(uv - CIRCLES[i].xy);
    c = min(c, 1.0 - c);
    float x = length(c) - sqrt(CIRCLES[i].z);
    if (x < m) {
      s = s * exp((x - m) / CELL_SMOOTH) + 1.0;
      se = se * exp((x - m) / EYE_SMOOTH) + 1.0;
      m = x;
    } else {
      s += exp((m - x) / CELL_SMOOTH);
      se += exp((m - x) / EYE_SMOOTH);
    }
  }
  float f = m - CELL_SMOOTH * log(s) + CELL_SMOOTH * 0.693147;
  float ds = m - EYE_SMOOTH * log(se);
  for (int i = 0; i < ${EYES.length}; i++) {
    vec2 c = abs(uv - EYES[i].xy);
    c = min(c, 1.0 - c);
    float peak = EYES[i].z;
    // Eye = where ds exceeds the level; cut it out of the foam (min = intersection).
    f = min(f, peak * (1.0 - EYE_OPEN) + EYE_ROUND * dot(c, c) / peak - ds);
  }
  return f;
}

// Analytic antialiasing: coverage of a signed field across this pixel.
float coverage(float field) {
  float w = fwidth(field) * 0.6 + 1e-6;
  return smoothstep(-w, w, field);
}

// Slow swell offset: regions of lines thicken/thin over several seconds.
vec2 swellPhase(vec2 uv, float time) {
  return M_2PI * SWELL_FREQ * vec2(dot(uv, vec2(0.6, 0.8)), dot(uv, vec2(-0.95, 0.31)))
    + vec2(0.55, 0.4) * time + vec2(1.0, 3.7);
}
vec2 swellOffset(vec2 uv, float time) {
  vec2 a = swellPhase(uv, time);
  return SWELL_AMP / 2.0 * vec2(sin(a.x) + sin(a.y), cos(1.07 * a.x + 1.3) + cos(1.07 * a.y + 1.3));
}

// Indirect-texture style offset: three travelling waves in different directions.
// Smooth and never folds over, so the network's shape changes but not its topology.
vec2 indirect(vec2 uv, float t) {
  vec3 a = M_2PI * WARP_FREQ * vec3(
    dot(uv, vec2(0.83, 0.56)),
    dot(uv, vec2(-0.42, 0.91)),
    dot(uv, vec2(0.97, -0.26))
  ) + vec3(1.1, 0.8, 1.4) * t + vec3(0.0, 2.1, 4.2);
  return WARP_AMP / 3.0 * vec2(
    sin(a.x) + sin(a.y) + sin(a.z),
    cos(a.x * 1.07 + 1.3) + cos(a.y * 1.07 + 1.3) + cos(a.z * 1.07 + 1.3)
  );
}

vec3 water(vec2 uv, vec3 cdir) {
  uv *= vec2(TEXTURE_SCALE);
  float t = iTime * WARP_SPEED;

  // Parallax height distortion with two directional waves at slightly different angles.
  vec2 a = 0.025 * cdir.xz / cdir.y; // Parallax offset
  float h = sin(uv.x + iTime); // Height at UV
  uv += a * h;
  h = sin(0.841471 * uv.x - 0.540302 * uv.y + iTime);
  uv += a * h;

  // Texture distortion
  float d1 = mod(uv.x + uv.y, M_2PI);
  float d2 = mod((uv.x + uv.y + 0.25) * 1.3, M_6PI);
  d1 = iTime * 0.07 + d1;
  d2 = iTime * 0.5 + d2;
  vec2 dist = vec2(
    sin(d1) * 0.15 + sin(d2) * 0.05,
    cos(d1) * 0.15 + cos(d2) * 0.05
  );

  vec2 under = uv + dist.xy;
  vec2 foam = vec2(1.0) - uv - dist.yx;
  vec3 ret = mix(WATER_COL, WATER2_COL, coverage(waterlayer(under + indirect(under, t * 0.8 + 3.0))));
  vec2 foamWarped = foam + indirect(foam, t) + swellOffset(foam, iTime);
  ret = mix(ret, FOAM_COL, coverage(foamlayer(foamWarped)));
  return ret;
}

// Camera perspective based on [0..1] viewport
vec3 pixtoray(vec2 uv, float focal) {
  vec3 pixpos;
  pixpos.xy = uv - 0.5;
  pixpos.y *= iResolution.y / iResolution.x; // Aspect correction
  pixpos.z = -focal; // Focal length (Controls field of view)
  return normalize(pixpos);
}

// Quaternion-vector multiplication
vec3 quatmul(vec4 q, vec3 v) {
  vec3 qvec = q.xyz;
  vec3 uv = cross(qvec, v);
  vec3 uuv = cross(qvec, uv);
  uv *= (2.0 * q.w);
  uuv *= 2.0;
  return v + uv + uuv;
}

vec3 shade(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  // Same vertical field of view at any aspect ratio.
  float halfH = 0.5 * iResolution.y / iResolution.x;
  float focal = halfH / tan(HALF_FOV);
  vec3 cdir = pixtoray(uv, focal);
  float tilt = CAMERA_TILT;
  // Stand back from the origin by exactly the distance to the point the screen
  // centre looks at, so the spin pivots on the middle of the screen.
  vec3 cpos = vec3(0.0, CAMERA_HEIGHT, CAMERA_HEIGHT / tan(tilt));
  tilt = clamp(tilt + uPitch, -0.3, 1.4); // dragging can look up at the sky or down at the water
  cdir = quatmul(vec4(-sin(0.5 * tilt), 0.0, 0.0, cos(0.5 * tilt)), cdir);

  // Rotating camera (orbits the point it looks at, so the sea turns like a turntable)
  float cost = cos(uYaw);
  float sint = sin(uYaw);
  cdir.xz = cost * cdir.xz + sint * vec2(-cdir.z, cdir.x);
  cpos.xz = cost * cpos.xz + sint * vec2(-cpos.z, cpos.x);

  // Ray-plane intersection. The water is evaluated for every pixel (no branch)
  // so the antialiasing derivatives stay valid; rays at or above the horizon are
  // clamped to MAX_DIST and their result is replaced by sky below.
  vec3 wdir = vec3(cdir.x, min(cdir.y, -1e-4), cdir.z);
  float dist = min(cpos.y / -wdir.y, MAX_DIST);
  vec3 pos = cpos + dist * wdir;
  vec3 wat = water(pos.xz, wdir);
  // Far away the lines are thinner than a pixel; settle to their average colour
  // before the haze takes over.
  wat = mix(wat, mix(WATER_COL, FOAM_COL, 0.16), smoothstep(60.0, 220.0, dist));
  // Eases into full haze with zero slope at MAX_DIST, so there's no crease
  // where the sea stops being drawn.
  float fog = 1.0 - pow(1.0 - dist / MAX_DIST, 1.6);
  vec3 sea = mix(wat, FOG_COL, fog);
  vec3 sky = mix(FOG_COL, SKY_COL, clamp(cdir.y * 4.0, 0.0, 1.0));
  return cdir.y < 0.0 && dist < MAX_DIST ? sea : sky;
}

void main() {
  gl_FragColor = vec4(shade(gl_FragCoord.xy), 1.0);
}`;

export default function OceanBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
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
      uYaw: { value: 0 },
      uPitch: { value: 0 },
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

    // Resolution: CSS size x the display's pixel density (capped), times a
    // quality factor the frame loop lowers if the GPU can't keep up.
    const maxRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    let quality = 1;
    const resize = () => {
      const ratio = maxRatio() * quality;
      const w = Math.max(1, Math.floor(window.innerWidth * ratio));
      const h = Math.max(1, Math.floor(window.innerHeight * ratio));
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      uniforms.iResolution.value.set(w, h, 1);
    };
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Random head start on the wave/eye clock (up to 5 min) so each visit
    // starts in a different phase; the spin controller also starts at a random yaw.
    const start = performance.now() - Math.random() * 300_000;
    let last = performance.now();
    let raf = 0;
    const spin = reducedMotion.matches ? null : createSpinController();
    // Adaptive resolution: every ~1 s, step quality down if below MIN_FPS and
    // back up when comfortably above it (ignores long gaps like background tabs).
    let frames = 0;
    let busy = 0;
    const frame = () => {
      const now = performance.now();
      const dt = now - last;
      if (dt < 250) {
        frames++;
        busy += dt;
        if (busy > 1000) {
          const fps = (frames * 1000) / busy;
          if (fps < MIN_FPS && quality > 0.4) {
            quality = Math.max(0.4, quality * 0.85);
            resize();
          } else if (fps > MIN_FPS + 12 && quality < 1) {
            quality = Math.min(1, quality * 1.08);
            resize();
          }
          frames = 0;
          busy = 0;
        }
      }
      uniforms.iTime.value = (now - start) / 1000;
      const pose = spin!.step(dt / 1000);
      uniforms.uYaw.value = pose.yaw;
      uniforms.uPitch.value = pose.pitch;
      last = now;
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
      spin?.dispose();
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" style="position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity 2.5s ease-out;" />;
}
