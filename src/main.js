import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { appartement as A, palette as P } from '../data/appartement.js';

const CM = 0.01;
const H = A.hauteurSousPlafond;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
// Reflets des matières brillantes (verre émaillé, plastique) : petit environnement neutre, appliqué à ces seules matières.
const reflets = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e7e2');
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);

// --- Lumières -------------------------------------------------------------
// Vues « maquette » (toit ouvert) : éclairage surtout ambiant, les murs gardent leur teinte.
// Visite : plafond en place, soleil bas qui entre par les fenêtres. Soir : luminaires allumés.
const CIBLE = new THREE.Vector3(5.8, 0, 2.6);
const ambiante = new THREE.AmbientLight('#ffffff', 2.7);
scene.add(ambiante);

function lumiereDirectionnelle(couleur, direction, definition) {
  const l = new THREE.DirectionalLight(couleur, 1);
  l.target.position.copy(CIBLE);
  l.position.copy(CIBLE).addScaledVector(direction.normalize(), 25);
  l.castShadow = true;
  l.shadow.mapSize.set(definition, definition);
  Object.assign(l.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
  l.shadow.bias = -0.0005;
  l.shadow.normalBias = 0.02;
  scene.add(l, l.target);
  return l;
}
// Ciel / sol : le plafond, les murs et le sol ne reçoivent pas la même quantité de lumière.
const ciel = new THREE.HemisphereLight('#ffffff', '#c4baab', 0);
scene.add(ciel);
// Lumière d'appoint sans ombre, venue de l'intérieur : elle différencie les murs selon leur orientation.
const appoint = new THREE.DirectionalLight('#fff6e8', 0);
appoint.position.set(-6, 5, 9);
scene.add(appoint);
// Lumière des vues « maquette », inclinée pour que chaque face de mur ait sa propre valeur.
const zenith = lumiereDirectionnelle('#ffffff', new THREE.Vector3(0.5, 1, 0.32), 4096);
const az = THREE.MathUtils.degToRad(A.eclairage.soleil.azimut);
const el = THREE.MathUtils.degToRad(A.eclairage.soleil.elevation);
const soleil = lumiereDirectionnelle(
  '#fff1d8',
  new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)),
  4096,
);

// --- Géométrie -------------------------------------------------------------

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
const matDessus = mat(P.dessusMur);

// Boîte posée sur l'emprise [x0,y0,x1,y1] (cm), entre les hauteurs bas et haut (cm).
function boite([x0, y0, x1, y1], bas, haut, materiau, ombre = true) {
  const g = new THREE.BoxGeometry((x1 - x0) * CM, (haut - bas) * CM, (y1 - y0) * CM);
  const m = new THREE.Mesh(g, materiau);
  m.position.set(((x0 + x1) / 2) * CM, ((bas + haut) / 2) * CM, ((y0 + y1) / 2) * CM);
  m.castShadow = ombre;
  m.receiveShadow = true;
  return m;
}

// Mur toute hauteur : faces claires, dessus sombre (lecture « maquette »).
function pan(r, bas, haut, couleur) {
  const c = mat(couleur);
  const dessus = haut >= H ? matDessus : c;
  if (bas === 0) socles.push(r);
  return boite(r, bas, haut, [c, c, dessus, c, c, c]);
}
const socles = []; // emprises des murs qui touchent le sol, pour y poser les plinthes

// Plinthes : au pied de chaque face de mur qui donne sur une pièce dont le sol en prévoit.
// Posées carreau par carreau, sur un fond couleur joint.
function construirePlinthes(groupe) {
  for (const piece of A.pieces) {
    const sol = P.sols[piece.sol], def = sol.plinthe;
    if (!def) continue;
    const carreau = mat(sol.fond, { roughness: 0.5 }), joint = mat(sol.joint);
    const e = def.epaisseur;
    const poser = (le_long_de_x, de, a, fixe, sens) => {
      if (a - de < 1) return;
      const rect = (u0, u1, ep) => {
        const [f0, f1] = sens > 0 ? [fixe, fixe + ep] : [fixe - ep, fixe];
        return le_long_de_x ? [u0, f0, u1, f1] : [f0, u0, f1, u1];
      };
      groupe.add(boite(rect(de, a, e * 0.7), 0, def.hauteur - 0.2, joint, false));
      for (let u = de; u < a - 0.5; u += def.longueur) {
        groupe.add(boite(rect(u + 0.2, Math.min(u + def.longueur, a) - 0.2, e), 0.5, def.hauteur, carreau, false)); // joint visible au sol
      }
    };
    for (const [zx0, zy0, zx1, zy1] of piece.zones) {
      for (const [x0, y0, x1, y1] of socles) {
        const dansX = (x) => x > zx0 && x < zx1, dansY = (y) => y > zy0 && y < zy1;
        const ix = [Math.max(x0, zx0), Math.min(x1, zx1)], iy = [Math.max(y0, zy0), Math.min(y1, zy1)];
        if (dansY(y0 - 0.5)) poser(true, ...ix, y0, -1);
        if (dansY(y1 + 0.5)) poser(true, ...ix, y1, 1);
        if (dansX(x0 - 0.5)) poser(false, ...iy, x0, -1);
        if (dansX(x1 + 0.5)) poser(false, ...iy, x1, 1);
      }
    }
  }
}

function construireMur(mur, groupe) {
  const [x0, y0, x1, y1] = mur.r;
  const couleur = mur.gaine ? P.gaine : P.mur;
  const lelongX = x1 - x0 >= y1 - y0;
  const [debut, fin] = lelongX ? [x0, x1] : [y0, y1];
  const tranche = (de, a) => (lelongX ? [de, y0, a, y1] : [x0, de, x1, a]);
  let curseur = debut;
  for (const o of [...(mur.o ?? [])].sort((p, q) => p.de - q.de)) {
    const vitre = o.type === 'fenetre' || o.type === 'baie';
    const allege = o.type === 'fenetre' ? A.fenetres.allege : 0;
    const haut = o.type === 'fenetre' ? A.fenetres.haut : o.type === 'baie' ? A.baie.haut : A.hauteurPortes;
    if (o.de > curseur) groupe.add(pan(tranche(curseur, o.de), 0, H, couleur));
    if (allege > 0) groupe.add(pan(tranche(o.de, o.a), 0, allege, couleur));
    if (haut < H) groupe.add(pan(tranche(o.de, o.a), haut, H, couleur));
    const milieu = lelongX ? (y0 + y1) / 2 : (x0 + x1) / 2;
    // Rectangle au sol d'un élément placé le long du mur, entre u0 et u1, à cheval sur l'axe « centre ».
    const lelong = (u0, u1, centre, ep) =>
      (lelongX ? [u0, centre - ep / 2, u1, centre + ep / 2] : [centre - ep / 2, u0, centre + ep / 2, u1]);
    if (o.type === 'entree') groupe.add(boite(lelong(o.de, o.a, milieu, 4), 0, haut, mat(o.couleur ?? P.porte)));
    if (vitre) {
      menuiserie(groupe, (u0, u1, ep) => lelong(u0, u1, milieu, ep), o.de, o.a, allege, haut, o.vantaux ?? 2, o.couleur);
      // Côté pièce : +1 si l'intérieur est vers les coordonnées croissantes (sud ou est).
      const cote = o.interieur === 'nord' || o.interieur === 'ouest' ? -1 : 1;
      const face = cote > 0 ? (lelongX ? y1 : x1) : (lelongX ? y0 : x0);
      if (o.coffre) {
        groupe.add(boite(lelong(o.de - 6, o.a + 6, face + cote * 5, 10), haut - 2, haut + 22, mat(o.couleur ?? '#f4f4f1')));
      }
      if (o.rideaux) rideaux(groupe, lelong, lelongX, o, face + cote * 14);
    }
    curseur = o.a;
  }
  if (curseur < fin) groupe.add(pan(tranche(curseur, fin), 0, H, couleur));
}

// Menuiserie vitrée : dormant, puis un cadre et un vitrage par vantail. « r(u0, u1, ep) » donne l'emprise au sol.
function menuiserie(groupe, r, de, a, bas, haut, vantaux, couleur = '#f4f4f1') {
  const pvc = mat(couleur, { roughness: 0.4 });
  const verre = mat(P.vitrage, { transparent: true, opacity: 0.22, roughness: 0.05 });
  const D = 5, V = 5; // largeur des profilés du dormant et des vantaux
  groupe.add(boite(r(de, a, 7), bas, bas + D, pvc), boite(r(de, a, 7), haut - D, haut, pvc));
  groupe.add(boite(r(de, de + D, 7), bas + D, haut - D, pvc), boite(r(a - D, a, 7), bas + D, haut - D, pvc));
  const largeur = (a - de - 2 * D) / vantaux;
  for (let i = 0; i < vantaux; i++) {
    const u0 = de + D + i * largeur, u1 = u0 + largeur, b = bas + D, h = haut - D;
    groupe.add(boite(r(u0, u0 + V, 5), b, h, pvc), boite(r(u1 - V, u1, 5), b, h, pvc));
    groupe.add(boite(r(u0 + V, u1 - V, 5), b, b + V, pvc), boite(r(u0 + V, u1 - V, 5), h - V, h, pvc));
    groupe.add(boite(r(u0 + V, u1 - V, 1.2), b + V, h - V, verre, false));
  }
}

