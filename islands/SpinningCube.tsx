import { useEffect, useRef } from "preact/hooks";
import * as THREE from "@3d/three";
import { burstColors, burstTextColors } from "../static/colors.ts";

const ROT_SPEED: number = 0.004;

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
    const geometry : THREE.BoxGeometry = new THREE.BoxGeometry(3, 3, 3);
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

    // Animation loop
    const animate = () => {
      cubeGroup.rotation.x += ROT_SPEED;
      cubeGroup.rotation.y += ROT_SPEED;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

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
      renderer.setAnimationLoop(null);
      globalThis.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      edges.dispose();
      lineMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "400px" }} />;
}