'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

function ChatBubbleMesh({ color = '#10b981' }) {
  const groupRef = useRef();
  const [hasRotated, setHasRotated] = useState(false);
  const rotationDuration = 6;
  const totalRotation = Math.PI * 2;
  const rotationSpeed = totalRotation / rotationDuration;
  const elapsed = useRef(0);

 useFrame((state, delta) => {
    // Rotate slowly
    groupRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={groupRef}>
      {/* Main chat bubble body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1.5, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Rounded corners */}
      <mesh position={[-0.85, 0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.85, 0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.85, -0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.85, -0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Chat bubble tail */}
      <mesh position={[-1.2, -0.8, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.3, 0.5, 3]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Dots inside bubble */}
      <mesh position={[-0.5, 0, 0.2]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.5, 0, 0.2]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export default function AutoAnimatedScene({ color = '#10b981' }) {
  return (
    <div className="w-full h-96">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#3b82f6" />
        <spotLight position={[0, 10, 0]} intensity={0.8} angle={0.3} penumbra={1} />
        <ChatBubbleMesh color={color} />
        <OrbitControls enableZoom enablePan enableRotate />
      </Canvas>
    </div>
  );
}