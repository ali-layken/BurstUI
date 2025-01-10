import { useEffect, useRef, useState } from "preact/hooks";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { burstColors } from "../static/colors.ts";
import { isNarrowSignal } from "../utils/signals.ts";

const AnimatedText3D = ({
  text = "Hello, 3D!",
  widesize = 70,
  narrowsize = 40
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isNarrowText, setIsNarrowText] = useState<boolean>(false);

  useEffect(() => {
      // Subscribe to changes in the signal
    const unsubscribe = isNarrowSignal.subscribe((newValue) => {
        console.log("Signal value changed:", newValue);
        setIsNarrowText(newValue);
    });
  
      // Cleanup subscription on unmount
      return () => unsubscribe();
  }, []);

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
    let textGroup: THREE.Group;
    let isTextVisible = false; // Track visibility
    let lastTime = 0;

    const init = () => {
      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mountRef.current!.offsetWidth, mountRef.current!.offsetHeight);
      renderer.setPixelRatio(globalThis.devicePixelRatio);
      mountRef.current!.appendChild(renderer.domElement);

      // Scene setup
      scene = new THREE.Scene();

      // Camera setup
      const aspectRatio = mountRef.current!.offsetWidth / mountRef.current!.offsetHeight;
      camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 1000);
      camera.position.z = 200;

      // Text Group
      textGroup = new THREE.Group();
      scene.add(textGroup);

      // Load font and create text
      const fontLoader = new FontLoader();
      fontLoader.load("/Source_Serif_4/Source Serif 4_Regular.json", (font: any) => {
        const textGeometry = new TextGeometry(text, {
          font,
          size: isNarrowText ? narrowsize : widesize,
          depth: 10,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 0.5,
        });

        const textMaterial = new THREE.MeshStandardMaterial({
          color: burstColors.accRed, // Base color of the text
          emissive: burstColors.accRed, // Glow color
          emissiveIntensity: 0.5, // Adjust glow intensity
          transparent: true,
          opacity: 0.7, // Adjust opacity if needed
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Add white edges to the text
        const edges = new THREE.EdgesGeometry(textGeometry);
        const emissiveMaterial = new THREE.MeshBasicMaterial({
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
          textMesh.position.set(centerOffset, -32, 0);
          edgeLines.position.set(centerOffset, -32, 5);
        }

        textGroup.add(textMesh);
        textGroup.add(edgeLines);

        // Mark text as visible
        isTextVisible = true;
      });

      // Handle resize
      globalThis.addEventListener("resize", onResize);

      animate(0);
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

      // Rotate text group only when it's fully visible
      if (isTextVisible && textGroup) {
        textGroup.rotation.y += deltaTime * 0.5; // 0.5 radians per second
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    init();

    return () => {
      // Cleanup
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
  }, [isNarrowText]);

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
