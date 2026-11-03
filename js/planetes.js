// =====================================================================
//  🪐  LES PLANÈTES DE LA GALAXIE
// ---------------------------------------------------------------------
//  C'est LE fichier à modifier pour ajouter ta planète.
//  Chaque planète ajoute aussi un portail au circuit de la course !
//  1. Copie le bloc "MODÈLE" tout en bas (entre les accolades { ... })
//  2. Colle-le à la fin de la liste, juste avant le ];
//  3. Change les valeurs (nom, auteur, couleurs...)
//  4. Propose ta modification (pull request) — voir le README
//
//  Types possibles : "rocheuse", "gazeuse", "glace", "lave", "oceanique"
//  Couleurs : n'importe quelle couleur CSS, ex. "#ff3366"
//  Taille : entre 0.6 (petite) et 2.5 (géante)
// =====================================================================

// Adresse du projet sur GitHub (affichée dans le site)
export const depot = "https://github.com/hdeligondes8/la-galaxie";

export const planetes = [
  {
    nom: "Origine",
    auteur: "Hugo",
    description:
      "La toute première planète. C'est d'ici qu'est partie la galaxie. Chaque orbite libre attend quelqu'un : la prochaine planète, c'est peut-être la tienne.",
    type: "oceanique",
    couleur: "#1e6bff",
    couleur2: "#34d399",
    taille: 1.6,
    anneaux: true,
    lunes: 2,
    lien: "",
  },
  {
    nom: "ECOTRA",
    auteur: "Hugo",
    description:
      "La planète de la logistique. Ici, chaque colis trouve sa route, et les anneaux sont des autoroutes de livraison qui ne dorment jamais.",
    type: "gazeuse",
    couleur: "#10b981",
    couleur2: "#0e3b5c",
    taille: 2.1,
    anneaux: true,
    lunes: 3,
    lien: "",
  },
  {
    nom: "Pulse Care",
    auteur: "Hugo",
    description:
      "Une planète de glace, fraîche et éclatante, avec des veines couleur bambou. Ici, tout brille, surtout les sourires.",
    type: "glace",
    couleur: "#ff7f6e",
    couleur2: "#7a9a3a",
    taille: 1.3,
    anneaux: false,
    lunes: 1,
    lien: "",
  },

  // ---------- MODÈLE (copie-moi !) ----------
  // {
  //   nom: "Nom de ta planète",
  //   auteur: "Ton prénom",
  //   description: "Une phrase sur toi ou sur ta planète.",
  //   type: "gazeuse",
  //   couleur: "#ff7a18",
  //   couleur2: "#7c3aed",
  //   taille: 1.2,
  //   anneaux: false,
  //   lunes: 1,
  //   lien: "https://lien-vers-ton-projet.com",
  // },
];
