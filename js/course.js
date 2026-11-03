// =====================================================================
//  LA GALAXIE — la course
//  Un vaisseau, un portail à côté de chaque planète, un chrono.
//  Chaque planète ajoutée dans planetes.js ajoute un portail au circuit.
// =====================================================================
import * as THREE from 'three';
import * as son from './son.js';

const VITESSE = 22;          // vitesse de croisière
const VITESSE_TURBO = 46;    // vitesse avec le turbo
const PAS_FANTOME = 0.1;     // le fantôme enregistre une position tous les 0,1 s

function lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch { /* stockage indisponible */ } }
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function aleatoire(seed) {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formaterTemps(s) {
  if (s == null || !isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
}

// ---------- Le vaisseau (le nez pointe vers -Z) ----------
function creerVaisseau(halo, fantome = false) {
  const racine = new THREE.Group();
  const modele = new THREE.Group();
  racine.add(modele);
  const mat = (options) => (fantome
    ? new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
    : new THREE.MeshStandardMaterial(options));
  const coque = mat({ color: 0xe6ebf7, metalness: 0.55, roughness: 0.3 });
  const accent = mat({ color: 0x7c5cff, metalness: 0.4, roughness: 0.4, emissive: 0x3b1fd1, emissiveIntensity: 0.7 });
  const vitre = mat({ color: 0x66e0ff, metalness: 0.2, roughness: 0.1, emissive: 0x1aa7ff, emissiveIntensity: 0.8 });
  const sombre = mat({ color: 0x2a3142, metalness: 0.6, roughness: 0.5 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.42, 2.6, 14), coque);
  fuselage.rotation.x = -Math.PI / 2;
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), vitre);
  cockpit.scale.set(1, 0.75, 2);
  cockpit.position.set(0, 0.24, -0.15);
  modele.add(fuselage, cockpit);

  const tuyeres = [];
  const lueurs = [];
  for (const s of [-1, 1]) {
    const aile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.75), coque);
    aile.position.set(s * 0.85, -0.05, 0.55);
    aile.rotation.y = -s * 0.38;
    const bande = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.16), accent);
    bande.position.set(s * 0.8, -0.03, 0.42);
    bande.rotation.y = -s * 0.38;
    const derive = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.55), accent);
    derive.position.set(s * 1.5, 0.15, 0.85);
    const reacteur = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.8, 14), sombre);
    reacteur.rotation.x = -Math.PI / 2;
    reacteur.position.set(s * 0.38, -0.02, 1.15);
    modele.add(aile, bande, derive, reacteur);

    const tuyere = new THREE.Vector3(s * 0.38, -0.02, 1.58);
    tuyeres.push(tuyere);
    if (!fantome) {
      const disque = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0x66e0ff).multiplyScalar(2) }),
      );
      disque.position.copy(tuyere);
      const lueur = new THREE.Sprite(new THREE.SpriteMaterial({
        map: halo, color: 0x5cc8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      lueur.position.copy(tuyere).z += 0.2;
      lueur.scale.setScalar(1.2);
      modele.add(disque, lueur);
      lueurs.push(lueur);
    }
  }
  return { racine, modele, tuyeres, lueurs };
}

// Un rocher : une sphère facettée, cabossée au hasard
function rocher() {
  const g = new THREE.DodecahedronGeometry(1, 1);
  const pos = g.attributes.position, v = new THREE.Vector3(), bosses = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const cle = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!bosses.has(cle)) bosses.set(cle, 0.72 + Math.random() * 0.5);
    v.multiplyScalar(bosses.get(cle));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Petites étincelles : traînée du réacteur, explosions, feux d'artifice
