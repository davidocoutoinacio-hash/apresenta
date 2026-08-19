import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Sparkles } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { MAGALU_BAR_COLORS } from "../utils/magaluGradient";
import { buildSoftSelection, applySoftDisplacement } from "../utils/softDeform";

const AURA_PARTICLE_COUNT = 260;

// Pivôs experimentais de "braço" pra modelos sem esqueleto (ver softDeform.js).
// Definidos no espaço local da malha (Blender Z-up, antes da rotação do nó), a
// partir da região onde a análise da geometria mostrou a maior largura do corpo
// (provável altura de braço/pata). Ajuste manual, não uma detecção automática.
const ARM_PIVOT_RIGHT_RAW = [0.27, 0.18, -0.42];
const ARM_PIVOT_LEFT_RAW = [-0.27, 0.18, -0.42];
const ARM_PIVOT_RADIUS_RAW = 0.14;

const MOUTH_MORPH_NAMES = ["mouthOpen", "viseme_aa", "jawOpen"];
const BLINK_MORPH_NAMES = ["eyeBlinkLeft", "eyesClosed", "eyeBlink_L"];

// Heurística para reconhecer clipes de animação pelo nome, já que cada GLB batiza
// suas animações do seu jeito. Se nada bater, o avatar cai num movimento procedural
// equivalente (então a feature funciona mesmo em modelos sem esses clipes).
const TALK_RE = /talk|speak|mouth|viseme/i;
const DANCE_RE = /dance|groove|funky/i;
const GREET_RE = /wave|greet|hello|hi[-_]|bow/i;

function pickClip(names, regex) {
  return names.find((n) => regex.test(n));
}

// Busca genérica por ossos de braço/queixo pelo nome — funciona em qualquer rig
// (Mixamo, Blender, etc.) sem depender de clipes de animação prontos no arquivo.
const ARM_RE = /arm|shoulder|clavicle/i;
const FOREARM_RE = /fore|elbow|lower/i;
const JAW_RE = /jaw|mouth/i;

function sideOf(name) {
  const n = name.toLowerCase();
  if (/\bleft\b|_l$|\.l$|^l_|^l\./.test(n)) return "left";
  if (/\bright\b|_r$|\.r$|^r_|^r\./.test(n)) return "right";
  return null;
}

function findRigBones(root) {
  const found = { left: null, right: null, jaw: null };
  root.traverse((obj) => {
    if (!obj.isBone) return;
    if (JAW_RE.test(obj.name) && !found.jaw) {
      found.jaw = obj;
      return;
    }
    if (ARM_RE.test(obj.name) && !FOREARM_RE.test(obj.name)) {
      const side = sideOf(obj.name);
      if (side && !found[side]) found[side] = obj;
    }
  });
  return found;
}

const TARGET_HEIGHT = 1.6; // altura visual alvo (unidades de cena), independente da escala nativa do arquivo

