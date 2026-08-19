export function createSkinTexture(THREE, baseColor = "#e8b48c") {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() * 18 - 9;
    ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${Math.abs(shade) / 90})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const gradient = ctx.createRadialGradient(
    size / 2, size * 0.35, size * 0.1,
    size / 2, size / 2, size * 0.7
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
