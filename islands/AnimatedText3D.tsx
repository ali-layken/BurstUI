import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { burstColors } from "../static/colors.ts";
import { isNarrowSignal } from "../utils/signals.ts";

const twoPi = 2 * Math.PI;

const AnimatedText3D = ({
  text = "Hello, 3D!",
  narrowZoom = 320,
  wideZoom = 210,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraZoomRef = useRef(0); // Tracks the current zoom level
  const targetZoomRef = useRef(0); // Tracks the target zoom level
  const isNarrowTextRef = useRef(false); // Tracks the state of isNarrowSignal
  const isMouseOverRef = useRef(false); // Tracks mouse hover state

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
    let textGroup: THREE.Group;
    let isTextVisible = false; // Track visibility
    let lastTime = 0;
    let pauseTime = 2;

    const unsubscribe = isNarrowSignal.subscribe((newValue) => {
      isNarrowTextRef.current = newValue;
      targetZoomRef.current = newValue ? narrowZoom : wideZoom; // Update target zoom
    });

    const init = () => {
      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mountRef.current!.offsetWidth, mountRef.current!.offsetHeight);
      renderer.setPixelRatio(globalThis.devicePixelRatio);
      mountRef.current!.appendChild(renderer.domElement);

      // Mouse events
      const onMouseEnter = () => {
        isMouseOverRef.current = true;
      };

      const onMouseLeave = () => {
        isMouseOverRef.current = false;
      };

      renderer.domElement.addEventListener("mouseenter", onMouseEnter);
      renderer.domElement.addEventListener("mouseleave", onMouseLeave);

      // Scene setup
      scene = new THREE.Scene();

      // Camera setup
      const aspectRatio = mountRef.current!.offsetWidth / mountRef.current!.offsetHeight;
      camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 1000);
      camera.position.z = 1000; // Start narrow if wide
      cameraZoomRef.current = 1000;

      // Conditional initialization based on isNarrowSignal
      if (isNarrowTextRef.current) {
        targetZoomRef.current = narrowZoom; // Zoom to narrow
      } else {
        targetZoomRef.current = wideZoom; // Zoom to wide
      }

      // Text Group
      textGroup = new THREE.Group();
      scene.add(textGroup);

      // Load font and create text
      const fontLoader = new FontLoader();
      fontLoader.load("/Source_Serif_4/Source Serif 4_Regular.json", (font: any) => {
        const textGeometry = new TextGeometry(text, {
          font,
          size: 70, // Hardcoded size
          depth: 10,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 0.5,
        });

        const textMaterial = new THREE.MeshStandardMaterial({
          transparent: true,
          opacity: 0.7,
        });

        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        const edges = new THREE.EdgesGeometry(textGeometry);
        const emissiveMaterial = new THREE.MeshStandardMaterial({
          color: burstColors.accRed, // Edge color
          emissive: burstColors.accRed2, // Emit light
          emissiveIntensity: 2.5, // Intensity of the glow
        });
        const edgeLines = new THREE.LineSegments(edges, emissiveMaterial);

        // Center the text
        textGeometry.computeBoundingBox();
        if (textGeometry.boundingBox) {
          const centerOffset =
            -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
          textMesh.position.set(centerOffset, -32, -10);
          edgeLines.position.set(centerOffset, -32, -8);
        }

        textGroup.add(textMesh);
        textGroup.add(edgeLines);

        isTextVisible = true;
      });

      // Handle resize
      globalThis.addEventListener("resize", onResize);

      animate(0);

      // Cleanup mouse events
      return () => {
        renderer.domElement.removeEventListener("mouseenter", onMouseEnter);
        renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      };
    };

    const onResize = () => {
      const width = mountRef.current!.offsetWidth;
      const height = mountRef.current!.offsetHeight;
      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 1000; // Convert time to seconds
      lastTime = time;

      if(isTextVisible) {
        pauseTime -= deltaTime
        if (isMouseOverRef.current) {
          const remainder = textGroup.rotation.y % twoPi
          const withinTolerance = Math.abs(remainder) < 0.1 || Math.abs(remainder - twoPi) < 0.1;
          if (!withinTolerance) {
            if (Math.ceil(textGroup.rotation.y / Math.PI) % 2 === 0) {
              textGroup.rotation.y -= deltaTime * -3; // Normalize angle
            } else {
              textGroup.rotation.y -= deltaTime * 3; // Normalize angle
            }
              
          } else {// Stop rotation when close enough to target
            textGroup.rotation.y = 0;
          }
        } else { // Normal spin when mouse is not over the canvas
          if (isTextVisible && pauseTime < 0 && textGroup) {
            textGroup.rotation.y += deltaTime * 0.5; // Normal speed
          }
        }
      }


      // Smoothly animate camera zoom
      if (isTextVisible && Math.abs(cameraZoomRef.current - targetZoomRef.current) > 0.1) {
        cameraZoomRef.current +=
          (targetZoomRef.current - cameraZoomRef.current) * deltaTime * 3; // Smooth interpolation
        camera.position.z = cameraZoomRef.current;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    init();

    return () => {
      unsubscribe();
      if (renderer) {
        renderer.dispose();
        if (mountRef.current) {
          while (mountRef.current.firstChild) {
            mountRef.current.removeChild(mountRef.current.firstChild);
          }
        }
      }
      globalThis.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "relative",
        width: "100%",
        height: "17rem",
        overflow: "hidden",
      }}
    />
  );
};

export default AnimatedText3D;
