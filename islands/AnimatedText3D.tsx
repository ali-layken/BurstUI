import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { burstColors, burstTextColors } from "../static/colors.ts";

const AnimatedText3D = ({
  text = "Hello, 3D!",
  fontPath = "/Teko/Teko-Light_Regular.json",
  size = 90,
  height = 10,
  color = burstColors.accRed,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

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

      // Light setup
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(10, 10, 10);
      scene.add(light);

      // Text Group
      textGroup = new THREE.Group();
      scene.add(textGroup);

      // Load font and create text
      const fontLoader = new FontLoader();
      fontLoader.load(fontPath, (font: any) => {
        const textGeometry = new TextGeometry(text, {
          font,
          size,
          depth: height,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 0.5,
        });

        const textMaterial = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.4,
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Add white edges to the text
        const edges = new THREE.EdgesGeometry(textGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: burstTextColors.white,
          transparent: true,
          opacity: 0.2,
        });
        const edgeLines = new THREE.LineSegments(edges, lineMaterial);

        // Center the text
        textGeometry.computeBoundingBox();
        if (textGeometry.boundingBox) {
          const centerOffset =
            -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
          textMesh.position.set(centerOffset, -40, 0);
          edgeLines.position.set(centerOffset, -40, 0);
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
  }, [text, fontPath, size, height, color]);

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
