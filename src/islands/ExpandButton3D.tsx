import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { burstColors } from "../lib/colors";

// The usual expand / collapse icon in the style and colours of BackButton3D (orange heads, yellow shafts, dim until hovered,
// then bright with red shafts): four arrows on the diagonals. Collapsed: they point out to the corners and push outwards and
// back ("expand"). Expanded (aria-pressed="true"): they point in at the centre and breathe slowly ("close"). The arrows never
// leave their corners and never fade: switching mode swivels each arrow half a turn around its own middle, one after the
// other, so the corner orientation is the same before and after. The host page owns the state and just toggles aria-pressed
// on the button; this island listens for it.
const SIZE = 64;
const HEAD_LEN = 0.62;
const HEAD_W = 0.78;
const SHAFT_LEN = 0.78;
const SHAFT_W = 0.3;
const DEPTH = 0.34;
const ARM_CENTER = 0.9; // distance of an arm's middle from the centre at rest
const SWIVEL = 1.05; // seconds for one arrow to swivel between pointing out and pointing in
const STAGGER = 0.09; // seconds between one arrow starting and the next
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function ExpandButton3D({ id = "frame-expand" }: { id?: string }) {
  const mountRef = useRef<HTMLButtonElement>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Same double-hydration guard as BackButton3D: always start from an empty mount.
    mount.querySelectorAll("canvas").forEach((c) => c.remove());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 4.6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none"; // the button receives the clicks
    mount.appendChild(renderer.domElement);

    const headMaterial = new THREE.MeshBasicMaterial({ color: burstColors.accOrange, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: burstColors.accYellow, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

    // One arm, drawn pointing along +x and centred on its own middle so that rotating it half a turn about z points it inwards.
    const headShape = new THREE.Shape();
    headShape.moveTo(HEAD_LEN, 0);
    headShape.lineTo(0, -HEAD_W / 2);
    headShape.lineTo(0, HEAD_W / 2);
    headShape.lineTo(HEAD_LEN, 0);
    const headGeometry = new THREE.ExtrudeGeometry(headShape, { depth: DEPTH, bevelEnabled: false });
    headGeometry.translate(0, 0, -DEPTH / 2);
    const shaftGeometry = new THREE.BoxGeometry(SHAFT_LEN, SHAFT_W, DEPTH);
    const total = SHAFT_LEN + HEAD_LEN;

    const root = new THREE.Group();
    scene.add(root);
    const arms: { flip: THREE.Group; p: number; from: number; to: number; t0: number }[] = [];
    for (let k = 0; k < 4; k++) {
      const pivot = new THREE.Group(); // rotated to the arm's direction, moved in and out along it
      pivot.rotation.z = Math.PI / 4 + (k * Math.PI) / 2; // the four corners
      const flip = new THREE.Group(); // spins the arm half a turn around its own middle
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.x = -total / 2 + SHAFT_LEN / 2;
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.x = -total / 2 + SHAFT_LEN;
      flip.add(shaft, head);
      pivot.add(flip);
      root.add(pivot);
      arms.push({ flip, p: 0, from: 0, to: 0, t0: 0 });
    }

    let time = 0;
    let target = mount.getAttribute("aria-pressed") === "true" ? 1 : 0;
    arms.forEach((a) => { a.p = a.from = a.to = target; });
    const syncState = () => {
      const open = mount.getAttribute("aria-pressed") === "true";
      mount.title = open ? "Close (Esc)" : "Expand";
      mount.setAttribute("aria-label", open ? "Close the expanded view" : "Expand to full screen");
      const next = open ? 1 : 0;
      if (next === target) return;
      target = next;
      arms.forEach((a, k) => { a.from = a.p; a.to = next; a.t0 = time + k * STAGGER; }); // each arrow starts a beat after the last
    };
    syncState();
    const observer = new MutationObserver(syncState);
    observer.observe(mount, { attributes: true, attributeFilter: ["aria-pressed"] });

    let rafId = 0;
    let last = performance.now();
    let hover = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;

      hover += ((hoverRef.current ? 1 : 0) - hover) * 0.12;

      // Idle. Outward: the arrows push out towards their corners and come back, over and over ("expand").
      // Inward: a slower, smaller in-and-out breath ("settle"). Opacity only follows hover (and is a little higher when closing).
      const push = (0.5 - 0.5 * Math.cos((time * Math.PI * 2) / 1.8)) * 0.3;
      const breath = Math.sin((time * Math.PI * 2) / 3.4) * 0.07;
      let inwardMean = 0;
      for (const a of arms) {
        const raw = Math.min(1, Math.max(0, (time - a.t0) / SWIVEL));
        a.p = a.from + (a.to - a.from) * easeInOut(raw);
        inwardMean += a.p / arms.length;
        const moving = raw > 0 && raw < 1 ? Math.sin(Math.PI * raw) : 0; // 0 at rest, 1 half way through the swivel
        a.flip.rotation.z = Math.PI * a.p; // half a turn around its own middle: the arrow ends up pointing the other way
        a.flip.position.x = ARM_CENTER + push * (1 - a.p) + breath * a.p + 0.3 * moving; // swings out a little as it turns
        a.flip.scale.setScalar(1 + 0.18 * moving);
      }
      const alpha = Math.max(0.3 + 0.3 * inwardMean, hover);
      headMaterial.opacity = alpha;
      shaftMaterial.opacity = alpha;
      shaftMaterial.color.set(hover > 0.5 ? burstColors.accRed : burstColors.accYellow);

      // A small tilt so the depth of the arrows shows, without turning them away from their corners.
      root.rotation.x = Math.sin(time * 0.9) * 0.22;
      root.rotation.y = Math.sin(time * 0.7 + 1) * 0.28;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      headGeometry.dispose();
      shaftGeometry.dispose();
      headMaterial.dispose();
      shaftMaterial.dispose();
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  return (
    <button
      id={id}
      ref={mountRef}
      type="button"
      aria-pressed="false"
      title="Expand"
      class="expand-button-3d"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      onFocus={() => (hoverRef.current = true)}
      onBlur={() => (hoverRef.current = false)}
      style={{ width: `${SIZE}px`, height: `${SIZE}px` }}
    />
  );
}