// Rideaux : tringle noire sur deux supports, et un pan froncé de chaque côté (plis = cylindres accolés).
function rideaux(groupe, lelong, lelongX, o, axe) {
  const noir = mat('#1b1b1d', { roughness: 0.5 }), tissu = mat(o.rideaux.couleur, { roughness: 1 });
  const hauteur = o.rideaux.tringle;
  const tringle = boite(lelong(o.de - 28, o.a + 28, axe, 2.4), hauteur - 1.2, hauteur + 1.2, noir);
  tringle.geometry = new THREE.CylinderGeometry(0.012, 0.012, (o.a - o.de + 56) * CM, 16);
  tringle.geometry.rotateZ(Math.PI / 2);
  if (!lelongX) tringle.geometry.rotateY(Math.PI / 2);
  groupe.add(tringle);
  for (const u of [o.de - 20, o.a + 20]) groupe.add(boite(lelong(u - 1.5, u + 1.5, axe - 6, 14), hauteur - 6, hauteur + 2, noir));
  const pli = (u, k) => {
    const rayon = 4.2 + (k % 2) * 1.2;
    const m = boite(lelong(u - rayon, u + rayon, axe + (k % 2 ? 1.5 : -1.5), rayon * 2), 1, hauteur, tissu);
    m.geometry = new THREE.CylinderGeometry(rayon * CM, rayon * CM * 1.08, (hauteur - 1) * CM, 12);
    groupe.add(m);
  };
  for (let k = 0; k < 6; k++) {
    pli(o.de - 4 + k * 7, k); // pans froncés devant les bords du vitrage, sans déborder sur le mur
    pli(o.a + 4 - k * 7, k);
  }
}

function etiquette(piece) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2a2926';
  ctx.font = '600 84px -apple-system, system-ui, sans-serif';
  ctx.fillText(piece.nom, 256, piece.cote ? 110 : 150);
  if (piece.cote) {
    ctx.font = '60px -apple-system, system-ui, sans-serif';
    ctx.fillText(piece.cote, 256, 200);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const largeur = Math.min(1.5, (piece.zones[0][2] - piece.zones[0][0]) * CM * 0.9);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, largeur / 2),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(piece.etiquette[0] * CM, 0.012, piece.etiquette[1] * CM);
  return m;
}

// Meuble ou équipement : volume simple { x, y, l, p, h, bas?, rotation?, couleur } en cm.
// (x, y) = coin haut-gauche sur le plan, l le long de x, p le long de y, rotation en degrés autour du centre.
function meuble(m) {
  const bas = m.bas ?? 0;
  // « rugosite » faible = surface brillante (écran, laque) : on lui donne des reflets.
  const brillant = m.rugosite !== undefined ? { roughness: m.rugosite, envMap: reflets, envMapIntensity: 0.6 } : {};
  const b = boite([m.x, m.y, m.x + m.l, m.y + m.p], bas, bas + m.h, mat(m.couleur ?? '#b0a999', brillant));
  if (m.arrondi) {
    const { width, height, depth } = b.geometry.parameters;
    b.geometry = new RoundedBoxGeometry(width, height, depth, 4, Math.min(m.arrondi * CM, width / 2, height / 2, depth / 2));
  }
  b.rotation.y = -THREE.MathUtils.degToRad(m.rotation ?? 0);
  b.name = m.nom ?? '';
  return b;
}

// Chaise à coque monobloc : surface galbée (assise qui remonte en dossier) + pieds bois évasés.
// Repère local en cm : x en largeur, z vers l'avant, y vers le haut.
function chaiseCoque(m) {
  const profil = new THREE.CatmullRomCurve3(
    [[23, 41.5], [19, 43.6], [6, 42.4], [-9, 42.4], [-17, 44.8], [-22, 52], [-24.8, 65], [-27, 82]]
      .map(([z, y]) => new THREE.Vector3(0, y, z)),
  );
  const largeurs = [[0, 21], [0.25, 23], [0.5, 22], [0.7, 20], [1, 17.5]]; // demi-largeur selon l'avancement
  const demiLargeur = (v) => {
    let i = 1;
    while (largeurs[i][0] < v) i++;
    const [v0, l0] = largeurs[i - 1], [v1, l1] = largeurs[i];
    const base = l0 + ((l1 - l0) * (v - v0)) / (v1 - v0);
    return base * arrondi(v);
  };
  // Arrondi du nez de l'assise et du haut du dossier : la coque se resserre et s'aplatit aux deux bouts.
  const arrondi = (v) => {
    const bord = Math.min(v, 1 - v) / 0.13;
    return bord >= 1 ? 1 : 0.45 + 0.55 * Math.sqrt(1 - (1 - bord) ** 2);
  };
  const NU = 20, NV = 48, positions = [], indices = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV, c = profil.getPointAt(v), t = profil.getTangentAt(v);
    const creux = (3 + 2 * v) * (0.35 + 0.65 * Math.min(1, Math.min(v, 1 - v) / 0.15)); // plus creuse vers le dossier, aplatie aux bouts
    for (let i = 0; i <= NU; i++) {
      const s = (i / NU) * 2 - 1, d = creux * s * s;
      positions.push(s * demiLargeur(v), c.y - t.z * d, c.z + t.y * d);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Épaisseur : la surface galbée devient la face du dessus ; on la double d'une face décalée le long
  // des normales, et on referme le chant tout autour. Les normales lissées arrondissent visuellement ce chant.
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  const normales = surface.getAttribute('normal').array;
  const EPAISSEUR = 1.6, N = positions.length / 3;
  const dessous = positions.map((p, k) => p - normales[k] * EPAISSEUR);
  const tous = [...indices];
  for (let k = 0; k < indices.length; k += 3) tous.push(indices[k] + N, indices[k + 2] + N, indices[k + 1] + N);
  const chant = (a, b) => tous.push(a, b, a + N, b, b + N, a + N);
  for (let i = 0; i < NU; i++) {
    chant(i, i + 1); // nez de l'assise
    chant(NV * (NU + 1) + i + 1, NV * (NU + 1) + i); // haut du dossier
  }
  for (let j = 0; j < NV; j++) {
    chant((j + 1) * (NU + 1), j * (NU + 1)); // côté gauche
    chant(j * (NU + 1) + NU, (j + 1) * (NU + 1) + NU); // côté droit
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...positions, ...dessous], 3));
  g.setIndex(tous);
  g.computeVertexNormals();
  const chaise = new THREE.Group();
  const coque = new THREE.Mesh(g, mat(m.couleur, { roughness: 0.38, side: THREE.DoubleSide, envMap: reflets, envMapIntensity: 0.9 }));
  chaise.add(coque);

  const bois = mat(m.pieds, { roughness: 0.7 });
  const barre = (de, a, haut, bas) => {
    const A0 = new THREE.Vector3(...de), B0 = new THREE.Vector3(...a);
    const gb = new THREE.CylinderGeometry(haut, bas, A0.distanceTo(B0), 4);
    gb.rotateY(Math.PI / 4);
    const b = new THREE.Mesh(gb, bois);
    b.position.copy(A0).add(B0).multiplyScalar(0.5);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), A0.clone().sub(B0).normalize());
    chaise.add(b);
  };
  for (const cx of [-1, 1]) {
    barre([cx * 10, 40.5, 9], [cx * 20, 0, 20], 2.5, 1.7);   // pied avant
    barre([cx * 10, 40.5, -9], [cx * 19, 0, -23], 2.5, 1.7); // pied arrière
    barre([cx * 11, 38.5, 10], [-cx * 11, 38.5, -10], 1.8, 1.8); // croix sous l'assise
  }
  chaise.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  chaise.scale.setScalar(CM);
  chaise.position.set(m.cx * CM, 0, m.cy * CM);
  chaise.rotation.y = { nord: 0, sud: Math.PI, ouest: Math.PI / 2, est: -Math.PI / 2 }[m.dos] ?? 0;
  chaise.name = m.nom;
  return chaise;
}
// Bois veiné : fines stries dans le sens de la longueur, dessinées à la volée.
function textureBois(fond, veine) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, 512, 512);
  let graine = 7;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  ctx.strokeStyle = veine;
  for (let i = 0; i < 150; i++) {
    const y = alea() * 512, onde = alea() * 6;
    ctx.globalAlpha = 0.12 + alea() * 0.4;
    ctx.lineWidth = 0.5 + alea() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + onde, 340, y - onde, 512, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Table à plateau fin aux angles arrondis et pieds ronds fuselés, légèrement évasés. Cotes en cm.
function tableBois(m) {
  const long = Math.max(m.l, m.p), large = Math.min(m.l, m.p), ep = 2.2, r = 6;
  const f = new THREE.Shape();
  const a = long / 2, b = large / 2;
  f.moveTo(-a + r, -b);
  f.lineTo(a - r, -b); f.absarc(a - r, -b + r, r, -Math.PI / 2, 0);
  f.lineTo(a, b - r); f.absarc(a - r, b - r, r, 0, Math.PI / 2);
  f.lineTo(-a + r, b); f.absarc(-a + r, b - r, r, Math.PI / 2, Math.PI);
  f.lineTo(-a, -b + r); f.absarc(-a + r, -b + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(f, {
    depth: ep - 0.8, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 3, curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2); // le plateau se couche à l'horizontale
  const veines = textureBois(m.couleur, m.veine);
  veines.repeat.set(1 / long, 3 / long); // les UV du plateau sont en cm
  const bois = mat('#ffffff', { map: veines, roughness: 0.55, envMap: reflets, envMapIntensity: 0.25 });
  const plateau = new THREE.Mesh(g, bois);
  plateau.position.y = m.h - ep + 0.4;
  const table = new THREE.Group();
  table.add(plateau);
  const boisPied = mat(m.couleur, { roughness: 0.6 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const haut = new THREE.Vector3(sx * (a - 13), m.h - ep, sz * (b - 10));
      const bas = new THREE.Vector3(sx * (a - 8), 0, sz * (b - 6));
      const pied = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.5, haut.distanceTo(bas), 20), boisPied);
      pied.position.copy(haut).add(bas).multiplyScalar(0.5);
      pied.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), haut.clone().sub(bas).normalize());
      table.add(pied);
    }
  }
  table.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  table.scale.setScalar(CM);
  table.position.set((m.x + m.l / 2) * CM, 0, (m.y + m.p / 2) * CM);
  if (m.p > m.l) table.rotation.y = Math.PI / 2;
  table.name = m.nom;
  return table;
}
// Petits outils pour les objets composés (cotes en cm, repère local : x largeur, y hauteur, z vers l'avant).
const bloc = (l, h, p, x, y, z, materiau, arrondi = 0) => {
  const g = arrondi ? new RoundedBoxGeometry(l, h, p, 4, Math.min(arrondi, l / 2, h / 2, p / 2)) : new THREE.BoxGeometry(l, h, p);
  const m = new THREE.Mesh(g, materiau);
  m.position.set(x, y, z);
  return m;
};
const tube = (de, a, rayonHaut, rayonBas, materiau, cotes = 4) => {
  const A0 = new THREE.Vector3(...de), B0 = new THREE.Vector3(...a);
  const g = new THREE.CylinderGeometry(rayonHaut, rayonBas, A0.distanceTo(B0), cotes);
  if (cotes === 4) g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, materiau);
  m.position.copy(A0).add(B0).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), A0.clone().sub(B0).normalize());
  return m;
};
const ORIENTATIONS = { nord: 0, sud: Math.PI, ouest: Math.PI / 2, est: -Math.PI / 2 };
function poser(groupe, m, xCm, yCm, rotation) {
  groupe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  groupe.scale.setScalar(CM);
  groupe.position.set(xCm * CM, 0, yCm * CM);
  groupe.rotation.y = rotation;
  groupe.name = m.nom;
  return groupe;
}

