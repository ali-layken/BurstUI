import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { burstColors } from "../lib/colors";

// A submit button in the style of BackButton3D and ExpandButton3D: flat theme colours, extruded shapes, a slow tilt so the
// depth shows. Two looks:
//   "letter": an envelope hovering over a letter slot. Sending drops it into the slot; the slot's rim turns green when the
//             report is stored and a fresh envelope comes down, or turns red and the envelope pops back out when it is not.
//   "arrow":  the site's arrow, pointing on. Sending shoots it off to the right; it comes back green, or red and shaking.
// The host page owns the state and sets data-state on the button (idle | sending | sent | failed); this island listens.
type Variant = "letter" | "arrow";
const W = 92;
const H = 64;
const REST_Y = 0.5; // the envelope's hover height
const IN_Y = -2.5; // fully inside the slot
const TOP_Y = 3.4; // above the canvas: where a fresh envelope comes from
const SLOT_Y = -1.3;
const FLASH = 1.6; // seconds the rim keeps the answer's colour

export default function SendButton3D({
  id = "rf-send",
  variant = "letter",
  label = "Send report",
}: {
  id?: string;
  variant?: Variant;
  label?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const button = buttonRef.current;
    const mount = mountRef.current;
    if (!button || !mount) return;

    // Same double-hydration guard as BackButton3D: always start from an empty mount.
    mount.querySelectorAll("canvas").forEach((c) => c.remove());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none"; // the button receives the clicks
    mount.appendChild(renderer.domElement);

    const disposables: { dispose(): void }[] = [];
    const flat = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) => {
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...extra });
      disposables.push(m);
      return m;
    };
    const keep = <T extends THREE.BufferGeometry>(g: T) => {
      disposables.push(g);
      return g;
    };

    let time = 0;
    let flash = 0;
    let flashColor: string = burstColors.accLiteGreen;
    let shake = 0;
    let state = "idle";
    let step: (dt: number, hover: number) => void = () => {};
    let onState: (next: string) => void = () => {};

    if (variant === "letter") {
      // Nothing of the envelope shows below the slot: what is under the rim is cut away.
      const underSlot = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(SLOT_Y - 0.12))];

      const slot = new THREE.Group();
      slot.position.y = SLOT_Y;
      slot.rotation.x = 0.6; // tipped towards the viewer so the opening shows
      const rimMaterial = flat(burstColors.accLitePurple);
      slot.add(new THREE.Mesh(keep(new THREE.BoxGeometry(3.5, 0.34, 1.0)), rimMaterial));
      const mouth = new THREE.Mesh(keep(new THREE.BoxGeometry(2.9, 0.36, 0.5)), flat(burstColors.termBack1));
      slot.add(mouth);
      scene.add(slot);

      const letter = new THREE.Group();
      const paper = flat(burstColors.creamTan2, { clippingPlanes: underSlot });
      const edge = flat(burstColors.accYellow, { clippingPlanes: underSlot });
      // BoxGeometry's faces: +x, -x, +y, -y, +z (front), -z (back).
      letter.add(new THREE.Mesh(keep(new THREE.BoxGeometry(2.3, 1.5, 0.14)), [edge, edge, edge, edge, paper, paper]));
      const flapShape = new THREE.Shape();
      flapShape.moveTo(-1.15, 0.75);
      flapShape.lineTo(1.15, 0.75);
      flapShape.lineTo(0, -0.12);
      flapShape.lineTo(-1.15, 0.75);
      const flap = new THREE.Mesh(
        keep(new THREE.ExtrudeGeometry(flapShape, { depth: 0.05, bevelEnabled: false })),
        flat(burstColors.accOrange, { clippingPlanes: underSlot }),
      );
      flap.position.z = 0.07;
      letter.add(flap);
      const seal = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20)), flat(burstColors.accRed, { clippingPlanes: underSlot }));
      seal.rotation.x = Math.PI / 2;
      seal.position.set(0, -0.12, 0.15);
      letter.add(seal);
      scene.add(letter);

      let y = REST_Y;
      let targetY = REST_Y;
      let refillAt = 0;
      let lift = 0;
      onState = (next) => {
        if (next === "sending") {
          targetY = IN_Y;
        } else if (next === "sent") {
          targetY = IN_Y;
          flash = FLASH;
          flashColor = burstColors.accLiteGreen;
          refillAt = time + 1.1; // a fresh envelope comes down once the green has been seen
        } else if (next === "failed") {
          targetY = REST_Y; // it comes back out
          refillAt = 0;
          flash = FLASH;
          flashColor = burstColors.accRed;
          shake = 0.6;
        } else if (y < IN_Y + 0.4 && !refillAt) {
          refillAt = time;
        }
      };
      step = (dt, hover) => {
        if (refillAt && time >= refillAt) {
          refillAt = 0;
          y = TOP_Y;
          targetY = REST_Y;
        }
        y += (targetY - y) * (1 - Math.exp(-dt * (targetY < y ? 9 : 6))); // quicker in than out
        lift += (hover - lift) * (1 - Math.exp(-dt * 10));
        const resting = Math.max(0, 1 - Math.abs(y - REST_Y)); // the idle motion fades while it travels
        letter.position.y = y + (Math.sin(time * 2.1) * 0.07 + lift * 0.16) * resting;
        letter.position.x = shake > 0 ? Math.sin(time * 46) * 0.14 * (shake / 0.6) : 0;
        letter.rotation.z = (-0.09 + Math.sin(time * 1.3) * 0.05) * resting;
        letter.rotation.y = Math.sin(time * 0.8 + 1) * 0.32 * resting;
        letter.rotation.x = Math.sin(time * 1.0) * 0.14 * resting;
        letter.scale.setScalar(1 + lift * 0.07 * resting);
        rimMaterial.color.set(flash > 0 ? flashColor : hover > 0.5 ? burstColors.accOrange : burstColors.accLitePurple);
      };
    } else {
      const arrow = new THREE.Group();
      const shaftMaterial = flat(burstColors.accYellow);
      const headMaterial = flat(burstColors.accOrange);
      const shaft = new THREE.Mesh(keep(new THREE.BoxGeometry(1.7, 0.7, 0.7)), shaftMaterial);
      shaft.position.x = -0.75;
      const headShape = new THREE.Shape();
      headShape.moveTo(1.4, 0);
      headShape.lineTo(0, -0.95);
      headShape.lineTo(0, 0.95);
      headShape.lineTo(1.4, 0);
      const head = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(headShape, { depth: 0.7, bevelEnabled: false })), headMaterial);
      head.position.set(0.1, 0, -0.35);
      arrow.add(shaft, head);
      scene.add(arrow);

      let x = 0;
      let targetX = 0;
      let returnAt = 0;
      let grow = 0;
      onState = (next) => {
        if (next === "sending") {
          targetX = 6.5; // off to the right
        } else if (next === "sent" || next === "failed") {
          flash = FLASH;
          flashColor = next === "sent" ? burstColors.accLiteGreen : burstColors.accRed;
          if (next === "failed") shake = 0.6;
          returnAt = time + (next === "sent" ? 0.5 : 0);
        } else if (x > 3 && !returnAt) {
          returnAt = time;
        }
      };
      step = (dt, hover) => {
        if (returnAt && time >= returnAt) {
          returnAt = 0;
          if (x > 3) x = -6.5; // it comes back in from the left
          targetX = 0;
        }
        x += (targetX - x) * (1 - Math.exp(-dt * (targetX > x + 3 ? 7 : 5)));
        grow += (hover - grow) * (1 - Math.exp(-dt * 10));
        const resting = Math.max(0, 1 - Math.abs(x));
        const push = (0.5 - 0.5 * Math.cos((time * Math.PI * 2) / 1.6)) * 0.45; // forward and back, over and over
        arrow.position.x = x + push * resting + (shake > 0 ? Math.sin(time * 46) * 0.14 * (shake / 0.6) : 0);
        arrow.rotation.x = time * 0.9; // the back button's slow roll
        arrow.scale.setScalar(1 + grow * 0.12);
        const answer = flash > 0 ? flashColor : null;
        headMaterial.color.set(answer ?? burstColors.accOrange);
        shaftMaterial.color.set(answer ?? (hover > 0.5 ? burstColors.accRed : burstColors.accYellow));
      };
    }

    const sync = () => {
      const next = button.dataset.state || "idle";
      if (next === state) return;
      state = next;
      onState(next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(button, { attributes: true, attributeFilter: ["data-state"] });

    let rafId = 0;
    let last = performance.now();
    let hover = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;
      flash = Math.max(0, flash - dt);
      shake = Math.max(0, shake - dt);
      hover += ((hoverRef.current && state !== "sending" ? 1 : 0) - hover) * 0.14;
      step(dt, hover);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, [variant]);

  return (
    <button
      id={id}
      ref={buttonRef}
      type="submit"
      class="send-button-3d"
      data-state="idle"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      onFocus={() => (hoverRef.current = true)}
      onBlur={() => (hoverRef.current = false)}
    >
      <span ref={mountRef} class="send-button-3d-art" style={{ width: `${W}px`, height: `${H}px` }} aria-hidden="true" />
      <span class="send-button-3d-label">{label}</span>
    </button>
  );
}
