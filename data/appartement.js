// Description de l'appartement D62 (T3, 6e étage) — séparée du code de rendu.
// Unités : centimètres. Repère du plan : x vers la droite, y vers le bas,
// origine = angle intérieur haut-gauche de la chambre 1 (côté fenêtres).
// Rectangles : [x0, y0, x1, y1].
//
// Fiabilité des cotes :
//   LU      = lu sur le plan (370×279, 370×255, 370×183, 464×451, 411×200, HSP 250)
//   DÉDUIT  = mesuré à l'échelle sur la photo du plan, à ±5 cm près (voire ±10 côté séjour)
//   SUPPOSÉ = absent du plan, valeur courante en attendant une mesure réelle

const BOIS_CLAIR = '#d8bf98';

// Table : plateau + quatre pieds.
function table(nom, x, y, l, p, h, couleur) {
  const pied = (px, py) => ({ nom: `${nom} — pied`, x: px, y: py, l: 5, p: 5, h: h - 4, couleur });
  return [
    { nom, x, y, l, p, bas: h - 4, h: 4, couleur },
    pied(x + 4, y + 4), pied(x + l - 9, y + 4), pied(x + 4, y + p - 9), pied(x + l - 9, y + p - 9),
  ];
}

// Table basse à plateau épais sur deux pieds-panneaux, reliés par une traverse (grand côté le long de y).
function tableTokyo(essai, x, y, l, p, h, couleur) {
  const EP = 4, RETRAIT = 14, n = (suffixe) => `${essai} — ${suffixe}`;
  const piece = (suffixe, o) => ({ essai, nom: n(suffixe), couleur, ...o });
  return [
    piece('plateau', { x, y, l, p, bas: h - EP, h: EP, arrondi: 0.4 }),
    piece('pied', { x: x + 3, y: y + RETRAIT, l: l - 6, p: EP, bas: 0, h: h - EP }),
    piece('pied', { x: x + 3, y: y + p - RETRAIT - EP, l: l - 6, p: EP, bas: 0, h: h - EP }),
    piece('traverse', { x: x + l / 2 - 2, y: y + RETRAIT + EP, l: 4, p: p - 2 * RETRAIT - 2 * EP, bas: h - EP - 7, h: 7 }),
  ];
}

// Chaise scandinave : coque monobloc noire mate, quatre pieds en bois clair évasés reliés par une croix.
// (x, y) = coin haut-gauche d'une emprise de 45 × 45 ; « dos » = côté du dossier (nord, sud, est, ouest).
// Largeur 46, profondeur 52, hauteur 82, assise à 44 : ESTIMÉ d'après les photos.
function chaise(nom, x, y, dos) {
  return [{ type: 'chaiseCoque', nom, cx: x + 22.5, cy: y + 22.5, dos, couleur: '#242427', pieds: '#d9b77e' }];
}

// Habillage en tasseaux verticaux sur un mur dont la face est à x = mur, centré sur y = centre.
// « sens » : -1 si la pièce est du côté des x décroissants (mur de droite), +1 dans le cas inverse.
// Les tasseaux sont répartis symétriquement dans la longueur, avec « ecart » de vide entre deux.
function tasseaux({ essai, mur, sens = -1, centre, longueur, largeur, epaisseur, ecart, bas, haut, bois, fond }) {
  const y0 = centre - longueur / 2, pas = largeur + ecart, F = 0.6;
  const nombre = Math.floor((longueur - largeur) / pas) + 1;
  const debut = y0 + (longueur - ((nombre - 1) * pas + largeur)) / 2;
  const pieces = [{ essai, nom: 'Tasseaux — fond', x: sens < 0 ? mur - F : mur, y: y0, l: F, p: longueur, bas, h: haut - bas, couleur: fond }];
  for (let i = 0; i < nombre; i++) {
    pieces.push({ essai, nom: 'Tasseaux — tasseau', x: sens < 0 ? mur - F - epaisseur : mur + F, y: debut + i * pas,
      l: epaisseur, p: largeur, bas, h: haut - bas, couleur: bois });
  }
  return pieces;
}

// Écran d'ordinateur sur pied : (x, y) = coin du pied, « angle » en degrés. 61 cm de large : ESTIMÉ.
function ecran(nom, x, y, angle, plateau = 73, options = {}) {
  const noir = '#111113';
  return [
    { nom: `${nom} — pied`, x, y: y + 20, l: 18, p: 22, bas: plateau, h: 1.5, couleur: noir },
    { nom: `${nom} — colonne`, x: x + 10, y: y + 29, l: 4, p: 4, bas: plateau, h: 16, couleur: noir },
    { nom: `${nom} — dalle`, x: x + 5, y, l: 4, p: 61, bas: plateau + 13, h: 36, rotation: angle, arrondi: 0.6, couleur: noir },
    { nom: `${nom} — image`, x: x + 4.6, y: y + 1.5, l: 0.6, p: 58, bas: plateau + 15, h: 32.5, rotation: angle, couleur: '#050506', rugosite: 0.15 },
  ].map((piece) => ({ ...piece, ...options }));
}

