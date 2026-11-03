// =====================================================================
//  LES VRAIES PLANÈTES DU SYSTÈME SOLAIRE
//  Les tailles et les distances sont "compressées" pour tenir à l'écran
//  (en vrai, Neptune est 30 fois plus loin du Soleil que la Terre).
//  Les infos des fiches, elles, sont les vraies.
// =====================================================================

export const systemeSolaire = [
  {
    nom: 'Mercure', type: 'rocheuse', couleur: '#a8a29e', couleur2: '#57534e',
    taille: 0.8, R: 20, lunes: 0,
    description: 'La plus petite planète et la plus proche du Soleil. Pas d\'atmosphère pour garder la chaleur : brûlante le jour, glaciale la nuit.',
    infos: {
      diametre: '4 879 km', distance: '58 millions de km', annee: '88 jours', temperature: 'de −173 °C à 427 °C',
      anecdote: 'Une journée sur Mercure (d\'un lever de Soleil au suivant) dure 176 jours terrestres : c\'est plus long que son année !',
    },
  },
  {
    nom: 'Vénus', type: 'gazeuse', couleur: '#f0d9a0', couleur2: '#cfa560', douceur: 0.75,
    taille: 1.3, R: 28, lunes: 0,
    description: 'Couverte d\'épais nuages toxiques, c\'est la planète la plus chaude du système solaire, encore plus que Mercure.',
    infos: {
      diametre: '12 104 km', distance: '108 millions de km', annee: '225 jours', temperature: '464 °C en moyenne',
      anecdote: 'Vénus tourne à l\'envers par rapport aux autres planètes : là-bas, le Soleil se lève à l\'ouest.',
    },
  },
  {
    nom: 'Terre', type: 'oceanique', couleur: '#1d4fc4', couleur2: '#3f8a3a',
    taille: 1.4, R: 37, lunes: 1,
    description: 'Notre planète. Pour l\'instant, la seule où l\'on sait que la vie existe.',
    infos: {
      diametre: '12 742 km', distance: '150 millions de km', annee: '365 jours', temperature: '15 °C en moyenne',
      anecdote: 'Environ 71 % de la surface de la Terre est recouverte d\'eau.',
    },
  },
  {
    nom: 'Mars', type: 'rocheuse', couleur: '#d1531f', couleur2: '#7a2c10',
    taille: 1.0, R: 46, lunes: 2,
    description: 'La planète rouge doit sa couleur à la rouille (de l\'oxyde de fer) qui recouvre son sol.',
    infos: {
      diametre: '6 779 km', distance: '228 millions de km', annee: '687 jours', temperature: '−65 °C en moyenne',
      anecdote: 'Mars abrite Olympus Mons, le plus grand volcan du système solaire : environ 22 km de haut, presque 3 fois l\'Everest.',
    },
  },
  {
    nom: 'Jupiter', type: 'gazeuse', couleur: '#e3c9a4', couleur2: '#a65e33',
    taille: 4.2, R: 68, lunes: 4,
    description: 'La géante du système solaire : on pourrait y faire rentrer plus de 1 300 Terres.',
    infos: {
      diametre: '139 820 km', distance: '778 millions de km', annee: '12 ans', temperature: '−110 °C en moyenne',
      anecdote: 'Sa Grande Tache rouge est une tempête plus grande que la Terre, observée depuis plus de 150 ans.',
    },
  },
  {
    nom: 'Saturne', type: 'gazeuse', couleur: '#ead9a6', couleur2: '#b8975a', douceur: 0.35,
    taille: 3.6, R: 88, lunes: 3, anneaux: true,
    description: 'Célèbre pour ses anneaux, faits de milliards de morceaux de glace et de roche.',
    infos: {
      diametre: '116 460 km', distance: '1,4 milliard de km', annee: '29 ans', temperature: '−140 °C en moyenne',
      anecdote: 'Saturne est moins dense que l\'eau : dans une baignoire assez grande, elle flotterait !',
    },
  },
  {
    nom: 'Uranus', type: 'gazeuse', couleur: '#a8e6ec', couleur2: '#7fcfd9', douceur: 0.85,
    taille: 2.4, R: 104, lunes: 2,
    description: 'Une géante de glace bleu-vert, tellement penchée qu\'elle tourne couchée sur le côté.',
    infos: {
      diametre: '50 724 km', distance: '2,9 milliards de km', annee: '84 ans', temperature: '−195 °C en moyenne',
      anecdote: 'À cause de son inclinaison, chaque pôle d\'Uranus reste 42 ans au soleil, puis 42 ans dans le noir.',
    },
  },
  {
    nom: 'Neptune', type: 'gazeuse', couleur: '#4a6cf0', couleur2: '#2a3db8', douceur: 0.5,
    taille: 2.3, R: 118, lunes: 1,
    description: 'La planète la plus lointaine, balayée par les vents les plus violents du système solaire.',
    infos: {
      diametre: '49 244 km', distance: '4,5 milliards de km', annee: '165 ans', temperature: '−200 °C en moyenne',
      anecdote: 'Neptune a été découverte en 1846 grâce à des calculs mathématiques, avant même d\'avoir été vue au télescope.',
    },
  },
].map((p) => ({ ...p, reelle: true, auteur: 'Système solaire' }));
