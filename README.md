# 🌌 La Galaxie

**Une course spatiale en 3D, du Soleil jusqu'aux planètes de la classe.**
Le circuit traverse les 8 vraies planètes du système solaire, puis les planètes ajoutées par
chaque personne qui contribue au projet. Chaque nouvelle planète = un nouveau portail.

👉 **Jouer : https://hdeligondes8.github.io/la-galaxie/**

Le projet est **open source** : tout le monde peut voir le code, le copier et l'améliorer.

---

## 🏁 Le jeu

Choisis ton pilote (vaisseau, scooter spatial, soucoupe, fusée rétro, canard géant ou baleine cosmique),
saute en hyperespace jusqu'à la ligne de départ, puis traverse **une fois** le portail de chaque planète,
dans l'ordre : Mercure, Vénus, la Terre… Neptune, puis les planètes de la classe.
L'anneau qui brille indique le prochain portail. Le dernier portail (bordé d'or) est l'arrivée.

| | Ordinateur | Téléphone |
|---|---|---|
| Diriger | Flèches ou ZQSD (WASD) | Glisser le doigt |
| Turbo | Espace | Bouton TURBO |
| Recommencer | R | Bouton « Rejouer » |
| Quitter la course | Échap | Bouton « Explorer » |

- ⚡ **Orbes bleus** : ils rechargent le turbo.
- ☄️ **Astéroïdes, planètes, soleil** : chaque choc coûte **1 seconde**.
- 👻 **Fantôme** : ta meilleure course est rejouée en transparent à côté de toi.
- 🥇🥈🥉 **Médailles** : les temps à battre dépendent de la longueur du circuit.
- 🔭 **Mode Explorer** : pour se balader dans la galaxie. Les vraies planètes ont une fiche avec
  leurs vraies infos (taille, distance au Soleil, durée d'une année, température, anecdote).
- 🤖 **Mode démo** : ajoute `?auto` à la fin de l'adresse et la course se pilote toute seule.

Les planètes repartent toujours de la même position au départ : tout le monde court sur le même circuit
et peut comparer ses temps (bouton « Partager mon temps »).

---

## 🪐 Ajouter ta planète (5 minutes, sans rien installer)

Ta planète apparaît dans la galaxie **et** devient un nouveau portail de la course.

1. En haut de cette page, clique sur **Fork**. Ça crée ta propre copie du projet.
2. Dans ta copie, ouvre le fichier [`js/planetes.js`](js/planetes.js) et clique sur le crayon ✏️ pour le modifier.
3. Copie le bloc **MODÈLE** (tout en bas), colle-le à la fin de la liste (juste avant `];`) et enlève les `//` devant chaque ligne.
4. Change les valeurs :

| Champ | Ce que c'est | Exemple |
|---|---|---|
| `nom` | Le nom de ta planète | `"Nébula-9"` |
| `auteur` | Ton prénom ou pseudo | `"Sarah"` |
| `description` | Une phrase sur toi ou ta planète | `"Planète des gens qui codent la nuit."` |
| `type` | `"rocheuse"`, `"gazeuse"`, `"glace"`, `"lave"` ou `"oceanique"` | `"lave"` |
| `couleur` | Couleur principale | `"#ff3366"` |
| `couleur2` | Couleur secondaire | `"#7c3aed"` |
| `taille` | De `0.6` (petite) à `2.5` (géante) | `1.4` |
| `anneaux` | `true` pour des anneaux, sinon `false` | `true` |
| `lunes` | Nombre de lunes, de `0` à `4` | `2` |
| `lien` | Un lien vers ton site ou ton projet (optionnel) | `"https://..."` |

5. Clique sur **Commit changes** pour enregistrer.
6. Reviens sur la page de ta copie et clique sur **Contribute → Open pull request**.
   C'est une "demande de fusion" : le propriétaire du projet la valide, et ta planète apparaît pour tout le monde.

> ⚠️ N'oublie pas la **virgule** après l'accolade `}` du bloc d'avant. C'est l'erreur n°1.

**Avec Claude Code ou Codex**, encore plus simple : récupère le projet et demande
_« ajoute ma planète dans js/planetes.js : nom X, type lave, couleurs rouge et violet »_.

---

## 🚀 Aller plus loin : améliorer la galaxie

Tu peux aussi modifier le site lui-même. Quelques idées si tu ne sais pas par où commencer :

- 🛸 Créer un nouveau personnage dans `js/personnages.js` (une moto, un dragon, un chat astronaute…)
- ☄️ Des comètes qui traversent le circuit pendant la course
- 💥 Un bonus "bouclier" qui protège d'un choc
- 🌗 Un nouveau type de planète (désert, cristal, toxique…)
- 🎶 Une musique qui accélère pendant le dernier tour
- 📱 Améliorer les commandes sur téléphone

Fais tes changements sur ton fork, puis ouvre une pull request en expliquant ce que tu as ajouté.

---

## 🗂️ Comment est rangé le projet

```
index.html        → la page (structure)
style.css         → l'apparence des boutons, textes et panneaux
js/planetes.js    → LA LISTE DES PLANÈTES (c'est ici qu'on ajoute la sienne)
js/systeme-solaire.js → les 8 vraies planètes et leurs infos
js/personnages.js → les 6 personnages de la course
js/main.js        → la galaxie en 3D (soleil, planètes, mode Explorer, choix du pilote)
js/course.js      → le jeu (portails, astéroïdes, chrono, fantôme, hyperespace)
js/son.js         → la musique et les bruitages
```

La 3D est faite avec [Three.js](https://threejs.org). Il n'y a **aucune image** et **aucun fichier son** :
les surfaces des planètes et la musique sont générées par le code, en direct.

### Lancer le site sur ton ordinateur

Le site a besoin d'un petit serveur local (ouvrir `index.html` en double-cliquant ne marche pas). Dans un terminal, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000 dans ton navigateur.

---

## 📜 Règles

- Une planète par personne (mais tu peux améliorer tout le reste autant que tu veux).
- Rien d'offensant dans les noms et descriptions.
- Sois sympa dans les pull requests : on construit ça ensemble.

Licence [MIT](LICENSE) : libre de copier, modifier et partager.