// Canapé d'angle en velours anthracite, modélisé d'après les photos : socle sur pieds métal fins,
// accoudoirs bas et carrés, coussins d'assise et de dossier, méridienne côté mur du fond.
// Dossier le long de x = 790 (côté hall), méridienne vers le bas du plan. Dimensions ESTIMÉES.
function canape() {
  const tissu = '#2e2e31', coussin = '#37373b', metal = '#18181a';
  const n = (suffixe) => `Canapé — ${suffixe}`;
  const pied = (x, y) => ({ nom: n('pied'), x, y, l: 3, p: 3, h: 14, couleur: metal });
  return [
    pied(793, 348), pied(879, 348), pied(793, 579), pied(944, 579), pied(944, 493), pied(879, 470),
    { nom: n('socle'), x: 790, y: 345, l: 95, p: 240, bas: 14, h: 16, arrondi: 3, couleur: tissu },
    { nom: n('socle méridienne'), x: 880, y: 490, l: 70, p: 95, bas: 14, h: 16, arrondi: 3, couleur: tissu },
    { nom: n('dossier'), x: 790, y: 345, l: 20, p: 240, bas: 28, h: 37, arrondi: 4, couleur: tissu },
    { nom: n('accoudoir'), x: 790, y: 345, l: 95, p: 20, bas: 28, h: 32, arrondi: 4, couleur: tissu },
    { nom: n('accoudoir méridienne'), x: 790, y: 565, l: 75, p: 20, bas: 28, h: 32, arrondi: 4, couleur: tissu },
    { nom: n('assise 1'), x: 810, y: 366, l: 75, p: 99, bas: 29, h: 15, arrondi: 6, couleur: coussin },
    { nom: n('assise 2'), x: 810, y: 466, l: 75, p: 99, bas: 29, h: 15, arrondi: 6, couleur: coussin },
    { nom: n('assise méridienne'), x: 866, y: 491, l: 83, p: 73, bas: 29, h: 15, arrondi: 6, couleur: coussin },
    { nom: n('coussin dossier 1'), x: 806, y: 368, l: 22, p: 64, bas: 43, h: 38, arrondi: 9, couleur: coussin },
    { nom: n('coussin dossier 2'), x: 806, y: 433, l: 22, p: 64, bas: 43, h: 38, arrondi: 9, couleur: coussin },
    { nom: n('coussin dossier 3'), x: 806, y: 498, l: 22, p: 64, bas: 43, h: 38, arrondi: 9, couleur: coussin },
  ];
}

// Meuble TV (vu sur photos) : caisson ouvert en bois clair sur fins pieds métal noir, quatre colonnes
// (tiroir-plateau + tablette, colonne haute, deux colonnes à tablette). Adossé au mur de droite du séjour,
// son extrémité contre le mur taupe. Télévision d'environ 46 pouces posée sur son pied. Longueur et hauteur MESURÉES, le reste ESTIMÉ.
function meubleTV({ Y, decalageTV, options }) {
  const bois = '#dfc48f', noir = '#161618';
  const X = 1127, P = 40, L = 185, PIEDS = 22, HC = 56, E = 2; // Y = début du meuble le long du mur
  const n = (suffixe) => `Meuble TV — ${suffixe}`;
  const planche = (suffixe, y, p, bas, h, o = {}) => ({ nom: n(suffixe), x: X, y, l: P, p, bas, h, couleur: bois, ...o });
  const cloisons = [0, 41, 83, 133, L - E]; // positions des montants le long du meuble
  const pieces = [
    planche('dessus', Y, L, PIEDS + HC - E, E),
    planche('fond bas', Y, L, PIEDS, E),
    { nom: n('dos'), x: X + P - 1, y: Y, l: 1, p: L, bas: PIEDS, h: HC, couleur: bois },
    ...cloisons.map((c) => planche('montant', Y + c, E, PIEDS + E, HC - 2 * E)),
    planche('tablette 1', Y + E, 39, PIEDS + 26, E),
    planche('tablette 3', Y + 85, 48, PIEDS + 28, E),
    planche('tablette 4', Y + 135, 48, PIEDS + 28, E),
    { nom: n('tiroir-plateau'), x: X - 12, y: Y + E, l: 44, p: 39, bas: PIEDS + HC - 11, h: 7, couleur: bois },
    ...[[3, 4], [3, L - 7], [P - 6, 4], [P - 6, L - 7]].map(([dx, dy]) => (
      { nom: n('pied'), x: X + dx, y: Y + dy, l: 2.5, p: 2.5, h: PIEDS, couleur: noir })),
  ];
  const HAUT = PIEDS + HC, yTV = Y + decalageTV, lTV = 106; // télévision vers l'extrémité côté mur du fond
  return [
    ...pieces,
    { nom: 'Télévision — socle', x: X + 8, y: yTV + 33, l: 24, p: 40, bas: HAUT, h: 1.5, couleur: noir },
    { nom: 'Télévision — pied', x: X + 21, y: yTV + 48, l: 4, p: 10, bas: HAUT, h: 9, couleur: noir },
    { nom: 'Télévision — coque', x: X + 20, y: yTV, l: 6, p: lTV, bas: HAUT + 7, h: 63, arrondi: 1, couleur: noir },
    { nom: 'Télévision — écran', x: X + 19.6, y: yTV + 3, l: 1, p: lTV - 6, bas: HAUT + 11, h: 56, couleur: '#050506', rugosite: 0.12 },
  ].map((piece) => ({ ...piece, ...options }));
}

