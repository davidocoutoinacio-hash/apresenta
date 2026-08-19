import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import ProceduralAvatar from "./ProceduralAvatar";
import GltfAvatar from "./GltfAvatar";
import JarvisAvatar from "./JarvisAvatar";

// Modelos prontos da opção "Avatar 3D" — ficam em frontend/public/models, então
// o Vite serve como arquivo estático nesse mesmo caminho.
export const BUNDLED_GLB_MODELS = {
  bear: "/models/avatar-bear.glb",
  parrot: "/models/avatar-parrot.glb",
};

export default function Scene({
  avatarUrl,
  avatarMode,
  glbModel,
  isSpeaking,
  isListening,
  amplitudeRef,
  onAvatarActivate,
}) {
  const effectiveUrl =
    avatarUrl ||
    (avatarMode === "procedural" ? BUNDLED_GLB_MODELS[glbModel] || BUNDLED_GLB_MODELS.bear : "");
  const isJarvis = !effectiveUrl && avatarMode === "jarvis";
  const controlsRef = useRef();
  const jarvisTarget = [0, 1.5, 0];
  const avatarTarget = [0, 0.8, 0];

  // Sempre que o avatar exibido muda (troca de modo, ou troca de modelo 3D
  // urso/papagaio/RPM), a câmera volta pro enquadramento padrão daquele avatar —
  // assim nunca fica desenquadrada por causa de um pan/zoom feito no anterior.
  // useLayoutEffect (não useEffect) garante que isso roda ANTES do primeiro frame
  // renderizado pelos controles — com useEffect existia uma corrida onde o
  // primeiro frame usava o alvo padrão (0,0,0) por uma fração de segundo,
  // empurrando o Jarvis pra fora do centro.
  useLayoutEffect(() => {
    if (!controlsRef.current) return;
    if (isJarvis) {
      controlsRef.current.object.position.set(0, 1.6, 2.6);
    } else {
      // Enquadra o corpo inteiro do avatar 3D (pés à cabeça) de cara, sem precisar
      // arrastar. Continua dando pra ajustar manualmente depois (arraste = mover).
      controlsRef.current.object.position.set(0, 1.05, 3.3);
    }
    controlsRef.current.target.set(...(isJarvis ? jarvisTarget : avatarTarget));
    controlsRef.current.update();
  }, [isJarvis, effectiveUrl]);

  return (
    <Canvas shadows camera={{ position: [0, 1.6, 2.6], fov: 35 }}>
      <color attach="background" args={["#182338"]} />
      <fog attach="fog" args={["#182338", 3, 8]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 3, 2]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Suspense fallback={null}>
        {effectiveUrl ? (
          <GltfAvatar
            url={effectiveUrl}
            isSpeaking={isSpeaking}
            isListening={isListening}
            amplitudeRef={amplitudeRef}
            onActivate={onAvatarActivate}
          />
        ) : isJarvis ? (
          <JarvisAvatar
            isSpeaking={isSpeaking}
            isListening={isListening}
            amplitudeRef={amplitudeRef}
            onActivate={onAvatarActivate}
          />
        ) : (
          <ProceduralAvatar
            isSpeaking={isSpeaking}
            isListening={isListening}
            amplitudeRef={amplitudeRef}
          />
        )}
        {!isJarvis && <Environment preset="city" />}
        {!isJarvis && (
          <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={4} blur={2.5} far={2} />
        )}
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        target={isJarvis ? jarvisTarget : avatarTarget}
        enablePan={!isJarvis}
        screenSpacePanning={!isJarvis}
        minDistance={isJarvis ? 1.6 : 1.2}
        maxDistance={isJarvis ? 4 : 6}
        maxPolarAngle={Math.PI / 1.9}
        mouseButtons={
          isJarvis
            ? undefined
            : { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
        }
        touches={isJarvis ? undefined : { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
      />
    </Canvas>
  );
}
