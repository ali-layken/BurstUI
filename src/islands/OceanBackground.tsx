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
 * Cost is per pixel (2x2 supersampling x 2 layers x 75 circles), so the canvas
 * renders at RENDER_SCALE of CSS size and is stretched by the browser.
 */
const RENDER_SCALE = 0.6;
const ANTIALIAS = 1; // 0 = 1 sample/pixel, 1 = 2x2 supersampling

// Indirect warp (texture-tile units). Max stretch = 2*pi*WARP_FREQ*WARP_AMP, keep < 1.
const WARP_AMP = 0.022; // how far the lookup is pushed around (band width swings ~+-35%)
const WARP_FREQ = 5.0; // waves per texture tile (about one per cell edge)
const WARP_SPEED = 1.0; // 1 = calm sea; the storm footage is roughly 2x
const TEXTURE_SCALE = 0.13; // texture tiles per world unit (original 0.25). On-screen cell size goes as TEXTURE_SCALE * CAMERA_HEIGHT (zoom cancels out with the horizon pinned)
const HORIZON_FROM_TOP = 0.05; // horizon height, as a fraction of the screen from the top
const CAMERA_HEIGHT = 8.0; // camera height above the water (original 4.0)
const ZOOM = 1.0; // focal length multiplier (original 1.0): higher = flatter, compressed lines pushed to the horizon
const MAX_DIST = 400.0 * ZOOM; // how far the sea is drawn before it is all haze

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

// Foam junctions in the texture: x, y, peak foam depth (distance to the nearest
// circle). Found offline as the local maxima (depth >= 0.023) of the foam's
// distance field.
const JUNCTIONS: [number, number, number][] = [
  [0.247, 0.055, 0.0606], [0.761, 0.139, 0.0530], [0.797, 0.279, 0.0264], [0.173, 0.305, 0.0281],
  [0.903, 0.371, 0.0530], [0.041, 0.373, 0.0276], [0.863, 0.493, 0.0235], [0.267, 0.545, 0.0293],
  [0.887, 0.657, 0.0289], [0.149, 0.705, 0.0300], [0.231, 0.841, 0.0233], [0.695, 0.843, 0.0486],
];
// Eye shape: the eye is the part of a junction deeper than (1 - open) of its
// peak, so it is an inset of the junction's own outline (triangles, quads),
// with a radial term that rounds it toward a circle. Verified offline: up to
// EYE_MAX_OPEN with EYE_ROUND_MIN, every junction gets exactly one eye and the
// foam stays in one piece.
const EYE_MAX_OPEN = 0.28;
const EYE_ROUND_MIN = 0.3; // sharpest (most junction-shaped)
const EYE_ROUND_MAX = 0.6; // roundest

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


const junctionArray = JUNCTIONS.map(([x, y, r]) => `vec3(${glslFloat(x)}, ${glslFloat(y)}, ${glslFloat(r)})`).join(",\n  ");

const FRAGMENT = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;
uniform float uYaw; // camera spin, driven from JS (see lib/oceanSpin.ts)
uniform float uPitch; // extra downward tilt from dragging (0 = default view)

#define ANTIALIAS ${ANTIALIAS}

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
#define EYE_MAX_OPEN ${glslFloat(EYE_MAX_OPEN)}
#define EYE_ROUND_MIN ${glslFloat(EYE_ROUND_MIN)}
#define EYE_ROUND_MAX ${glslFloat(EYE_ROUND_MAX)}
#define TEXTURE_SCALE ${glslFloat(TEXTURE_SCALE)}
#define HORIZON_FROM_TOP ${glslFloat(HORIZON_FROM_TOP)}
#define MAX_DIST ${glslFloat(MAX_DIST)}
#define CAMERA_HEIGHT ${glslFloat(CAMERA_HEIGHT)}
#define FOCAL ${glslFloat(0.6 * ZOOM)}
#define ZOOM ${glslFloat(ZOOM)}

const vec3 CIRCLES[${CIRCLES.length}] = vec3[${CIRCLES.length}](
  ${circleArray}
);

const vec3 JUNCTIONS[${JUNCTIONS.length}] = vec3[${JUNCTIONS.length}](
  ${junctionArray}
);

float circ(vec2 pos, vec2 c, float s) {
  c = abs(pos - c);
  c = min(c, 1.0 - c);
  return dot(c, c) < s ? -1.0 : 0.0;
}