export const appartement = {
  nom: 'Appartement D62 — T3',
  hauteurSousPlafond: 250, // LU (donnée par l'utilisateur)
  hauteurPortes: 204, // SUPPOSÉ
  fenetres: { allege: 90, haut: 215 }, // SUPPOSÉ
  baie: { allege: 0, haut: 215 }, // SUPPOSÉ

  pieces: [
    { id: 'ch1', nom: 'Chambre 1', cote: '370 × 279', sol: 'parquet',
      zones: [[0, 0, 279, 345], [0, 345, 185, 370]], etiquette: [140, 160] },
    { id: 'ch2', nom: 'Chambre 2', cote: '370 × 255', sol: 'parquet',
      zones: [[286, 0, 541, 345], [379, 345, 541, 370]], etiquette: [413, 160] },
    { id: 'cuisine', nom: 'Cuisine', cote: '370 × 183', sol: 'carrelage',
      zones: [[551, 0, 734, 134], [551, 134, 703, 370]], etiquette: [672, 190] },
    { id: 'sejour', nom: 'Séjour', cote: '464 × 451', sol: 'carrelage',
      zones: [[703, 134, 1167, 585]], etiquette: [1010, 480] },
    { id: 'loggia', nom: 'Loggia', cote: '411 × 200', sol: 'gazon',
      zones: [[756, -86, 1167, 114]], etiquette: [961, 14] },
    { id: 'bains', nom: 'Bains', cote: '', sol: 'carrelageVert',
      zones: [[0, 377, 185, 465], [0, 465, 203, 555]], etiquette: [95, 440] },
    { id: 'degt', nom: 'Dégagement', cote: '', sol: 'carrelage',
      zones: [[192, 377, 559, 465], [192, 352, 372, 377]], etiquette: [375, 421] },
    { id: 'wc', nom: 'WC', cote: '', sol: 'carrelage',
      zones: [[251, 472, 440, 555]], etiquette: [345, 514] },
    { id: 'rangement', nom: 'Rangt', cote: '', sol: 'carrelage',
      zones: [[489, 472, 559, 585]], etiquette: [524, 528] },
    { id: 'hall', nom: 'Hall', cote: '', sol: 'carrelage',
      zones: [[566, 377, 696, 585]], etiquette: [631, 470] },
  ],

  // Dalle sous l'ensemble (visible aux seuils de portes).
  dalle: [[-20, -20, 756, 575], [440, 472, 1187, 605], [703, 114, 1187, 605], [734, -90, 1171, 134]],

  // Murs : r = emprise au sol, o = ouvertures le long du grand côté (positions absolues en cm).
  // types d'ouverture : fenetre, baie, porte, entree
  murs: [
    // --- Enveloppe (épaisseur 20 : DÉDUIT) ---
    { r: [-20, -20, 756, 0], o: [
      { type: 'fenetre', de: 99, a: 209 },   // chambre 1 — DÉDUIT (~110)
      { type: 'fenetre', de: 327, a: 440 },  // chambre 2 — DÉDUIT (~113)
      { type: 'fenetre', de: 619, a: 707, vantaux: 1 },  // cuisine   — DÉDUIT (~88)
    ] },
    { r: [-20, 0, 0, 575] },
    { r: [-20, 555, 440, 575] },
    { r: [440, 585, 1187, 605], o: [{ type: 'entree', de: 588, a: 678, couleur: '#f3ecdf' }] }, // porte palière ~90 — DÉDUIT ; couleur mur clair (demandé)
    { r: [1167, 114, 1187, 585] },
    { r: [734, 0, 756, 134] }, // mur cuisine / loggia
    // Porte-fenêtre du séjour (~270 de large, DÉDUIT ; elle commence après un pan de mur d'au moins 78,
    // largeur de la table qui y tient — 84 retenu) : trois vantaux gris clair, coffre de volet roulant
    // au-dessus côté pièce, tringle noire et deux rideaux en lin clair (vus sur photos).
    { r: [756, 114, 1167, 134], o: [{
      type: 'baie', de: 840, a: 1110, vantaux: 3, interieur: 'sud', coffre: true, couleur: '#c6c9cb',
      rideaux: { couleur: '#e4ded2', tringle: 242 },
    }] },

    // --- Cloisons (épaisseur 7 : SUPPOSÉ) ---
    { r: [279, 0, 286, 352] },                 // chambre 1 / chambre 2
    { r: [541, 0, 551, 312] },                 // chambre 2 / cuisine
    { r: [185, 305, 192, 370] },               // joue placard ch.1
    { r: [192, 345, 279, 352], o: [{ type: 'porte', de: 194, a: 277 }] }, // porte ch.1
    { r: [372, 305, 379, 370] },               // joue placard ch.2
    { r: [286, 345, 372, 352], o: [{ type: 'porte', de: 288, a: 371 }] }, // porte ch.2
    { r: [0, 370, 192, 377] },                 // placard ch.1 / bains
    { r: [372, 370, 703, 377] },               // placard ch.2, cuisine / dégagement, hall
    { r: [185, 377, 192, 465], o: [{ type: 'porte', de: 381, a: 454 }] }, // porte bains
    { r: [192, 465, 566, 472], o: [{ type: 'porte', de: 352, a: 425 }] }, // porte WC
    { r: [559, 377, 566, 465], o: [{ type: 'porte', de: 384, a: 457 }] }, // porte dégagement / hall
    { r: [696, 302, 703, 501], o: [{ type: 'porte', de: 390, a: 501 }] }, // double porte hall / séjour ~110

    // --- Gaines techniques (pleines) ---
    { r: [541, 312, 600, 370], gaine: true },  // angle cuisine
    { r: [203, 472, 251, 555], gaine: true },  // entre bains et WC
    { r: [440, 472, 489, 585], gaine: true },  // entre WC et rangement
    { r: [696, 501, 788, 585], gaine: true },  // angle séjour (« DIST »)
  ],

  // Façades de placards (portes de placard, toute hauteur).
  placards: [
    [0, 302, 185, 305],     // chambre 1
    [379, 302, 541, 305],   // chambre 2
    { r: [559, 472, 562, 585], couleur: '#f3ecdf' }, // rangement du hall — repeint couleur des murs (demandé)
  ],

  // Loggia (vue sur photos) : muret béton surmonté d'une lisse métallique à barreaux horizontaux,
  // écran en verre dépoli sur le côté droit. Hauteurs ESTIMÉES.
  gardeCorps: {
    muret: { hauteur: 50, couleur: '#cdc8be' },
    lisses: { hauteurs: [66, 82, 100], couleur: '#8d9297' },
    segments: [[756, -90, 1171, -80], [752, -90, 762, -20]],
    ecran: { r: [1167, -86, 1171, 114], hauteur: 190 },
  },

  // Éclairage. Soleil : azimut en degrés depuis le haut du plan (0 = entre par les fenêtres des chambres,
  // positif = vient de la droite), élévation au-dessus de l'horizon. Orientation réelle INCONNUE : SUPPOSÉ.
  // Luminaires : positions ESTIMÉES d'après les photos ; hauteur = bas de l'abat-jour pour une suspension.
  // Types : plafonnier, suspension (abat-jour conique), gradins (verre émaillé à trois étages).
  eclairage: {
    soleil: { azimut: 20, elevation: 30 },
    luminaires: [
      { nom: 'Suspension séjour', type: 'gradins', x: 930, y: 400, hauteur: 185, diametre: 32, couleur: '#ee4f1c', intensite: 9, ombre: true },
      { nom: 'Plafonnier cuisine', type: 'plafonnier', x: 665, y: 170, diametre: 36, couleur: '#8fa899', intensite: 7, ombre: true },
      { nom: 'Plafonnier hall', type: 'plafonnier', x: 631, y: 440, diametre: 30, couleur: '#f4f4f0', intensite: 3 },
      { nom: 'Plafonnier dégagement', type: 'plafonnier', x: 375, y: 421, diametre: 30, couleur: '#f4f4f0', intensite: 3 },
      { nom: 'Ampoule chambre 1', type: 'suspension', x: 150, y: 150, hauteur: 205, diametre: 8, couleur: '#fff3d6', intensite: 5 },
      { nom: 'Lampadaire Flora (canapé)', essai: 'Lampadaire près du canapé', type: 'diffuse', x: 974, y: 562, hauteur: 100, intensite: 0.9 },
      // Lumière diffuse du lampadaire à l'essai (son volume est décrit dans le mobilier).
      { nom: 'Lampadaire Flora', essai: 'Lampadaire Flora', type: 'diffuse', x: 1136, y: 180, hauteur: 100, intensite: 0.9 },
      { nom: 'Spots salle de bains', type: 'plafonnier', x: 95, y: 440, diametre: 12, couleur: '#f4f4f0', intensite: 3 },
    ],
  },

  // Points de vue pour les captures d'écran : caméras placées dans les angles hauts des pièces, juste sous
  // le plafond, visant le bas de l'angle opposé, en très grand-angle. « de » = position, « vers » = point visé (cm).
  focaleCaptures: 75,          // champ vertical (degrés) de la visite libre
  camerasAngles: { hauteur: 232, focale: 76, hauteurVisee: 60 }, // 76° vertical ≈ 100° en largeur au format 3:2
  // Caméras à 30-45 cm des deux murs de l'angle : plus près, les murs envahissent les bords de l'image.
  pointsDeVue: [
    { nom: 'Séjour — angle télévision', de: [1128, 548], vers: [760, 170] },
    { nom: 'Séjour — angle bureau', de: [1128, 178], vers: [770, 560] },
    { nom: 'Séjour — angle canapé', de: [832, 548], vers: [1120, 160] },
    { nom: 'Séjour — angle cuisine', de: [800, 176], vers: [1130, 560] },
    { nom: 'Cuisine — angle fenêtre', de: [700, 36], vers: [585, 340] },
    { nom: 'Cuisine — angle séjour', de: [680, 280], vers: [575, 20] },
    { nom: 'Hall', de: [668, 558], vers: [578, 390] },
    { nom: 'Dégagement', de: [540, 448], vers: [205, 400] },
    { nom: 'Chambre 1 — angle porte', de: [245, 270], vers: [20, 20] },
    { nom: 'Chambre 1 — angle fenêtre', de: [245, 36], vers: [20, 290] },
    { nom: 'Chambre 2 — angle porte', de: [322, 270], vers: [530, 15] },
    { nom: 'Chambre 2 — angle fenêtre', de: [505, 36], vers: [300, 290] },
    { nom: 'Salle de bains', de: [160, 402], vers: [25, 540] },
    { nom: 'WC', de: [418, 490], vers: [270, 545] },
  ],

  // Variantes : chaque variante est la liste des essais affichés. La page s'ouvre sur « defaut ».
  variantes: {
    defaut: 'Vos essais',
    liste: [
      { nom: 'Existant', essais: [] },
      { nom: 'Vos essais', essais: ['Tapis Coralie', 'Lampadaire Flora', 'Tasseaux bureau', 'Tasseaux canapé', 'Bureau Ava', 'Chaise bois et vert', 'Grand tableau', 'Table basse Tokyo'] },
      { nom: 'Proposition de Claude', essais: ['Tapis Coralie', 'Tasseaux bureau 140 cm', 'Lampadaire près du canapé', 'Tableau mur taupe', 'Plante'] },
    ],
  },

  // Murs peints d'une autre couleur que le blanc : fine plaque posée devant le mur (vu sur photos).
  peintures: [
    { nom: 'Mur du fond séjour', r: [788, 584, 1167, 585], couleur: '#a5826c' },
    { nom: 'Mur tête de lit chambre 1', r: [0, 0, 1, 305], couleur: '#1f5d4a' },
    // Hall peint comme le mur du fond du séjour (demandé). Restent en couleur d'origine : portes de placard,
    // porte d'entrée et une bande de 7 cm autour de chaque baie de porte (chambranle, largeur SUPPOSÉE).
    // « bas » = la plaque commence à cette hauteur (au-dessus des portes : 204 + 7).
    { nom: 'Hall — mur du dégagement', r: [566, 377, 696, 378], couleur: '#a5826c' },
    { nom: 'Hall — au-dessus porte dégagement', r: [566, 377, 567, 472], bas: 211, couleur: '#a5826c' },
    { nom: 'Hall — à droite porte dégagement', r: [566, 464, 567, 472], couleur: '#a5826c' },
    { nom: 'Hall — à gauche porte séjour', r: [695, 377, 696, 383], couleur: '#a5826c' },
    { nom: 'Hall — au-dessus porte séjour', r: [695, 377, 696, 585], bas: 211, couleur: '#a5826c' },
    { nom: 'Hall — à droite porte séjour', r: [695, 508, 696, 585], couleur: '#a5826c' },
    { nom: 'Hall — à gauche entrée', r: [566, 584, 581, 585], couleur: '#a5826c' },
    { nom: 'Hall — au-dessus entrée', r: [566, 584, 696, 585], bas: 211, couleur: '#a5826c' },
    { nom: 'Hall — à droite entrée', r: [685, 584, 696, 585], couleur: '#a5826c' },
  ],

  // Équipements fixes. Emprises DÉDUITES du plan et des photos, hauteurs ESTIMÉES.
  equipements: [
// Cuisine équipée (vue sur photos), le long du mur de gauche, de la fenêtre (y = 0) vers le fond.
    // Façades à cadre vert sauge brillant, poignées barres métal, plan de travail et dosseret anthracite.
    // Longueur 312 : DÉDUIT du plan. Largeurs des modules et hauteurs : ESTIMÉ (modules standard de 60).
    { type: 'cuisine', nom: 'Cuisine équipée', x: 551, y: 0, longueur: 312,
      facade: '#a3b8a9', plan: '#2c2d30', socle: '#8d968f',
      bas: [{ genre: 'four', l: 60 }, { genre: 'tiroirs', l: 60 }, { genre: 'porte', l: 64 }, { genre: 'porte', l: 64 }, { genre: 'porte', l: 64 }],
      plaque: [3, 59], evier: [186, 266],
      hauts: [{ genre: 'hotte', l: 60 }, { genre: 'double', l: 63 }, { genre: 'double', l: 63 }, { genre: 'double', l: 63 }, { genre: 'double', l: 63 }] },
    { nom: 'Chaudière et son coffrage', x: 603, y: 335, l: 37, p: 35, h: 225, couleur: '#f7f7f5' },
    { nom: 'Baignoire', x: 43, y: 485, l: 160, p: 70, h: 55, couleur: '#ffffff' },
    { nom: 'Meuble vasque', x: 0, y: 380, l: 50, p: 103, h: 85, couleur: '#ffffff' },
    { nom: 'Cuvette WC', x: 251, y: 494, l: 70, p: 40, h: 40, couleur: '#ffffff' },
    { nom: 'Radiateur séjour', x: 1157, y: 147.5, l: 10, p: 96, // 96 de long, à 13,5 du mur de la porte-fenêtre : MESURÉ
      bas: 15, h: 60, couleur: '#f2f0ea' },
    { nom: 'Radiateur chambre 1', x: 104, y: 0, l: 100, p: 10, bas: 15, h: 60, couleur: '#f2f0ea' },
  ],

  // Meubles : volumes simples { nom, x, y, l, p, h, couleur, bas?, rotation? } en cm.
  // (x, y) = coin haut-gauche sur le plan, l le long de x, p le long de y.
  // TOUTES les dimensions ci-dessous sont ESTIMÉES d'après les photos, à remplacer par les mesures réelles.
  mobilier: [
    // Cuisine
    { nom: 'Réfrigérateur', x: 641, y: 310, l: 55, p: 60, h: 160, couleur: '#f7f7f5' },
    { nom: 'Micro-ondes', x: 646, y: 322, l: 45, p: 36, bas: 160, h: 28, couleur: '#1c1c1e' },

    // Séjour — coin repas
    // Plateau fin plaqué frêne aux angles arrondis, pieds ronds fuselés légèrement évasés (vu sur photos).
    // Largeur 78 : MESURÉ. Longueur 140 et hauteur 74 : celles du modèle du commerce ressemblant, À CONFIRMER.
    // Petit côté contre le mur, calée dans l'angle de la loggia, à gauche de la porte-fenêtre.
    { type: 'tableBois', nom: 'Table à manger', x: 744, y: 136, l: 78, p: 140, h: 74, couleur: '#dccbac', veine: '#c4ae8a' },
    ...chaise('Chaise 1', 706, 164, 'ouest'),
    ...chaise('Chaise 2', 706, 218, 'ouest'),
    ...chaise('Chaise 3', 817, 164, 'est'),
    ...chaise('Chaise 4', 817, 218, 'est'),

    // Miroir « pilule » à fin cadre noir (vu sur photos), sur le pan de mur entre la porte du hall et la niche
    // du réfrigérateur, tourné vers le séjour. 40 × 140 : MESURÉ. Bas à 45 du sol, côté porte : ESTIMÉ.
    { type: 'miroir', nom: 'Miroir du séjour', mur: 703, face: 'est', centre: 355, largeur: 40, hauteur: 140, bas: 45 },

    // Séjour — salon
    ...canape(),
    // Table basse actuelle : s'efface quand l'essai « Table basse Tokyo » est coché.
    ...[...table('Table basse', 925, 365, 55, 90, 45, BOIS_CLAIR),
      { nom: 'Table basse — tablette', x: 928, y: 368, l: 49, p: 84, bas: 15, h: 3, couleur: BOIS_CLAIR },
    ].map((piece) => ({ ...piece, saufEssai: 'Table basse Tokyo' })),
    // Table basse Tokyo, finition bois naturel (fiche Northdeco) : plateau épais de 120 × 45 (LU), deux pieds
    // en panneaux pleins en retrait des bouts et une traverse sous le plateau. Hauteur 36 : ESTIMÉ sur photo.
    ...tableTokyo('Table basse Tokyo', 930, 350, 45, 120, 36, '#dcb682'),
    // Collé au mur taupe (y = 584, plinthe comprise) : il reste 12 cm entre le meuble et les tasseaux.
    ...meubleTV({ Y: 398, decalageTV: 40, options: {} }),

    // Séjour — bureau
// Bureau noir à piétement en A (vu sur photos), contre le mur de droite, après le radiateur.
    // 140 × 75 × 73 : ESTIMÉ (160 ne tenait pas entre le radiateur mesuré et le meuble TV).
    // Le bureau noir, ses écrans et son fauteuil s'effacent quand l'essai « Bureau Ava » est coché (saufEssai).
    { type: 'bureau', saufEssai: 'Bureau Ava', nom: 'Bureau', x: 1092, y: 246, l: 75, p: 140, h: 73, couleur: '#1b1b1d' },
    // Deux écrans sur pied, légèrement tournés vers le fauteuil.
    ...ecran('Écran gauche', 1146, 250, 10, 73, { saufEssai: 'Bureau Ava' }),
    ...ecran('Écran droit', 1146, 320, -8, 73, { saufEssai: 'Bureau Ava' }),
    { saufEssai: 'Bureau Ava', nom: 'Clavier', x: 1112, y: 280, l: 14, p: 44, bas: 73, h: 2, couleur: '#141416' },
    { saufEssai: 'Bureau Ava', nom: 'Tapis de souris', x: 1098, y: 336, l: 30, p: 40, bas: 73, h: 0.4, couleur: '#222225' },
    // Fauteuil de bureau noir : piétement étoile à roulettes, assise épaisse, haut dossier, appui-tête, accoudoirs.
    { type: 'fauteuilBureau', saufEssai: ['Bureau Ava', 'Chaise bois et vert'], nom: 'Fauteuil de bureau', cx: 1072, cy: 316, dos: 'ouest', angle: 0, couleur: '#1f1f22' },

    // --- Essais de déco (achats envisagés) : « essai » crée une case à cocher pour comparer avec / sans. ---
    // Tapis Coralie écru 160 × 230 (fiche produit But) : motif d'arches ton sur ton, redessiné d'après la photo.
    // Glissé de 20 cm sous l'avant du canapé, sous la table basse, à 35 cm du mur taupe (avancé vers la porte-fenêtre).
    { type: 'tapis', essai: 'Tapis Coralie', nom: 'Tapis Coralie écru', x: 865, y: 320, l: 160, p: 230,
      fond: '#f2ede2', motif: '#ddd7ca', cotes: '#e4ded1' },

    // Lampadaire Flora blanc (fiche produit But) : H 130, largeur 30 — LU. Pied conique et abat-jour en trèfle
    // à quatre lobes, tissu bouclé écru. Dans l'angle porte-fenêtre / mur du bureau, devant le radiateur.
    { type: 'lampadaire', essai: 'Lampadaire Flora', nom: 'Lampadaire Flora', cx: 1136, cy: 180, h: 130, diametre: 30,
      couleur: '#eee9de' },

    // Mur à tasseaux derrière le bureau : fond noir de 130 de large, tasseaux bois verticaux de section
    // 25 × 13 mm, espacés de 15 mm. Centrés entre le radiateur (fin à y = 243,5) et le meuble TV (début à y = 398) : 12 cm de chaque côté, comme le bureau Ava.
    ...tasseaux({ essai: 'Tasseaux bureau', mur: 1167, centre: 320.75, longueur: 130, largeur: 2.5, epaisseur: 1.3,
      ecart: 1.5, bas: 8, haut: 250, bois: '#d3b07c', fond: '#151516' }),

    // Mêmes tasseaux sur le petit mur derrière le canapé (face du coffrage, 84 de large, toute hauteur).
    ...tasseaux({ essai: 'Tasseaux canapé', mur: 788, sens: 1, centre: 543, longueur: 84, largeur: 2.5, epaisseur: 1.3,
      ecart: 1.5, bas: 8, haut: 250, bois: '#d3b07c', fond: '#151516' }),

    // Bureau Ava bois et blanc (photos fournies) : plateau bois clair à rebord arrière, piétement luge en
    // tube blanc, tablette en métal perforé, croisillon. Remplace le bureau noir quand l'essai est coché.
    // 111 × 51 et rebord de 10,5 : LU sur le schéma coté du fabricant. Hauteur du plateau (76) : ESTIMÉ.
    { type: 'bureauAva', essai: 'Bureau Ava', nom: 'Bureau Ava', x: 1116, y: 265.25, l: 51, p: 111, h: 76, rebord: 10.5,
      couleur: '#e0bf90', veine: '#c9a271', metal: '#f4f2ee' },
    ...ecran('Écran gauche (Ava)', 1144, 259.75, 10, 76, { essai: 'Bureau Ava' }),
    ...ecran('Écran droit (Ava)', 1144, 320.75, -8, 76, { essai: 'Bureau Ava' }),
    { essai: 'Bureau Ava', nom: 'Clavier (Ava)', x: 1124, y: 298.75, l: 14, p: 44, bas: 76, h: 2, couleur: '#141416' },
    { type: 'fauteuilBureau', essai: 'Bureau Ava', saufEssai: 'Chaise bois et vert', nom: 'Fauteuil de bureau (Ava)', cx: 1096, cy: 320.75, dos: 'ouest', angle: 0, couleur: '#1f1f22' },

    // Chaise de bureau bois et tissu vert (photos fournies) : coques en bois cintré clair, assise et dossier
    // capitonnés vert sauge, piétement étoile blanc à roulettes, sans accoudoirs. Remplace le fauteuil noir.
    // Aucune cote fournie : 50 de large, assise à 48, haut du dossier à 90 — ESTIMÉ sur photos.
    // Deux emplacements selon le bureau affiché (siEssai = seulement si cet essai est coché).
    { type: 'chaiseBureauBois', essai: 'Chaise bois et vert', saufEssai: 'Bureau Ava', nom: 'Chaise de bureau bois et vert',
      cx: 1070, cy: 316, dos: 'ouest', angle: 12, tissu: '#8fae98', bois: '#e2c79b', metal: '#f4f2ee' },
    { type: 'chaiseBureauBois', essai: 'Chaise bois et vert', siEssai: 'Bureau Ava', nom: 'Chaise de bureau bois et vert (Ava)',
      cx: 1092, cy: 320.75, dos: 'ouest', angle: 12, tissu: '#8fae98', bois: '#e2c79b', metal: '#f4f2ee' },

    // Grand tableau sur le mur taupe, d'après la photo d'inspiration : toile monochrome crème, à peine nuancée,
    // fin cadre noir. 150 × 100 : SUPPOSÉ. Centré sur toute la largeur du mur taupe (de x = 788 à 1167).
    { type: 'cadre', essai: 'Grand tableau', nom: 'Grand tableau clair', x: 902.5, y: 581.2, l: 150, p: 2.8, bas: 100, h: 100,
      face: 'nord', motif: 'brume', ligne: false, couleurs: ['#efe6d2', '#e9dec6', '#f4eedd', '#7d7a74'] },

    // --- Proposition de Claude pour le séjour (voir « variantes » plus bas) ---
    // 1. Tasseaux derrière le bureau, élargis à la largeur du plateau (140) au lieu de 130.
    ...tasseaux({ essai: 'Tasseaux bureau 140 cm', mur: 1167, centre: 318.5, longueur: 140, largeur: 2.5, epaisseur: 1.3,
      ecart: 1.5, bas: 8, haut: 250, bois: '#d3b07c', fond: '#151516' }),
    // 2. Le mur taupe, vide aujourd'hui, devient un coin composé : lampadaire au bout de la méridienne,
    //    grand tableau aux teintes de la pièce, plante haute près du meuble TV.
    { type: 'lampadaire', essai: 'Lampadaire près du canapé', nom: 'Lampadaire Flora (canapé)', cx: 974, cy: 562, h: 130,
      diametre: 30, couleur: '#eee9de' },
    { type: 'cadre', essai: 'Tableau mur taupe', nom: 'Grand tableau', x: 1004, y: 581.2, l: 70, p: 2.8, bas: 92, h: 100,
      face: 'nord', couleurs: ['#efe8da', '#e2553a', '#1d1d1f', '#9fb5a6', '#c9a877'] },
    { type: 'plante', essai: 'Plante', nom: 'Plante haute', cx: 1100, cy: 552, h: 165, pot: '#f1ece2', feuillage: '#3f6b4a' },

    // Chambre 1
    { nom: 'Lit — cadre', x: 8, y: 50, l: 200, p: 165, h: 30, couleur: '#d9c3a0' },
    { nom: 'Lit — matelas', x: 10, y: 52, l: 196, p: 161, bas: 30, h: 20, couleur: '#f1ede4' },
    { nom: 'Lit — tête de lit', x: 0, y: 50, l: 8, p: 165, h: 95, couleur: '#d8d0c0' },
    { nom: 'Chevet fenêtre', x: 0, y: 8, l: 35, p: 40, h: 50, couleur: BOIS_CLAIR },
    { nom: 'Chevet placard', x: 0, y: 217, l: 35, p: 40, h: 50, couleur: BOIS_CLAIR },
    { nom: 'Meuble TV chambre', x: 244, y: 140, l: 35, p: 80, h: 40, couleur: '#1c1c1e' },
    { nom: 'Télévision chambre', x: 258, y: 142, l: 5, p: 75, bas: 42, h: 45, couleur: '#111113' },
  ],
};

export const palette = {
  mur: '#f3ecdf',
  dessusMur: '#3b3a37',
  gaine: '#d9d4c8',
  placard: '#c9b79c',
  dalle: '#8c887f',
  vitrage: '#9cc7dd',
  porte: '#a98f6f',
  // Sols : carreaux (fond, joint, taille en cm, pose en diagonale), lames (teintes, taille du motif), ou uni.
  sols: {
    // plinthe : plinthes carrelées assorties au pied de tous les murs de la pièce (hauteur, épaisseur, longueur d'un carreau).
    carrelage: { type: 'carreaux', fond: '#e6e5e1', joint: '#a9a7a0', taille: 33, diagonale: true,
      plinthe: { hauteur: 8, epaisseur: 1.2, longueur: 33 } },
    carrelageVert: { type: 'carreaux', fond: '#3f5348', joint: '#2a3830', taille: 20, diagonale: true },
    parquet: { type: 'lames', teintes: ['#b77f48', '#bd8650', '#b17a44', '#c28c56'], taille: 120 },
    gazon: { type: 'uni', couleur: '#6f9a55' },
    exterieur: { type: 'uni', couleur: '#b3b0a8' },
  },
};
