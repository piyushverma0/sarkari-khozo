import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Star {
  id: number;
  name: string;
  ra: number;
  dec: number;
  mag: number;
  color: string;
}

const CosmosBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Load star data and create visualization
    fetch('/data.json')
      .then(response => response.json())
      .then((stars: Star[]) => {
        // Generate more stars procedurally for a fuller sky
        const allStars = [...stars];
        for (let i = 0; i < 5000; i++) {
          allStars.push({
            id: stars.length + i,
            name: `Star-${i}`,
            ra: Math.random() * 24,
            dec: (Math.random() - 0.5) * 180,
            mag: Math.random() * 6,
            color: '#ffffff'
          });
        }

        const positions = new Float32Array(allStars.length * 3);
        const colors = new Float32Array(allStars.length * 3);
        const sizes = new Float32Array(allStars.length);

        allStars.forEach((star, i) => {
          // Convert RA/Dec to 3D coordinates
          const phi = (90 - star.dec) * (Math.PI / 180);
          const theta = star.ra * (Math.PI / 12);
          const radius = 100;

          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.cos(phi);
          positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

          // Color mapping
          const color = new THREE.Color(star.color);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;

          // Size based on magnitude (brighter = larger)
          sizes[i] = Math.max(0.5, (6 - star.mag) * 0.5);
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
          size: 2,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending
        });

        const starField = new THREE.Points(geometry, material);
        scene.add(starField);
        starsRef.current = starField;
      });

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      targetRotationRef.current.x = mouseRef.current.y * 0.3;
      targetRotationRef.current.y = mouseRef.current.x * 0.3;
    };

    // Zoom with mouse wheel
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z += event.deltaY * 0.05;
      camera.position.z = Math.max(20, Math.min(100, camera.position.z));
    };

    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (starsRef.current) {
        // Smooth rotation with easing
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.05;
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.05;
        
        starsRef.current.rotation.x = currentRotationRef.current.x;
        starsRef.current.rotation.y = currentRotationRef.current.y;

        // Gentle auto-rotation
        starsRef.current.rotation.z += 0.0002;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 -z-10 pointer-events-auto"
      style={{ 
        background: 'radial-gradient(ellipse at center, #0a0e27 0%, #020308 100%)'
      }}
    />
  );
};

export default CosmosBackground;