// Bureau à plateau noir et piétement métallique en A à chaque bout, avec goulotte à câbles à l'arrière.
function bureau(m) {
  const long = Math.max(m.l, m.p), prof = Math.min(m.l, m.p), ep = 2.5;
  const noir = mat(m.couleur, { roughness: 0.5, envMap: reflets, envMapIntensity: 0.25 });
  const acier = mat('#121214', { roughness: 0.45 });
  const g = new THREE.Group();
  g.add(bloc(long, ep, prof, 0, m.h - ep / 2, 0, noir, 0.8));
  for (const sx of [-1, 1]) {
    const x = sx * (long / 2 - 9), haut = m.h - ep;
    g.add(tube([x, haut, -prof * 0.22], [x, 0, -prof / 2 + 2], 2.2, 2.2, acier)); // montant avant
    g.add(tube([x, haut, prof * 0.22], [x, 0, prof / 2 - 2], 2.2, 2.2, acier)); // montant arrière
    g.add(bloc(4, 3, prof * 0.5, x, haut - 1.5, 0, acier)); // traverse haute
    g.add(bloc(3, 3, prof * 0.74, x, 22, 0, acier)); // traverse basse
  }
  g.add(bloc(long - 40, 9, 12, 0, m.h - ep - 6, prof / 2 - 9, mat('#1d1d20', { roughness: 0.8 }))); // goulotte
  return poser(g, m, m.x + m.l / 2, m.y + m.p / 2, m.p > m.l ? Math.PI / 2 : 0);
}

