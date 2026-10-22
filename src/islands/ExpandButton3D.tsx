import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { burstColors } from "../lib/colors";

// A four-pointed arrow in the same style and colours as BackButton3D (orange heads, yellow shafts, dim until hovered,
// then bright with red shafts). Collapsed: the arrows point outwards and pulse outwards ("expand"). Expanded
// (aria-pressed="true"): each arrow flips to point inwards and the set breathes slowly ("close"). The host page owns the
// state and just toggles aria-pressed on the button; this island listens for it.
const SIZE = 64;
const HEAD_LEN = 0.62;
const HEAD_W = 0.78;
const SHAFT_LEN = 0.78;
const SHAFT_W = 0.3;
const DEPTH = 0.34;
const ARM_CENTER = 0.95; // distance of an arm's middle from the centre at rest

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

    const headMaterial = new THREE.MeshBasicMaterial({ color: burstColors.accOrange, transparent: true, opacity: 0.3 });
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: burstColors.accYellow, transparent: true, opacity: 0.3 });

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
    const arms: { pivot: THREE.Group; flip: THREE.Group }[] = [];
    for (let k = 0; k < 4; k++) {
      const pivot = new THREE.Group(); // rotated to the arm's direction, moved in and out along it
      pivot.rotation.z = (k * Math.PI) / 2;
      const flip = new THREE.Group(); // spins the arm half a turn around its own middle
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.x = -total / 2 + SHAFT_LEN / 2;
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.x = -total / 2 + SHAFT_LEN;
      flip.add(shaft, head);
      pivot.add(flip);
      root.add(pivot);
      arms.push({ pivot, flip });
    }

    let flipTarget = mount.getAttribute("aria-pressed") === "true" ? 1 : 0;
    let flipValue = flipTarget;
    const syncState = () => {
      const open = mount.getAttribute("aria-pressed") === "true";
      flipTarget = open ? 1 : 0;
      mount.title = open ? "Close (Esc)" : "Expand";
      mount.setAttribute("aria-label", open ? "Close the expanded view" : "Expand to full screen");
    };
    syncState();
    const observer = new MutationObserver(syncState);
    observer.observe(mount, { attributes: true, attributeFilter: ["aria-pressed"] });

    let rafId = 0;
    let last = performance.now();
    let time = 0;
    let hover = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;

      hover += ((hoverRef.current ? 1 : 0) - hover) * 0.12;
      flipValue += (flipTarget - flipValue) * Math.min(1, dt * 7);
      const inward = flipValue; // 0 = pointing out, 1 = pointing in

      // Outward: arrows push out along their direction and fade, then start again ("expand").
      // Inward: a slow in-and-out breath ("settle").
      const period = 1.7;
      const p = (time % period) / period;
      const push = (1 - Math.pow(1 - p, 3)) * 0.42;
      const breath = Math.sin((time * Math.PI * 2) / 3.4) * 0.09;
      const offset = push * (1 - inward) + breath * inward;
      const fade = 1 - 0.65 * p * p;
      const alphaBase = 0.3 + 0.7 * hover;
      const alpha = alphaBase * (fade * (1 - inward) + inward);

      for (const { flip } of arms) {
        flip.position.x = ARM_CENTER + offset;
        flip.rotation.z = Math.PI * inward;
      }
      headMaterial.opacity = alpha;
      shaftMaterial.opacity = alpha;
      shaftMaterial.color.set(hover > 0.5 ? burstColors.accRed : burstColors.accYellow);

      // A gentle sway so the depth of the arrows shows, like the back arrow's roll.
      root.rotation.x = Math.sin(time * 0.9) * 0.5;
      root.rotation.y = Math.sin(time * 0.7 + 1) * 0.55;

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
