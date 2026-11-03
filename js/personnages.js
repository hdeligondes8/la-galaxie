// =====================================================================
//  LES PERSONNAGES (les "skins" de la course)
//  Chacun est construit avec des formes simples (sphères, boîtes, cônes).
//  Ils vont tous à la même vitesse : seul le look change.
//  Le nez de chaque personnage pointe vers -Z (vers l'avant).
//
//  Envie d'en ajouter un ? Écris une fonction comme celles du dessous,
//  puis ajoute-la dans la liste PERSONNAGES tout en bas.
// =====================================================================
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Ajoute une forme au modèle : position, rotation et échelle sont optionnelles
function ajouter(parent, geometrie, materiau, position = [0, 0, 0], rotation = null, echelle = null) {
  const m = new THREE.Mesh(geometrie, materiau);
  m.position.set(...position);
  if (rotation) m.rotation.set(...rotation);
  if (echelle) m.scale.set(...echelle);
  parent.add(m);
  return m;
}
const sphere = (r, l = 24, h = 16) => new THREE.SphereGeometry(r, l, h);

// ---------- 🚀 Le vaisseau ----------
function vaisseau({ modele, mat }) {
  const coque = mat({ color: 0xe6ebf7, metalness: 0.55, roughness: 0.3 });
  const accent = mat({ color: 0x7c5cff, metalness: 0.4, roughness: 0.4, emissive: 0x3b1fd1, emissiveIntensity: 0.7 });
  const vitre = mat({ color: 0x66e0ff, metalness: 0.2, roughness: 0.1, emissive: 0x1aa7ff, emissiveIntensity: 0.8 });
  const sombre = mat({ color: 0x2a3142, metalness: 0.6, roughness: 0.5 });
  ajouter(modele, new THREE.CylinderGeometry(0.1, 0.42, 2.6, 14), coque, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  ajouter(modele, sphere(0.28, 20, 14), vitre, [0, 0.24, -0.15], null, [1, 0.75, 2]);
  for (const s of [-1, 1]) {
    ajouter(modele, new THREE.BoxGeometry(1.5, 0.07, 0.75), coque, [s * 0.85, -0.05, 0.55], [0, -s * 0.38, 0]);
    ajouter(modele, new THREE.BoxGeometry(1.1, 0.08, 0.16), accent, [s * 0.8, -0.03, 0.42], [0, -s * 0.38, 0]);
    ajouter(modele, new THREE.BoxGeometry(0.06, 0.5, 0.55), accent, [s * 1.5, 0.15, 0.85]);
    ajouter(modele, new THREE.CylinderGeometry(0.17, 0.21, 0.8, 14), sombre, [s * 0.38, -0.02, 1.15], [-Math.PI / 2, 0, 0]);
  }
  return { tuyeres: [V(-0.38, -0.02, 1.58), V(0.38, -0.02, 1.58)] };
}

// ---------- 🛵 Le scooter spatial ----------
function scooter({ modele, mat, lueur }) {
  const carrosserie = mat({ color: 0x2dd4bf, metalness: 0.3, roughness: 0.35 });
  const creme = mat({ color: 0xf5f0e6, roughness: 0.5 });
  const sombre = mat({ color: 0x222831, metalness: 0.5, roughness: 0.6 });
  const casque = mat({ color: 0xffffff, metalness: 0.3, roughness: 0.25 });
  const visiere = mat({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.1, emissive: 0x1d4ed8, emissiveIntensity: 0.6 });
  const combinaison = mat({ color: 0xff7a18, roughness: 0.7 });

  ajouter(modele, new THREE.BoxGeometry(0.62, 0.42, 1.6), carrosserie, [0, 0, 0.15]);
  ajouter(modele, sphere(0.4), carrosserie, [0, 0.05, 0.85], null, [0.8, 0.6, 0.6]);
  ajouter(modele, new THREE.BoxGeometry(0.6, 0.85, 0.1), carrosserie, [0, 0.45, -0.68], [0.35, 0, 0]);
  ajouter(modele, new THREE.CylinderGeometry(0.05, 0.05, 0.75), sombre, [0, 0.95, -0.88], [0.35, 0, 0]);
  ajouter(modele, new THREE.CylinderGeometry(0.04, 0.04, 0.9), sombre, [0, 1.3, -1.0], [0, 0, Math.PI / 2]);
  ajouter(modele, sphere(0.12, 14, 10), lueur(0xfff3c4, 3), [0, 1.12, -1.1]);
  ajouter(modele, new THREE.BoxGeometry(0.46, 0.12, 0.75), creme, [0, 0.27, 0.35]);
  // Patins antigravité à la place des roues
  for (const z of [-0.6, 0.65]) ajouter(modele, new THREE.CylinderGeometry(0.34, 0.34, 0.08, 24), lueur(0x5ef2ff, 1.6), [0, -0.27, z]);
  // Le pilote
  ajouter(modele, new THREE.CapsuleGeometry(0.2, 0.42, 6, 12), combinaison, [0, 0.74, 0.22], [-0.35, 0, 0]);
  ajouter(modele, sphere(0.26), casque, [0, 1.2, 0.02]);
  ajouter(modele, sphere(0.2), visiere, [0, 1.19, -0.1], null, [1.05, 0.7, 0.9]);
  for (const s of [-1, 1]) {
    ajouter(modele, new THREE.CapsuleGeometry(0.07, 0.8, 4, 8), combinaison, [s * 0.3, 1.1, -0.42], [-1.4, 0, 0]);
  }
  return { tuyeres: [V(0, 0.02, 1.1)] };
}

// ---------- 🛸 La soucoupe volante ----------
function soucoupe({ modele, mat, lueur }) {
  const metal = mat({ color: 0xc7ccd9, metalness: 0.8, roughness: 0.25 });
  const vitre = mat({ color: 0x9be7ff, roughness: 0.05, transparent: true, opacity: 0.4 });
  const peau = mat({ color: 0x7ee84a, roughness: 0.6 });
  const noir = mat({ color: 0x050505, roughness: 0.15, metalness: 0.4 });

  const plateau = new THREE.Group();
  modele.add(plateau);
  ajouter(plateau, sphere(1.35, 40, 20), metal, [0, 0, 0], null, [1, 0.22, 1]);
  ajouter(plateau, new THREE.TorusGeometry(1.32, 0.07, 10, 48), lueur(0xff5cf0, 1.5), [0, 0, 0], [Math.PI / 2, 0, 0]);
  const couleurs = [0x5ef2ff, 0xffd27a, 0xff5cf0, 0x7ee84a];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ajouter(plateau, sphere(0.09, 10, 8), lueur(couleurs[k % 4], 2.5), [Math.cos(a) * 1.0, -0.2, Math.sin(a) * 1.0]);
  }
  // Le petit alien
  ajouter(modele, new THREE.CapsuleGeometry(0.15, 0.18, 4, 10), peau, [0, 0.38, 0]);
  ajouter(modele, sphere(0.27), peau, [0, 0.72, 0], null, [1, 1.15, 1]);
  for (const s of [-1, 1]) {
    ajouter(modele, sphere(0.1, 12, 10), noir, [s * 0.12, 0.76, -0.2], [0, 0, s * 0.45], [1.2, 0.7, 0.6]);
    ajouter(modele, new THREE.CylinderGeometry(0.015, 0.015, 0.3), peau, [s * 0.1, 1.08, 0], [0, 0, -s * 0.3]);
    ajouter(modele, sphere(0.05, 10, 8), lueur(0x7ee84a, 2), [s * 0.15, 1.22, 0]);
  }
  ajouter(modele, new THREE.SphereGeometry(0.62, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), vitre, [0, 0.2, 0]);
  return {
    tuyeres: [V(-0.5, 0, 1.25), V(0.5, 0, 1.25)],
    animer: (t) => { plateau.rotation.y = t * 1.5; },
  };
}