export default function GltfAvatar({ url, isSpeaking, isListening, amplitudeRef, onActivate }) {
  const { scene, animations } = useGLTF(url);
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);
  const groupRef = useRef();
  const { actions, names } = useAnimations(animations, groupRef);

  // Cada .glb vem numa escala/origem diferente (avatar humano, urso, papagaio, etc.)
  // — em vez de supor unidades fixas OU supor que a altura (Y) é a maior dimensão
  // (quebra em criaturas mais largas/compridas que altas, como um pássaro), medimos
  // a caixa delimitadora real e normalizamos pela MAIOR das três dimensões — assim
  // qualquer proporção de corpo acaba com tamanho consistente na tela.
  const { fitPosition, fitScale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const largestDimension = Math.max(size.x, size.y, size.z);
    const scale = largestDimension > 0.0001 ? TARGET_HEIGHT / largestDimension : 1;
    return {
      fitScale: scale,
      fitPosition: [-center.x * scale, -box.min.y * scale, -center.z * scale],
    };
  }, [clonedScene]);

  const [mode, setMode] = useState("idle"); // idle | talk | dance | greet
  const blinkClock = useRef(0);
  const idleTimerRef = useRef(0);
  const nextDanceAtRef = useRef(10 + Math.random() * 10);
  const modeEndRef = useRef(0);
  const currentTimeRef = useRef(0);
  const clickPulseRef = useRef(0);

  const clipNames = useMemo(
    () => ({
      talk: pickClip(names, TALK_RE),
      dance: pickClip(names, DANCE_RE),
      greet: pickClip(names, GREET_RE),
    }),
    [names]
  );

  const rig = useMemo(() => findRigBones(clonedScene), [clonedScene]);
  const restRotations = useRef({});

  useEffect(() => {
    restRotations.current = {};
    ["left", "right", "jaw"].forEach((key) => {
      const bone = rig[key];
      if (bone) restRotations.current[key] = bone.rotation.clone();
    });
  }, [rig]);

  useEffect(() => {
    if (names.length) {
      console.log("[Avatar GLB] animações encontradas no arquivo:", names);
      console.log("[Avatar GLB] mapeamento automático (fala/dança/saudação):", clipNames);
    } else {
      console.log("[Avatar GLB] nenhuma animação nomeada encontrada — usando movimento procedural.");
    }
    console.log("[Avatar GLB] ossos de braço/queixo encontrados:", {
      bracoEsquerdo: rig.left?.name || null,
      bracoDireito: rig.right?.name || null,
      queixo: rig.jaw?.name || null,
    });
  }, [names, clipNames, rig]);

  // Deformação experimental de "braço" via soft-selection de vértices — só entra em
  // ação quando o arquivo NÃO tem esqueleto (senão o movimento por osso acima já
  // resolve isso de forma correta e sem risco de distorcer a malha).
  const deformableMesh = useMemo(() => {
    // Pivôs calibrados manualmente só pras coordenadas do modelo do urso — em
    // qualquer outro arquivo eles não fariam sentido (selecionariam vértices
    // aleatórios), então a deformação fica desligada fora dele.
    if (rig.left || rig.right || !url.includes("avatar-bear")) return null;
    let found = null;
    clonedScene.traverse((obj) => {
      if (!found && obj.isMesh && obj.geometry?.attributes?.position) found = obj;
    });
    if (found) found.geometry = found.geometry.clone();
    return found;
  }, [clonedScene, rig]);

  const armSelections = useMemo(() => {
    if (!deformableMesh) return null;
    const positions = deformableMesh.geometry.attributes.position.array;
    return {
      right: buildSoftSelection(positions, ARM_PIVOT_RIGHT_RAW, ARM_PIVOT_RADIUS_RAW),
      left: buildSoftSelection(positions, ARM_PIVOT_LEFT_RAW, ARM_PIVOT_RADIUS_RAW),
    };
  }, [deformableMesh]);

  useEffect(() => {
    if (armSelections) {
      console.log("[Avatar GLB] deformação experimental de braço (sem esqueleto):", {
        verticesBracoDireito: armSelections.right.indices.length,
        verticesBracoEsquerdo: armSelections.left.indices.length,
      });
    }
  }, [armSelections]);

  const morphMeshes = useMemo(() => {
    const meshes = [];
    clonedScene.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        meshes.push(obj);
      }
    });
    return meshes;
  }, [clonedScene]);

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // Cada partícula recebe uma cor da paleta da marca, ciclando pelas 7 cores —
  // dá o efeito de "estrelas coloridas" em vez de um brilho uniforme.
  const auraColors = useMemo(() => {
    const arr = new Float32Array(AURA_PARTICLE_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < AURA_PARTICLE_COUNT; i++) {
      c.set(MAGALU_BAR_COLORS[i % MAGALU_BAR_COLORS.length]);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, []);

  // Velocidade/opacidade "de repouso" de cada partícula — o useFrame multiplica esses
  // valores base pela amplitude da voz, então elas se agitam quando a IA fala.
  // auraBase* nunca são tocados depois de criados — servem só de referência "de
  // repouso". O drei usa o Float32Array passado pra Sparkles POR REFERÊNCIA (sem
  // copiar), então as props abaixo são cópias separadas: é nelas que o useFrame
  // escreve todo frame. Ler e escrever no mesmo array teria virado um loop que
  // multiplica o valor por ele mesmo a cada frame (por isso as partículas sumiam
  // ao falar: o valor explodia exponencialmente em poucos frames).
  const auraBaseSpeeds = useMemo(() => {
    const arr = new Float32Array(AURA_PARTICLE_COUNT);
    for (let i = 0; i < AURA_PARTICLE_COUNT; i++) arr[i] = 0.1 + Math.random() * 0.18;
    return arr;
  }, []);
  const auraBaseOpacities = useMemo(() => {
    const arr = new Float32Array(AURA_PARTICLE_COUNT);
    for (let i = 0; i < AURA_PARTICLE_COUNT; i++) arr[i] = 0.55 + Math.random() * 0.45;
    return arr;
  }, []);
  const auraSpeedProp = useMemo(() => Float32Array.from(auraBaseSpeeds), [auraBaseSpeeds]);
  const auraOpacityProp = useMemo(() => Float32Array.from(auraBaseOpacities), [auraBaseOpacities]);
  const sparklesRef = useRef();

  const setMorph = (morphNames, value) => {
    morphMeshes.forEach((mesh) => {
      morphNames.forEach((name) => {
        const idx = mesh.morphTargetDictionary[name];
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[idx],
            value,
            0.5
          );
        }
      });
    });
  };

  function playClip(clipName, { once = false, fadeIn = 0.3 } = {}) {
    if (!clipName || !actions[clipName]) return false;
    Object.entries(actions).forEach(([n, action]) => {
      if (n !== clipName) action.fadeOut(0.25);
    });
    const action = actions[clipName];
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.fadeIn(fadeIn).play();
    return true;
  }

  function triggerMode(newMode, duration) {
    setMode(newMode);
    modeEndRef.current = currentTimeRef.current + duration;
  }

  function handlePointerDown(event) {
    event.stopPropagation();
    onActivate?.();
    clickPulseRef.current = 1;
    triggerMode("greet", 1.8);
    playClip(clipNames.greet, { once: true, fadeIn: 0.15 });
  }

  useEffect(() => {
    if (isSpeaking) {
      setMode("talk");
      playClip(clipNames.talk, { fadeIn: 0.25 });
    } else if (mode === "talk") {
      setMode("idle");
      const idleAction = clipNames.talk && actions[clipNames.talk];
      idleAction?.fadeOut(0.4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    currentTimeRef.current = t;
    const amplitude = amplitudeRef?.current || 0;

    // Boca sempre sincronizada com a fala via morph target, com ou sem clipe de animação.
    setMorph(MOUTH_MORPH_NAMES, isSpeaking ? Math.min(1, amplitude * 1.3) : 0);

    blinkClock.current += delta;
    if (blinkClock.current > 3.2) {
      const blink = Math.max(0, Math.sin((blinkClock.current - 3.2) * 20));
      setMorph(BLINK_MORPH_NAMES, blink);
      if (blinkClock.current > 3.35) blinkClock.current = 0;
    }

    // Dança espontânea: só entra em cena quando parada (nem falando, nem ouvindo).
    if (!isSpeaking && !isListening) {
      idleTimerRef.current += delta;
      if (idleTimerRef.current > nextDanceAtRef.current && mode === "idle") {
        idleTimerRef.current = 0;
        nextDanceAtRef.current = 20 + Math.random() * 25;
        triggerMode("dance", 4);
        playClip(clipNames.dance, { once: true, fadeIn: 0.4 });
      }
    } else {
      idleTimerRef.current = 0;
    }

    if ((mode === "dance" || mode === "greet") && t > modeEndRef.current) {
      setMode(isSpeaking ? "talk" : "idle");
    }

    if (groupRef.current) {
      const baseY = fitPosition[1];
      if (mode === "dance" && !clipNames.dance) {
        groupRef.current.rotation.y = Math.sin(t * 2.4) * 0.35;
        groupRef.current.position.y = baseY + Math.abs(Math.sin(t * 4.2)) * 0.06 * fitScale;
        groupRef.current.rotation.z = Math.sin(t * 3.1) * 0.05;
      } else if ((mode === "greet" && !clipNames.greet) || (mode === "talk" && !clipNames.talk)) {
        // Falando usa a mesma animação de "aceno" do clique — pedido explícito.
        groupRef.current.rotation.z = Math.sin(t * 10) * 0.08;
        groupRef.current.position.y = baseY;
      } else {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.06);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.06);
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          baseY + Math.sin(t * 0.9) * 0.015 * fitScale,
          0.06
        );
      }

      clickPulseRef.current = Math.max(0, clickPulseRef.current - delta * 2.2);
      groupRef.current.scale.setScalar(fitScale * (1 + clickPulseRef.current * 0.08));
    }

    // Movimento procedural de braços/queixo, quando o arquivo tem esses ossos —
    // funciona mesmo sem clipes de animação prontos.
    const rest = restRotations.current;
    if (rig.left && rest.left) {
      const swing =
        mode === "dance"
          ? Math.sin(t * 3.1) * 0.5
          : mode === "greet"
            ? Math.sin(t * 9) * 0.35 + 0.4
            : mode === "talk"
              ? Math.sin(t * 3) * 0.12
              : 0;
      rig.left.rotation.z = rest.left.z + swing;
    }
    if (rig.right && rest.right) {
      const swing =
        mode === "dance"
          ? Math.sin(t * 3.1 + Math.PI) * 0.5
          : mode === "talk"
            ? Math.sin(t * 3 + Math.PI) * 0.12
            : 0;
      rig.right.rotation.z = rest.right.z - swing;
    }
    if (rig.jaw && rest.jaw) {
      const open = isSpeaking ? amplitude * 0.4 : 0;
      rig.jaw.rotation.x = THREE.MathUtils.lerp(rig.jaw.rotation.x, rest.jaw.x + open, 0.5);
    }

    // Deformação experimental de braço (só quando não há esqueleto no arquivo).
    // Desloca a região selecionada com queda suave — tentativa aproximada, não um
    // gesto articulado real, já que a malha não tem separação entre braço e tronco.
    if (armSelections) {
      const swingWorld =
        mode === "dance"
          ? Math.sin(t * 3.1) * 0.09
          : mode === "greet"
            ? Math.sin(t * 9) * 0.07 + 0.05
            : mode === "talk"
              ? Math.sin(t * 3) * 0.03
              : 0;
      const liftWorld =
        mode === "dance" ? Math.abs(Math.sin(t * 3.1)) * 0.05 : mode === "greet" ? 0.04 : 0;
      // Desloc. em espaço "mundo" (y=altura, z=frente/trás) convertido pro espaço bruto
      // da malha (Blender Z-up): dx_raw=dx, dy_raw=dz, dz_raw=-dy.
      const posAttr = deformableMesh.geometry.attributes.position;
      applySoftDisplacement(posAttr.array, armSelections.right, 0, swingWorld, -liftWorld);
      applySoftDisplacement(posAttr.array, armSelections.left, 0, -swingWorld, -liftWorld);
      posAttr.needsUpdate = true;
    }

    // Aura reage à voz: partículas mais rápidas e brilhantes enquanto a IA fala,
    // pra dar sensação de presença "viva" reagindo ao áudio.
    const speedAttr = sparklesRef.current?.geometry?.attributes?.speed;
    const opacityAttr = sparklesRef.current?.geometry?.attributes?.opacity;
    if (sparklesRef.current && speedAttr && opacityAttr) {
      const boost = isSpeaking ? amplitude : 0;
      for (let i = 0; i < AURA_PARTICLE_COUNT; i++) {
        speedAttr.array[i] = auraBaseSpeeds[i] * (1 + boost * 1.6);
        opacityAttr.array[i] = Math.min(1, auraBaseOpacities[i] * (0.7 + boost * 1.6));
      }
      speedAttr.needsUpdate = true;
      opacityAttr.needsUpdate = true;

      const pulseScale = 1 + boost * 0.3 + (mode === "dance" ? 0.15 : 0);
      const current = sparklesRef.current.scale.x;
      sparklesRef.current.scale.setScalar(THREE.MathUtils.lerp(current, pulseScale, 0.15));
    }
  });

  const ringColor = isListening ? "#38bdf8" : isSpeaking ? "#22c55e" : "#94a3b8";

  return (
    <group>
      {/* Aura em partículas: "estrelas" coloridas com a paleta da marca, flutuando
          ao redor do corpo (dentro do avatar ficam ocultas pela própria malha). */}
      <group position={[0, TARGET_HEIGHT * 0.52, 0]}>
        <Sparkles
          ref={sparklesRef}
          count={AURA_PARTICLE_COUNT}
          scale={[TARGET_HEIGHT * 1.15, TARGET_HEIGHT * 1.35, TARGET_HEIGHT * 1.15]}
          size={2.4}
          speed={auraSpeedProp}
          opacity={auraOpacityProp}
          color={auraColors}
        />
      </group>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.7} />
      </mesh>

      <group
        ref={groupRef}
        position={fitPosition}
        scale={fitScale}
        onPointerDown={handlePointerDown}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}
