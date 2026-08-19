import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSkinTexture } from "../utils/skinTexture";

export default function ProceduralAvatar({ isSpeaking, isListening, amplitudeRef }) {
  const jawRef = useRef();
  const headRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const blinkClock = useRef(0);

  const skinTexture = useMemo(() => createSkinTexture(THREE, "#e8b48c"), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.6) * 0.08;
      headRef.current.position.y = Math.sin(t * 1.2) * 0.02;
    }

    blinkClock.current += delta;
    if (blinkClock.current > 3.2) {
      const blink = Math.max(0, Math.sin((blinkClock.current - 3.2) * 20));
      if (leftEyeRef.current) leftEyeRef.current.scale.y = 1 - blink;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = 1 - blink;
      if (blinkClock.current > 3.35) blinkClock.current = 0;
    }

    if (jawRef.current) {
      const amplitude = amplitudeRef?.current || 0;
      const target = isSpeaking ? 0.12 + amplitude * 0.9 : 0.12;
      jawRef.current.scale.y = THREE.MathUtils.lerp(jawRef.current.scale.y, target, 0.5);
    }
  });

  const ringColor = isListening ? "#38bdf8" : isSpeaking ? "#22c55e" : "#94a3b8";

  return (
    <group>
      <group ref={headRef} position={[0, 1.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 48, 48]} />
          <meshStandardMaterial map={skinTexture} roughness={0.55} metalness={0.05} />
        </mesh>

        <mesh position={[-0.18, 0.06, 0.44]} ref={leftEyeRef}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.2} />
        </mesh>
        <mesh position={[0.18, 0.06, 0.44]} ref={rightEyeRef}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.2} />
        </mesh>

        <mesh position={[0, -0.06, 0.49]}>
          <boxGeometry args={[0.05, 0.09, 0.05]} />
          <meshStandardMaterial map={skinTexture} roughness={0.6} />
        </mesh>

        <mesh position={[0, -0.28, 0.42]} ref={jawRef} scale={[1, 0.12, 1]}>
          <boxGeometry args={[0.22, 1, 0.1]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.5} />
        </mesh>

        <mesh position={[0, 0.42, -0.05]}>
          <sphereGeometry args={[0.52, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#3b2417" roughness={0.7} />
        </mesh>
      </group>

      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.55, 0.9, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      <mesh position={[0, 1.14, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.22, 16]} />
        <meshStandardMaterial map={skinTexture} roughness={0.6} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
