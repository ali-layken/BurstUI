import { useEffect, useRef } from "preact/hooks";
import * as THREE from "three";
import { burstColors } from "../static/colors.ts";

const SIZE = [100, 75];

export default function BackButton3D() {
  const mountRef = useRef<HTMLAnchorElement>(null);
  const isHoveredRef = useRef(false); // Track hover state

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let lastTime = 0;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(SIZE[0], SIZE[1]); // Small size for the button
    renderer.setClearColor(0x000000, 0); // Transparent background
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();

    // Create a triangular prism pointing left (point connected to rectangle)
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0); // Point
    triangleShape.lineTo(-1, -1); // Bottom left
    triangleShape.lineTo(-1, 1); // Top left
    triangleShape.lineTo(0, 0); // Close

    const extrudeSettings = { depth: 1, bevelEnabled: false };
    const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
    const triangleMaterial = new THREE.MeshBasicMaterial({
      color: burstColors.accOrange,
      transparent: true,
      opacity: 0.3, // Initial opacity
    });
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    triangle.rotation.y = Math.PI; // Point triangle left
    triangle.position.set(-2, 0, 0.5);
    group.add(triangle);

    // Create a rectangle connected to the point of the triangle
    const rectangleGeometry = new THREE.BoxGeometry(2, 1, 1);
    const rectangleMaterial = new THREE.MeshBasicMaterial({
      color: burstColors.accYellow,
      transparent: true,
      opacity: 0.3, // Initial opacity
    });
    const rectangle = new THREE.Mesh(rectangleGeometry, rectangleMaterial);
    rectangle.position.set(0, 0, 0); // Connect to triangle's point
    group.add(rectangle);

    scene.add(group);

    // Add hover animation
    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 1000; // Time in seconds
      lastTime = time;


      // Add slight rotation to show 3D depth
      group.rotation.x += deltaTime * 0.9;

      // Adjust opacity and color based on hover state
      const targetOpacity = isHoveredRef.current ? 1 : 0.3;
      rectangleMaterial.opacity += (targetOpacity - rectangleMaterial.opacity) * 0.1; // Smooth transition
      triangleMaterial.opacity += (targetOpacity - triangleMaterial.opacity) * 0.1; // Smooth transition
      rectangleMaterial.color.set(isHoveredRef.current ? burstColors.accRed : burstColors.accYellow);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate(0);

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // Hover handlers
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };
  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  return (
    <a
      href="/"
      f-partial="/partials/home" // Specify the optimized partial endpoint
      ref={mountRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${SIZE[0]}px`, // Small button
        height: `40px`,
        cursor: "pointer",
        background: "transparent", // No background
        position: "relative",
        margin: "0", // No extra spacing
        display: "inline-block", // Align naturally
      }}
      title="Go Back"
    />
  );
}
