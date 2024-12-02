import { useEffect, useRef, useState } from "preact/hooks";
import * as THREE from "@3d/three";
import { burstColors } from "../static/colors.ts";

const SIZE = [100, 75]

export default function BackButton3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false); // Hover state

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    

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
    const triangleMaterial = new THREE.MeshBasicMaterial({ color: burstColors.accOrange });
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    triangle.rotation.y = Math.PI; // Point triangle left
    triangle.position.set(-2, 0, 0.5) 
    group.add(triangle);

    // Create a rectangle connected to the point of the triangle
    const rectangleGeometry = new THREE.BoxGeometry(2, 1, 1);
    const rectangleMaterial = new THREE.MeshBasicMaterial({ color: isHovered ? burstColors.accRed : burstColors.accYellow });
    const rectangle = new THREE.Mesh(rectangleGeometry, rectangleMaterial);
    rectangle.position.set(0, 0, 0); // Connect to triangle's point
    group.add(rectangle);

    scene.add(group);

    // Add hover animation (up and down movement)
    let direction = 1;
    const animate = () => {
      // Hover animation for the group
      //group.position.y += 0.01 * direction;

      // Reverse direction at hover limits
      if (group.position.y > 0.2 || group.position.y < -0.2) {
        direction *= -1;
      }

      // Add slight rotation to show 3D depth
      group.rotation.x += 0.01;

      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      mount.removeChild(renderer.domElement);
    };
  }, [isHovered]);

  // Hover handlers
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Navigate back to the home page
  const handleClick = () => {
    window.location.href = "/";
  };

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      class="go-back" // Add a class for styling
      style={{
        width: `${SIZE[0]}px`, // Small button
        height: `50px`,
        cursor: "pointer",
        background: "transparent", // No background
        position: "relative",
        left: "-10px",
        margin: "0", // No extra spacing
        display: "inline-block", // Align naturally
        opacity: isHovered ? '1' : '0.3', // Low initial opacity
        filter: isHovered ? "brightness(1.2)" : "brightness(0.8)", // Bright when hovered, dull otherwise
        transition: "opacity 0.2s ease, filter 0.2s ease", // Smooth transition
      }}
      title="Go Back"
    />
  );
}
