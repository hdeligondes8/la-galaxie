# 🌌 La Galaxie

**Une galaxie en 3D construite à plusieurs.** Au centre, un soleil. Autour, des orbites.
Chaque planète a été ajoutée par une personne différente — et il reste des orbites libres.

👉 **Voir le site : https://hdeligondes8.github.io/la-galaxie/**

Le projet est **open source** : tout le monde peut voir le code, le copier et l'améliorer.
Le but, c'est que la galaxie grandisse avec chaque personne qui passe.

---

## 🪐 Ajouter ta planète (5 minutes, sans rien installer)

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

- ☄️ Des comètes qui traversent l'écran de temps en temps
- 🛸 Un vaisseau qu'on pilote au clavier entre les planètes
- 🌗 Un nouveau type de planète (désert, cristal, toxique…)
- 🔭 Un mode "visite guidée" qui passe automatiquement d'une planète à l'autre
- 🎶 Une musique différente quand on s'approche de chaque planète
- 📱 Améliorer l'affichage sur téléphone

Fais tes changements sur ton fork, puis ouvre une pull request en expliquant ce que tu as ajouté.

---

## 🗂️ Comment est rangé le projet

```
index.html        → la page (structure)
style.css         → l'apparence des boutons, textes et panneaux
js/planetes.js    → LA LISTE DES PLANÈTES (c'est ici qu'on ajoute la sienne)
js/main.js        → le moteur 3D (soleil, orbites, caméra, sons…)
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