// Fauteuil de bureau : piétement étoile à cinq branches sur roulettes, assise épaisse, haut dossier galbé,
// appui-tête et accoudoirs. 65 cm d'emprise, assise à 48, haut de l'appui-tête à 132 : ESTIMÉ.
function fauteuilBureau(m) {
  const tissu = mat(m.couleur, { roughness: 0.95 });
  const coque = mat('#141416', { roughness: 0.5, envMap: reflets, envMapIntensity: 0.3 });
  const g = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3, dx = Math.sin(a), dz = Math.cos(a);
    g.add(tube([dx * 4, 9, dz * 4], [dx * 31, 6, dz * 31], 2.4, 1.8, coque));
    const roulette = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), coque);
    roulette.position.set(dx * 31, 3, dz * 31);
    g.add(roulette);
  }
  g.add(tube([0, 40, 0], [0, 8, 0], 2.6, 3.2, coque, 16));
  g.add(bloc(22, 4, 22, 0, 40, -2, coque, 1.5)); // mécanisme sous l'assise
  g.add(bloc(50, 9, 48, 0, 46.5, 1, tissu, 4)); // assise
  // Dossier incliné de quelques degrés, plus large aux épaules qu'à la taille, et appui-tête.
  const dossier = new THREE.Group();
  dossier.add(bloc(40, 26, 7, 0, 13, 0, tissu, 3.4));
  dossier.add(bloc(46, 42, 7, 0, 44, 0, tissu, 3.4));
  dossier.add(bloc(8, 16, 3, 0, 68, -2.5, coque, 1));
  dossier.add(bloc(30, 15, 7, 0, 77, 1.5, tissu, 3.4));
  dossier.position.set(0, 52, -24);
  dossier.rotation.x = -0.14;
  g.add(dossier);
  g.add(bloc(7, 4, 18, 0, 44, -17, coque, 1)); // liaison assise-dossier
  for (const sx of [-1, 1]) {
    g.add(tube([sx * 27, 66, -4], [sx * 22, 44, -6], 1.6, 1.6, coque));
    g.add(bloc(9, 3, 25, sx * 27.5, 67.5, 0, coque, 1.4)); // manchette d'accoudoir
  }
  const angle = THREE.MathUtils.degToRad(m.angle ?? 0);
  return poser(g, m, m.cx, m.cy, (ORIENTATIONS[m.dos] ?? 0) + angle);
}
// Tapis à relief ton sur ton, redessiné d'après la fiche produit (format 160 × 230) : trois hauteurs de poil,
// velours haut clair, fond ras plus gris, et zones côtelées. Le même tracé sert à la couleur et au relief.
function tapis(m) {
  const court = Math.min(m.l, m.p), long = Math.max(m.l, m.p), k = 6; // 6 pixels par cm
  const dessiner = (haut, ras, cotes, grain) => {
    const c = document.createElement('canvas');
    c.width = court * k; c.height = long * k;
    const ctx = c.getContext('2d');
    const cotele = (() => { // côtes horizontales de 1,6 cm (le motif est dessiné en dixièmes de cm)
      const r = document.createElement('canvas');
      r.width = 16; r.height = 16;
      const x = r.getContext('2d');
      x.fillStyle = cotes[0]; x.fillRect(0, 0, 16, 16);
      x.fillStyle = cotes[1]; x.fillRect(0, 0, 16, 7);
      const motif = ctx.createPattern(r, 'repeat');
      motif.setTransform(new DOMMatrix().scale(0.1));
      return motif;
    })();
    ctx.scale((court / 160) * k, (long / 230) * k); // on dessine ensuite en cm, sur 160 × 230
    const P = Math.PI;
    const forme = (remplissage, tracer) => { ctx.fillStyle = remplissage; ctx.beginPath(); tracer(); ctx.closePath(); ctx.fill(); };
    const demiAnneau = (cx, cy, re, ri, de, a) => () => { ctx.arc(cx, cy, re, de, a); ctx.arc(cx, cy, ri, a, de, true); };
    forme(haut, () => ctx.rect(0, 0, 160, 230));
    // Tiers haut : quart de disque côtelé à gauche, grand U ras à droite, pavé côtelé dans le creux du U.
    forme(cotele, () => { ctx.moveTo(48, 4); ctx.arc(48, 4, 44, P / 2, P); });
    forme(ras, () => ctx.rect(48, 0, 28, 20));
    forme(ras, () => ctx.rect(132, 0, 28, 20));
    forme(ras, demiAnneau(104, 20, 56, 28, 0, P));
    forme(cotele, () => ctx.rect(80, 4, 48, 26));
    // Tiers milieu : demi-disque côtelé à gauche, bande rase en J qui file vers la gauche, demi-disque côtelé à droite.
    forme(ras, () => ctx.rect(82, 78, 38, 40));
    forme(ras, demiAnneau(63, 118, 57, 19, 0, P * 0.86));
    forme(cotele, () => { ctx.moveTo(46, 76); ctx.arc(46, 116, 40, -P / 2, P / 2, true); });
    forme(cotele, () => { ctx.moveTo(123, 82); ctx.arc(123, 116, 34, -P / 2, P / 2); });
    // Tiers bas : grande arche rase, pavé côtelé à sa base, quart côtelé en bas à droite.
    forme(ras, demiAnneau(72, 230, 66, 36, P, 0));
    forme(cotele, () => ctx.rect(46, 204, 52, 22));
    forme(cotele, () => { ctx.moveTo(156, 226); ctx.arc(156, 226, 30, P, P * 1.5); });
    // Grain du poil : fines mouchetures.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let graine = 11;
    const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < c.width * c.height * 0.05; i++) {
      ctx.fillStyle = alea() > 0.5 ? grain[0] : grain[1];
      ctx.fillRect(alea() * c.width, alea() * c.height, 1.5, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (m.l > m.p) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
    return t;
  };
  const couleur = dessiner(m.fond, m.motif, [m.fond, m.cotes ?? m.motif], ['rgba(255,255,255,0.10)', 'rgba(90,80,60,0.06)']);
  couleur.colorSpace = THREE.SRGBColorSpace;
  const relief = dessiner('#ffffff', '#6a6a6a', ['#f2f2f2', '#7c7c7c'], ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.25)']);
  const laine = mat('#ffffff', { map: couleur, bumpMap: relief, bumpScale: 2.2, roughness: 1 });
  const chant = mat(m.fond, { roughness: 1 });
  const tapisMesh = boite([m.x, m.y, m.x + m.l, m.y + m.p], 0, 1.4, [chant, chant, laine, chant, chant, chant], false);
  tapisMesh.name = m.nom;
  return tapisMesh;
}
// Lampadaire : pied conique en tissu et abat-jour cylindrique à quatre lobes (section en trèfle).
function lampadaire(m) {
  const R = m.diametre / 2, hPied = m.h * 0.56, hAbat = m.h - hPied + 3;
  const tissu = mat(m.couleur, { roughness: 1 });
  const abat = mat(m.couleur, { roughness: 1, side: THREE.DoubleSide, emissive: '#ffdcae', emissiveIntensity: 0 });
  abat.userData.lueur = m.essai ?? true; // s'allume avec l'ambiance « soir »
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.46, R * 0.74, hPied, 40), tissu).translateY(hPied / 2));
  const tube = new THREE.CylinderGeometry(1, 1, hAbat, 128, 1, true);
  const pos = tube.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const r = R * (0.7 + 0.3 * Math.abs(Math.cos(2 * a)) ** 0.7); // quatre lobes séparés par des plis
    pos.setXYZ(i, Math.cos(a) * r, pos.getY(i), Math.sin(a) * r);
  }
  tube.computeVertexNormals();
  g.add(new THREE.Mesh(tube, abat).translateY(m.h - hAbat / 2));
  return poser(g, m, m.cx, m.cy, Math.PI / 4);
}
// Cuisine en ligne adossée à un mur de gauche (façades tournées vers les x croissants), modules listés
// depuis y = m.y. Bas : four, tiroirs ou porte ; hauts : deux portes superposées, ou colonne hotte.
function cuisine(m) {
  const g = new THREE.Group();
  const X = m.x, PROF = 58, HAUT_BAS = 87, SOCLE = 10;
  const laque = mat(m.facade, { roughness: 0.22, envMap: reflets, envMapIntensity: 0.45 });
  const metal = mat('#b9bcc0', { roughness: 0.3, envMap: reflets, envMapIntensity: 0.6 });
  const pierre = mat(m.plan, { roughness: 0.45, envMap: reflets, envMapIntensity: 0.2 });
  const verreNoir = mat('#0c0c0e', { roughness: 0.1, envMap: reflets, envMapIntensity: 0.7 });
  const ajouter = (r, bas, haut, materiau) => g.add(boite(r, bas, haut, materiau));
  // Façade à cadre : panneau en retrait, quatre montants de 6 cm en relief, poignée barre en haut ou en bas.
  const facade = (xf, y0, y1, bas, haut, poignee) => {
    y0 += 0.25; y1 -= 0.25; bas += 0.25; haut -= 0.25;
    ajouter([xf, y0, xf + 1.4, y1], bas, haut, laque);
    ajouter([xf + 1.4, y0, xf + 2, y0 + 6], bas, haut, laque);
    ajouter([xf + 1.4, y1 - 6, xf + 2, y1], bas, haut, laque);
    ajouter([xf + 1.4, y0 + 6, xf + 2, y1 - 6], bas, bas + 6, laque);
    ajouter([xf + 1.4, y0 + 6, xf + 2, y1 - 6], haut - 6, haut, laque);
    if (!poignee) return;
    const h = poignee === 'haut' ? haut - 3.4 : poignee === 'bas' ? bas + 3.4 : (bas + haut) / 2;
    const c = (y0 + y1) / 2, demi = Math.min(9, (y1 - y0) / 2 - 8);
    ajouter([xf + 2, c - demi, xf + 4.6, c - demi + 1.2], h - 0.6, h + 0.6, metal);
    ajouter([xf + 2, c + demi - 1.2, xf + 4.6, c + demi], h - 0.6, h + 0.6, metal);
    ajouter([xf + 3.6, c - demi - 1.5, xf + 4.8, c + demi + 1.5], h - 0.6, h + 0.6, metal);
  };
  const fin = m.y + m.longueur;
  // Socle, caissons, plan de travail et dosseret.
  ajouter([X, m.y, X + PROF - 5, fin], 0, SOCLE, mat(m.socle));
  ajouter([X, m.y, X + PROF, fin], SOCLE, HAUT_BAS, mat(m.facade, { roughness: 0.6 }));
  ajouter([X, m.y, X + PROF + 4, fin], HAUT_BAS, HAUT_BAS + 4, pierre);
  ajouter([X, m.y, X + 2, fin], HAUT_BAS + 4, HAUT_BAS + 16, pierre);
  let y = m.y;
  for (const b of m.bas) {
    const y0 = y, y1 = y + b.l, xf = X + PROF;
    if (b.genre === 'porte') facade(xf, y0, y1, SOCLE, HAUT_BAS, 'haut');
    if (b.genre === 'tiroirs') for (let k = 0; k < 3; k++) facade(xf, y0, y1, SOCLE + (k * (HAUT_BAS - SOCLE)) / 3, SOCLE + ((k + 1) * (HAUT_BAS - SOCLE)) / 3, 'milieu');
    if (b.genre === 'four') {
      facade(xf, y0, y1, SOCLE, 26, null);
      ajouter([xf, y0 + 0.5, xf + 2, y1 - 0.5], 26, 77, verreNoir);            // porte vitrée du four
      ajouter([xf, y0 + 0.5, xf + 2.2, y1 - 0.5], 77, HAUT_BAS - 0.3, metal);  // bandeau de commandes
      ajouter([xf + 2, y0 + 6, xf + 5, y1 - 6], 72.5, 74, metal);              // poignée
    }
    y = y1;
  }
  // Plaque de cuisson, évier inox et robinet.
  const dessus = HAUT_BAS + 4;
  ajouter([X + 7, m.y + m.plaque[0], X + PROF - 3, m.y + m.plaque[1]], dessus, dessus + 0.5, verreNoir);
  const [e0, e1] = [m.y + m.evier[0], m.y + m.evier[1]];
  ajouter([X + 9, e0, X + PROF - 4, e1], dessus, dessus + 0.4, metal);
  ajouter([X + 13, e0 + 4, X + PROF - 8, e0 + 42], dessus + 0.4, dessus + 0.6, mat('#7f8387', { roughness: 0.35 }));
  ajouter([X + 5, e0 + 44, X + 7.4, e0 + 46.4], dessus, dessus + 26, metal);
  ajouter([X + 5, e0 + 44.4, X + 24, e0 + 46], dessus + 24, dessus + 26, metal);
  // Meubles hauts : rangée basse 145-195, rangée haute 195-240 ; la colonne hotte est plus courte.
  const PH = 35, B1 = 145, B2 = 195, B3 = 240;
  y = m.y;
  for (const h of m.hauts) {
    const y0 = y, y1 = y + h.l, bas = h.genre === 'hotte' ? 162 : B1;
    ajouter([X, y0, X + PH, y1], bas, B3, mat(m.facade, { roughness: 0.6 }));
    facade(X + PH, y0, y1, bas, B2, 'bas');
    facade(X + PH, y0, y1, B2, B3, 'bas');
    if (h.genre === 'hotte') ajouter([X, y0 + 1, X + 48, y1 - 1], bas - 5, bas, metal);
    y = y1;
  }
  g.name = m.nom;
  return g;
}
// Tableau encadré accroché au mur : cadre noir fin et composition abstraite de formes simples.
// « face » = côté vers lequel l'image regarde (nord, sud, est, ouest) ; « couleurs » = fond puis teintes.
function cadre(m) {
  const c = document.createElement('canvas');
  const enX = m.l >= m.p, largeur = enX ? m.l : m.p;
  c.width = Math.round(largeur * 8); c.height = Math.round(m.h * 8);
  const ctx = c.getContext('2d'), [fond, c1, c2, c3, c4] = m.couleurs, W = c.width, HH = c.height;
  ctx.fillStyle = '#19191b'; ctx.fillRect(0, 0, W, HH);
  const marge = W * 0.03;
  ctx.fillStyle = '#f6f3ec'; ctx.fillRect(marge, marge, W - 2 * marge, HH - 2 * marge); // passe-partout
  if (m.motif === 'brume') {
    // Grande toile abstraite claire : aplats crème et sable fondus, traversés d'une ligne de brume grise.
    const cadreNoir = Math.max(6, W * 0.012);
    const g0 = ctx.createLinearGradient(0, 0, W, HH);
    g0.addColorStop(0, fond); g0.addColorStop(0.55, c1); g0.addColorStop(1, fond);
    ctx.fillStyle = g0; ctx.fillRect(cadreNoir, cadreNoir, W - 2 * cadreNoir, HH - 2 * cadreNoir);
    let graine = 3;
    const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) { // nuages doux
      const cx = alea() * W, cy = alea() * HH, r = W * (0.08 + alea() * 0.16);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      halo.addColorStop(0, i % 3 ? c2 : c1); halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.28; ctx.fillStyle = halo; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
    const ligne = (decalage, epaisseur, alpha) => { // ligne de brume ondulée
      ctx.strokeStyle = c3; ctx.globalAlpha = alpha; ctx.lineWidth = epaisseur; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W * 0.04, HH * (0.6 + decalage));
      ctx.bezierCurveTo(W * 0.22, HH * (0.42 + decalage), W * 0.36, HH * (0.78 + decalage), W * 0.52, HH * (0.62 + decalage));
      ctx.bezierCurveTo(W * 0.68, HH * (0.46 + decalage), W * 0.8, HH * (0.74 + decalage), W * 0.96, HH * (0.5 + decalage));
      ctx.stroke();
    };
    if (m.ligne !== false) { ligne(0, HH * 0.05, 0.16); ligne(0.004, HH * 0.022, 0.3); ligne(0.008, HH * 0.008, 0.55); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#19191b'; ctx.lineWidth = cadreNoir * 2; ctx.strokeRect(0, 0, W, HH);
  } else {
  const x0 = W * 0.12, y0 = HH * 0.1, w = W * 0.76, h = HH * 0.8;
  ctx.fillStyle = fond; ctx.fillRect(x0, y0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  const disque = (cx, cy, r, couleur, de = 0, a = Math.PI * 2) => { ctx.fillStyle = couleur; ctx.beginPath(); ctx.moveTo(x0 + cx * w, y0 + cy * h); ctx.arc(x0 + cx * w, y0 + cy * h, r * w, de, a); ctx.closePath(); ctx.fill(); };
  disque(0.5, 0.36, 0.34, c1, Math.PI, 0);        // demi-soleil orangé
  disque(0.5, 0.36, 0.34, c4, 0, Math.PI);        // son reflet bois
  disque(0.28, 0.74, 0.2, c2);                    // disque noir
  disque(0.74, 0.8, 0.3, c3, Math.PI, Math.PI * 1.5); // quart vert sauge
  ctx.fillStyle = c2; ctx.fillRect(x0 + w * 0.62, y0 + h * 0.56, w * 0.05, h * 0.36);
  ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const noir = mat('#19191b', { roughness: 0.5 }), image = mat('#ffffff', { map: t, roughness: 0.8 });
  const faces = [noir, noir, noir, noir, noir, noir];
  faces[{ est: 0, ouest: 1, sud: 4, nord: 5 }[m.face]] = image;
  const tableau = boite([m.x, m.y, m.x + m.l, m.y + m.p], m.bas, m.bas + m.h, faces, false);
  tableau.name = m.nom;
  return tableau;
}

// Plante haute en pot : cache-pot, tronc fin et grandes feuilles ovales réparties en couronne.
function plante(m) {
  const g = new THREE.Group();
  const pot = mat(m.pot, { roughness: 0.8 }), vert = mat(m.feuillage, { roughness: 0.7, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 32, 32), pot).translateY(16));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 1, 32), mat('#3a2c22')).translateY(31));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, m.h * 0.55, 8), mat('#5b4a35')).translateY(31 + m.h * 0.275));
  let graine = 5;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const feuille = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 16; i++) {
    const tour = i * 2.4, niveau = i / 15, rayon = 14 + 22 * Math.sin(niveau * Math.PI) + alea() * 6;
    const f = new THREE.Mesh(feuille, vert);
    f.scale.set(13 + alea() * 5, 1.2, 22 + alea() * 8);
    f.position.set(Math.cos(tour) * rayon, 55 + niveau * (m.h - 70), Math.sin(tour) * rayon);
    f.rotation.set(0.5 - niveau * 0.9, -tour + Math.PI / 2, 0, 'YXZ');
    g.add(f);
  }
  return poser(g, m, m.cx, m.cy, 0);
}
// Bureau « Ava » : plateau bois à angles arrondis et rebord arrière qui retombe sur les côtés,
// piétement luge en tube blanc, tablette en métal perforé sous le plateau, croisillon à l'arrière.
function bureauAva(m) {
  const L = Math.max(m.l, m.p), P = Math.min(m.l, m.p), H = m.h, ep = 2, R = 6;
  const veines = textureBois(m.couleur, m.veine);
  veines.repeat.set(1 / L, 3 / L);
  const bois = mat('#ffffff', { map: veines, roughness: 0.55 });
  const boisUni = mat(m.couleur, { roughness: 0.55 });
  const blanc = mat(m.metal, { roughness: 0.45 });
  const g = new THREE.Group();
  // Plateau : contour arrondi extrudé puis couché (le « y » du tracé devient la profondeur, avant vers -z).
  const f = new THREE.Shape(), a = L / 2, b = P / 2;
  f.moveTo(-a + R, -b);
  f.lineTo(a - R, -b); f.absarc(a - R, -b + R, R, -Math.PI / 2, 0);
  f.lineTo(a, b - 1); f.absarc(a - 1, b - 1, 1, 0, Math.PI / 2);
  f.lineTo(-a + 1, b); f.absarc(-a + 1, b - 1, 1, Math.PI / 2, Math.PI);
  f.lineTo(-a, -b + R); f.absarc(-a + R, -b + R, R, Math.PI, Math.PI * 1.5);
  const plateau = new THREE.ExtrudeGeometry(f, { depth: ep - 0.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2, curveSegments: 10 });
  plateau.rotateX(Math.PI / 2); // tracé +y → vers l'arrière (+z), épaisseur vers le bas
  g.add(new THREE.Mesh(plateau, bois).translateY(H - 0.3));
  // Rebord : panneau arrière, et deux joues qui descendent en courbe vers l'avant.
  g.add(bloc(L - 2.4, m.rebord, 1.2, 0, H + m.rebord / 2, b - 0.6, boisUni, 0.4));
  const joue = new THREE.Shape();
  joue.moveTo(0, 0); joue.lineTo(24, 0); joue.quadraticCurveTo(8, 1.5, 0, m.rebord); joue.closePath();
  for (const sx of [-1, 1]) {
    const gj = new THREE.ExtrudeGeometry(joue, { depth: 1.2, bevelEnabled: false });
    gj.rotateY(Math.PI / 2); // la joue file vers l'avant (-z)
    g.add(new THREE.Mesh(gj, boisUni).translateX(sx > 0 ? a - 1.2 : -a).translateY(H).translateZ(b));
  }
  // Piétement luge : montant arrière, patin au sol, montant avant incliné ; tablette perforée ; croisillon.
  const r = 1.1, xs = a - 5, zAr = b - 6, zAv = -b + 3;
  for (const sx of [-1, 1]) {
    const x = sx * xs;
    g.add(tube([x, H - ep, zAr], [x, r, zAr + 1], r, r, blanc, 12));
    g.add(tube([x, r, zAr + 1], [x, r, zAv], r, r, blanc, 12));
    g.add(tube([x, H - ep, zAv + 14], [x, r, zAv], r, r, blanc, 12));
    for (const z of [zAr + 1, zAv]) g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), blanc).translateX(x).translateY(r).translateZ(z));
    g.add(tube([x, H - ep - 1, zAr], [x, H - ep - 1, zAv + 14], r * 0.8, r * 0.8, blanc, 12));
  }
  const yTab = H - 11;
  g.add(bloc(2 * xs, 0.5, 34, 0, yTab, zAr - 17, mat(m.metal, { roughness: 0.6, transparent: true, opacity: 0.88 })));
  for (const z of [zAr, zAr - 34]) g.add(tube([-xs, yTab, z], [xs, yTab, z], r * 0.8, r * 0.8, blanc, 12));
  g.add(tube([-xs, yTab - 4, zAr], [xs, 26, zAr], 0.35, 0.35, blanc, 8));
  g.add(tube([xs, yTab - 4, zAr], [-xs, 26, zAr], 0.35, 0.35, blanc, 8));
  return poser(g, m, m.x + m.l / 2, m.y + m.p / 2, m.p > m.l ? Math.PI / 2 : 0);
}
// Chaise de bureau à coques en bois cintré : assise et dossier capitonnés, reliés par deux plats métalliques,
// piétement étoile à cinq branches sur roulettes, sans accoudoirs.
function chaiseBureauBois(m) {
  const tissu = mat(m.tissu, { roughness: 1 }), bois = mat(m.bois, { roughness: 0.5, side: THREE.DoubleSide });
  const metal = mat(m.metal, { roughness: 0.45 });
  const g = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3, dx = Math.sin(a), dz = Math.cos(a);
    g.add(tube([dx * 4, 9, dz * 4], [dx * 29, 6.5, dz * 29], 2.2, 1.6, metal));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), metal).translateX(dx * 29).translateY(3).translateZ(dz * 29));
  }
  g.add(tube([0, 30, 0], [0, 8, 0], 2.8, 3.2, metal, 20));
  g.add(tube([0, 40, 0], [0, 30, 0], 1.6, 1.6, mat('#b9bcc0', { roughness: 0.3 }), 16));
  g.add(bloc(20, 3, 20, 0, 40.5, -1, mat('#2a2a2c'), 1));
  // Assise : coque bois qui remonte légèrement sur les côtés, coussin vert par-dessus.
  g.add(bloc(50, 4, 46, 0, 44, 0, bois, 2));
  for (const sx of [-1, 1]) g.add(bloc(3, 6, 42, sx * 24, 46, 0, bois, 1.5));
  g.add(bloc(46, 6, 43, 0, 48, 0.5, tissu, 3));
  // Dossier : coque bois cintrée (portion de cylindre), coussin et ses deux boutons, deux plats de liaison.
  const coque = new THREE.Mesh(new THREE.CylinderGeometry(44, 44, 27, 24, 1, true, Math.PI - 0.55, 1.1), bois);
  coque.position.set(0, 76.5, 17);
  g.add(coque);
  // Coussin du dossier : secteur d'anneau plein, extrudé en hauteur, qui suit le cintre de la coque.
  const secteur = new THREE.Shape();
  secteur.absarc(0, -17, 42.8, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, false);
  secteur.absarc(0, -17, 39.4, Math.PI / 2 + 0.5, Math.PI / 2 - 0.5, true);
  const gc = new THREE.ExtrudeGeometry(secteur, { depth: 23, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 16 });
  gc.rotateX(-Math.PI / 2); // tracé +y → vers l'arrière (-z), extrusion → vers le haut
  g.add(new THREE.Mesh(gc, tissu).translateY(65));
  for (const sx of [-1, 1]) {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat('#7d9c86')).translateX(sx * 7).translateY(79).translateZ(-22));
    g.add(tube([sx * 8, 72, -27.6], [sx * 8, 42, -20], 1.2, 1.2, metal));
  }
  const angle = THREE.MathUtils.degToRad(m.angle ?? 0);
  return poser(g, m, m.cx, m.cy, (ORIENTATIONS[m.dos] ?? 0) + angle);
}
// Miroir mural en forme de pilule (rectangle terminé par deux demi-cercles), fin cadre noir, vrai reflet.
// « mur » = position de la face du mur, « face » = côté vers lequel le miroir regarde (est ou ouest).
function miroir(m) {
  const pilule = (l, h) => {
    const f = new THREE.Shape(), r = l / 2;
    f.absarc(0, h / 2 - r, r, 0, Math.PI);
    f.absarc(0, -h / 2 + r, r, Math.PI, Math.PI * 2);
    f.closePath();
    return f;
  };
  const g = new THREE.Group();
  const cadreGeo = new THREE.ExtrudeGeometry(pilule(m.largeur, m.hauteur), { depth: 1.6, bevelEnabled: false, curveSegments: 24 });
  g.add(new THREE.Mesh(cadreGeo, mat('#161618', { roughness: 0.5 })));
  const glace = new Reflector(new THREE.ShapeGeometry(pilule(m.largeur - 2.4, m.hauteur - 2.4), 24), {
    textureWidth: 768, textureHeight: 1536, color: '#d5d8d8', clipBias: 0.003,
  });
  glace.position.z = 1.75;
  g.add(glace);
  const sens = m.face === 'ouest' ? -1 : 1;
  g.scale.setScalar(CM);
  g.rotation.y = (sens * Math.PI) / 2;
  g.position.set(m.mur * CM, (m.bas + m.hauteur / 2) * CM, m.centre * CM);
  g.name = m.nom;
  return g;
}
const objets = { chaiseCoque, tableBois, bureau, fauteuilBureau, tapis, lampadaire, cuisine, cadre, plante, bureauAva, chaiseBureauBois, miroir };

