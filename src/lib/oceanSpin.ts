// Camera control for the ocean background: a slow default spin, mouse-position
// steering over the background, and grab / drag / throw. Horizontal drag spins
// (and throws, with friction back to the target spin); vertical drag tilts the
// camera, which springs back to the default view after release.
//
// Yaw sign: positive turns the sea like "Burst!" (front moving right), so the
// two never spin against each other.

import { MD_PX } from "./breakpoint";

export const SPIN = {
  /** Default spin (rad/s) when the mouse isn't on the page (or on touch devices). */
  base: 0.012,
  /** Spin with the mouse at the far left/right edge of the background (rad/s).
   *  (The "Burst!" logo turns at 0.5 rad/s; throws can still go up to maxThrow.) */
  hoverMax: 0.25,
  /** Fraction of the half-width around the centre that adds no steering. */
  deadzone: 0.12,
  /** Time constant (s) for easing toward the target spin: higher = longer glide after a throw. */
  settle: 1.4,
  /** Fastest a throw can spin the sea (rad/s). */
  maxThrow: 2.0,
  /** On release the sea accelerates to this multiple of the flick speed... */
  throwBoost: 1.6,
  /** ...over about this long (s), before friction takes over. */
  throwAccelTime: 0.25,
  /** Drag sensitivity: dragging across the full window width turns this many radians. */
  dragPerWidth: 1.6,
  /** Vertical drag: dragging the full window height tilts this many radians. */
  dragPerHeight: 1.2,
  /** Tilt limits relative to the default view (rad): negative looks up toward the sky. */
  pitchMin: -0.5,
  pitchMax: 0.55,
  /** Spring back to the default tilt after release (rad/s natural frequency; critically damped). */
  pitchReturn: 4.0,
  /** Fastest a vertical flick can tilt (rad/s). */
  maxPitchThrow: 2.5,
};

export interface CameraPose {
  yaw: number;
  pitch: number;
}

/**
 * Whether the element under the pointer is bare ocean rather than a panel. The layout wrappers are transparent.
 * Above md the content panel is #component-container, so only #main-container (the gap round it) is ocean. Below md
 * the wire-framed panels (#main-container, and #component-container inside it) are see-through, so the ocean shows
 * through wherever no text plate or other content sits (and the 3D title, marked data-ocean, is drawn straight onto
 * it); solid panels (blog posts) and the drawer are real surfaces.
 */
