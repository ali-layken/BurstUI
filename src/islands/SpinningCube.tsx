import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { burstColors, burstTextColors } from "../lib/colors";

export default function SpinningCube() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Set up Three.js scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    mount.appendChild(renderer.domElement);

    // Create a cube and add it to the scene
    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(3, 3, 3);
    const material = new THREE.MeshBasicMaterial({ color: burstColors.accRed });
    const cube = new THREE.Mesh(geometry, material);

    // Add white edges to the cube
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: burstTextColors.white });
    const edgeLines = new THREE.LineSegments(edges, lineMaterial);

    // Group cube and edges for better management
    const cubeGroup = new THREE.Group();
    cubeGroup.add(cube);
    cubeGroup.add(edgeLines);
    scene.add(cubeGroup);

    // Set camera position
    camera.position.z = 5;

    // The cube swells a little while the pointer is over it (not just over the canvas).
    const HOVER_SCALE = 1.12;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let overCube = false;
    let hoverScale = 1;
    let lastTime = performance.now();
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      overCube = raycaster.intersectObject(cube).length > 0;
    };
    const onPointerLeave = () => { overCube = false; };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    // Animation loop
    const animate = () => {
      // Rotation stays per-frame on purpose: the page is about the speed changing with the display's refresh rate.
      cubeGroup.rotation.x += 0.01;
      cubeGroup.rotation.y += 0.01;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      hoverScale += ((overCube ? HOVER_SCALE : 1) - hoverScale) * (1 - Math.exp(-dt * 10)); // the swell itself is time-based
      cubeGroup.scale.setScalar(hoverScale);
      renderer.render(scene, camera);
      requestAnimationFrame(animate); 
    };

    animate(); // Start the animation loop

    // Handle window resize
    const handleResize = () => {
      if (mount) {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      }
    };
    globalThis.addEventListener("resize", handleResize);

    // Clean up when the component is unmounted
    return () => {
      globalThis.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      geometry.dispose();
      material.dispose();
      edges.dispose();
      lineMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "400px" }} />;
}
