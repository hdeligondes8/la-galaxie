// =====================================================================
//  LA GALAXIE — les sons
//  Tout est fabriqué par le code, il n'y a aucun fichier audio.
// =====================================================================

function lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch { /* navigation privée */ } }

let audio = null;
let actif = lire('son') !== 'non';
let moteur = null;

export const sonActif = () => actif;

export function demarrerSon() {
  if (audio || !actif) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const maitre = ctx.createGain();
  maitre.gain.value = 0.13;
  maitre.connect(ctx.destination);

  // Nappe d'ambiance : quelques notes graves filtrées qui respirent lentement
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
  audio = { ctx, maitre, nappe };
}

export function basculerSon() {
  actif = !actif;
  ecrire('son', actif ? 'oui' : 'non');
  if (actif) demarrerSon();
  if (audio) { if (actif) audio.ctx.resume(); else audio.ctx.suspend(); }
  return actif;
}

function ton(freq, duree, { type = 'sine', volume = 0.4, glisse = null, delai = 0 } = {}) {
  const { ctx, maitre } = audio;
  const t = ctx.currentTime + delai;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, t + duree);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g); g.connect(maitre);
  o.start(t); o.stop(t + duree + 0.05);
}

// Bruit blanc filtré : souffles, explosions, réacteurs
function souffle(duree, { de = 200, a = 2000, retour = null, volume = 1, type = 'bandpass', attaque = 0.05 } = {}) {
  const { ctx, maitre } = audio;
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(de, t);
  if (retour) {
    f.frequency.exponentialRampToValueAtTime(a, t + duree * 0.45);
    f.frequency.exponentialRampToValueAtTime(retour, t + duree);
  } else {
    f.frequency.exponentialRampToValueAtTime(a, t + duree);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(f); f.connect(g); g.connect(maitre);
  src.start(t); src.stop(t + duree);
}

const note = (demiTons) => 523.25 * Math.pow(2, demiTons / 12);
const GAMME = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function bruitage(type, n = 0) {
  if (!audio || !actif) return;
  switch (type) {
    case 'hyperespace': souffle(4, { de: 180, a: 2400, retour: 120, volume: 2.2, attaque: 1.2 }); break;
    case 'ping': ton(880, 1.4, { volume: 0.5 }); ton(1320, 1.4, { volume: 0.25 }); break;
    case 'bip': ton(440, 0.25, { type: 'square', volume: 0.18 }); break;
    case 'go': ton(880, 0.7, { type: 'square', volume: 0.2 }); ton(1320, 0.7, { volume: 0.35 }); break;
    case 'portail': {
      const f = note(GAMME[n % GAMME.length]);
      ton(f, 0.9, { volume: 0.45 });
      ton(f * 1.5, 0.9, { volume: 0.22, delai: 0.06 });
      souffle(0.5, { de: 3000, a: 600, volume: 0.6, type: 'highpass' });
      break;
    }
    case 'orbe': ton(1200, 0.25, { volume: 0.25, glisse: 2200 }); break;
    case 'choc':
      souffle(0.55, { de: 500, a: 60, volume: 3, type: 'lowpass', attaque: 0.01 });
      ton(90, 0.4, { type: 'sawtooth', volume: 0.3, glisse: 40 });
      break;
    case 'turbo': souffle(1, { de: 300, a: 3200, volume: 1.4, attaque: 0.1 }); break;
    case 'victoire':
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => ton(note(s), 1.4, { volume: 0.32, delai: i * 0.11 }));
      break;
  }
}

// Le moteur du vaisseau : un grondement qui monte dans les aigus avec la vitesse
export function moteurDemarrer() {
  if (!audio || moteur) return;
  const { ctx, maitre } = audio;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'square';
  o1.frequency.value = 45; o2.frequency.value = 46.5;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 250;
  const g = ctx.createGain();
  g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(maitre);
  o1.start(); o2.start();
  g.gain.setTargetAtTime(0.28, ctx.currentTime, 0.3);
  moteur = { o1, o2, f, g };
}

export function moteurRegler(vitesseRelative, turbo) {
  if (!moteur) return;
  const t = audio.ctx.currentTime;
  moteur.o1.frequency.setTargetAtTime(45 + vitesseRelative * 70, t, 0.1);
  moteur.o2.frequency.setTargetAtTime(46.5 + vitesseRelative * 73, t, 0.1);
  moteur.f.frequency.setTargetAtTime(220 + vitesseRelative * 900 + (turbo ? 700 : 0), t, 0.1);
}

export function moteurArreter() {
  if (!moteur) return;
  const m = moteur;
  moteur = null;
  m.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.15);
  setTimeout(() => { m.o1.stop(); m.o2.stop(); }, 900);
}
