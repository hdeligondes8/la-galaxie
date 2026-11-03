// =====================================================================
//  LA GALAXIE — moteur 3D
//  Tu veux juste ajouter ta planète ? Ce n'est pas ici : va dans planetes.js
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { planetes as planetesBrutes, depot } from './planetes.js';

// ---------- Réglages ----------
const planetes = planetesBrutes.filter((p) => p && p.nom);
const NB_ORBITES = Math.max(10, planetes.length + 3);
const VUE_GENERALE = new THREE.Vector3(0, 75, 165);
const ORIGINE = new THREE.Vector3();
const rayonOrbite = (i) => 22 + i * 12;

// ---------- Qualité (HD ou éco) ----------
function lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch { /* navigation privée */ } }
const appareilModeste = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const qualiteSauvee = lire('qualite');
const haute = qualiteSauvee ? qualiteSauvee === 'haute' : !appareilModeste;

// ---------- Outils ----------
function graine(texte) {
  let h = 2166136261;
  for (const c of texte) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function aleatoire(seed) {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = THREE.MathUtils.clamp;
const lissage = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const contraste = (n) => clamp((n - 0.5) * 2.2 + 0.5, 0, 1);
const melange = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const fois = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
function rvb(couleur) {
  const o = {};
  new THREE.Color(couleur).getRGB(o, THREE.SRGBColorSpace);
  return [o.r, o.g, o.b];
}
const hex = (couleur) => '#' + new THREE.Color(couleur).getHexString();
function echapper(texte) {
  const d = document.createElement('div');
  d.textContent = String(texte ?? '');
  return d.innerHTML;
}

// Bruit 3D (sert à dessiner des surfaces de planètes sans raccord visible)
function creerFbm(seed) {
  const rnd = aleatoire(seed);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const v = new Float32Array(256).map(() => rnd());
  const lisse = (t) => t * t * (3 - 2 * t);
  function bruit(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const u = lisse(x - X), w = lisse(y - Y), s = lisse(z - Z);
    const xa = X & 255, xb = (X + 1) & 255, ya = Y & 255, yb = (Y + 1) & 255, za = Z & 255, zb = (Z + 1) & 255;
    const h = (a, b, c) => v[p[p[p[a] + b] + c]];
    const x00 = h(xa, ya, za) + (h(xb, ya, za) - h(xa, ya, za)) * u;
    const x10 = h(xa, yb, za) + (h(xb, yb, za) - h(xa, yb, za)) * u;
    const x01 = h(xa, ya, zb) + (h(xb, ya, zb) - h(xa, ya, zb)) * u;
    const x11 = h(xa, yb, zb) + (h(xb, yb, zb) - h(xa, yb, zb)) * u;
    const y0 = x00 + (x10 - x00) * w, y1 = x01 + (x11 - x01) * w;
    return y0 + (y1 - y0) * s;
  }
  return (x, y, z, octaves = 5) => {
    let somme = 0, amp = 0.5, freq = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      somme += amp * bruit(x * freq + o * 17.3, y * freq, z * freq);
      total += amp; amp *= 0.5; freq *= 2.03;
    }
    return somme / total;
  };
}

function versTexture(L, H, pixels) {
  const c = document.createElement('canvas');
  c.width = L; c.height = H;
  c.getContext('2d').putImageData(new ImageData(pixels, L, H), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Dessine la surface d'une planète selon son type
function texturePlanete(p, seed, L) {
  const H = L / 2;
  const fbm = creerFbm(seed), fbm2 = creerFbm(seed + 99);
  const c1 = rvb(p.couleur || '#88aaff'), c2 = rvb(p.couleur2 || p.couleur || '#334477');
  const type = p.type || 'rocheuse';
  const carte = new Uint8ClampedArray(L * H * 4);
  const emis = type === 'lave' ? new Uint8ClampedArray(L * H * 4) : null;
  const nuages = type === 'oceanique' ? new Uint8ClampedArray(L * H * 4) : null;

  for (let y = 0; y < H; y++) {
    const lat = ((y + 0.5) / H) * Math.PI;
    const sy = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < L; x++) {
      const lon = (x / L) * Math.PI * 2;
      const sx = sl * Math.cos(lon), sz = sl * Math.sin(lon);
      const i = (y * L + x) * 4;
      let col;

      if (type === 'gazeuse') {
        const w = fbm(sx * 1.8, sy * 1.8, sz * 1.8, 4);
        const bande = 0.5 + 0.5 * Math.sin((sy * 5 + w * 2.4) * Math.PI);
        const fin = 0.5 + 0.5 * Math.sin((sy * 28 + w * 7) * Math.PI);
        col = fois(melange(c1, c2, bande), 0.82 + fin * 0.28);
      } else if (type === 'glace') {
        const n = contraste(fbm(sx * 3, sy * 3, sz * 3, 5));
        const fissure = 1 - lissage(0, 0.035, Math.abs(fbm2(sx * 5, sy * 5, sz * 5, 4) - 0.5));
        col = melange(melange([0.92, 0.96, 1], c1, n * 0.55), c2, fissure * 0.7);
      } else if (type === 'lave') {
        const n = fbm(sx * 2.5, sy * 2.5, sz * 2.5, 5);
        const f = Math.abs(n - 0.5);
        const veine = 1 - lissage(0, 0.05, f);
        const halo = (1 - lissage(0, 0.16, f)) * 0.25;
        const roche = 0.07 + fbm2(sx * 8, sy * 8, sz * 8, 3) * 0.12;
        col = melange([roche + c2[0] * 0.12, roche + c2[1] * 0.12, roche + c2[2] * 0.12], c1, veine * 0.6);
        const e = fois(c1, Math.min(1, veine + halo));
        emis[i] = e[0] * 255; emis[i + 1] = e[1] * 255; emis[i + 2] = e[2] * 255; emis[i + 3] = 255;
      } else if (type === 'oceanique') {
        const n = contraste(fbm(sx * 2, sy * 2, sz * 2, 6));
        if (n > 0.55) {
          col = melange(c2, [0.55, 0.47, 0.34], lissage(0.6, 0.95, n));
        } else {
          const t = n / 0.55;
          col = melange(fois(c1, 0.35), c1, t);
          if (t > 0.9) col = melange(col, [0.5, 0.85, 0.95], (t - 0.9) * 4);
        }
        if (Math.abs(sy) > 0.84 + fbm2(sx * 4, sy * 4, sz * 4, 3) * 0.12) col = [0.93, 0.96, 1];
        const a = lissage(0.5, 0.68, fbm2(sx * 3 + 5, sy * 4, sz * 3, 5)) * 0.9;
        nuages[i] = 255; nuages[i + 1] = 255; nuages[i + 2] = 255; nuages[i + 3] = a * 255;
      } else {
        const n = contraste(fbm(sx * 2.2, sy * 2.2, sz * 2.2, 6));
        const d = fbm2(sx * 9, sy * 9, sz * 9, 3);
        col = fois(melange(c2, c1, n), 0.7 + d * 0.5);
      }
      carte[i] = col[0] * 255; carte[i + 1] = col[1] * 255; carte[i + 2] = col[2] * 255; carte[i + 3] = 255;
    }
  }
  return {
    carte: versTexture(L, H, carte),
    emissive: emis ? versTexture(L, H, emis) : null,
    nuages: nuages ? versTexture(L, H, nuages) : null,
  };
}

function textureHalo(taille = 256, centre = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
  g.addColorStop(0, centre);
  g.addColorStop(0.2, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, taille, taille);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureNebuleuse(seed) {
  const rnd = aleatoire(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  for (let k = 0; k < 14; k++) {
    const x = 128 + (rnd() - 0.5) * 120, y = 128 + (rnd() - 0.5) * 120, r = 30 + rnd() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.08 + rnd() * 0.12})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

// ---------- Rendu ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: haute, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, haute ? 2 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 8000);
camera.position.set(0, 500, 2000);
scene.add(camera);

const rendusEtiquettes = new CSS2DRenderer();
rendusEtiquettes.setSize(innerWidth, innerHeight);
Object.assign(rendusEtiquettes.domElement.style, {
  position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '5', opacity: '0', transition: 'opacity 1.5s ease',
});
document.body.appendChild(rendusEtiquettes.domElement);

let composer = null;
if (haute) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.95, 0.55, 0.72));
  composer.addPass(new OutputPass());
}

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 700;
controls.enabled = false;

// ---------- Lumières ----------
scene.add(new THREE.AmbientLight(0x6070a0, 0.3));
scene.add(new THREE.PointLight(0xfff0dd, 3.4, 0, 0));

// ---------- Fond : étoiles, galaxie spirale, nébuleuses ----------
const disque = textureHalo(64);

function champEtoiles() {
  const n = haute ? 7000 : 3000;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = aleatoire(3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(3000 + rnd() * 2500);
    v.toArray(pos, i * 3);
    const c = new THREE.Color().setHSL(0.55 + rnd() * 0.15, 0.5, 0.65 + rnd() * 0.35);
    c.toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.8, sizeAttenuation: false, vertexColors: true, map: disque, transparent: true, depthWrite: false,
  }));
}