// Essais de déco : chaque nom d'« essai » présent dans les données peut être affiché ou masqué.
const essaisMasques = new Set();

// Sols : textures dessinées à la volée, calées sur les coordonnées du plan pour être continues d'une zone à l'autre.
const texturesSol = new Map();
function materiauSol(nom) {
  if (texturesSol.has(nom)) return texturesSol.get(nom);
  const def = P.sols[nom];
  let m;
  if (def.type === 'uni') {
    m = mat(def.couleur);
  } else {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    if (def.type === 'carreaux') {
      ctx.fillStyle = def.joint; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = def.fond; ctx.fillRect(5, 5, 502, 502);
    } else {
      // Lames de parquet : 8 rangs, lames de longueurs décalées.
      for (let rang = 0; rang < 8; rang++) {
        for (let i = -1; i < 4; i++) {
          ctx.fillStyle = def.teintes[(rang * 3 + i * 5 + 8) % def.teintes.length];
          ctx.fillRect(i * 170 + ((rang * 67) % 170), rang * 64, 169, 63);
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (def.diagonale) t.rotation = Math.PI / 4;
    m = mat('#ffffff', { map: t });
    m.userData.taille = def.taille;
  }
  texturesSol.set(nom, m);
  return m;
}

function sol([x0, y0, x1, y1], nom) {
  const m = materiauSol(nom);
  const g = new THREE.PlaneGeometry((x1 - x0) * CM, (y1 - y0) * CM);
  const t = m.userData.taille ?? 100;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0, y0, x1, y0, x0, y1, x1, y1].map((v) => v / t), 2));
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(((x0 + x1) / 2) * CM, 0, ((y0 + y1) / 2) * CM);
  mesh.receiveShadow = true;
  return mesh;
}