export function isBackground(el: Element | null): boolean {
  if (!el) return false;
  if (document.querySelector(".drawer.open")) return false; // sidebar up on mobile: the ocean is out of play
  if (el === document.documentElement || el === document.body) return true;
  if (el.classList.contains("layout")) return true;
  const id = el.id;
  if (id === "background-container") return true;
  if (id === "wide-bottom-or-narrow-nav-container") return !el.classList.contains("drawer");
  const narrow = window.innerWidth < MD_PX;
  if (id === "main-container") return !narrow || el.classList.contains("wire-frame-narrow");
  if (id === "component-container") return narrow && !!el.closest("#main-container.wire-frame-narrow");
  return narrow && !!el.closest("[data-ocean]") && !!el.closest("#main-container.wire-frame-narrow");
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SpinController {
  /** Advance by dt seconds and return the camera pose (radians). */
  step(dt: number): CameraPose;
  dispose(): void;
}

export function createSpinController(): SpinController {
  let yaw = Math.random() * Math.PI * 2; // random spot on the spin path, so every visit looks different
  let vel = SPIN.base;
  let target = SPIN.base;
  let pitch = 0;
  let pitchVel = 0;

  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let dragVel = 0; // smoothed drag velocity, becomes the throw speed on release
  let dragPitchVel = 0;
  let throwTarget = 0; // speed the sea accelerates to right after a throw
  let throwTime = 0; // seconds of throw acceleration left

  const root = document.documentElement;
  const setCursor = (c: string) => {
    if (root.style.cursor !== c) root.style.cursor = c;
  };

  const steer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (isBackground(e.target as Element)) {
      const x = (e.clientX / window.innerWidth) * 2 - 1; // -1 left edge .. 1 right edge
      const s = Math.sign(x) * smoothstep(SPIN.deadzone, 1, Math.abs(x));
      target = SPIN.base + SPIN.hoverMax * s;
      if (!dragging) setCursor("grab");
    } else {
      target = 0; // over a panel: let the sea come to rest
      if (!dragging) setCursor("");
    }
  };

  const onMove = (e: PointerEvent) => {
    steer(e);
    if (!dragging || e.pointerId !== pointerId) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dYaw = (dx / window.innerWidth) * SPIN.dragPerWidth;
    // Grabbing the sea and pulling it down means looking up (less tilt).
    const before = pitch;
    pitch = clamp(pitch - (dy / window.innerHeight) * SPIN.dragPerHeight, SPIN.pitchMin, SPIN.pitchMax);
    yaw += dYaw;
    const dt = Math.max(1, now - lastT) / 1000;
    // Weighted toward recent motion so a flick at the end of a drag is what gets thrown.
    dragVel = dragVel * 0.6 + (dYaw / dt) * 0.4;
    dragPitchVel = dragPitchVel * 0.6 + ((pitch - before) / dt) * 0.4;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (!isBackground(e.target as Element)) return;
    touchGrab = e.pointerType === "touch";
    e.preventDefault(); // no text selection while dragging
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    dragVel = 0;
    dragPitchVel = 0;
    throwTime = 0; // grabbing cancels any throw in progress
    setCursor("grabbing");
    document.body.style.userSelect = "none";
  };

  // A touch that started on bare ocean owns the whole drag, both axes: stop the browser turning it into a page scroll.
  // Touches that start on text or panels never set touchGrab, so they scroll as usual.
  let touchGrab = false;
  const onTouchMove = (e: TouchEvent) => {
    if (touchGrab && e.cancelable) e.preventDefault();
  };

  const release = () => {
    touchGrab = false;
    if (!dragging) return;
    dragging = false;
    pointerId = -1;
    // A drag that stopped before release shouldn't throw.
    const idle = (performance.now() - lastT) / 1000;
    const flick = idle > 0.08 ? 0 : 1;
    vel = clamp(dragVel * flick, -SPIN.maxThrow, SPIN.maxThrow);
    throwTarget = clamp(vel * SPIN.throwBoost, -SPIN.maxThrow, SPIN.maxThrow);
    throwTime = flick ? SPIN.throwAccelTime : 0;
    pitchVel = clamp(dragPitchVel * flick, -SPIN.maxPitchThrow, SPIN.maxPitchThrow);
    setCursor("");
    document.body.style.userSelect = "";
  };

  const onLeave = (e: MouseEvent) => {
    if (e.relatedTarget === null) {
      target = SPIN.base; // pointer left the window
      if (!dragging) setCursor("");
    }
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);
  document.addEventListener("mouseout", onLeave);

  return {
    step(dt) {
      dt = Math.min(dt, 0.05); // after a background tab, don't jump
      if (!dragging) {
        if (throwTime > 0) {
          // Just thrown: accelerate toward the boosted throw speed.
          throwTime -= dt;
          vel += (throwTarget - vel) * (1 - Math.exp(-dt / (SPIN.throwAccelTime / 3)));
        } else {
          // Friction-like ease from the current (possibly thrown) speed to the target.
          vel += (target - vel) * (1 - Math.exp(-dt / SPIN.settle));
        }
        yaw += vel * dt;
        // Critically damped spring back to the default tilt (no wobble).
        const w = SPIN.pitchReturn;
        pitchVel += (-w * w * pitch - 2 * w * pitchVel) * dt;
        pitch = clamp(pitch + pitchVel * dt, SPIN.pitchMin, SPIN.pitchMax);
        if (pitch === SPIN.pitchMin || pitch === SPIN.pitchMax) pitchVel *= 0.5;
      }
      return { yaw, pitch };
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      document.removeEventListener("mouseout", onLeave);
      setCursor("");
      document.body.style.userSelect = "";
    },
  };
}