function galaxieSpirale() {
  const n = haute ? 45000 : 14000;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = aleatoire(42);
  const gauss = () => rnd() + rnd() + rnd() - 1.5;
  const cCoeur = new THREE.Color('#ffb36b'), cBras = new THREE.Color('#6a7bff'), cRose = new THREE.Color('#ff4fd8');
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = 230 + Math.pow(rnd(), 1.5) * 1500;
    const bras = ((i % 4) / 4) * Math.PI * 2;
    const angle = bras + r * 0.0034;
    const ecart = 30 + r * 0.13;
    pos[i * 3] = Math.cos(angle) * r + gauss() * ecart;
    pos[i * 3 + 1] = gauss() * (14 + r * 0.02);
    pos[i * 3 + 2] = Math.sin(angle) * r + gauss() * ecart;
    c.copy(cCoeur).lerp(cBras, clamp((r - 230) / 1100, 0, 1));
    if (rnd() < 0.12) c.lerp(cRose, 0.7);
    c.multiplyScalar(0.55 + rnd() * 0.6);
    c.toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: haute ? 3.2 : 6, sizeAttenuation: true, vertexColors: true, map: disque,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.rotation.x = 0.18;
  return points;
}

function nebuleuses() {
  const groupe = new THREE.Group();
  const teintes = ['#7c3aed', '#22d3ee', '#ff4fd8', '#3b82f6', '#a855f7', '#14b8a6'];
  const rnd = aleatoire(11);
  teintes.forEach((teinte, k) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureNebuleuse(100 + k), color: teinte, transparent: true, opacity: 0.28,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const a = rnd() * Math.PI * 2, r = 1300 + rnd() * 900;
    s.position.set(Math.cos(a) * r, (rnd() - 0.5) * 900, Math.sin(a) * r);
    s.scale.setScalar(900 + rnd() * 900);
    groupe.add(s);
  });
  return groupe;
}