const coque = new THREE.Group();
const etiquettes = new THREE.Group();
scene.add(coque, etiquettes);

function construire() {
  coque.clear();
  etiquettes.clear();
  for (const r of A.dalle) coque.add(boite(r, -20, -1, mat(P.dalle), false));
  for (const p of A.pieces) {
    for (const z of p.zones) coque.add(sol(z, p.sol));
    etiquettes.add(etiquette(p));
  }
  socles.length = 0;
  for (const m of A.murs) construireMur(m, coque);
  construirePlinthes(coque);
  for (const p of A.placards) {
    const [r, couleur] = Array.isArray(p) ? [p, P.placard] : [p.r, p.couleur];
    coque.add(boite(r, 0, H, mat(couleur)));
  }
  for (const p of A.peintures) coque.add(boite(p.r, p.bas ?? 0, H, mat(p.couleur), false));
  for (const m of [...A.equipements, ...A.mobilier]) {
    if (m.essai && essaisMasques.has(m.essai)) continue;
    if (m.siEssai && essaisMasques.has(m.siEssai)) continue; // dépend d'un autre essai
    if (m.saufEssai && [].concat(m.saufEssai).some((e) => !essaisMasques.has(e))) continue; // remplacé par un essai actif
    coque.add(m.type ? objets[m.type](m) : meuble(m));
  }
  const G = A.gardeCorps;
  for (const r of G.segments) {
    coque.add(boite(r, 0, G.muret.hauteur, mat(G.muret.couleur)));
    const [x0, y0, x1, y1] = r, enX = x1 - x0 > y1 - y0;
    const fine = enX ? [x0, (y0 + y1) / 2 - 1.5, x1, (y0 + y1) / 2 + 1.5] : [(x0 + x1) / 2 - 1.5, y0, (x0 + x1) / 2 + 1.5, y1];
    for (const h of G.lisses.hauteurs) coque.add(boite(fine, h - 1.5, h + 1.5, mat(G.lisses.couleur, { roughness: 0.4 })));
    for (let u = enX ? x0 : y0; u <= (enX ? x1 : y1); u += 100) {
      const poteau = enX ? [u, fine[1], Math.min(u + 3, x1), fine[3]] : [fine[0], u, fine[2], Math.min(u + 3, y1)];
      coque.add(boite(poteau, G.muret.hauteur, Math.max(...G.lisses.hauteurs), mat(G.lisses.couleur)));
    }
  }
  const depoli = mat('#eef2f3', { transparent: true, opacity: 0.6, roughness: 0.9 });
  coque.add(boite(G.ecran.r, 0, G.ecran.hauteur, depoli, false));
}
construire();