function creerParticules(scene, halo, n) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  const base = new Float32Array(n * 3), vie = new Float32Array(n), vieMax = new Float32Array(n);
  let suivant = 0;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.35, map: halo, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  return {
    points,
    emettre(p, v, c, duree) {
      const i = suivant;
      suivant = (suivant + 1) % n;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
      base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b;
      vie[i] = vieMax[i] = duree;
    },
    maj(dt) {
      const frein = Math.exp(-dt * 1.5);
      for (let i = 0; i < n; i++) {
        if (vie[i] <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        vie[i] -= dt;
        const k = Math.max(vie[i] / vieMax[i], 0);
        for (let a = 0; a < 3; a++) {
          pos[i * 3 + a] += vel[i * 3 + a] * dt;
          vel[i * 3 + a] *= frein;
          col[i * 3 + a] = base[i * 3 + a] * k;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
    vider() { vie.fill(0); },
  };
}

export function creerCourse({ scene, camera, corps, hyperespace, halo, haute, signature, quandQuitter }) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    temps: $('c-temps'), tour: $('c-tour'), portail: $('c-portail'), record: $('c-record'),
    jauge: $('c-jauge'), jaugeBoite: $('c-turbo'), vitesse: $('c-vitesse'),
    cible: $('cible'), fleche: $('cible-fleche'), cibleDist: $('cible-dist'),
    decompte: $('decompte'), message: $('message'), flash: $('flash'),
    resultat: $('resultat'), rMedaille: $('r-medaille'), rTemps: $('r-temps'), rDetail: $('r-detail'),
    rObjectifs: $('r-objectifs'), rNote: $('r-note'),
    tactile: $('tactile'), joystick: $('joystick'), manette: $('joystick-manette'), btnTurbo: $('btn-turbo'),
  };
  const cleRecord = `galaxie-record-${signature}`;
  const cleFantome = `galaxie-fantome-${signature}`;
  const pilotageAutomatique = new URLSearchParams(location.search).has('auto');
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const couleurTrainee = new THREE.Color(0x4fc3ff).multiplyScalar(1.1);
  const couleurTurbo = new THREE.Color(0xff5cf0).multiplyScalar(1.3);
  const couleurChoc = new THREE.Color(0xffa45c).multiplyScalar(2);
  const couleurOrbe = new THREE.Color(0x5ef2ff).multiplyScalar(2);

  // ---------- Vaisseau, fantôme, particules ----------
  const vaisseau = creerVaisseau(halo);
  vaisseau.racine.visible = false;
  const fantome = creerVaisseau(halo, true);
  fantome.racine.visible = false;
  scene.add(vaisseau.racine, fantome.racine);
  const particules = creerParticules(scene, halo, haute ? 2500 : 1200);

  // ---------- Portails : la ligne de départ + un par planète ----------
  let corpsPortails = corps.filter((c) => c.type === 'planete');
  if (!corpsPortails.length) corpsPortails = corps.filter((c) => c.type === 'libre').slice(0, 3);
  const nbTours = corpsPortails.length <= 4 ? 3 : corpsPortails.length <= 8 ? 2 : 1;
  const rayonMax = Math.max(...corpsPortails.map((c) => c.R)) + 14;

  function creerPortail(teinte, rayon, corpsLie) {
    const couleur = new THREE.Color(teinte);
    const groupe = new THREE.Group();
    const matAnneau = new THREE.MeshBasicMaterial({ color: couleur.clone().multiplyScalar(2.2), transparent: true });
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.22, 12, 72), matAnneau);
    const matDisque = new THREE.MeshBasicMaterial({
      color: couleur, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const disque = new THREE.Mesh(new THREE.CircleGeometry(rayon, 48), matDisque);
    const deco = new THREE.Group();
    const geoDeco = new THREE.OctahedronGeometry(0.38, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const d = new THREE.Mesh(geoDeco, matAnneau);
      d.position.set(Math.cos(a) * (rayon + 0.7), Math.sin(a) * (rayon + 0.7), 0);
      deco.add(d);
    }
    groupe.add(anneau, disque, deco);
    groupe.visible = false;
    scene.add(groupe);
    return { groupe, deco, matAnneau, matDisque, couleur, rayon, corps: corpsLie, centre: new THREE.Vector3(), normale: new THREE.Vector3(), pulse: 0 };
  }
  const portails = [
    creerPortail('#ffd27a', 5.5, null),
    ...corpsPortails.map((c) => creerPortail(c.data?.couleur || '#9fb0ff', 4.5, c)),
  ];

  // Un grand rayon lumineux vertical sur le prochain portail, pour le repérer de loin
  const faisceau = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 140, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  faisceau.visible = false;
  scene.add(faisceau);

  function placerPortails() {
    portails[0].centre.set(0, 9, 15);
    for (const p of portails) {
      if (!p.corps) continue;
      const pos = p.corps.holder.position;
      v1.set(pos.x, 0, pos.z).normalize();
      p.centre.copy(pos).addScaledVector(v1, p.corps.rayon * 2.6 + p.rayon + 1);
    }
    const n = portails.length;
    portails.forEach((p, i) => {
      p.normale.subVectors(portails[(i + 1) % n].centre, portails[(i - 1 + n) % n].centre);
      if (p.normale.lengthSq() < 1e-6) p.normale.set(0, 0, 1);
      p.normale.normalize();
      p.groupe.position.copy(p.centre);
      p.groupe.lookAt(v2.copy(p.centre).add(p.normale));
    });
  }

  // ---------- Astéroïdes ----------
  const nbAsteroides = haute ? 130 : 80;
  const champ = new THREE.InstancedMesh(
    rocher(),
    new THREE.MeshStandardMaterial({ color: 0x9a8f86, roughness: 0.95, flatShading: true }),
    nbAsteroides,
  );
  champ.visible = false;
  champ.frustumCulled = false;
  scene.add(champ);
  const asteroides = Array.from({ length: nbAsteroides }, () => ({
    p: new THREE.Vector3(), r: 1, rot: new THREE.Euler(), spin: new THREE.Vector3(),
  }));
  const objet = new THREE.Object3D();

  function placerAsteroide(a, rnd, eviter) {
    for (let essai = 0; essai < 25; essai++) {
      const ang = rnd() * Math.PI * 2, R = 14 + rnd() * (rayonMax - 14);
      a.p.set(Math.cos(ang) * R, (rnd() - 0.5) * 14, Math.sin(ang) * R);
      if (!eviter.some(([c, d]) => a.p.distanceTo(c) < d)) break;
    }
    a.r = 0.8 + Math.pow(rnd(), 2) * 2.2;
    a.rot.set(rnd() * 6, rnd() * 6, rnd() * 6);
    a.spin.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.8);
  }

  function majAsteroides(dt) {
    asteroides.forEach((a, i) => {
      a.rot.x += a.spin.x * dt; a.rot.y += a.spin.y * dt; a.rot.z += a.spin.z * dt;
      objet.position.copy(a.p);
      objet.rotation.copy(a.rot);
      objet.scale.setScalar(a.r);
      objet.updateMatrix();
      champ.setMatrixAt(i, objet.matrix);
    });
    champ.instanceMatrix.needsUpdate = true;
  }

  // ---------- Orbes d'énergie (rechargent le turbo) ----------
  const geoOrbe = new THREE.IcosahedronGeometry(0.45, 2);
  const matOrbe = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ef2ff).multiplyScalar(2.5) });
  const orbes = Array.from({ length: 60 }, () => {
    const mesh = new THREE.Mesh(geoOrbe, matOrbe);
    const lueur = new THREE.Sprite(new THREE.SpriteMaterial({
      map: halo, color: 0x5ef2ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    lueur.scale.setScalar(3.2);
    mesh.add(lueur);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, actif: false, base: new THREE.Vector3(), phase: Math.random() * 6 };
  });

  function placerOrbes(rnd) {
    orbes.forEach((o) => { o.actif = false; o.mesh.visible = false; });
    let k = 0;
    const n = portails.length;
    for (let i = 0; i < n; i++) {
      for (const t of [0.3, 0.5, 0.7]) {
        if (k >= orbes.length) return;
        const o = orbes[k++];
        o.base.lerpVectors(portails[i].centre, portails[(i + 1) % n].centre, t)
          .add(v1.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(6));
        if (o.base.length() < 11) o.base.setLength(11);
        o.actif = true;
        o.mesh.visible = true;
        o.mesh.position.copy(o.base);
      }
    }
  }

  // ---------- État de la course ----------
  let etat = 'inactif';  // inactif → decompte → course → fini
  let cap = 0, tangage = 0, vitesse = 0, turbo = 1, enTurbo = false;
  let tCourse = 0, penalites = 0, tour = 1, cible = 1, tDecompte = 0, chiffre = 0;
  let secousse = 0, invincible = 0, angleFin = 0, tFeux = 0, prochainFeu = 0;
  let enregistrement = [], prochainEchantillon = 0, fantomeData = null;
  let longueurCircuit = 0, recordActuel = null, dernierTemps = 0, derniereMedaille = '';
  const dir = new THREE.Vector3();

  function chargerFantome() {
    try {
      const d = JSON.parse(lire(cleFantome));
      return Array.isArray(d) && d.length > 1 ? d : null;
    } catch { return null; }
  }

  // Temps à battre pour les médailles, calculés d'après la longueur du circuit
  // (l'or demande de passer presque tout le temps en turbo sans rien toucher)
  const objectifs = () => ({ or: longueurCircuit / 19, argent: longueurCircuit / 15.5, bronze: longueurCircuit / 12 });

  function reinitialiser() {
    // Les planètes repartent toujours de la même position : le circuit est le même à chaque essai
    for (const c of corps) {
      c.angle = c.angleDepart;
      c.holder.position.set(Math.cos(c.angle) * c.R, 0, Math.sin(c.angle) * c.R);
    }
    placerPortails();
    longueurCircuit = 0;
    portails.forEach((p, i) => { longueurCircuit += p.centre.distanceTo(portails[(i + 1) % portails.length].centre); });
    longueurCircuit *= nbTours;

    const depart = portails[0], premier = portails[1] || portails[0];
    v1.subVectors(premier.centre, depart.centre).normalize();
    vaisseau.racine.position.copy(depart.centre).addScaledVector(v1, -8);
    dir.subVectors(premier.centre, vaisseau.racine.position).normalize();
    cap = Math.atan2(-dir.x, -dir.z);
    tangage = Math.asin(clamp(dir.y, -1, 1));
    vaisseau.racine.rotation.set(tangage, cap, 0, 'YXZ');
    vaisseau.modele.rotation.z = 0;

    const rnd = aleatoire(1234);
    const eviter = [[vaisseau.racine.position, 18], ...portails.map((p) => [p.centre, p.rayon + 4])];
    asteroides.forEach((a) => placerAsteroide(a, rnd, eviter));
    placerOrbes(rnd);
    particules.vider();

    vitesse = 0; turbo = 1; enTurbo = false;
    tCourse = 0; penalites = 0; tour = 1; cible = 1 % portails.length;
    tDecompte = 3; chiffre = 4; secousse = 0; invincible = 0; tFeux = 0;
    enregistrement = []; prochainEchantillon = 0;
    fantomeData = chargerFantome();
    recordActuel = Number(lire(cleRecord)) || null;
    etat = 'decompte';
    ui.resultat.classList.add('cache');
    ui.decompte.textContent = '';
  }

  // ---------- Effets à l'écran ----------
  function flash(couleur, force) {
    const el = ui.flash;
    el.style.transition = 'none';
    el.style.background = typeof couleur === 'string' ? couleur : '#' + couleur.getHexString();
    el.style.opacity = force;
    void el.offsetWidth;
    el.style.transition = 'opacity .6s ease';
    el.style.opacity = 0;
  }
  function message(texte, classe = '') {
    const el = ui.message;
    el.className = '';
    void el.offsetWidth;
    el.textContent = texte;
    el.className = `montrer ${classe}`;
  }
  function afficherDecompte(texte, go = false) {
    const el = ui.decompte;
    el.className = '';
    void el.offsetWidth;
    el.textContent = texte;
    el.className = go ? 'montrer go' : 'montrer';
  }
  function explosion(point, couleur, nombre, force, duree) {
    for (let k = 0; k < nombre; k++) {
      particules.emettre(point, v3.randomDirection().multiplyScalar(force * (0.4 + Math.random() * 0.6)), couleur, duree * (0.6 + Math.random() * 0.6));
    }
  }

  // ---------- Commandes : clavier, écran tactile, pilote automatique ----------
  const touches = new Set();
  const tactile = { x: 0, y: 0, turbo: false };
  const TOUCHES_BLOQUEES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  addEventListener('keydown', (e) => {
    if (etat === 'inactif') return;
    if (TOUCHES_BLOQUEES.includes(e.code)) e.preventDefault();
    touches.add(e.code);
    if (e.code === 'KeyR' && !e.repeat) reinitialiser();
    if (e.code === 'Escape') quandQuitter();
  });
  addEventListener('keyup', (e) => {
    if (TOUCHES_BLOQUEES.includes(e.code) && etat !== 'inactif') e.preventDefault();
    touches.delete(e.code);
  });
  addEventListener('blur', () => touches.clear());

  let doigt = null;
  ui.tactile.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#btn-turbo') || doigt) return;
    doigt = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { ui.tactile.setPointerCapture(e.pointerId); } catch { /* le doigt a déjà été levé */ }
    ui.joystick.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    ui.joystick.classList.add('actif');
  });
  ui.tactile.addEventListener('pointermove', (e) => {
    if (!doigt || e.pointerId !== doigt.id) return;
    const dx = clamp((e.clientX - doigt.x) / 55, -1, 1), dy = clamp((e.clientY - doigt.y) / 55, -1, 1);
    tactile.x = dx;
    tactile.y = -dy;
    ui.manette.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
  });
  const lacher = (e) => {
    if (!doigt || e.pointerId !== doigt.id) return;
    doigt = null;
    tactile.x = tactile.y = 0;
    ui.manette.style.transform = '';
    ui.joystick.classList.remove('actif');
  };
  ui.tactile.addEventListener('pointerup', lacher);
  ui.tactile.addEventListener('pointercancel', lacher);
  ui.btnTurbo.addEventListener('pointerdown', (e) => { e.stopPropagation(); tactile.turbo = true; ui.btnTurbo.classList.add('appuye'); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    ui.btnTurbo.addEventListener(ev, () => { tactile.turbo = false; ui.btnTurbo.classList.remove('appuye'); });
  }

  function lireCommandes() {
    if (pilotageAutomatique) {
      v2.subVectors(portails[cible].centre, vaisseau.racine.position);
      const d = v2.length() || 1;
      let dc = Math.atan2(-v2.x, -v2.z) - cap;
      dc = Math.atan2(Math.sin(dc), Math.cos(dc));
      return { x: clamp(-dc * 3, -1, 1), y: clamp((Math.asin(clamp(v2.y / d, -1, 1)) - tangage) * 3, -1, 1), boost: true };
    }
    let x = tactile.x, y = tactile.y;
    if (touches.has('ArrowLeft') || touches.has('KeyA')) x -= 1;
    if (touches.has('ArrowRight') || touches.has('KeyD')) x += 1;
    if (touches.has('ArrowUp') || touches.has('KeyW')) y += 1;
    if (touches.has('ArrowDown') || touches.has('KeyS')) y -= 1;
    const boost = tactile.turbo || touches.has('Space') || touches.has('ShiftLeft') || touches.has('ShiftRight');
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), boost };
  }

  // ---------- Pilotage ----------
  function piloter(x, y, veutTurbo, dt, libre, vitesseImposee = 0) {
    const boost = libre && veutTurbo && turbo > 0.02;
    if (boost && !enTurbo) son.bruitage('turbo');
    enTurbo = boost;
    turbo = clamp(turbo + (boost ? -0.3 : 0.05) * dt, 0, 1);
    const vitesseVoulue = libre ? (boost ? VITESSE_TURBO : VITESSE) : vitesseImposee;
    vitesse += (vitesseVoulue - vitesse) * (1 - Math.exp(-dt * (boost ? 2.5 : 1.6)));
    cap -= x * 1.75 * dt;
    tangage = clamp(tangage + y * 1.3 * dt, -1.1, 1.1);
    dir.set(-Math.sin(cap) * Math.cos(tangage), Math.sin(tangage), -Math.cos(cap) * Math.cos(tangage));

    const r = vaisseau.racine;
    r.position.addScaledVector(dir, vitesse * dt);
    // Les bords de la zone renvoient doucement le vaisseau vers le centre
    if (r.position.length() > rayonMax + 25) rebondir(v1.copy(r.position).negate().normalize());
    if (Math.abs(r.position.y) > 35) rebondir(v1.set(0, -Math.sign(r.position.y), 0));
    r.rotation.set(tangage, cap, 0, 'YXZ');
    const m = vaisseau.modele;
    m.rotation.z += (-x * 0.8 - m.rotation.z) * (1 - Math.exp(-dt * 6));

    son.moteurRegler(vitesse / VITESSE_TURBO, boost);
    const force = 0.5 + (vitesse / VITESSE_TURBO) * 0.5 + (boost ? 0.3 : 0);
    vaisseau.lueurs.forEach((l) => l.scale.setScalar(force));
  }

  // Renvoie le vaisseau comme une balle sur un mur (n = direction du mur vers le vaisseau)
  function rebondir(n) {
    const d = dir.dot(n);
    if (d >= 0) return;
    dir.addScaledVector(n, -2 * d).normalize();
    cap = Math.atan2(-dir.x, -dir.z);
    tangage = clamp(Math.asin(clamp(dir.y, -1, 1)), -1.1, 1.1);
  }

  function choc(point) {
    if (invincible > 0) return;
    invincible = 0.7;
    penalites += 1;
    secousse = 1;
    vitesse *= 0.35;
    message('+1 s', 'rouge');
    flash('#ff4d4d', 0.28);
    son.bruitage('choc');
    explosion(point, couleurChoc, 36, 10, 0.9);
  }

  function collisions(dt) {
    invincible -= dt;
    const pos = vaisseau.racine.position;
    if (pos.length() < 10) {
      const n = v1.copy(pos).normalize().clone();
      pos.copy(n).multiplyScalar(10.05);
      rebondir(n);
      choc(pos.clone());
    }
    for (const c of corps) {
      if (c.type !== 'planete') continue;
      const centre = c.holder.position;
      if (pos.distanceTo(centre) < c.rayon + 1) {
        const n = v1.subVectors(pos, centre).normalize().clone();
        pos.copy(centre).addScaledVector(n, c.rayon + 1.05);
        rebondir(n);
        choc(pos.clone());
      }
    }
    for (const a of asteroides) {
      if (pos.distanceTo(a.p) < a.r * 0.85 + 0.8 && invincible <= 0) {
        choc(a.p.clone());
        placerAsteroide(a, Math.random, [[pos, 40]]);
      }
    }
  }

  function ramasserOrbes() {
    const pos = vaisseau.racine.position;
    for (const o of orbes) {
      if (!o.actif || pos.distanceTo(o.mesh.position) > 2.6) continue;
      o.actif = false;
      o.mesh.visible = false;
      turbo = Math.min(1, turbo + 0.22);
      son.bruitage('orbe');
      explosion(o.mesh.position, couleurOrbe, 16, 6, 0.5);
    }
  }

  function verifierPortail() {
    const p = portails[cible];
    if (vaisseau.racine.position.distanceTo(p.centre) > p.rayon * 1.1) return;
    p.pulse = 1;
    flash(p.couleur, 0.3);
    son.bruitage('portail', (tour - 1) * portails.length + cible);
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      v2.set(Math.cos(a) * p.rayon, Math.sin(a) * p.rayon, 0).applyQuaternion(p.groupe.quaternion).add(p.centre);
      particules.emettre(v2, v3.subVectors(v2, p.centre).normalize().multiplyScalar(7), p.couleur.clone().multiplyScalar(2.2), 0.9);
    }
    if (cible === 0) {
      if (tour >= nbTours) { terminer(); return; }
      tour++;
      message(tour === nbTours ? 'DERNIER TOUR !' : `TOUR ${tour}/${nbTours}`, 'grand');
      placerOrbes(aleatoire(tour * 97));
    } else {
      message(`PORTAIL ${cible}/${portails.length}`);
    }
    cible = (cible + 1) % portails.length;
  }

  function enregistrerFantome() {
    const p = vaisseau.racine.position;
    while (tCourse >= prochainEchantillon) {
      enregistrement.push([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +cap.toFixed(3), +tangage.toFixed(3)]);
      prochainEchantillon += PAS_FANTOME;
    }
  }

  function majFantome() {
    const f = fantome.racine;
    const i = Math.floor(tCourse / PAS_FANTOME);
    if (!fantomeData || (etat !== 'course' && etat !== 'decompte') || i >= fantomeData.length - 1) { f.visible = false; return; }
    const a = fantomeData[i], b = fantomeData[i + 1], k = tCourse / PAS_FANTOME - i;
    f.visible = true;
    f.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
    f.rotation.set(lerp(a[4], b[4], k), lerp(a[3], b[3], k), 0, 'YXZ');
  }

  function terminer() {
    etat = 'fini';
    const temps = tCourse + penalites;
    const ancien = recordActuel;
    const nouveau = ancien === null || temps < ancien;
    if (nouveau) {
      ecrire(cleRecord, String(temps));
      ecrire(cleFantome, JSON.stringify(enregistrement));
      recordActuel = temps;
    }
    const obj = objectifs();
    const medaille = temps <= obj.or ? '🥇' : temps <= obj.argent ? '🥈' : temps <= obj.bronze ? '🥉' : '🚀';
    dernierTemps = temps;
    derniereMedaille = medaille;
    ui.rMedaille.textContent = medaille;
    ui.rTemps.textContent = formaterTemps(temps);
    ui.rDetail.textContent = nouveau
      ? (ancien === null ? 'Premier record enregistré !' : `Nouveau record ! (avant : ${formaterTemps(ancien)})`)
      : `Ton record : ${formaterTemps(ancien)}`;
    ui.rDetail.classList.toggle('record', nouveau);
    ui.rObjectifs.textContent = `🥇 ${formaterTemps(obj.or)}   🥈 ${formaterTemps(obj.argent)}   🥉 ${formaterTemps(obj.bronze)}`;
    ui.rNote.textContent = penalites
      ? `Dont ${penalites} s de pénalité (chocs)`
      : 'Aucun choc, pilotage parfait 👌';
    angleFin = cap;
    tFeux = 2.4;
    prochainFeu = 0;
    message('ARRIVÉE !', 'grand');
    son.bruitage('victoire');
    setTimeout(() => { if (etat === 'fini') ui.resultat.classList.remove('cache'); }, 1500);
  }

  $('r-rejouer').addEventListener('click', () => reinitialiser());
  $('r-explorer').addEventListener('click', () => quandQuitter());
  $('r-partager').addEventListener('click', async () => {
    const texte = `J'ai bouclé La Galaxie en ${formaterTemps(dernierTemps)} ${derniereMedaille} Tu fais mieux ? 👉 ${location.origin}${location.pathname}`;
    try {
      if (navigator.share) { await navigator.share({ text: texte }); return; }
      await navigator.clipboard.writeText(texte);
      ui.rNote.textContent = 'Copié ! Colle-le dans ton groupe 📋';
    } catch (e) {
      if (e?.name !== 'AbortError') ui.rNote.textContent = texte;
    }
  });

  // ---------- Caméra qui suit le vaisseau ----------
  const camCible = new THREE.Vector3(), regard = new THREE.Vector3(), orientation = new THREE.Euler();
  function majCamera(dt) {
    const r = vaisseau.racine;
    if (etat === 'fini') {
      angleFin += dt * 0.35;
      camCible.set(Math.sin(angleFin) * 11, 3.5, Math.cos(angleFin) * 11).add(r.position);
      regard.copy(r.position);
    } else {
      orientation.set(tangage * 0.5, cap, 0, 'YXZ');
      // Sur un écran en hauteur (téléphone), on recule un peu pour voir autour du vaisseau
      const recul = camera.aspect < 1 ? 1.45 : 1;
      camCible.set(0, 2.3 * recul, 7.5 * recul).applyEuler(orientation).add(r.position);
      regard.copy(dir).multiplyScalar(12).add(r.position);
      regard.y += 0.8;
    }
    camera.position.lerp(camCible, 1 - Math.exp(-dt * (etat === 'decompte' ? 2.5 : 7)));
    secousse *= Math.exp(-dt * 4);
    const s = secousse * 0.5 + (enTurbo ? 0.05 : 0);
    if (s > 0.001) camera.position.add(v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(s));
    camera.lookAt(regard);
    const fov = etat === 'fini' ? 55 : enTurbo ? 88 : 66 + (vitesse / VITESSE) * 2;
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3));
    camera.updateProjectionMatrix();

    // Traits d'hyperespace quand le turbo est allumé
    const lignes = hyperespace.lignes;
    lignes.visible = true;
    lignes.material.opacity += ((enTurbo ? 0.55 : 0) - lignes.material.opacity) * (1 - Math.exp(-dt * 5));
    hyperespace.maj(dt, 300 + vitesse * 40);
  }

  function majTrainee() {
    if (vitesse < 1) return;
    vaisseau.racine.updateMatrixWorld(true);
    const nb = enTurbo ? 2 : 1;
    for (const t of vaisseau.tuyeres) {
      v2.copy(t);
      vaisseau.modele.localToWorld(v2);
      // Les étincelles suivent presque le vaisseau : elles restent derrière lui sans foncer dans la caméra
      for (let k = 0; k < nb; k++) {
        v1.copy(dir).multiplyScalar(vitesse * 0.75).add(v3.randomDirection().multiplyScalar(0.5));
        particules.emettre(v2, v1, enTurbo ? couleurTurbo : couleurTrainee, 0.12 + Math.random() * 0.14);
      }
    }
  }

  function majPortails(dt, t) {
    portails.forEach((p, i) => {
      const actif = i === cible && etat !== 'fini';
      p.pulse = Math.max(0, p.pulse - dt * 2);
      p.groupe.scale.setScalar(1 + p.pulse * 0.6 + (actif ? Math.sin(t * 5) * 0.04 : 0));
      p.matAnneau.opacity = actif ? 1 : 0.22;
      p.matDisque.opacity = actif ? 0.1 + Math.sin(t * 3) * 0.04 : 0.02;
      p.deco.rotation.z += dt * (actif ? 1.2 : 0.3);
    });
    faisceau.visible = etat !== 'fini';
    faisceau.position.copy(portails[cible].centre);
    faisceau.material.color.copy(portails[cible].couleur);
  }

  function majHud() {
    ui.temps.textContent = formaterTemps(tCourse + penalites);
    ui.tour.textContent = `TOUR ${Math.min(tour, nbTours)}/${nbTours}`;
    ui.portail.textContent = `PORTAIL ${cible === 0 ? portails.length : cible}/${portails.length}`;
    ui.record.textContent = `RECORD ${formaterTemps(recordActuel)}`;
    ui.jauge.style.width = `${turbo * 100}%`;
    ui.jaugeBoite.classList.toggle('actif', enTurbo);
    ui.vitesse.textContent = `${Math.round(vitesse * 1000).toLocaleString('fr-FR')} km/s`;
  }

  // Flèche sur le bord de l'écran qui montre où est le prochain portail
  function majCibleEcran() {
    if (etat !== 'course' && etat !== 'decompte') { ui.cible.classList.add('cache'); return; }
    ui.cible.classList.remove('cache');
    const p = portails[cible];
    v1.copy(p.centre).project(camera);
    let x = v1.x, y = v1.y;
    const derriere = v1.z > 1;
    if (derriere) { x = -x; y = -y; if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) y = -1; }
    const dedans = !derriere && Math.abs(x) < 0.92 && Math.abs(y) < 0.86;
    if (!dedans) { const m = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8); x /= m; y /= m; }
    ui.cible.style.transform = `translate(${((x + 1) / 2) * innerWidth}px, ${((1 - y) / 2) * innerHeight}px)`;
    ui.cible.classList.toggle('bord', !dedans);
    ui.fleche.style.transform = `rotate(${Math.PI / 2 - Math.atan2(y, x)}rad)`;
    ui.cible.style.setProperty('--teinte', '#' + p.couleur.getHexString());
    ui.cibleDist.textContent = `${Math.round(vaisseau.racine.position.distanceTo(p.centre) * 1000).toLocaleString('fr-FR')} km`;
  }

  // ---------- Boucle (appelée à chaque image par main.js) ----------
  function maj(dt) {
    if (etat === 'inactif') return;
    const t = performance.now() / 1000;
    placerPortails();
    majAsteroides(dt);
    for (const o of orbes) {
      if (!o.actif) continue;
      o.mesh.position.y = o.base.y + Math.sin(t * 2 + o.phase) * 0.4;
      o.mesh.rotation.y += dt * 2;
    }
    majPortails(dt, t);

    const { x, y, boost } = lireCommandes();
    if (etat === 'decompte') {
      tDecompte -= dt;
      const n = Math.ceil(tDecompte);
      if (n !== chiffre && n > 0) { chiffre = n; afficherDecompte(String(n)); son.bruitage('bip'); }
      if (tDecompte <= 0) { etat = 'course'; afficherDecompte('GO !', true); son.bruitage('go'); }
      piloter(0, 0, false, dt, false, 0);
    } else if (etat === 'course') {
      tCourse += dt;
      piloter(x, y, boost, dt, true);
      collisions(dt);
      ramasserOrbes();
      verifierPortail();
      if (etat === 'course') enregistrerFantome();
    } else if (etat === 'fini') {
      piloter(0, 0, false, dt, false, 10);
      tFeux -= dt;
      prochainFeu -= dt;
      if (tFeux > 0 && prochainFeu <= 0) {
        prochainFeu = 0.22;
        const couleur = portails[Math.floor(Math.random() * portails.length)].couleur.clone().multiplyScalar(2.4);
        v2.randomDirection().multiplyScalar(5 + Math.random() * 4).add(vaisseau.racine.position);
        explosion(v2.clone(), couleur, 60, 9, 1.3);
      }
    }
    particules.maj(dt);
    majTrainee();
    majFantome();
    majCamera(dt);
    majHud();
    majCibleEcran();
  }

  function demarrer() {
    document.activeElement?.blur?.();
    vaisseau.racine.visible = champ.visible = particules.points.visible = true;
    portails.forEach((p) => { p.groupe.visible = true; });
    camera.clearViewOffset();
    son.moteurDemarrer();
    reinitialiser();
  }

  function arreter() {
    etat = 'inactif';
    vaisseau.racine.visible = fantome.racine.visible = champ.visible = particules.points.visible = faisceau.visible = false;
    portails.forEach((p) => { p.groupe.visible = false; });
    orbes.forEach((o) => { o.actif = false; o.mesh.visible = false; });
    hyperespace.lignes.visible = false;
    ui.resultat.classList.add('cache');
    ui.cible.classList.add('cache');
    son.moteurArreter();
    camera.fov = 55;
    camera.updateProjectionMatrix();
    touches.clear();
  }

  return { demarrer, arreter, maj };
}
