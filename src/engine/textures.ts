import * as THREE from 'three';

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createGroundTexture(
  baseHex: string,
  grainHex: string,
  gridLines = false,
  anisotropy = 4,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle surface speckle & micro-detail
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 3;
    ctx.globalAlpha = 0.05 + Math.random() * 0.1;
    ctx.fillStyle = i % 2 === 0 ? grainHex : '#000000';
    ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;

  if (gridLines) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= 512; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = anisotropy;
  return tex;
}

export function createTargetPlateTexture(anisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(0, 0, 256, 256);

  // Outer scoring rings
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 4;
  [112, 84, 56].forEach((r) => {
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Center bullseye
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(128, 128, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef2f2';
  ctx.beginPath();
  ctx.arc(128, 128, 10, 0, Math.PI * 2);
  ctx.fill();

  // Subtle crosslines
  ctx.strokeStyle = 'rgba(24,24,27,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 10);
  ctx.lineTo(128, 246);
  ctx.moveTo(10, 128);
  ctx.lineTo(246, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWoodTexture(anisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(42,22,10,0.35)' : 'rgba(138,88,48,0.25)';
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createCrateTexture(anisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#5a5244';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#3c362c';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.lineTo(242, 242);
  ctx.moveTo(242, 14);
  ctx.lineTo(14, 242);
  ctx.stroke();

  ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.fillRect(24, 118, 54, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