// Foam pattern for the water constructed out of a series of circles
float waterlayer(vec2 uv) {
  uv = mod(uv, 1.0); // Clamp to [0..1]
  float ret = 1.0;
  for (int i = 0; i < ${CIRCLES.length}; i++) {
    ret += circ(uv, CIRCLES[i].xy, CIRCLES[i].z);
  }
  return max(ret, 0.0);
}

// Same foam as waterlayer(), but via its distance field (> 0 in foam = distance
// to the nearest circle), so the junction eyes can take the junction's shape.
// Each eye opens and shuts on its own slow cycle (closed about half the time)
// and drifts between junction-shaped and rounder.
float foamlayer(vec2 uv, float t) {
  uv = mod(uv, 1.0);
  float d = 1e3;
  for (int i = 0; i < ${CIRCLES.length}; i++) {
    vec2 c = abs(uv - CIRCLES[i].xy);
    c = min(c, 1.0 - c);
    d = min(d, length(c) - sqrt(CIRCLES[i].z));
  }
  if (d <= 0.0) return 0.0;
  for (int i = 0; i < ${JUNCTIONS.length}; i++) {
    float fi = float(i);
    vec2 c = abs(uv - JUNCTIONS[i].xy);
    c = min(c, 1.0 - c);
    float peak = JUNCTIONS[i].z;
    // Slightly below zero at rest so the peak itself never shows as a speck.
    float open = (EYE_MAX_OPEN + 0.04) * clamp(1.6 * sin(0.45 * t + fi * 2.4) - 0.3, 0.0, 1.0) - 0.04;
    float roundness = mix(EYE_ROUND_MIN, EYE_ROUND_MAX, 0.5 + 0.5 * sin(0.31 * t + fi * 1.7));
    if (d > peak * (1.0 - open) + roundness * dot(c, c) / peak) return 0.0;
  }
  return 1.0;
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
  vec3 ret = mix(WATER_COL, WATER2_COL, waterlayer(under + indirect(under, t * 0.8 + 3.0)));
  ret = mix(ret, FOAM_COL, foamlayer(foam + indirect(foam, t), t));
  return ret;
}

// Camera perspective based on [0..1] viewport
vec3 pixtoray(vec2 uv) {
  vec3 pixpos;
  pixpos.xy = uv - 0.5;
  pixpos.y *= iResolution.y / iResolution.x; // Aspect correction
  pixpos.z = -FOCAL; // Focal length (Controls field of view)
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
  vec3 cdir = pixtoray(uv);

  // Tilt down just enough that the horizon sits HORIZON_FROM_TOP below the top
  // edge, whatever the window's aspect ratio.
  float halfH = 0.5 * iResolution.y / iResolution.x;
  float tilt = atan((1.0 - 2.0 * HORIZON_FROM_TOP) * halfH / FOCAL);
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

  // Ray-plane intersection
  const vec3 ocean = vec3(0.0, 1.0, 0.0);
  float dist = -dot(cpos, ocean) / dot(cdir, ocean);
  vec3 pos = cpos + dist * cdir;

  if (dist > 0.0 && dist < MAX_DIST) {
    vec3 wat = water(pos.xz, cdir);
    // Far away the lines are thinner than a pixel and alias; settle to their
    // average colour before the haze takes over.
    wat = mix(wat, mix(WATER_COL, FOAM_COL, 0.16), smoothstep(60.0 * ZOOM, 220.0 * ZOOM, dist));
    return mix(wat, FOG_COL, pow(dist / MAX_DIST, 0.8));
  }
  return mix(FOG_COL, SKY_COL, min(cdir.y * 4.0, 1.0));
}

void main() {
#if ANTIALIAS
  vec3 col = vec3(0.0);
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      col += shade(gl_FragCoord.xy + vec2(0.5) * vec2(x, y) - vec2(0.25)) * 0.25;
    }
  }
  gl_FragColor = vec4(col, 1.0);
#else
  gl_FragColor = vec4(shade(gl_FragCoord.xy), 1.0);
#endif
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
    let last = start;
    let raf = 0;
    const spin = reducedMotion.matches ? null : createSpinController();
    const frame = () => {
      const now = performance.now();
      uniforms.iTime.value = (now - start) / 1000;
      const pose = spin!.step((now - last) / 1000);
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