// Plafond : présent seulement en visite (les vues « maquette » gardent le toit ouvert).
const plafond = new THREE.Group();
for (const r of A.dalle) plafond.add(boite(r, H, H + 15, mat('#fbfaf6')));
scene.add(plafond);

// Luminaires : un abat-jour et une source ponctuelle chacun.
const luminaires = new THREE.Group();
scene.add(luminaires);
const lampes = [];
for (const l of A.eclairage.luminaires) {
  if (l.type === 'diffuse') {
    // Lampe à abat-jour translucide : une source douce dans toutes les directions, sans abat-jour propre.
    const lampe = new THREE.PointLight(l.teinte ?? '#ffdcae', 0, 7, 2);
    lampe.position.set(l.x * CM, l.hauteur * CM, l.y * CM);
    luminaires.add(lampe);
    lampes.push({ lampe, lueur: new THREE.PointLight('#000000', 0), abat: mat('#000000'), def: l });
    continue;
  }
  const x = l.x * CM, z = l.y * CM, rayon = (l.diametre * CM) / 2;
  const abat = mat(l.couleur, { emissive: l.couleur, emissiveIntensity: 0, side: THREE.DoubleSide });
  let yLampe, ampoule;
  if (l.type === 'gradins') {
    // Suspension en verre émaillé à trois gradins : profil tourné autour de l'axe (rayon, hauteur), en cm
    // pour un diamètre de 32, mis à l'échelle du diamètre demandé.
    const k = (l.diametre / 32) * CM, bas = l.hauteur * CM;
    const profil = [
      [14.6, 0], [15.6, 0.6], [16, 1.8], [16, 5.2], [15.5, 6.5], [14.4, 7],
      [11.8, 7], [11.2, 7.3], [11, 8], [11, 11.6], [10.6, 12.6], [9.8, 13],
      [6.2, 13], [5.7, 13.3], [5.5, 14], [5.5, 20.6], [5.1, 21.6], [4.2, 22], [1.2, 22],
    ].map(([r, y]) => new THREE.Vector2(r * k, y * k));
    const email = new THREE.MeshPhysicalMaterial({
      color: l.couleur, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide,
      emissive: l.couleur, emissiveIntensity: 0, envMap: reflets, envMapIntensity: 0.45,
    });
    const noir = mat('#1a1a1c', { roughness: 0.6 });
    const cloche = new THREE.Mesh(new THREE.LatheGeometry(profil, 64), email);
    const douille = new THREE.Mesh(new THREE.CylinderGeometry(2.3 * k, 2.6 * k, 4.5 * k, 24), noir);
    douille.position.y = 24 * k;
    const longueurFil = H * CM - bas - 26 * k;
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, longueurFil), noir);
    fil.position.y = 26 * k + longueurFil / 2;
    const rosace = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 32), noir);
    rosace.position.y = H * CM - bas - 0.0125;
    const reflecteur = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4 * k, 6.8 * k, 5 * k, 32, 1, true),
      mat('#f6f4ee', { side: THREE.DoubleSide }),
    );
    reflecteur.position.y = 3.5 * k;
    ampoule = mat('#fffaf0', { emissive: '#ffe2b0', emissiveIntensity: 0 });
    const bulbe = new THREE.Mesh(new THREE.SphereGeometry(3 * k, 24, 16), ampoule);
    bulbe.position.y = 4 * k;
    const lustre = new THREE.Group();
    lustre.add(cloche, douille, fil, rosace, reflecteur, bulbe);
    lustre.position.set(x, bas, z);
    lustre.name = l.nom;
    luminaires.add(lustre);
    abat.dispose();
    lampes.abatGradins = email;
    yLampe = bas + 0.5 * k;
  } else if (l.type === 'suspension') {
    const bas = l.hauteur * CM, hauteurAbat = Math.max(0.06, rayon * 0.9);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.4, rayon, hauteurAbat, 32, 1, true), abat);
    cone.position.set(x, bas + hauteurAbat / 2, z);
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, H * CM - bas - hauteurAbat), mat('#1c1c1e'));
    fil.position.set(x, (H * CM + bas + hauteurAbat) / 2, z);
    luminaires.add(cone, fil);
    yLampe = bas + 0.02;
  } else {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(rayon, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), abat);
    dome.scale.y = 0.6;
    dome.position.set(x, H * CM, z);
    luminaires.add(dome);
    yLampe = H * CM - rayon * 0.6 - 0.04;
  }
  // Un vrai luminaire n'éclaire presque pas vers le haut (abat-jour, vasque) : faisceau large dirigé vers le bas,
  // plus une faible lueur diffuse placée plus bas, pour que le plafond ne soit ni noir ni « brûlé ».
  const teinte = l.teinte ?? '#ffdcae';
  const lampe = new THREE.SpotLight(teinte, 0, 9, 1.35, 0.6, 2);
  lampe.position.set(x, yLampe, z);
  lampe.target.position.set(x, 0, z);
  if (l.ombre) {
    lampe.castShadow = true;
    lampe.shadow.mapSize.set(2048, 2048);
    lampe.shadow.bias = -0.002;
    Object.assign(lampe.shadow.camera, { near: 0.05, far: 9 });
  }
  const lueur = new THREE.PointLight(teinte, 0, 6, 2);
  lueur.position.set(x, Math.min(yLampe, H * CM - 0.8), z);
  luminaires.add(lampe, lampe.target, lueur);
  lampes.push({ lampe, lueur, abat: l.type === 'gradins' ? lampes.abatGradins : abat, ampoule, def: l });
}

// --- Caméra et navigation --------------------------------------------------

const boiteEnglobante = new THREE.Box3().setFromObject(coque);
const centre = boiteEnglobante.getCenter(new THREE.Vector3());
centre.y = 0;

const orbite = new OrbitControls(camera, renderer.domElement);
orbite.maxPolarAngle = Math.PI / 2 - 0.02;
orbite.enableDamping = true;

let mode = 'ensemble';
let soir = false;

function appliquerLumiere() {
  const visite = mode === 'visite';
  plafond.visible = visite;
  zenith.visible = !soir && !visite;
  soleil.visible = !soir && visite;
  zenith.intensity = 1.9;
  // Vue de dessus : lumière presque verticale, sinon les ombres des murs noient les petites pièces.
  const inclinaison = mode === 'dessus' ? new THREE.Vector3(0.06, 1, 0.08) : new THREE.Vector3(0.3, 1, 0.22);
  zenith.position.copy(CIBLE).addScaledVector(inclinaison.normalize(), 25);
  soleil.intensity = 1.9;
  ambiante.intensity = soir ? 0.7 : visite ? 1.45 : 1.55;
  ciel.intensity = soir ? 0 : visite ? 0.9 : 0.6;
  appoint.intensity = soir || !visite ? 0 : 0.9;
  ambiante.color.set(soir ? '#cfd6ff' : '#ffffff');
  scene.background.set(soir ? '#15161c' : visite ? '#cfe2f1' : '#e9e7e2');
  coque.traverse((o) => { if (o.material?.userData?.lueur) o.material.emissiveIntensity = soir ? 0.55 : 0; });
  for (const { lampe, lueur, abat, ampoule, def } of lampes) {
    const allume = soir && !(def.essai && essaisMasques.has(def.essai));
    lampe.intensity = allume ? def.intensite * 1.8 : 0;
    lueur.intensity = allume ? def.intensite * 0.08 : 0;
    abat.emissiveIntensity = soir ? (def.type === 'gradins' ? 0.35 : 0.9) : 0;
    if (ampoule) ampoule.emissiveIntensity = soir ? 2 : 0;
  }
}
const regard = { lacet: 0, tangage: 0 };
const aide = document.getElementById('aide');
const boutons = {
  ensemble: document.getElementById('vue-ensemble'),
  dessus: document.getElementById('vue-dessus'),
  visite: document.getElementById('vue-visite'),
};
const choixPiece = document.getElementById('piece');
for (const p of A.pieces) choixPiece.add(new Option(p.nom, p.id));
choixPiece.value = 'sejour';

