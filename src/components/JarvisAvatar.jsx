import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

// Gradiente estilo Magalu, em versão neon (mais saturado/claro que o hex "oficial")
// para brilhar contra o fundo escuro: laranja -> vermelho -> magenta -> roxo -> azul -> ciano -> verde.
const GRADIENT_HEX = [
  "#ffa733",
  "#ff3b3b",
  "#ff2d95",
  "#b24bf3",
  "#5b7cfa",
  "#38d4ff",
  "#4ade80",
];
const GRADIENT_STOPS = GRADIENT_HEX.map((hex) => new THREE.Color(hex));

const RIPPLE_DURATION = 1.4;
const RIPPLE_SPEED = 0.9;
const RIPPLE_STRENGTH = 0.22;
const MAX_RIPPLES = 4;

function sampleGradient(t, target = new THREE.Color()) {
  const n = GRADIENT_STOPS.length;
  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * (n - 1);
  const i = Math.min(n - 2, Math.floor(scaled));
  const localT = scaled - i;
  return target.copy(GRADIENT_STOPS[i]).lerp(GRADIENT_STOPS[i + 1], localT);
}

// Hash determinístico por vértice (substitui um gerador de ruído real: barato e estável
// entre frames, então cada "espícula" do holograma sempre vibra na mesma fase).
function seedFor(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

function buildLayer(radius, detail, hueOffset) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const count = position.count;
  const dirs = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    dirs[i * 3] = v.x;
    dirs[i * 3 + 1] = v.y;
    dirs[i * 3 + 2] = v.z;
    seeds[i] = seedFor(v.x, v.y, v.z);

    // Mapeia a cor pelo ângulo em volta do eixo Y (+ leve inclinação vertical), então o
    // gradiente forma uma faixa contínua ao redor da esfera, como a barra de referência.
    const azimuth = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5;
    sampleGradient(azimuth + v.y * 0.18 + hueOffset, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return { geometry, dirs, seeds, baseRadius: radius };
}

export default function JarvisAvatar({ isSpeaking, isListening, amplitudeRef, onActivate }) {
  const groupRef = useRef();
  const layerGroupRefs = useRef([]);
  const meshRefs = useRef([]);
  const coreRef = useRef();
  const lightRef = useRef();
  const tmpColor = useRef(new THREE.Color());
  const currentTimeRef = useRef(0);
  const ripplesRef = useRef([]);

  // Três camadas de icosaedro em wireframe, com detalhes/raios diferentes, sobrepostas
  // e giradas em velocidades distintas — é isso que cria o efeito "flor de arame" da imagem.
  const layers = useMemo(
    () => [
      buildLayer(0.5, 3, 0),
      buildLayer(0.56, 2, 0.12),
      buildLayer(0.42, 2, -0.12),
    ],
    []
  );

  function handlePointerDown(event) {
    event.stopPropagation();
    if (!groupRef.current) return;

    const localPoint = event.point.clone();
    groupRef.current.worldToLocal(localPoint);
    if (localPoint.lengthSq() < 1e-6) return;
    localPoint.normalize();

    ripplesRef.current.push({ dir: localPoint, start: currentTimeRef.current });
    if (ripplesRef.current.length > MAX_RIPPLES) ripplesRef.current.shift();

    onActivate?.();
  }

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    currentTimeRef.current = t;
    const amplitude = amplitudeRef?.current || 0;

    const spinSpeed = isListening ? 0.5 : isSpeaking ? 0.35 : 0.15;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * spinSpeed;
      groupRef.current.position.y = 1.35 + Math.sin(t * 0.8) * 0.03;
    }

    // Remove ondulações já concluídas para não acumular a lista indefinidamente.
    ripplesRef.current = ripplesRef.current.filter((r) => t - r.start < RIPPLE_DURATION);

    const restSpike = isListening ? 0.09 : 0.05;
    const spikeAmount = isSpeaking ? restSpike + amplitude * 0.55 : restSpike;

    layers.forEach((layer, idx) => {
      const mesh = meshRefs.current[idx];
      const layerGroup = layerGroupRefs.current[idx];
      if (!mesh) return;

      const position = mesh.geometry.attributes.position;
      const { dirs, seeds, baseRadius } = layer;

      for (let i = 0; i < position.count; i++) {
        const dx = dirs[i * 3];
        const dy = dirs[i * 3 + 1];
        const dz = dirs[i * 3 + 2];

        const wobble = Math.sin(t * 2.2 + seeds[i] + idx * 1.7) * 0.5 + 0.5;
        let r = baseRadius + wobble * spikeAmount;

        // Onda expansiva a partir do ponto clicado: uma crista que percorre a superfície
        // (usando a distância angular ao ponto de origem) e decai com o tempo — as arestas
        // do wireframe esticam e recolhem conforme a crista passa por cada vértice.
        for (const ripple of ripplesRef.current) {
          const age = t - ripple.start;
          if (age < 0) continue;
          const dot = dx * ripple.dir.x + dy * ripple.dir.y + dz * ripple.dir.z;
          const angDist = Math.acos(THREE.MathUtils.clamp(dot, -1, 1)) / Math.PI;
          const wavefront = age * RIPPLE_SPEED;
          const band = Math.exp(-Math.pow((angDist - wavefront) * 13, 2));
          const decay = 1 - age / RIPPLE_DURATION;
          r += band * decay * decay * RIPPLE_STRENGTH;
        }

        position.setXYZ(i, dx * r, dy * r, dz * r);
      }
      position.needsUpdate = true;

      const dir = idx % 2 === 0 ? 1 : -1;
      if (layerGroup) {
        layerGroup.rotation.y = t * (0.08 + idx * 0.04) * dir;
        layerGroup.rotation.x = t * 0.05 * -dir;
      }
    });

    if (coreRef.current) {
      let ripplePulse = 0;
      for (const ripple of ripplesRef.current) {
        const age = t - ripple.start;
        if (age < 0) continue;
        ripplePulse += Math.max(0, 1 - age / (RIPPLE_DURATION * 0.5)) * 0.5;
      }

      const pulse = 1 + amplitude * 0.6 + ripplePulse + Math.sin(t * 3) * 0.04;
      coreRef.current.scale.setScalar(pulse);

      const c = sampleGradient(t * 0.05, tmpColor.current);
      coreRef.current.material.color.copy(c);
      if (lightRef.current) lightRef.current.color.copy(c);
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.35, 0]} onPointerDown={handlePointerDown}>
      {layers.map((layer, idx) => (
        <group key={idx} ref={(el) => (layerGroupRefs.current[idx] = el)}>
          <mesh ref={(el) => (meshRefs.current[idx] = el)} geometry={layer.geometry}>
            <meshBasicMaterial
              vertexColors
              wireframe
              transparent
              opacity={0.85 - idx * 0.12}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Camada extra levemente maior, aditiva e mais fraca: simula o halo/bloom de
              néon ao redor de cada aresta sem precisar de pós-processamento. */}
          <mesh geometry={layer.geometry} scale={1.05}>
            <meshBasicMaterial
              vertexColors
              wireframe
              transparent
              opacity={0.35 - idx * 0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Halo suave por trás de tudo, para reforçar o brilho geral do holograma. */}
      <mesh scale={1.9}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#b24bf3"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <pointLight ref={lightRef} intensity={5} distance={3.5} />
      <Sparkles count={70} scale={2} size={2.6} speed={0.3} color="#ff2d95" opacity={0.75} />
    </group>
  );
}