const fondEtoiles = champEtoiles();
const galaxie = galaxieSpirale();
scene.add(fondEtoiles, galaxie, nebuleuses());

// ---------- Le soleil ----------
function textureSoleil() {
  const L = haute ? 512 : 256, H = L / 2;
  const fbm = creerFbm(5);
  const px = new Uint8ClampedArray(L * H * 4);
  for (let y = 0; y < H; y++) {
    const lat = ((y + 0.5) / H) * Math.PI, sy = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < L; x++) {
      const lon = (x / L) * Math.PI * 2;
      const n = contraste(fbm(sl * Math.cos(lon) * 6, sy * 6, sl * Math.sin(lon) * 6, 5));
      const col = melange([1, 0.42, 0.08], [1, 0.9, 0.55], n);
      const i = (y * L + x) * 4;
      px[i] = col[0] * 255; px[i + 1] = col[1] * 255; px[i + 2] = col[2] * 255; px[i + 3] = 255;
    }
  }
  return versTexture(L, H, px);
}
const soleilMat = new THREE.MeshBasicMaterial({ map: textureSoleil() });
soleilMat.color.setScalar(2.4);
const soleil = new THREE.Mesh(new THREE.SphereGeometry(7, 64, 64), soleilMat);
scene.add(soleil);
const halo = textureHalo(256);
[[30, '#ffb347', 0.8], [60, '#ff7a18', 0.22]].forEach(([taille, teinte, opacite]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: halo, color: teinte, transparent: true, opacity: opacite, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(taille);
  soleil.add(s);
});

// ---------- Planètes et orbites ----------
const corps = [];       // tout ce qui tourne autour du soleil
const zonesClic = [];   // sphères invisibles pour cliquer facilement