function allerA(nouveauMode) {
  mode = nouveauMode;
  for (const [k, b] of Object.entries(boutons)) b.classList.toggle('actif', k === mode);
  orbite.enabled = mode !== 'visite';
  appliquerLumiere();
  camera.fov = mode === 'dessus' ? 9 : mode === 'visite' ? A.focaleCaptures : 45;
  camera.near = 0.05;
  camera.updateProjectionMatrix();
  // Distance telle que toute la maquette tienne dans la fenêtre, quel que soit son format.
  const taille = boiteEnglobante.getSize(new THREE.Vector3());
  const demiV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const demiH = demiV * (Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1);
  if (mode === 'ensemble') {
    const rayon = Math.hypot(taille.x, taille.z) / 2;
    const d = (rayon / Math.min(demiV, demiH)) * 1.1;
    camera.position.copy(centre).add(new THREE.Vector3(0.2, 0.8, 0.56).normalize().multiplyScalar(d));
    orbite.target.copy(centre);
    aide.textContent = 'Glisser : tourner · Molette : zoomer · Clic droit : déplacer';
  } else if (mode === 'dessus') {
    const d = Math.max(taille.z / 2 / demiV, taille.x / 2 / demiH) * 1.08;
    camera.position.set(centre.x, d, centre.z + 0.01);
    camera.near = Math.max(0.05, d - 20); // vue lointaine : resserrer la profondeur pour un rendu net
    camera.updateProjectionMatrix();
    orbite.target.copy(centre);
    aide.textContent = 'Vue en plan — les fenêtres des chambres sont en haut, comme sur votre plan';
  } else {
    const p = A.pieces.find((q) => q.id === choixPiece.value);
    camera.position.set(p.etiquette[0] * CM, 1.6, p.etiquette[1] * CM);
    regard.lacet = 0; regard.tangage = 0;
    aide.textContent = 'Glisser : regarder autour · Flèches ou ZQSD : avancer · Regard à 1,60 m';
  }
}
for (const [k, b] of Object.entries(boutons)) b.onclick = () => allerA(k);
choixPiece.onchange = () => { document.getElementById('point-de-vue').value = ''; allerA('visite'); };
// Une case à cocher par essai de déco, et un menu de variantes qui coche d'un coup une sélection d'essais.
const casesEssais = new Map();
for (const nom of new Set(A.mobilier.map((m) => m.essai).filter(Boolean))) {
  const etiq = document.createElement('label');
  etiq.className = 'case essai';
  const caseACocher = Object.assign(document.createElement('input'), { type: 'checkbox', checked: true });
  caseACocher.onchange = () => {
    if (caseACocher.checked) essaisMasques.delete(nom); else essaisMasques.add(nom);
    construire();
    appliquerLumiere();
  };
  etiq.append(caseACocher, ` Essai : ${nom}`);
  document.getElementById('barre').append(etiq);
  casesEssais.set(nom, caseACocher);
}
const choixVariante = document.getElementById('variante');
for (const v of A.variantes.liste) choixVariante.add(new Option(`Variante : ${v.nom}`, v.nom));
function appliquerVariante(nom) {
  const variante = A.variantes.liste.find((v) => v.nom === nom);
  if (!variante) return;
  choixVariante.value = nom;
  essaisMasques.clear();
  for (const [essai, caseACocher] of casesEssais) {
    caseACocher.checked = variante.essais.includes(essai);
    if (!caseACocher.checked) essaisMasques.add(essai);
  }
  construire();
  appliquerLumiere();
}
choixVariante.onchange = () => appliquerVariante(choixVariante.value);
const boutonAmbiance = document.getElementById('ambiance');
boutonAmbiance.onclick = () => {
  soir = !soir;
  boutonAmbiance.textContent = soir ? 'Ambiance : soir' : 'Ambiance : jour';
  appliquerLumiere();
};
document.getElementById('cotes').onchange = (e) => { etiquettes.visible = e.target.checked; };

// --- Points de vue et captures ----------------------------------------------
const choixVue = document.getElementById('point-de-vue');
A.pointsDeVue.forEach((p, i) => choixVue.add(new Option(p.nom, i)));

function allerAuPointDeVue(i) {
  const p = A.pointsDeVue[i];
  allerA('visite');
  const C = A.camerasAngles, hauteur = p.hauteur ?? C.hauteur;
  const dx = p.vers[0] - p.de[0], dy = p.vers[1] - p.de[1];
  camera.fov = p.focale ?? C.focale;
  camera.updateProjectionMatrix();
  camera.position.set(p.de[0] * CM, hauteur * CM, p.de[1] * CM);
  regard.lacet = Math.atan2(-dx, -dy);
  regard.tangage = Math.atan2((p.hauteurVisee ?? C.hauteurVisee) - hauteur, Math.hypot(dx, dy));
  camera.rotation.set(regard.tangage, regard.lacet, 0, 'YXZ');
  aide.textContent = `Point de vue : ${p.nom} — « Capturer » l'enregistre dans le dossier captures/`;
}
choixVue.onchange = () => { if (choixVue.value !== '') allerAuPointDeVue(+choixVue.value); };

// Rend la vue courante en 2400 × 1600 (paysage), sans les étiquettes, et l'envoie au serveur local.
async function capturer(nom) {
  const L = 2400, HAUT = 1600;
  const avant = { taille: renderer.getSize(new THREE.Vector2()), ratio: renderer.getPixelRatio(), aspect: camera.aspect, etiquettes: etiquettes.visible };
  renderer.setPixelRatio(1);
  renderer.setSize(L, HAUT, false);
  camera.aspect = L / HAUT;
  camera.updateProjectionMatrix();
  etiquettes.visible = false;
  renderer.render(scene, camera);
  const image = await new Promise((r) => renderer.domElement.toBlob(r, 'image/png'));
  renderer.setPixelRatio(avant.ratio);
  renderer.setSize(avant.taille.x, avant.taille.y, false);
  camera.aspect = avant.aspect;
  camera.updateProjectionMatrix();
  etiquettes.visible = avant.etiquettes;
  const fichier = `${choixVariante.value} ${nom} ${soir ? 'soir' : 'jour'}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const reponse = await fetch(`/capture?nom=${encodeURIComponent(fichier)}`, { method: 'POST', body: image });
  if (!reponse.ok) throw new Error('enregistrement refusé');
  return reponse.text();
}
const nomVueCourante = () => (mode === 'visite' && choixVue.value !== '' ? A.pointsDeVue[+choixVue.value].nom : `vue ${mode}`);
// Les captures ne s'enregistrent qu'avec le serveur local : boutons masqués sur la version en ligne.
if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
  for (const id of ['capturer', 'capturer-tout']) document.getElementById(id).style.display = 'none';
}
document.getElementById('capturer').onclick = async () => {
  try { aide.textContent = `Image enregistrée : ${await capturer(nomVueCourante())}`; }
  catch (e) { aide.textContent = `Capture impossible : ${e.message}`; }
};
async function toutCapturer() {
  const faites = [];
  for (let i = 0; i < A.pointsDeVue.length; i++) {
    choixVue.value = i;
    allerAuPointDeVue(i);
    aide.textContent = `Capture ${i + 1} / ${A.pointsDeVue.length}…`;
    await new Promise((r) => setTimeout(r, 30)); // pas d'attente d'affichage : fonctionne aussi page masquée
    faites.push(await capturer(`${String(i + 1).padStart(2, '0')} ${A.pointsDeVue[i].nom}`));
  }
  aide.textContent = `${faites.length} images enregistrées dans le dossier captures/`;
  return faites;
}
document.getElementById('capturer-tout').onclick = () => toutCapturer().catch((e) => { aide.textContent = `Capture impossible : ${e.message}`; });

// Visite : glisser pour regarder, clavier pour avancer.
let glisse = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (mode === 'visite') glisse = [e.clientX, e.clientY]; });
addEventListener('pointerup', () => { glisse = null; });
addEventListener('pointermove', (e) => {
  if (!glisse) return;
  regard.lacet -= (e.clientX - glisse[0]) * 0.004;
  regard.tangage = THREE.MathUtils.clamp(regard.tangage - (e.clientY - glisse[1]) * 0.004, -1.2, 1.2);
  glisse = [e.clientX, e.clientY];
});
const touches = new Set();
addEventListener('keydown', (e) => touches.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => touches.delete(e.key.toLowerCase()));

function redimensionner() {
  if (!innerWidth || !innerHeight) return; // page chargée dans un volet masqué : on attend d'avoir une taille
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (!Number.isFinite(camera.position.x)) allerA(mode); // cadrage calculé sans taille : on le refait
}
addEventListener('resize', redimensionner);
redimensionner();
allerA('ensemble');
appliquerVariante(A.variantes.defaut);

const horloge = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(horloge.getDelta(), 0.1);
  if (mode === 'visite') {
    const av = (touches.has('arrowup') || touches.has('z') || touches.has('w') ? 1 : 0) - (touches.has('arrowdown') || touches.has('s') ? 1 : 0);
    const cote = (touches.has('arrowright') || touches.has('d') ? 1 : 0) - (touches.has('arrowleft') || touches.has('q') || touches.has('a') ? 1 : 0);
    const v = 1.5 * dt;
    camera.position.x += (-Math.sin(regard.lacet) * av + Math.cos(regard.lacet) * cote) * v;
    camera.position.z += (-Math.cos(regard.lacet) * av - Math.sin(regard.lacet) * cote) * v;
    camera.rotation.set(regard.tangage, regard.lacet, 0, 'YXZ');
  } else {
    orbite.update();
  }
  renderer.render(scene, camera);
});

window.__app = { scene, camera, allerA, construire, A, regard, orbite, toutCapturer, allerAuPointDeVue, appliquerVariante };