// ---------- 🔴 La fusée rétro ----------
function fusee({ modele, mat }) {
  const blanc = mat({ color: 0xf4f4f6, metalness: 0.4, roughness: 0.3 });
  const rouge = mat({ color: 0xe23b3b, metalness: 0.3, roughness: 0.35 });
  const vitre = mat({ color: 0x66e0ff, emissive: 0x1aa7ff, emissiveIntensity: 0.8, roughness: 0.1 });
  const profil = [[0.001, -1.1], [0.3, -1.05], [0.42, -0.7], [0.46, -0.1], [0.42, 0.5], [0.32, 0.9]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  ajouter(modele, new THREE.LatheGeometry(profil, 28), blanc, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  ajouter(modele, new THREE.ConeGeometry(0.325, 0.65, 28), rouge, [0, 0, -1.22], [-Math.PI / 2, 0, 0]);
  ajouter(modele, new THREE.CylinderGeometry(0.465, 0.465, 0.16, 28), rouge, [0, 0, 0.1], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 3; k++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (k / 3) * Math.PI * 2;
    modele.add(pivot);
    ajouter(pivot, new THREE.BoxGeometry(0.06, 0.55, 0.6), rouge, [0, 0.55, 0.75], [0.25, 0, 0]);
  }
  ajouter(modele, new THREE.TorusGeometry(0.15, 0.04, 8, 24), rouge, [0, 0.43, -0.35], [Math.PI / 2 - 0.1, 0, 0]);
  ajouter(modele, new THREE.CircleGeometry(0.14, 20), vitre, [0, 0.44, -0.35], [-Math.PI / 2 - 0.1, 0, 0]);
  return { tuyeres: [V(0, 0, 1.15)] };
}

// ---------- 🦆 Le canard géant ----------
function canard({ modele, mat }) {
  const jaune = mat({ color: 0xffd23f, roughness: 0.45 });
  const orange = mat({ color: 0xff8a1f, roughness: 0.5 });
  const noir = mat({ color: 0x111111, roughness: 0.2 });
  const blanc = mat({ color: 0xffffff, roughness: 0.3 });
  const gris = mat({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 });

  ajouter(modele, sphere(0.85), jaune, [0, 0, 0.1], null, [1, 0.72, 1.25]);
  ajouter(modele, sphere(0.52), jaune, [0, 0.72, -0.6]);
  ajouter(modele, sphere(0.3), orange, [0, 0.62, -1.08], null, [1, 0.35, 1]);
  for (const s of [-1, 1]) {
    ajouter(modele, sphere(0.12, 14, 10), blanc, [s * 0.22, 0.88, -0.98]);
    ajouter(modele, sphere(0.065, 10, 8), noir, [s * 0.23, 0.89, -1.08]);
  }
  ajouter(modele, new THREE.ConeGeometry(0.25, 0.5, 16), jaune, [0, 0.38, 1.1], [0.9, 0, 0]);
  const ailes = [-1, 1].map((s) => ajouter(modele, sphere(0.42), jaune, [s * 0.82, 0.05, 0.15], null, [0.35, 0.6, 1]));
  // Un petit jetpack, parce qu'un canard ne vole pas dans l'espace tout seul
  for (const s of [-1, 1]) ajouter(modele, new THREE.CylinderGeometry(0.13, 0.15, 0.5, 14), gris, [s * 0.3, 0.3, 1.0], [-Math.PI / 2, 0, 0]);
  return {
    tuyeres: [V(-0.3, 0.3, 1.28), V(0.3, 0.3, 1.28)],
    animer: (t) => ailes.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * Math.sin(t * 12) * 0.35; }),
  };
}

