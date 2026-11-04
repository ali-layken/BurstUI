import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";

/**
 * Full-page background based on the "Wind Waker Ocean" shader by Polyflare
 * (https://www.shadertoy.com/view/ltfGD7, CC BY 4.0), ported to a three.js
 * fullscreen triangle and reworked to match how the game's sea actually moves.
 *
 * What frame-by-frame analysis of the real game showed, and how it's modelled:
 *  - Each foam band is two copies of the same line network, offset slightly and
 *    drifting relative to each other. Overlapping copies read as one band; when
 *    they drift apart the band thickens, splits into parallel strands, and
 *    pinches shut where they cross, leaving the little lens-shaped "eyes".
 *    -> foam = union of two copies of the network with a slowly varying offset.
 *  - On top of that the whole band dilates/erodes over time (width "breathes").
 *    -> the network is a signed distance field, thresholded at a moving level.
 *  - Under the foam there is a second, fainter layer of darker lines (~12%
 *    darker than the water) doing the same thing with its own drift.
 *
 * The network itself is still Polyflare's 75 circles (fitted to the game's
 * texture); foam is the gaps between them. Edges are antialiased analytically
 * with fwidth, so there is no supersampling.
 */
const RENDER_SCALE = 0.75;

// Tunables (texture-tile units; one tile = 4 world units)
const FOAM_SEPARATION = 0.014; // how far the two foam copies drift apart (eyes/double lines)
const FOAM_BREATHE = 0.006; // how much band width swells/shrinks
const UNDER_SEPARATION = 0.02;
const UNDER_BREATHE = 0.008;
const MORPH_SPEED = 1.0; // 1 = calm; the storm footage is roughly 2-3
const CELL_ROUNDING = 0.008; // smooth-min radius between circles (rounder cells, softer junctions)
const STRAND_MERGE = 0.006; // water gaps thinner than this between strands close up
const LINE_THIN = 0.002; // global erosion of the lines (lower foam coverage)
const BAND_CAP = 0.045; // max foam band width per copy; wider gaps open into eyes
const TEXTURE_SCALE = 0.2; // texture tiles per world unit (original 0.25; lower = bigger cells)

// x, y, s from the original shader, where s = radius^2
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
// The GLSL array stores the radius, so the shader can build a distance field.
const circleArray = CIRCLES.map(
  ([x, y, s]) => `vec3(${glslFloat(x)}, ${glslFloat(y)}, ${glslFloat(+Math.sqrt(s).toPrecision(6))})`,
).join(",\n  ");

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

#define MORPH_SPEED ${glslFloat(MORPH_SPEED)}
#define FOAM_SEPARATION ${glslFloat(FOAM_SEPARATION)}
#define FOAM_BREATHE ${glslFloat(FOAM_BREATHE)}
#define UNDER_SEPARATION ${glslFloat(UNDER_SEPARATION)}
#define UNDER_BREATHE ${glslFloat(UNDER_BREATHE)}
#define CELL_ROUNDING ${glslFloat(CELL_ROUNDING)}
#define STRAND_MERGE ${glslFloat(STRAND_MERGE)}
#define LINE_THIN ${glslFloat(LINE_THIN)}
#define TEXTURE_SCALE ${glslFloat(TEXTURE_SCALE)}
#define BAND_CAP ${glslFloat(BAND_CAP)}

// x, y, radius
const vec3 CIRCLES[${CIRCLES.length}] = vec3[${CIRCLES.length}](
  ${circleArray}
);

// Polynomial smooth min/max (iq). k = blend radius in tile units.
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

// Signed distance to the circle set on a wrapping unit tile:
// > 0 in the gaps between circles (the line network), < 0 inside a circle.
// Smooth-min rounds the cusps where circles meet, so cells read as soft blobs
// and line junctions get the game's rounded concave triangles.
float network(vec2 uv) {
  uv = fract(uv);
  float d = 1e3;
  for (int i = 0; i < ${CIRCLES.length}; i++) {
    vec2 c = abs(uv - CIRCLES[i].xy);
    c = min(c, 1.0 - c);
    d = smin(d, length(c) - CIRCLES[i].z, CELL_ROUNDING);
  }
  return d;
}

