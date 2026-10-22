// Expand / collapse choreography shared by the pages that embed an app in an iframe (Movement Map, Snake).
//
// The iframe is made full size at once and a clip-path reveal does the animating on the compositor (so the app inside is laid
// out once, not on every frame). The expand button lives under the frame and flies to the bottom centre of the screen with
// the window, and back. Pages plug app-specific steps into the hooks; each hook may be async and is awaited:
//
//   expand:   lock(rect) -> [window opens, button flies] -> opened()
//   collapse: closing(rect) -> [window closes, button flies home] -> closed()
//
// Markup: src/components/ExpandFrame.astro.

export interface ExpandHooks {
  /** The iframe has just become full size but only `rect` of it is visible: keep what is inside rect looking the same. */
  lock?: (rect: DOMRect) => void;
  /** The window has finished opening. */
  opened?: () => void | Promise<void>;
  /** About to close. `rect` is where the frame will end up. */
  closing?: (rect: DOMRect) => void | Promise<void>;
  /** The window has closed and the iframe is back at its slot size. */
  closed?: () => void | Promise<void>;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function initExpandFrame(hooks: ExpandHooks = {}) {
  const slot = document.getElementById("xf-slot");
  const frame = document.getElementById("xf-frame");
  const bar = document.getElementById("xf-bar");
  const btn = document.getElementById("xf-expand");
  const iframe = document.getElementById("xf-iframe") as HTMLIFrameElement | null;
  if (!slot || !frame || !bar || !btn || !iframe) return;
  if (btn.dataset.xfReady) return; // astro:page-load can fire more than once
  btn.dataset.xfReady = "1";

  const clipTo = (r: DOMRect) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;
  const transitionDone = (el: HTMLElement, ms: number) =>
    new Promise<void>((resolve) => {
      const h = (e: TransitionEvent) => {
        if (e.target !== el) return;
        el.removeEventListener("transitionend", h);
        resolve();
      };
      el.addEventListener("transitionend", h);
      setTimeout(resolve, ms);
    });

  // The button flies between its place under the frame and the bottom centre of the screen.
  const liftButton = () => {
    const r = btn.getBoundingClientRect();
    if (!btn.classList.contains("xf-flying")) {
      bar.style.minHeight = `${bar.offsetHeight}px`; // keep the page the same height while the button is away
      btn.style.transition = "none";
      btn.classList.add("xf-flying");
      btn.style.left = `${r.left}px`;
      btn.style.top = `${r.top}px`;
      void btn.offsetWidth;
      btn.style.transition = "";
    }
    return r;
  };
  const flyButtonTo = async (left: number, top: number) => {
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    await transitionDone(btn, 700);
  };
  const buttonHome = () => {
    const b = bar.getBoundingClientRect();
    return { left: b.left + (b.width - btn.offsetWidth) / 2, top: b.top + parseFloat(getComputedStyle(bar).paddingTop) };
  };
  const landButton = () => {
    btn.classList.remove("xf-flying");
    btn.style.left = btn.style.top = btn.style.transition = "";
    bar.style.minHeight = "";
  };

  let expanded = false;
  let token = 0;
  const setExpanded = async (next: boolean) => {
    expanded = next;
    const mine = ++token;
    btn.setAttribute("aria-pressed", String(next));
    if (next) {
      const r = slot.getBoundingClientRect();
      const b = liftButton();
      frame.style.transition = "none";
      frame.style.clipPath = clipTo(r);
      frame.classList.add("moving");
      document.body.style.overflow = "hidden";
      void frame.offsetWidth;
      hooks.lock?.(r); // the iframe is now full size
      await nextFrame();
      if (mine !== token) return;
      frame.style.transition = "";
      frame.style.clipPath = "inset(0px)";
      const flight = flyButtonTo((innerWidth - b.width) / 2, innerHeight - b.height - 18);
      await transitionDone(frame, 700);
      await flight;
      if (mine !== token) return;
      await hooks.opened?.();
      iframe.contentWindow?.focus(); // keep keyboard input (the game) in the app
    } else {
      await hooks.closing?.(slot.getBoundingClientRect());
      if (mine !== token) return;
      frame.style.clipPath = clipTo(slot.getBoundingClientRect());
      liftButton();
      const home = buttonHome();
      const flight = flyButtonTo(home.left, home.top);
      await transitionDone(frame, 700);
      await flight;
      if (mine !== token) return;
      frame.classList.remove("moving");
      frame.removeAttribute("style");
      document.body.style.overflow = "";
      landButton();
      await nextFrame(); // the iframe is back at its slot size
      await hooks.closed?.();
      iframe.contentWindow?.focus();
    }
  };

  btn.addEventListener("click", () => setExpanded(!expanded));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && expanded) setExpanded(false);
  });
}
