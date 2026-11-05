import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { burstColors } from "../lib/colors";
import { isNarrowSignal } from "../lib/signals";

const twoPi = 2 * Math.PI;

/**
 * The spinning "Burst!" title on the home page: extruded Source Serif text with glowing red edges. Spins slowly after a
 * short pause; hovering it turns it back to face the camera. The camera eases between two distances so the text fits
 * the narrow and wide layouts (isNarrowSignal, set by ResizeDetector).
 */
const AnimatedText3D = ({ text = "Hello, 3D!", narrowZoom = 320, wideZoom = 210 }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.offsetWidth, mount.offsetHeight);
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    let hovered = false;
    const onMouseEnter = () => (hovered = true);
    const onMouseLeave = () => (hovered = false);
    renderer.domElement.addEventListener("mouseenter", onMouseEnter);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.offsetWidth / mount.offsetHeight, 1, 1000);
    camera.position.z = 1000; // starts far away and glides in once the text is loaded
    let cameraZoom = 1000;
    let targetZoom = isNarrowSignal.value ? narrowZoom : wideZoom;
    const unsubscribe = isNarrowSignal.subscribe((narrow) => {
      targetZoom = narrow ? narrowZoom : wideZoom;
    });

    const textGroup = new THREE.Group();
    scene.add(textGroup);
    let textVisible = false;
    let pauseTime = 2; // seconds before the spin starts

    new FontLoader().load("/Source_Serif_4/Source Serif 4_Regular.json", (font: Font) => {
      const textGeometry = new TextGeometry(text, {
        font,
        size: 70,
        depth: 10,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 0.5,
      });
      const textMesh = new THREE.Mesh(textGeometry, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.9 }));
      const edgeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(textGeometry, 10),
        new THREE.MeshStandardMaterial({ color: burstColors.accRed, emissive: burstColors.accRed, emissiveIntensity: 2.5 }),
      );
      // Centre the text horizontally.
      textGeometry.computeBoundingBox();
      const box = textGeometry.boundingBox!;
      const centerOffset = -0.5 * (box.max.x - box.min.x);
      textMesh.position.set(centerOffset, -32, -10);
      edgeLines.position.set(centerOffset, -32, -7);
      textGroup.add(textMesh, edgeLines);
      textVisible = true;
    });

    const onResize = () => {
      const width = mount.offsetWidth;
      const height = mount.offsetHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    globalThis.addEventListener("resize", onResize);

    let lastTime = 0;
    let rafId = 0;
    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      if (textVisible) {
        pauseTime -= deltaTime;
        if (hovered) {
          // Turn back to face the camera by the shorter way round, then snap to exactly 0.
          const remainder = textGroup.rotation.y % twoPi;
          const facing = Math.abs(remainder) < 0.1 || Math.abs(remainder - twoPi) < 0.1;
          if (facing) textGroup.rotation.y = 0;
          else textGroup.rotation.y += deltaTime * 3 * (Math.ceil(textGroup.rotation.y / Math.PI) % 2 === 0 ? 1 : -1);
        } else if (pauseTime < 0) {
          textGroup.rotation.y += deltaTime * 0.5;
        }
        if (Math.abs(cameraZoom - targetZoom) > 0.1) {
          cameraZoom += (targetZoom - cameraZoom) * deltaTime * 3;
          camera.position.z = cameraZoom;
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
      globalThis.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mouseenter", onMouseEnter);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} class="relative w-full overflow-hidden" style={{ height: "17rem" }} />;
};

export default AnimatedText3D;
