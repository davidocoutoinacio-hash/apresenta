// Deformação "soft-selection" (como o Proportional Editing do Blender): em vez de
// mover um pedaço isolado da malha (o que rasgaria a superfície onde ela se conecta
// ao resto do corpo), afeta todo vértice dentro de um raio ao redor de um ponto,
// com peso que cai suavemente até a borda — assim a transição fica contínua.
//
// Isso é um substituto aproximado pra um osso de verdade, útil só quando o arquivo
// não tem esqueleto. Como não há separação real entre braço e tronco na malha, o
// resultado é uma ondulação da região, não um gesto articulado limpo.
export function buildSoftSelection(positionArray, pivot, radius) {
  const indices = [];
  const weights = [];
  const restX = [];
  const restY = [];
  const restZ = [];
  const [px, py, pz] = pivot;
  const r2 = radius * radius;

  for (let i = 0; i < positionArray.length; i += 3) {
    const dx = positionArray[i] - px;
    const dy = positionArray[i + 1] - py;
    const dz = positionArray[i + 2] - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 <= r2) {
      const d = Math.sqrt(d2);
      const w = 1 - d / radius;
      const smooth = w * w * (3 - 2 * w); // smoothstep: borda mais suave que linear
      indices.push(i / 3);
      weights.push(smooth);
      restX.push(positionArray[i]);
      restY.push(positionArray[i + 1]);
      restZ.push(positionArray[i + 2]);
    }
  }

  return {
    indices: Uint32Array.from(indices),
    weights: Float32Array.from(weights),
    restX: Float32Array.from(restX),
    restY: Float32Array.from(restY),
    restZ: Float32Array.from(restZ),
  };
}

export function applySoftDisplacement(positionArray, selection, dx, dy, dz) {
  const { indices, weights, restX, restY, restZ } = selection;
  for (let k = 0; k < indices.length; k++) {
    const i3 = indices[k] * 3;
    const w = weights[k];
    positionArray[i3] = restX[k] + dx * w;
    positionArray[i3 + 1] = restY[k] + dy * w;
    positionArray[i3 + 2] = restZ[k] + dz * w;
  }
}