function atmosphere(rayon, couleur) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(rayon * 1.18, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: { teinte: { value: new THREE.Color(couleur) } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 teinte; varying vec3 vN; varying vec3 vV;
        void main() {
          float d = -dot(vN, vV);
          float f = pow(smoothstep(0.0, 0.5, d), 3.0) * 0.55;
          gl_FragColor = vec4(teinte, f);
        }`,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
}

function anneaux(rayon, p, rnd) {
  const int = rayon * 1.45, ext = rayon * 2.4;
  const geo = new THREE.RingGeometry(int, ext, 160, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - int) / (ext - int), 0.5);
  }
  const c = document.createElement('canvas');
  c.width = 512; c.height = 2;
  const ctx = c.getContext('2d');
  const a1 = rvb(p.couleur || '#ffffff'), a2 = rvb(p.couleur2 || '#ffffff');
  const ph1 = rnd() * 6, ph2 = rnd() * 6;
  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    let a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 46 + ph1)) * (0.5 + 0.5 * Math.sin(t * 13 + ph2));
    a *= lissage(0, 0.08, t) * (1 - lissage(0.9, 1, t));
    if (t > 0.6 && t < 0.65) a *= 0.12;
    const col = melange(melange(a1, [1, 1, 1], 0.45), a2, t);
    ctx.fillStyle = `rgba(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0},${a * 0.85})`;
    ctx.fillRect(x, 0, 1, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1,
  }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

function ligneOrbite(R, couleur, libre) {
  const pts = [];
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const ligne = libre
    ? new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x8899ff, dashSize: 1.4, gapSize: 2, transparent: true, opacity: 0.22 }))
    : new THREE.Line(geo, new THREE.LineBasicMaterial({ color: couleur, transparent: true, opacity: 0.7 }));
  if (libre) ligne.computeLineDistances();
  scene.add(ligne);
}

function etiquette(texte, classe = '') {
  const el = document.createElement('div');
  el.className = 'etiquette ' + classe;
  el.textContent = texte;
  return new CSS2DObject(el);
}

function zoneClic(parent, rayon, c) {
  const z = new THREE.Mesh(new THREE.SphereGeometry(rayon, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
  z.userData.corps = c;
  parent.add(z);
  zonesClic.push(z);
}

function ajouterPlanete(p, index) {
  const seed = graine(`${p.nom}|${p.auteur}`);
  const rnd = aleatoire(seed);
  const rayon = clamp(Number(p.taille) || 1, 0.6, 2.5);
  const R = rayonOrbite(index);
  const tex = texturePlanete(p, seed, haute ? 512 : 256);

  const holder = new THREE.Group();
  const inclinaison = new THREE.Group();
  inclinaison.rotation.z = (rnd() - 0.5) * 0.7;
  holder.add(inclinaison);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(rayon, 64, 64),
    new THREE.MeshStandardMaterial({
      map: tex.carte,
      roughness: p.type === 'glace' ? 0.45 : 0.9,
      emissiveMap: tex.emissive,
      emissive: tex.emissive ? 0xffffff : 0x000000,
      emissiveIntensity: tex.emissive ? 1.8 : 0,
    }),
  );
  inclinaison.add(mesh);

  let nuages = null;
  if (tex.nuages) {
    nuages = new THREE.Mesh(
      new THREE.SphereGeometry(rayon * 1.025, 64, 64),
      new THREE.MeshStandardMaterial({ map: tex.nuages, transparent: true, depthWrite: false, roughness: 1 }),
    );
    inclinaison.add(nuages);
  }
  holder.add(atmosphere(rayon, p.type === 'oceanique' ? '#7ec8ff' : (p.couleur || '#88aaff')));
  if (p.anneaux) inclinaison.add(anneaux(rayon, p, rnd));

  const lunes = [];
  const nbLunes = clamp(Math.round(Number(p.lunes) || 0), 0, 4);
  for (let k = 0; k < nbLunes; k++) {
    const lune = new THREE.Mesh(
      new THREE.SphereGeometry(rayon * (0.14 + rnd() * 0.1), 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xb9b6c4, roughness: 1 }),
    );
    holder.add(lune);
    lunes.push({ mesh: lune, r: rayon * (2.8 + k * 0.9), v: 0.5 + rnd() * 0.7, a: rnd() * Math.PI * 2, inc: (rnd() - 0.5) * 0.7 });
  }

  const etiq = etiquette(p.nom);
  etiq.position.set(0, rayon * 1.25 + 0.6, 0);
  holder.add(etiq);
  scene.add(holder);
  ligneOrbite(R, hex(p.couleur || '#88aaff'), false);

  const c = {
    type: 'planete', data: p, index, holder, mesh, nuages, lunes, rayon, R,
    angle: index * 2.399 + rnd() * 0.5, vitesse: 1.1 / Math.pow(R, 0.85), spin: 0.15 + rnd() * 0.25,
    etiquette: etiq.element,
  };
  zoneClic(holder, Math.max(rayon * 1.8, 4.5), c);
  corps.push(c);
}

function ajouterOrbiteLibre(index) {
  const R = rayonOrbite(index);
  const holder = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshBasicMaterial({ color: 0x9fb0ff, wireframe: true, transparent: true, opacity: 0.28 }),
  );
  holder.add(mesh);
  const etiq = etiquette('orbite libre', 'libre');
  etiq.position.set(0, 2.2, 0);
  holder.add(etiq);
  scene.add(holder);
  ligneOrbite(R, 0x8899ff, true);
  const c = {
    type: 'libre', index, holder, mesh, lunes: [], rayon: 1.1, R,
    angle: index * 2.399, vitesse: 1.1 / Math.pow(R, 0.85), spin: 0.3, etiquette: etiq.element,
  };
  zoneClic(holder, 4.5, c);
  corps.push(c);
}

planetes.forEach(ajouterPlanete);
for (let i = planetes.length; i < NB_ORBITES; i++) ajouterOrbiteLibre(i);

const corpsSoleil = { type: 'soleil', holder: soleil, rayon: 7, lunes: [] };
zoneClic(soleil, 8, corpsSoleil);

// Ceinture d'astéroïdes, au-delà de la dernière orbite
function ceinture() {
  const n = haute ? 2200 : 600;
  const m = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({ color: 0x8d8579, roughness: 1, flatShading: true }),
    n,
  );
  const rnd = aleatoire(7), o = new THREE.Object3D();
  const R0 = rayonOrbite(NB_ORBITES - 1) + 16;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = R0 + (rnd() + rnd() - 1) * 8;
    o.position.set(Math.cos(a) * r, (rnd() - 0.5) * 3, Math.sin(a) * r);
    o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
    o.scale.setScalar(0.3 + Math.pow(rnd(), 3) * 2.2);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  }
  scene.add(m);
  return m;
}
const asteroides = ceinture();

// ---------- Effet hyperespace (intro) ----------
function creerHyperespace() {
  const n = haute ? 700 : 300;
  const pos = new Float32Array(n * 6);
  const traits = [];
  const rnd = aleatoire(9);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * 70;
    traits.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -100 - rnd() * 1900, v: 0.6 + rnd() * 0.8 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lignes = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xb8c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lignes.frustumCulled = false;
  lignes.visible = false;
  camera.add(lignes);
  return {
    lignes,
    maj(dt, vitesse) {
      const longueur = 10 + vitesse * 0.08;
      traits.forEach((t, i) => {
        t.z += vitesse * t.v * dt;
        if (t.z > -15) t.z -= 1950;
        pos.set([t.x, t.y, t.z, t.x, t.y, t.z - longueur * t.v], i * 6);
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}
const hyperespace = creerHyperespace();

// ---------- Son (généré en direct, aucun fichier) ----------
let audio = null;
let sonActif = lire('son') !== 'non';

function demarrerSon() {
  if (audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const maitre = ctx.createGain();
  maitre.gain.value = 0;
  maitre.connect(ctx.destination);

  const filtre = ctx.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.frequency.value = 520;
  filtre.Q.value = 3;
  const nappe = ctx.createGain();
  nappe.gain.value = 0;
  filtre.connect(nappe);
  nappe.connect(maitre);
  [55, 82.41, 110, 164.81, 246.94].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 ? 'sawtooth' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 2) * 7;
    const g = ctx.createGain();
    g.gain.value = 0.17;
    o.connect(g); g.connect(filtre); o.start();
  });
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 320;
  lfo.connect(lfoGain); lfoGain.connect(filtre.frequency); lfo.start();
  nappe.gain.linearRampToValueAtTime(1, ctx.currentTime + 5);
  maitre.gain.value = 0.13;
  audio = { ctx, maitre };
}

function bruitage(type) {
  if (!audio || !sonActif) return;
  const { ctx, maitre } = audio;
  const t = ctx.currentTime;
  if (type === 'hyperespace') {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 1.8);
    bp.frequency.exponentialRampToValueAtTime(120, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(2.2, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    src.connect(bp); bp.connect(g); g.connect(maitre);
    src.start(t); src.stop(t + 4);
  } else {
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.25 : 0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); g.connect(maitre); o.start(t); o.stop(t + 1.5);
    });
  }
}

function appliquerSon() {
  btnSon.textContent = sonActif ? '🔊' : '🔇';
  if (!audio) return;
  if (sonActif) audio.ctx.resume(); else audio.ctx.suspend();
}

// ---------- Interface ----------
const $ = (id) => document.getElementById(id);
const intro = $('intro'), hud = $('hud'), aide = $('aide');
const fiche = $('fiche'), ficheContenu = $('fiche-contenu'), annuaire = $('annuaire');
const btnSon = $('btn-son'), btnQualite = $('btn-qualite'), btnEntrer = $('btn-entrer');
const nbLibres = NB_ORBITES - planetes.length;
const nbAuteurs = new Set(planetes.map((p) => (p.auteur || '').trim().toLowerCase()).filter(Boolean)).size;
const lienDepot = /^https?:\/\//.test(depot) ? depot : '#';

$('compteur').textContent = `${planetes.length} planète${planetes.length > 1 ? 's' : ''} · ${nbLibres} orbites libres`;
btnQualite.textContent = haute ? 'Qualité : HD' : 'Qualité : éco';
appliquerSon();

function contenuFiche(c) {
  if (c.type === 'soleil') {
    return `
      <span class="badge" style="color:#ffb347;border-color:#ffb347">Étoile centrale</span>
      <h2>La Galaxie</h2>
      <p class="auteur">Un projet <b>open source</b></p>
      <p class="description">Le code de ce site est public : n'importe qui peut le copier, l'améliorer et y ajouter sa planète. Chaque planète que tu vois a été ajoutée par une personne différente. Plus on est, plus la galaxie grandit.</p>
      <div class="stats">
        <div><b>${planetes.length}</b><span>PLANÈTES</span></div>
        <div><b>${nbAuteurs}</b><span>CRÉATEURS</span></div>
        <div><b>${nbLibres}</b><span>LIBRES</span></div>
      </div>
      <a class="lien-projet" href="${lienDepot}" target="_blank" rel="noopener">Voir le code sur GitHub ↗</a>`;
  }
  if (c.type === 'libre') {
    return `
      <span class="badge">Orbite n°${c.index + 1} · libre</span>
      <h2>Cette place est pour toi</h2>
      <p class="description">Personne n'a encore posé sa planète ici. Ça prend 5 minutes :</p>
      <ol class="etapes">
        <li>Ouvre <a href="${lienDepot}" target="_blank" rel="noopener" style="color:inherit">le projet sur GitHub</a> et clique sur <b>Fork</b> (ça crée ta copie).</li>
        <li>Ouvre le fichier <code>js/planetes.js</code>.</li>
        <li>Copie le bloc <b>MODÈLE</b>, colle-le à la fin de la liste et mets ton nom, tes couleurs, ton type de planète.</li>
        <li>Enregistre (<b>Commit</b>), puis <b>Contribute → Open pull request</b>.</li>
        <li>Dès que c'est accepté, ta planète apparaît ici pour tout le monde. 🪐</li>
      </ol>
      <p class="description" style="font-size:13px;color:var(--texte-doux)">Astuce : avec Claude Code ou Codex, demande simplement « ajoute ma planète dans planetes.js ».</p>
      <a class="lien-projet" href="${lienDepot}" target="_blank" rel="noopener">Ouvrir le projet GitHub ↗</a>`;
  }
  const p = c.data;
  const couleur = hex(p.couleur || '#88aaff');
  const lien = /^https?:\/\//.test(p.lien || '') ? p.lien : '';
  return `
    <span class="badge" style="color:${couleur};border-color:${couleur}">Planète ${echapper(p.type || 'rocheuse')}</span>
    <h2>${echapper(p.nom)}</h2>
    <p class="auteur">Ajoutée par <b>${echapper(p.auteur || 'un inconnu')}</b></p>
    <p class="description">${echapper(p.description || '')}</p>
    <div class="stats">
      <div><b>${clamp(Number(p.taille) || 1, 0.6, 2.5)}</b><span>TAILLE</span></div>
      <div><b>n°${c.index + 1}</b><span>ORBITE</span></div>
      <div><b>${c.lunes.length}</b><span>LUNES</span></div>
    </div>
    ${lien ? `<a class="lien-projet" href="${echapper(lien)}" target="_blank" rel="noopener">Voir son projet ↗</a>` : ''}`;
}

function remplirAnnuaire() {
  const items = corps.filter((c) => c.type === 'planete').map((c) => `
    <button data-i="${corps.indexOf(c)}">
      <span class="pastille" style="background:${hex(c.data.couleur || '#88aaff')};box-shadow:0 0 10px ${hex(c.data.couleur || '#88aaff')}"></span>
      <span>${echapper(c.data.nom)}<small>par ${echapper(c.data.auteur || '?')}</small></span>
    </button>`);
  const libre = corps.findIndex((c) => c.type === 'libre');
  items.push(`
    <button data-i="soleil"><span class="pastille" style="background:#ffb347;box-shadow:0 0 10px #ffb347"></span>
      <span>Le soleil<small>à propos du projet</small></span></button>`);
  if (libre >= 0) {
    items.push(`
      <button data-i="${libre}"><span class="pastille" style="border:1px dashed #9fb0ff"></span>
        <span>${nbLibres} orbites libres<small>ajoute ta planète</small></span></button>`);
  }
  annuaire.innerHTML = items.join('');
  annuaire.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    annuaire.classList.add('cache');
    selectionner(b.dataset.i === 'soleil' ? corpsSoleil : corps[Number(b.dataset.i)]);
  }));
}
remplirAnnuaire();

// ---------- Caméra : voler vers une planète, la suivre, revenir ----------
let etat = 'accueil';        // accueil → intro → libre
let suivi = null, enVol = false, retour = false, debutVol = 0, debutIntro = 0;
const dernierePos = new THREE.Vector3(), cibleCam = new THREE.Vector3(), tmp = new THREE.Vector3();
const departIntro = new THREE.Vector3();

function selectionner(c) {
  if (!c || etat !== 'libre') return;
  suivi?.etiquette?.classList.remove('cache');
  c.etiquette?.classList.add('cache');
  suivi = c;
  enVol = true;
  retour = false;
  debutVol = horloge.elapsedTime;
  c.holder.getWorldPosition(dernierePos);
  const dist = c.rayon * 4.5 + 5;
  const n = dernierePos.lengthSq() > 0.01 ? dernierePos.clone().normalize() : new THREE.Vector3(0, 0, 1).negate();
  const cote = new THREE.Vector3(-n.z, 0, n.x);
  cibleCam.copy(dernierePos)
    .addScaledVector(n, -dist * 0.7)
    .addScaledVector(cote, dist * 0.6)
    .add(new THREE.Vector3(0, dist * 0.35, 0));
  controls.minDistance = c.rayon * 1.6;
  ficheContenu.innerHTML = contenuFiche(c);
  fiche.classList.remove('cache');
  bruitage('ping');
}

function fermer() {
  fiche.classList.add('cache');
  if (!suivi) return;
  suivi.etiquette?.classList.remove('cache');
  suivi = null;
  enVol = false;
  retour = true;
  debutVol = horloge.elapsedTime;
  controls.minDistance = 10;
}

function mettreAJourCamera(dt) {
  if (suivi) {
    suivi.holder.getWorldPosition(tmp);
    const delta = tmp.clone().sub(dernierePos);
    dernierePos.copy(tmp);
    if (enVol) {
      cibleCam.add(delta);
      camera.position.lerp(cibleCam, 1 - Math.exp(-dt * 2.6));
      controls.target.lerp(tmp, 1 - Math.exp(-dt * 5));
      if (camera.position.distanceTo(cibleCam) < 0.4 || horloge.elapsedTime - debutVol > 4) enVol = false;
    } else {
      camera.position.add(delta);
      controls.target.add(delta);
    }
  } else if (retour) {
    camera.position.lerp(VUE_GENERALE, 1 - Math.exp(-dt * 2));
    controls.target.lerp(ORIGINE, 1 - Math.exp(-dt * 4));
    if (camera.position.distanceTo(VUE_GENERALE) < 1 || horloge.elapsedTime - debutVol > 4) retour = false;
  }
  controls.enabled = !enVol && !retour;

  // Quand la fiche est ouverte, on décale la vue pour que la planète ne soit pas cachée
  // (vers la gauche sur ordinateur, vers le haut sur téléphone)
  const large = innerWidth > 720;
  const cx = suivi && large ? innerWidth * 0.17 : 0;
  const cy = suivi && !large ? innerHeight * 0.22 : 0;
  const k = 1 - Math.exp(-dt * 3);
  decalage.x += (cx - decalage.x) * k;
  decalage.y += (cy - decalage.y) * k;
  if (Math.abs(decalage.x) + Math.abs(decalage.y) > 0.5) {
    camera.setViewOffset(innerWidth, innerHeight, decalage.x, decalage.y, innerWidth, innerHeight);
  } else if (camera.view?.enabled) camera.clearViewOffset();
}
const decalage = { x: 0, y: 0 };

// ---------- Souris / doigt ----------
const raycaster = new THREE.Raycaster();
const pointeur = new THREE.Vector2(-10, -10);
let appui = null, survole = null;

function viser(x, y) {
  pointeur.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointeur, camera);
  const hits = raycaster.intersectObjects(zonesClic, false);
  return hits.length ? hits[0].object.userData.corps : null;
}

canvas.addEventListener('pointerdown', (e) => { appui = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!appui || etat !== 'libre') return;
  const bouge = Math.hypot(e.clientX - appui.x, e.clientY - appui.y);
  appui = null;
  if (bouge > 6) return;
  const c = viser(e.clientX, e.clientY);
  if (c) selectionner(c);
});
canvas.addEventListener('pointermove', (e) => {
  if (etat !== 'libre' || e.pointerType !== 'mouse') return;
  const c = viser(e.clientX, e.clientY);
  if (c === survole) return;
  survole?.etiquette?.classList.remove('survol');
  survole = c;
  survole?.etiquette?.classList.add('survol');
  canvas.style.cursor = c ? 'pointer' : '';
});

// ---------- Boutons ----------
function entrer() {
  if (etat !== 'accueil') return;
  etat = 'intro';
  debutIntro = horloge.elapsedTime;
  departIntro.copy(camera.position);
  intro.classList.add('cache');
  setTimeout(() => { intro.style.display = 'none'; }, 1300);
  if (sonActif) { demarrerSon(); bruitage('hyperespace'); }
  hyperespace.lignes.visible = true;
}

btnEntrer.addEventListener('click', entrer);
$('fiche-fermer').addEventListener('click', fermer);
$('btn-annuaire').addEventListener('click', () => annuaire.classList.toggle('cache'));
$('btn-ajouter').addEventListener('click', () => {
  annuaire.classList.add('cache');
  selectionner(corps.find((c) => c.type === 'libre') || corpsSoleil);
});
btnSon.addEventListener('click', () => {
  sonActif = !sonActif;
  ecrire('son', sonActif ? 'oui' : 'non');
  if (sonActif) demarrerSon();
  appliquerSon();
});
btnQualite.addEventListener('click', () => {
  ecrire('qualite', haute ? 'basse' : 'haute');
  location.reload();
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { annuaire.classList.add('cache'); fermer(); }
  if (e.key === 'Enter' && etat === 'accueil') entrer();
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  rendusEtiquettes.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
});

// ---------- Boucle d'animation ----------
const horloge = new THREE.Clock();
const DUREE_INTRO = 4.2;

function boucle() {
  requestAnimationFrame(boucle);
  const dt = Math.min(horloge.getDelta(), 0.05);
  const t = horloge.elapsedTime;

  galaxie.rotation.y += dt * 0.004;
  asteroides.rotation.y += dt * 0.01;
  soleil.rotation.y += dt * 0.03;

  for (const c of corps) {
    c.angle += c.vitesse * dt;
    c.holder.position.set(Math.cos(c.angle) * c.R, 0, Math.sin(c.angle) * c.R);
    c.mesh.rotation.y += dt * c.spin;
    if (c.type === 'libre') c.mesh.rotation.x += dt * 0.2;
    if (c.nuages) c.nuages.rotation.y += dt * c.spin * 0.4;
    for (const l of c.lunes) {
      l.a += l.v * dt;
      l.mesh.position.set(Math.cos(l.a) * l.r, Math.sin(l.a) * l.r * l.inc, Math.sin(l.a) * l.r);
    }
  }

  if (etat === 'accueil') {
    const a = t * 0.03;
    camera.position.set(Math.sin(a) * 2000, 500, Math.cos(a) * 2000);
    camera.lookAt(ORIGINE);
  } else if (etat === 'intro') {
    const p = Math.min((t - debutIntro) / DUREE_INTRO, 1);
    const e = 1 - Math.pow(1 - p, 4);
    camera.position.lerpVectors(departIntro, VUE_GENERALE, e);
    camera.fov = 55 + 38 * Math.sin(Math.min(p * 1.3, 1) * Math.PI);
    camera.updateProjectionMatrix();
    camera.lookAt(ORIGINE);
    hyperespace.lignes.material.opacity = Math.max(0, 1 - p * 1.5) * Math.min(1, p * 8) * 0.9;
    hyperespace.maj(dt, 2600 * (1 - e) + 150);
    if (p >= 1) {
      etat = 'libre';
      hyperespace.lignes.visible = false;
      camera.fov = 55;
      camera.updateProjectionMatrix();
      controls.target.copy(ORIGINE);
      controls.enabled = true;
      hud.classList.remove('cache');
      aide.classList.remove('cache');
      rendusEtiquettes.domElement.style.opacity = '1';
    }
  } else {
    mettreAJourCamera(dt);
    controls.update();
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
  rendusEtiquettes.render(scene, camera);
}

boucle();
btnEntrer.disabled = false;
btnEntrer.textContent = 'Entrer dans la galaxie ▸';