// ---------- 🐋 La baleine cosmique ----------
function baleine({ modele, mat }) {
  const bleu = mat({ color: 0x3b6fd8, roughness: 0.55, metalness: 0.1 });
  const ventre = mat({ color: 0xdbe7ff, roughness: 0.6 });
  const noir = mat({ color: 0x0b1020, roughness: 0.2 });

  ajouter(modele, sphere(0.8, 32, 20), bleu, [0, 0, 0], null, [0.95, 0.8, 1.8]);
  ajouter(modele, sphere(0.72, 32, 20), ventre, [0, -0.2, -0.05], null, [0.88, 0.62, 1.7]);
  for (const s of [-1, 1]) {
    ajouter(modele, sphere(0.07, 10, 8), noir, [s * 0.66, 0.05, -0.85]);
    ajouter(modele, sphere(0.5), bleu, [s * 0.85, -0.3, -0.35], [0, s * 0.5, s * 0.3], [0.7, 0.12, 0.35]);
  }
  const queue = new THREE.Group();
  queue.position.set(0, 0.05, 1.3);
  modele.add(queue);
  ajouter(queue, new THREE.ConeGeometry(0.35, 0.9, 16), bleu, [0, 0, 0.3], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) ajouter(queue, new THREE.BoxGeometry(0.8, 0.06, 0.4), bleu, [s * 0.38, 0, 0.75], [0, s * 0.45, 0]);
  return {
    tuyeres: [V(0, 0.05, 2.05)],
    animer: (t) => { queue.rotation.x = Math.sin(t * 3) * 0.35; },
  };
}

export const PERSONNAGES = [
  { id: 'vaisseau', nom: 'Le Vaisseau', description: 'Le classique. Fin, rapide, élégant.', creer: vaisseau },
  { id: 'scooter', nom: 'Le Scooter spatial', description: 'Casque sur la tête, guidon en main, on file.', creer: scooter },
  { id: 'soucoupe', nom: 'La Soucoupe', description: 'Pilotée par un petit alien très concentré.', creer: soucoupe },
  { id: 'fusee', nom: 'La Fusée rétro', description: 'Rouge et blanche, comme dans les vieux films.', creer: fusee },
  { id: 'canard', nom: 'Le Canard géant', description: 'Personne ne sait comment il vole. Mais il vole.', creer: canard },
  { id: 'baleine', nom: 'La Baleine cosmique', description: 'Elle nage entre les étoiles.', creer: baleine },
];

// Construit un personnage prêt à être posé dans la scène.
// fantome = true → une version transparente (pour le fantôme du record).
export function creerPersonnage(id, halo, fantome = false) {
  const perso = PERSONNAGES.find((p) => p.id === id) || PERSONNAGES[0];
  const racine = new THREE.Group();
  const modele = new THREE.Group();
  racine.add(modele);
  const transparent = () => new THREE.MeshBasicMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mat = (options) => (fantome ? transparent() : new THREE.MeshStandardMaterial(options));
  const lueur = (couleur, force) => (fantome ? transparent() : new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur).multiplyScalar(force) }));
  const { tuyeres, animer } = perso.creer({ modele, mat, lueur });

  // Lueur des réacteurs
  const lueurs = [];
  if (!fantome) {
    for (const t of tuyeres) {
      const disque = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), lueur(0x66e0ff, 2));
      disque.position.copy(t);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: halo, color: 0x5cc8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.position.copy(t).z += 0.2;
      modele.add(disque, sprite);
      lueurs.push(sprite);
    }
  }
  return { id: perso.id, racine, modele, tuyeres, lueurs, animer: animer || (() => {}) };
}