// Two copies of the network drifting relative to each other, unioned, then
// dilated/eroded by a slowly travelling amount. Signed: > 0 means "on a line".
// Where the copies overlap you get one band; slightly apart, a fat band; further
// apart, two strands that pinch shut where they cross, leaving lens-shaped eyes.
float morphLines(vec2 uv, float t, float sep, float breathe, float seed) {
  vec2 off = sep * vec2(
    sin(t * 0.83 + uv.y * 9.0 + 1.3 * sin(uv.x * 7.0 + seed)),
    cos(t * 0.67 + uv.x * 8.0 + 1.1 * sin(uv.y * 6.0 - seed))
  );
  // Cap each copy's band: gaps wider than 2*BAND_CAP (voids between circles)
  // become a foam outline around water instead of a big solid foam blob.
  float a = network(uv + off);
  float b = network(uv - off);
  a = min(a, BAND_CAP - a);
  b = min(b, BAND_CAP - b);
  // Smooth union = union + closing: water slivers thinner than STRAND_MERGE
  // between the two strands fill in, so only plump lens-shaped eyes survive.
  float grow = breathe * sin(t * 1.1 + (uv.x - uv.y) * 11.0 + seed) - LINE_THIN;
  return smax(a, b, STRAND_MERGE) + grow;
}

vec3 water(vec2 uv, vec3 cdir) {
  uv *= vec2(TEXTURE_SCALE);
  float t = iTime * MORPH_SPEED;

  // Parallax height distortion with two directional waves at slightly different angles.
  vec2 a = 0.025 * cdir.xz / cdir.y;
  float h = sin(uv.x + iTime);
  uv += a * h;
  h = sin(0.841471 * uv.x - 0.540302 * uv.y + iTime);
  uv += a * h;

  // Lateral texture distortion (original).
  float d1 = mod(uv.x + uv.y, M_2PI);
  float d2 = mod((uv.x + uv.y + 0.25) * 1.3, M_6PI);
  d1 = iTime * 0.07 + d1;
  d2 = iTime * 0.5 + d2;
  vec2 dist = vec2(
    sin(d1) * 0.15 + sin(d2) * 0.05,
    cos(d1) * 0.15 + cos(d2) * 0.05
  );

  // Once a pixel covers more texture than a band is wide, lines would alias into
  // noise; fade both layers to their average coverage instead.
  float px = fwidth(uv.x) + fwidth(uv.y);
  float far = smoothstep(0.006, 0.03, px);

  // Under-layer: fainter, darker lines with their own drift and a softer edge.
  float u = morphLines(uv + dist.xy, t, UNDER_SEPARATION, UNDER_BREATHE, 3.1);
  float uw = fwidth(u) + 0.0015;
  float under = mix(smoothstep(-uw, uw, u), 0.3, far);
  vec3 col = mix(WATER_COL, UNDER_COL, under);

  // Foam layer.
  float f = morphLines(vec2(1.0) - uv - dist.yx, t, FOAM_SEPARATION, FOAM_BREATHE, 0.0);
  float fw = fwidth(f) * 0.75;
  float foam = mix(smoothstep(-fw, fw, f), 0.25, far);
  return mix(col, FOAM_COL, foam);
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
  cdir = quatmul(vec4(-0.19867, 0.0, 0.0, 0.980067), cdir); // tilt down slightly

  // Rotating camera
  float cost = cos(iTime * -0.05);
  float sint = sin(iTime * -0.05);
  cdir.xz = cost * cdir.xz + sint * vec2(-cdir.z, cdir.x);
  cpos.xz = cost * cpos.xz + sint * vec2(-cpos.z, cpos.x);

  // Water is evaluated for every pixel (no branch) so fwidth stays valid;
  // above the horizon the ray is clamped and the result discarded.
  vec3 wdir = vec3(cdir.x, min(cdir.y, -1e-3), cdir.z);
  float dist = min(cpos.y / -wdir.y, 100.0);
  vec3 pos = cpos + dist * wdir;
  vec3 sea = mix(water(pos.xz, wdir), FOG_COL, min(dist * 0.01, 1.0));
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
