import { useState, useRef, useMemo, useCallback, createContext, useContext, useEffect, Component } from "react"; // v20

// ══════════════════════════════════════════════════════
//  VERSIONING — source unique de vérité
// ══════════════════════════════════════════════════════
const VERSION = "3.9.0"; // v77

// ══════════════════════════════════════════════════════
//  GESTION DU BOUTON RETOUR ANDROID (WebView)
//  Android appelle window.__mpBack() via evaluateJavascript.
//  Retourne true si une modal a été fermée, false sinon (Android ferme l'app).
// ══════════════════════════════════════════════════════
const _backStack = [];

if (typeof window !== 'undefined') {
  window.__mpBack = () => {
    if (_backStack.length > 0) {
      _backStack[_backStack.length - 1](); // ferme la modal la plus haute
      return true;
    }
    return false;
  };
}

/**
 * Enregistre un handler "fermeture" pour le bouton retour Android.
 * enabled=false désactive le hook (utile pour les overlays conditionnels).
 */
function useBackHandler(onClose, enabled = true) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!enabled) return;
    const fn = () => ref.current();
    _backStack.push(fn);
    return () => {
      const i = _backStack.lastIndexOf(fn);
      if (i !== -1) _backStack.splice(i, 1);
    };
  }, [enabled]);
}

// ══════════════════════════════════════════════════════
//  PALETTE "ACIER NOCTURNE"
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  THÈMES  —  « classique » = thème d'origine (inchangé) · « minuit » = nouveau thème
//  C est un objet MUTABLE : applyTheme() recopie les valeurs du thème choisi dedans.
//  Tous les composants lisent C.xxx au moment du rendu → changer de thème = re-rendre.
// ══════════════════════════════════════════════════════
const THEMES = {
  classic: {
    id:'classic', label:'Classique', modern:false,
    bg:       '#111419',
    card:     '#181C24',
    cardHov:  '#1E2432',
    border:   '#2A3040',
    ring:     '#2A3040',
    accent:   '#7BA8E8',
    accentDk: '#4878C8',
    accentBg: 'rgba(123,168,232,0.11)',
    accentDkMid: 'rgba(72,120,200,0.4)',
    green:    '#5CC4A0',
    greenBg:  'rgba(92,196,160,0.12)',
    text:     '#E8EAF2',
    hi:       '#FFFFFF',
    onAccent: '#FFFFFF',
    soft:     '#B0BDD8',
    muted:    '#7888A8',
    orange:   '#E8A87B',
    orangeBg: 'rgba(232,168,123,0.12)',
    red:      '#E87878',
    redBg:    'rgba(232,120,120,0.10)',
    sweet:    '#C87BD8',
    sweetBg:  'rgba(200,123,216,0.10)',
    planBg:   '#151B28',
    planBdr:  '#243048',
    cookedBg: 'rgba(92,196,160,0.14)',
    yellow:   '#E8D878',
    snackBg:  '#253040',
    catHdr:   '#1A2636',
    curBg:     'rgba(100, 185, 255, 0.13)',
    curBdr:    'rgba(100, 185, 255, 0.55)',
    curTagBg:  'rgba(100,185,255,0.2)',
    curTagBdr: 'rgba(100,185,255,0.4)',
    sky:      '#7EC8FF',
    skyCur:   '#64B9FF',
    navDk:    '#0F2137',
    navMid:   '#152E52',
    navHdr:   '#1A3A6C',
    navBdr:   '#1E4070',
    navMuted: '#3A6080',
    navDeep:  '#0D2040',
    rBtn:9, rRow:9, rCard:12, rRecipe:11, rBig:14, rSheet:20,
  },
  minuit: {
    id:'minuit', label:'Minuit', modern:true,
    bg:       '#0D0E11',
    card:     '#16181D',
    cardHov:  '#1D2026',
    border:   '#23262D',
    ring:     '#3A3F4A',
    accent:   '#5CC4A0',
    accentDk: '#5CC4A0',
    accentBg: 'rgba(92,196,160,0.12)',
    accentDkMid: 'rgba(92,196,160,0.35)',
    green:    '#5CC4A0',
    greenBg:  'rgba(92,196,160,0.12)',
    text:     '#ECEDF0',
    hi:       '#ECEDF0',
    onAccent: '#0D1F18',
    soft:     '#B7BBC6',
    muted:    '#8A8F9C',
    orange:   '#E8A87B',
    orangeBg: 'rgba(232,168,123,0.12)',
    red:      '#E87878',
    redBg:    'rgba(232,120,120,0.10)',
    sweet:    '#C87BD8',
    sweetBg:  'rgba(200,123,216,0.10)',
    planBg:   '#1D2026',
    planBdr:  '#23262D',
    cookedBg: '#12251F',
    yellow:   '#E8D878',
    snackBg:  '#1D2026',
    catHdr:   '#12251F',
    curBg:     'rgba(92,196,160,0.08)',
    curBdr:    'rgba(92,196,160,0.45)',
    curTagBg:  'rgba(92,196,160,0.18)',
    curTagBdr: 'rgba(92,196,160,0.4)',
    sky:      '#5CC4A0',
    skyCur:   '#5CC4A0',
    navDk:    '#0D0E11',
    navMid:   '#16181D',
    navHdr:   '#16181D',
    navBdr:   '#23262D',
    navMuted: '#8A8F9C',
    navDeep:  '#0D0E11',
    rBtn:20, rRow:14, rCard:20, rRecipe:18, rBig:20, rSheet:28,
  },
};
const THEME_IDS = ['classic', 'minuit'];

const C = { ...THEMES.classic };
function applyTheme(id) { Object.assign(C, THEMES[id] || THEMES.classic); }



const UNITS = ['','g','kg','ml','cl','L','cs','cc','tasse','pincée','tranche','boîte','sachet','bouquet','gousse'];

// ══════════════════════════════════════════════════════
//  CATÉGORIES DE COURSES (données initiales)
// ══════════════════════════════════════════════════════
const DEFAULT_CATS = [
  { id:'c1', name:'Viandes & Poissons', emoji:'🥩', kw:['poulet','bœuf','boeuf','porc','saumon','thon','viande','poisson','jambon','dinde','crevette','veau','agneau','steak','lardons','canard','filet'], order:0 },
  { id:'c2', name:'Fruits & Légumes',   emoji:'🥦', kw:['tomate','carotte','oignon','ail','salade','courgette','poivron','champignon','épinard','epinard','banane','fraise','concombre','aubergine','brocoli','poireau','pomme de terre','citron','haricot','petits pois','navet'], order:1 },
  { id:'c3', name:'Produits laitiers',  emoji:'🧀', kw:['lait','beurre','fromage','crème','creme','yaourt','gruyère','gruyere','parmesan','mozzarella','ricotta','emmental','camembert'], order:2 },
  { id:'c4', name:'Œufs',              emoji:'🥚', kw:['œuf','oeuf'], order:3 },
  { id:'c5', name:'Féculents',          emoji:'🍝', kw:['pâtes','pates','riz','quinoa','semoule','lentille','pois chiche','spaghetti','tagliatelle','gnocchi','nouille','fettuccine'], order:4 },
  { id:'c6', name:'Épicerie',           emoji:'🫙', kw:['huile','vinaigre','sel','sucre','sauce','moutarde','ketchup','poivre','curry','cumin','paprika','cannelle','épice','epice','bouillon','fécule','chapelure','farine','levure','concentré','coulis'], order:5 },
  { id:'c7', name:'Boulangerie',        emoji:'🥖', kw:['pain','baguette','brioche','pain de mie'], order:6 },
  { id:'c8', name:'Boissons',           emoji:'🍶', kw:['eau','jus','vin','bière','biere','café','cafe','thé','the','sirop','limonade'], order:7 },
  { id:'c9', name:'Autre',              emoji:'🛍️', kw:[], order:8 },
];

// ══════════════════════════════════════════════════════
//  SAISONS DE RECETTE
// ══════════════════════════════════════════════════════
const SEASONS = [
  { id:'spring', label:'Printemps', emoji:'🌱' },
  { id:'summer', label:'Été',       emoji:'☀️' },
  { id:'autumn', label:'Automne',   emoji:'🍂' },
  { id:'winter', label:'Hiver',     emoji:'❄️' },
];

/** Saison actuelle selon le mois (hémisphère nord, non configurable) */
function getCurrentSeason(date = new Date()) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4)  return 'spring';
  if (m >= 5 && m <= 7)  return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** seasons vide/absent → 'all' (mixte), pour compat avec les recettes existantes */
function getRecipeSeasons(recipe) {
  return (recipe.seasons && recipe.seasons.length) ? recipe.seasons : ['all'];
}

/**
 * Calcule le prochain état `seasons` après un tap sur une chip.
 * Règle d'exclusion : "Mixte" écrase tout ; sélectionner une saison retire "Mixte".
 * Utilisé à la fois par RecipeEditor (form.seasons) et RecipeCard (recipe.seasons directement).
 */
function toggleSeasonInList(list, id) {
  if (id === 'all') return list.includes('all') ? [] : ['all'];
  const withoutAll = list.filter(s => s !== 'all');
  return withoutAll.includes(id) ? withoutAll.filter(s => s !== id) : [...withoutAll, id];
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
const genId = () => Math.random().toString(36).slice(2, 10);
const ts    = () => Date.now();

function getISOWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 864e5 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekStart(key) {
  const [y, wn] = key.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (wn - 1) * 7);
  return d;
}

function getWeekRange(key) {
  const s = getWeekStart(key);
  const e = new Date(s); e.setDate(s.getDate() + 6);
  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function shiftWeek(key, n) {
  const d = getWeekStart(key);
  d.setDate(d.getDate() + n * 7);
  return getISOWeekKey(d);
}

// ══════════════════════════════════════════════════════
//  MENUS CANTINE
// ══════════════════════════════════════════════════════
const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

/** Date locale (pas UTC, pour éviter les décalages de fuseau) → 'YYYY-MM-DD' */
function fmtISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Les 5 jours (lundi→vendredi) de la semaine ISO donnée, en objets Date */
function getWeekdayDates(weekKey) {
  const start = getWeekStart(weekKey); // lundi
  return [0, 1, 2, 3, 4].map(i => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}

/** Vérifie qu'une chaîne 'YYYY-MM-DD' est une date calendaire valide (rejette '2026-02-30' etc.) */
function isValidISODate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || '')) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d) && fmtISODate(d) === str;
}

/** Vérifie qu'un mot-clé correspond à un nom entier (pas une sous-chaîne d'un mot) */
/**
 * Génère les variantes singulier/pluriel d'un mot-clé français.
 * Couvre les cas courants en alimentation : -s, -x, -eau/-eaux, -al/-aux.
 */
function kwVariants(kw) {
  const set = new Set([kw]);
  const w   = kw.toLowerCase();
  // Pluriel → singulier
  if      (w.endsWith('eaux'))                      set.add(kw.slice(0, -1));          // poireaux → poireau
  else if (w.endsWith('aux') && w.length > 4)       set.add(kw.slice(0, -3) + 'al'); // animaux → animal
  else if (w.endsWith('s')   && w.length > 2)       set.add(kw.slice(0, -1));          // pommes → pomme
  // Singulier → pluriel (eau/al prennent x/aux, pas s)
  const getsX = w.endsWith('eau') || (w.endsWith('al') && !w.endsWith('eal'));
  if      (w.endsWith('eau'))                        set.add(kw + 'x');                 // poireau → poireaux
  else if (w.endsWith('al')  && !w.endsWith('eal')) set.add(kw.slice(0, -2) + 'aux'); // animal → animaux
  if (!getsX && !w.endsWith('s') && !w.endsWith('x') && !w.endsWith('z')) set.add(kw + 's'); // pomme → pommes
  return [...set];
}

/**
 * Normalise un nom d'article pour la comparaison singulier/pluriel
 * (utilisé dans la fusion : "pomme" et "pommes" → même base "pomme").
 */
/** Détecte une durée en secondes dans le texte d'une étape ("20 min", "1h30", "5 minutes"…) */
function parseStepDuration(text) {
  const mMatch = text.match(/(\d+)\s*min(?:utes?)?/i);
  const hMatch = text.match(/(\d+)\s*h(?:eures?)?/i);
  let secs = 0;
  if (hMatch) secs += parseInt(hMatch[1]) * 3600;
  if (mMatch) secs += parseInt(mMatch[1]) * 60;
  return secs > 0 ? secs : null;
}

function stemFrName(name) {
  // Normalise mot par mot, supprime les 's' finaux sauf pour les mots très courts
  return name.toLowerCase().trim()
    .replace(/\b([a-zà-ÿ]{3,})s\b/gi, (_, stem) => stem)   // pommes → pomme, tomates → tomate
    .replace(/\b([a-zà-ÿ]{3,})eaux\b/gi, (_, stem) => stem + 'eau') // poireaux → poireau
    .trim();
}

function matchesKeyword(name, kw) {
  // Essaie toutes les variantes singulier/pluriel du mot-clé
  for (const variant of kwVariants(kw)) {
    const e = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('(?<![a-zA-ZÀ-ÿ0-9])' + e + '(?![a-zA-ZÀ-ÿ0-9])', 'i').test(name)) return true;
  }
  return false;
}

function categorize(name, cats) {
  const low = name.toLowerCase();
  for (const c of [...cats].sort((a, b) => a.order - b.order)) {
    if (!c.kw || c.kw.length === 0) continue;
    if (c.kw.some(k => matchesKeyword(low, k.toLowerCase()))) return c.id;
  }
  return cats.find(c => !c.kw || c.kw.length === 0)?.id ?? cats[cats.length - 1]?.id;
}

/**
 * Vrai si au moins une catégorie a un mot-clé qui correspond réellement au nom.
 * Distinct de categorize() : categorize() retourne TOUJOURS un id (fallback sur "Autre"),
 * donc il ne permet pas de savoir si la correspondance était réelle ou un fallback.
 */
function hasKeywordMatch(name, cats) {
  const low = name.toLowerCase();
  return cats.some(c => c.kw?.length > 0 && c.kw.some(k => matchesKeyword(low, k.toLowerCase())));
}

/** Retourne les ingrédients sélectionnés sans correspondance de mot-clé */
function getUncatIngredients(recipe, ingIds, cats) {
  return (recipe.ingredients || [])
    .filter(ing => ingIds.includes(ing.id))
    .filter(ing => !hasKeywordMatch(ing.name, cats));
}

// ══════════════════════════════════════════════════════
//  FUSION D'ARTICLES — conversion d'unités
// ══════════════════════════════════════════════════════

/** Facteurs de conversion vers l'unité de base (g pour le poids, ml pour le volume) */
const UNIT_CONV = {
  g:  { factor: 1,    type: 'weight' },
  kg: { factor: 1000, type: 'weight' },
  ml: { factor: 1,    type: 'volume' },
  cl: { factor: 10,   type: 'volume' },
  l:  { factor: 1000, type: 'volume' }, // 'L' normalisé en lowercase
};

/** Exprime une quantité en base (g ou ml) dans l'unité la plus lisible */
function bestUnit(base, type) {
  if (type === 'weight') {
    return base >= 1000
      ? { qty: Math.round(base / 100) / 10, unit: 'kg' }
      : { qty: Math.round(base * 10) / 10,  unit: 'g'  };
  }
  if (base >= 1000) return { qty: Math.round(base / 100) / 10, unit: 'L'  };
  if (base >= 100)  return { qty: Math.round(base / 10)  / 10, unit: 'cl' };
  return             { qty: Math.round(base * 10)  / 10, unit: 'ml' };
}

/**
 * Tente de fusionner deux quantités (unités identiques ou compatibles poids/volume).
 * Retourne { qty, unit } si possible, null sinon.
 */
function tryMergeQty(eQty, eUnit, nQty, nUnit) {
  const eu = (eUnit || '').trim().toLowerCase();
  const nu = (nUnit || '').trim().toLowerCase();
  if (eu === nu) return { qty: Math.round((eQty + nQty) * 10) / 10, unit: eUnit || nUnit };
  const ec = UNIT_CONV[eu], nc = UNIT_CONV[nu];
  if (ec && nc && ec.type === nc.type)
    return bestUnit(eQty * ec.factor + nQty * nc.factor, ec.type);
  return null;
}

/** Formate une quantité+unité pour les messages d'info (ex: 1.5 L, 250 g) */
function fmtQU(qty, unit) {
  if (!qty && !unit) return '—';
  return `${qty || 0}${unit ? '\u202f' + unit : ''}`;
}

/**
 * Insère ou fusionne `newItem` dans la liste de courses.
 * Fusion si même nom (insensible à la casse), article non barré, et unités compatibles.
 */
function mergeOrAdd(list, newItem) {
  const normName = stemFrName(newItem.name.trim());
  const existing = list.find(s => !s.checked && stemFrName(s.name.trim()) === normName);
  if (!existing) return [...list, newItem];
  const merged = tryMergeQty(existing.qty, existing.unit, newItem.qty, newItem.unit);
  if (merged) {
    // Met à jour la catégorie seulement si le nouvel article en a une valide
    // (évite d'écraser une catégorie existante avec undefined/null)
    const catUpdate = newItem.categoryId ? { categoryId: newItem.categoryId } : {};
    return list.map(s => s.id === existing.id
      ? { ...s, qty: merged.qty, unit: merged.unit, ...catUpdate }
      : s);
  }
  return [...list, newItem]; // unités incompatibles → article séparé
}

// ══════════════════════════════════════════════════════
//  STOCK / GARDE-MANGER — outils purs (testés hors interface)
// ══════════════════════════════════════════════════════
const STOCK_ZONES = [
  { id:'sec',    label:'Sec',         icon:'🌾', color:'#E0A24F' },
  { id:'frigo',  label:'Frigo',       icon:'❄️', color:'#4FA3E0' },
  { id:'congel', label:'Congélateur', icon:'🧊', color:'#9AA4FF' },
  { id:'maison', label:'Maison',      icon:'🏠', color:'#5FCB9A' },
];
const stockZone = id => STOCK_ZONES.find(z => z.id === id) || STOCK_ZONES[0];
const MAISON_GROUPS = [
  { id:'Ménage',        icon:'🧽' },
  { id:'Sanitaires',    icon:'🚽' },
  { id:'Salle de bain', icon:'🛁' },
  { id:'Chiens',        icon:'🐕' },
];
/** Même table que la fusion de courses + cuillères (approximation volume : 1 cs ≈ 15 ml, 1 cc ≈ 5 ml) */
const STOCK_CONV = { ...UNIT_CONV, cs:{ factor:15, type:'volume' }, cc:{ factor:5, type:'volume' } };
const PIECE_UNITS = new Set(['pc','pcs','piece','pieces','pièce','pièces','u','unité','unités','unite','unites']);

/** Nom comparable : minuscules, sans accents, singulier (« Œufs » = « oeuf » = « oeufs ») */
function stockNorm(name) {
  return stemFrName(String(name || '').replace(/\u0153/gi, 'oe')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Quantité de recette → unité de base du stock (g, ml, ou unité brute ; '' = pièces) */
function stockBase(qty, unit) {
  const u = String(unit || '').trim().toLowerCase();
  const c = STOCK_CONV[u];
  if (c) return { qty: (qty || 0) * c.factor, unit: c.type === 'weight' ? 'g' : 'ml', factor: c.factor };
  return { qty: qty || 0, unit: PIECE_UNITS.has(u) ? '' : u, factor: 1 };
}

const r1 = n => Math.round(n * 10) / 10;

/** Affichage d'une quantité de stock selon son unité de base */
function fmtStockQty(qty, unit) {
  if (unit === 'q') return `${Math.round((qty || 0) * 25)} %`;
  if (unit === 'g')  return qty >= 1000 ? `${r1(qty / 1000)} kg` : `${r1(qty)} g`;
  if (unit === 'ml') return qty >= 1000 ? `${r1(qty / 1000)} L`  : `${r1(qty)} ml`;
  return `${r1(qty || 0)}${unit ? ' ' + unit : ''}`;
}

/** Jours entre aujourd'hui et une date ISO (négatif = dépassée) ; null si pas de date */
function daysUntil(iso) {
  if (!iso || !isValidISODate(iso)) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00') - t) / 86400000);
}
function addDaysISO(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return fmtISODate(d); }
function addMonthsISO(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setMonth(d.getMonth() + n); return fmtISODate(d); }
function fmtDlcLabel(iso) {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n < 0)   return `périmé · ${-n} j`;
  if (n === 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  if (n < 60)  return `${n} j`;
  return `${Math.round(n / 30)} mois`;
}

/** Zone de stock proposée pour une catégorie de courses ('none' = ne pas suivre en stock) */
function catStockZone(cat) {
  if (!cat) return 'none';
  if (cat.stockZone) return cat.stockZone;
  if (/entretien|m[ée]nage|hygi|sanit|chien|animaux|bain/i.test(cat.name || '')) return 'maison';
  const byId = { c1:'frigo', c3:'frigo', c4:'frigo', c5:'sec', c6:'sec', c8:'sec' };
  return byId[cat.id] || 'none';
}
function catMaisonGroup(cat) {
  const n = cat?.name || '';
  if (/chien|animaux/i.test(n)) return 'Chiens';
  if (/sanit|wc|toilet/i.test(n)) return 'Sanitaires';
  if (/hygi|bain|douche/i.test(n)) return 'Salle de bain';
  return 'Ménage';
}

/** Un article à racheter : seuil atteint (jamais pour « toujours là ») */
const stockNeedsRestock = it => !it.always && it.min != null && (it.qty || 0) <= it.min;

/**
 * Fusionne `entry` dans la liste de stock : même nom + même zone + même unité de base → on additionne.
 * Retourne la nouvelle liste.
 */
function stockMergeAdd(list, entry) {
  const n = stockNorm(entry.name);
  const ex = list.find(s => s.zone === entry.zone && stockNorm(s.name) === n && (s.unit || '') === (entry.unit || '')
    && (entry.zone !== 'maison' || (s.grp || '') === (entry.grp || '')));
  if (!ex) return [...list, entry];
  const dlcs = [ex.dlc, entry.dlc].filter(Boolean).sort();
  return list.map(s => s.id !== ex.id ? s : {
    ...s,
    qty: entry.zone === 'maison' ? 4 : r1((s.qty || 0) + (entry.qty || 0)),
    cap: entry.zone === 'maison' ? 4 : Math.max(s.cap || 0, r1((s.qty || 0) + (entry.qty || 0))),
    dlc: dlcs[0] || null,                       // on garde la date la plus proche
    buy: entry.buy || s.buy || null,
  });
}

/**
 * Plan de prélèvement dans le stock pour une liste d'ingrédients (dans l'ordre).
 * lines : [{key, name, qty, unit}] · skip : Set de clés ignorées (case décochée)
 * Retourne { [key]: { item, status, use, avail, remain } }
 *   status : 'always' (toujours là) | 'full' (couvert) | 'partial' | 'incompat' (unité différente)
 *   use    : quantité prise, en unité de base du stock · remain : reste à acheter, en unité de la recette
 */
function planStockUse(lines, stock, skip = new Set()) {
  const left = {};
  stock.forEach(s => { left[s.id] = s.qty || 0; });
  const out = {};
  lines.forEach(l => {
    if (skip.has(l.key)) return;
    const n = stockNorm(l.name);
    const cands = stock.filter(s => s.zone !== 'maison' && stockNorm(s.name) === n);
    if (!cands.length) return;
    const always = cands.find(s => s.always);
    if (always) { out[l.key] = { item: always, status:'always', use:0, avail:0, remain:0 }; return; }
    const b = stockBase(l.qty, l.unit);
    const compat = cands.filter(s => (s.unit || '') === b.unit && left[s.id] > 0)
      .sort((x, y) => (x.dlc || '9999').localeCompare(y.dlc || '9999') || left[y.id] - left[x.id]);
    if (!compat.length) {
      const sameUnit = cands.some(s => (s.unit || '') === b.unit);
      if (!sameUnit) out[l.key] = { item: cands[0], status:'incompat', use:0, avail: cands[0].qty || 0, remain: l.qty };
      return; // même unité mais stock à 0 : rien à proposer
    }
    const item = compat[0];
    if (b.qty <= 0) { out[l.key] = { item, status:'full', use:0, avail:left[item.id], remain:0 }; return; } // « sel » sans quantité
    const avail = left[item.id];
    const use = Math.min(avail, b.qty);
    left[item.id] -= use;
    const remain = r1(Math.max(0, (b.qty - use) / b.factor));
    out[l.key] = { item, status: remain <= 0 ? 'full' : 'partial', use: r1(use), avail, remain };
  });
  return out;
}

/** Construit un article de stock complet à partir d'une saisie partielle. */
function makeStockItem(e) {
  const maison = e.zone === 'maison';
  return {
    id: genId(), name: String(e.name || '').trim(), zone: e.zone || 'sec',
    grp: maison ? (e.grp || 'Ménage') : null,
    qty: e.always ? 0 : (maison ? Math.max(0, Math.min(4, e.qty ?? 4)) : Math.max(0, e.qty ?? 0)),
    unit: maison ? 'q' : (e.unit || ''),
    always: !!e.always, min: e.min ?? null, dlc: e.dlc || null,
    buy: e.buy || null, catId: e.catId || null, addedAt: ts(),
    cap: maison ? 4 : (e.always ? 0 : Math.max(0, e.qty ?? 0)),
  };
}

// ══════════════════════════════════════════════════════
//  DONNÉES INITIALES (démo)
// ══════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════
//  PERSISTANCE — localStorage + fallback mémoire
//  Fonctionne en WebView Android ET dans un artefact Claude
// ══════════════════════════════════════════════════════
const _mem = {};
const _ls  = (() => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } })();

function loadFromStorage(key, defaultValue) {
  if (_ls) {
    try {
      const stored = _ls.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch {}
  }
  return _mem[key] !== undefined ? _mem[key] : defaultValue;
}

// ── Tags : comparaison insensible à la casse et aux accents ──
const normTag = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Aligne chaque tag saisi sur la graphie déjà utilisée ailleurs (« plat » → « Plat ») et retire les doublons. */
function canonTags(list, known) {
  const byNorm = {};
  known.forEach(k => { const n = normTag(k); if (!byNorm[n]) byNorm[n] = k; });
  const seen = new Set(), out = [];
  list.forEach(t => {
    const n = normTag(t);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(byNorm[n] || t.trim());
  });
  return out;
}

// ── Sauvegarde / restauration : outils partagés (écran Options ET écran de secours) ──
const PRE_IMPORT_KEY = 'mp_pre_import'; // copie des données d'avant le dernier import
const BACKUP_KEYS = ['recipes', 'meals', 'shopping', 'cats', 'settings', 'cantine', 'stock'];

/**
 * Enregistre un fichier texte. Sur Android : fenêtre « Enregistrer sous » du système
 * (pont natif saveFile, fiable dans la WebView). Dans un navigateur : téléchargement classique.
 * Résolu avec { ok } | { cancelled } | { error }.
 */
function saveTextFile(filename, text) {
  return new Promise(resolve => {
    if (window.Android && typeof window.Android.saveFile === 'function') {
      const cbId = 'sv' + Date.now();
      window.__mpSave = window.__mpSave || {};
      window.__mpSave[cbId] = res => resolve(res || { error: 'réponse vide' });
      try { window.Android.saveFile(filename, text, cbId); }
      catch (e) { delete window.__mpSave[cbId]; resolve({ error: e.message || 'pont indisponible' }); }
      return;
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve({ ok: true });
    } catch (e) { resolve({ error: e.message || 'téléchargement impossible' }); }
  });
}

/** Vérifie qu'un JSON ressemble à une sauvegarde Meal Plan AVANT de toucher aux données. */
function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return { error: 'Ce fichier n\u2019est pas une sauvegarde Meal Plan.' };
  const need = { recipes: ['id','name'], meals: ['id','weekKey'], shopping: ['id','name'], cats: ['id','name'], cantine: ['date'], stock: ['id','name'] };
  const counts = {};
  for (const k of Object.keys(need)) {
    if (data[k] === undefined) continue;
    if (!Array.isArray(data[k])) return { error: `Section « ${k} » illisible : le fichier est abîmé.` };
    for (const it of data[k]) {
      if (!it || typeof it !== 'object' || need[k].some(f => typeof it[f] !== 'string' || !it[f]))
        return { error: `Section « ${k} » : un élément est incomplet. Fichier abîmé ou modifié.` };
    }
    counts[k] = data[k].length;
  }
  if (data.settings !== undefined && (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)))
    return { error: 'Section « settings » illisible : le fichier est abîmé.' };
  if (!Object.keys(counts).length) return { error: 'Aucune donnée Meal Plan reconnue dans ce fichier.' };
  return { ok: true, counts, exportDate: data.exportDate || null, version: data.version || null };
}

// ══════════════════════════════════════════════════════
//  CONTEXT
// ══════════════════════════════════════════════════════
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children }) {
  const [recipes,  setRecipes]  = useState(() => loadFromStorage('mp_recipes',  []));
  const [meals,    setMeals]    = useState(() => loadFromStorage('mp_meals',     []));
  const [shopping, setShopping] = useState(() => loadFromStorage('mp_shopping',  []));
  const [cats,     setCats]     = useState(() => loadFromStorage('mp_cats',      DEFAULT_CATS));
  const [settings, setSettings] = useState(() => loadFromStorage('mp_settings',  { weeksToShow: 4, householdSize: 6 }));
  const [cantine,  setCantine]  = useState(() => loadFromStorage('mp_cantine',   []));
  const [stock,    setStock]    = useState(() => loadFromStorage('mp_stock',     []));
  // Thème appliqué AVANT le rendu des enfants (C est lu pendant leur rendu)
  applyTheme(settings.theme);
  const [planningTarget, setPlanningTarget] = useState(null); // weekKey cible pour navigation
  const [preImport, setPreImport] = useState(() => {
    const v = loadFromStorage(PRE_IMPORT_KEY, null);
    return v && v.data ? { date: v.date } : null;
  });

  const [snack,    setSnack]    = useState(null);
  const snackRef = useRef(null);
  const storageErrShown = useRef(false);

  const showSnack = useCallback((msg, undo) => {
    clearTimeout(snackRef.current);
    setSnack({ msg, undo });
    snackRef.current = setTimeout(() => setSnack(null), 3500);
  }, []);

  /** Sauvegarde avec détection d'erreur localStorage (quota plein, navigation privée…) */
  const saveWithCheck = useCallback((key, value) => {
    _mem[key] = value;
    if (!_ls) return;
    try {
      _ls.setItem(key, JSON.stringify(value));
      storageErrShown.current = false;
    } catch {
      if (!storageErrShown.current) {
        storageErrShown.current = true;
        showSnack('⚠️ Stockage local plein · données non sauvegardées sur le disque');
      }
    }
  }, [showSnack]);

  // ── Sauvegarde automatique ────────────────────────────
  useEffect(() => saveWithCheck('mp_recipes',  recipes),  [recipes,  saveWithCheck]);
  useEffect(() => saveWithCheck('mp_meals',    meals),    [meals,    saveWithCheck]);
  useEffect(() => saveWithCheck('mp_shopping', shopping), [shopping, saveWithCheck]);
  useEffect(() => saveWithCheck('mp_cats',     cats),     [cats,     saveWithCheck]);
  useEffect(() => saveWithCheck('mp_settings', settings), [settings, saveWithCheck]);
  useEffect(() => saveWithCheck('mp_cantine',  cantine),  [cantine,  saveWithCheck]);
  useEffect(() => saveWithCheck('mp_stock',    stock),    [stock,    saveWithCheck]);

  /* ── Recettes ── */
  const addRecipe    = d => { setRecipes(p => [{ ...d, id: genId(), createdAt: ts() }, ...p]); showSnack('✅ Recette créée'); };
  const updateRecipe = d => { setRecipes(p => p.map(r => r.id === d.id ? d : r)); showSnack('✅ Recette mise à jour'); };
  const duplicateRecipe = id => {
    const src = recipes.find(r => r.id === id);
    if (!src) return null;
    const copy = { ...src, id: genId(), name: `${src.name} (copie)`, createdAt: ts() };
    setRecipes(p => [copy, ...p]);
    showSnack(`📋 "${copy.name}" créée`);
    return copy; // retourne l'objet pour ouvrir l'éditeur immédiatement
  };
  const deleteRecipe = id => {
    const recipe        = recipes.find(r => r.id === id);
    const removedMeals  = meals.filter(m => m.recipeId === id);
    const removedShop   = shopping.filter(s =>
      s.fromRecipeId === id || removedMeals.some(m => m.id === s.fromMealId)
    );
    const stockBack = removedMeals.flatMap(m => m.stockUsed || []);
    if (stockBack.length) restoreStock(stockBack);
    setRecipes(p  => p.filter(r => r.id !== id));
    setMeals(p    => p.filter(m => m.recipeId !== id));
    setShopping(p => p.filter(s =>
      s.fromRecipeId !== id && !removedMeals.some(m => m.id === s.fromMealId)
    ));
    const parts = [];
    if (removedMeals.length > 0) parts.push(`${removedMeals.length} repas`);
    if (removedShop.length  > 0) parts.push(`${removedShop.length} courses`);
    showSnack(
      `🗑 "${recipe?.name || 'Recette'}" supprimée${parts.length ? ' · ' + parts.join(', ') + ' retirés' : ''}`,
      () => {
        setRecipes(p  => [...p, recipe]);
        setMeals(p    => [...p, ...removedMeals]);
        if (removedShop.length) setShopping(p => [...p, ...removedShop]);
        if (stockBack.length) deductStock(stockBack);
      }
    );
  };

  /* ── Stock (déclaré avant les repas : les repas y puisent / y rendent) ── */
  const deductStock = used => setStock(p => p.map(s => {
    const q = used.filter(u => u.stockId === s.id).reduce((a, u) => a + u.qty, 0);
    return q ? { ...s, qty: Math.max(0, r1((s.qty || 0) - q)) } : s;
  }));
  const restoreStock = used => setStock(p => {
    let list = p;
    used.forEach(u => {
      list = list.some(s => s.id === u.stockId)
        ? list.map(s => s.id === u.stockId ? { ...s, qty: r1((s.qty || 0) + u.qty) } : s)
        : [...list, { ...makeStockItem({ name:u.name, zone:u.zone, unit:u.unit, qty:u.qty }), id: u.stockId }];
    });
    return list;
  });
  const addStockItem = (entry, silent = false) => {
    const item = makeStockItem(entry);
    if (!item.name) return null;
    setStock(p => stockMergeAdd(p, item));
    if (!silent) showSnack(`🥫 « ${item.name} » ajouté au stock`);
    return item.id;
  };
  const updateStockItem = (id, patch) => setStock(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  const deleteStockItem = id => {
    const it = stock.find(s => s.id === id);
    if (!it) return;
    setStock(p => p.filter(s => s.id !== id));
    showSnack(`« ${it.name} » retiré du stock`, () => setStock(p => p.some(s => s.id === id) ? p : [...p, it]));
  };
  /** Ajout groupé (fin de courses) : annulation = retour à l'état d'avant. */
  const addStockBatch = (entries) => {
    if (!entries.length) return;
    const prev = stock;
    setStock(p => entries.reduce((list, e) => stockMergeAdd(list, makeStockItem(e)), p));
    showSnack(`🥫 ${entries.length} article${entries.length>1?'s':''} ajouté${entries.length>1?'s':''} au stock`, () => setStock(prev));
  };
  /** Fin de courses : range dans le stock ET retire de la liste, en une seule annulation. */
  const stockFromShopping = (entries, clearIds) => {
    const prevStock = stock;
    const removed = shopping.filter(s => clearIds.includes(s.id));
    if (entries.length) setStock(p => entries.reduce((l, e) => stockMergeAdd(l, makeStockItem(e)), p));
    if (removed.length) setShopping(p => p.filter(s => !clearIds.includes(s.id)));
    const a = entries.length, b = removed.length;
    showSnack(
      `${a ? `🥫 ${a} article${a>1?'s':''} rangé${a>1?'s':''} au stock` : ''}${a && b ? ' · ' : ''}${b ? `${b} retiré${b>1?'s':''} de la liste` : ''}`,
      () => { setStock(prevStock); if (removed.length) setShopping(p => [...p, ...removed]); }
    );
  };
  /** Réachat : met les articles sous leur seuil dans la liste de courses. */
  const restockItems = (items) => {
    if (!items.length) return;
    const prev = shopping;
    const news = items.map(it => ({
      id: genId(), name: it.name, qty: it.buy?.qty || 0, unit: it.buy?.unit || '',
      categoryId: cats.some(c => c.id === it.catId) ? it.catId : categorize(it.name, cats),
      fromRecipeId: null, checked: false, sortOrder: ts() + Math.random(), addedAt: ts(),
    }));
    setShopping(p => news.reduce((l, i) => mergeOrAdd(l, i), p));
    showSnack(`🛒 ${news.length} article${news.length>1?'s':''} ajouté${news.length>1?'s':''} aux courses`, () => setShopping(prev));
  };

  /* ── Repas ── */
  const addMeal = (weekKey, recipeId, persons, customName = '', stockUsed = null) => {
    const id = genId();
    const used = (stockUsed || []).filter(u => u.qty > 0);
    setMeals(p => [...p, { id, weekKey, recipeId: recipeId || null, customName: customName || '', persons, done: false, note: '', addedAt: ts(),
      ...(used.length ? { stockUsed: used } : {}) }]);
    if (used.length) deductStock(used);
    return id;
  };

  const addIngredientsFromRecipe = (recipe, persons, selectedIngIds, catOverrides = {}, mealId = null, qtyOverrides = {}) => {
    const scale = persons / (recipe.portions || 4);
    const items = (recipe.ingredients || [])
      .filter(ing => selectedIngIds.includes(ing.id))
      .filter(ing => !(ing.id in qtyOverrides) || qtyOverrides[ing.id] > 0) // couvert par le stock → rien à acheter
      .map(ing => ({
        id: genId(), name: ing.name,
        qty:  ing.id in qtyOverrides ? qtyOverrides[ing.id] : (ing.qty ? Math.round(ing.qty * scale * 10) / 10 : 0),
        unit: ing.unit || '',
        categoryId:  catOverrides[ing.id] ?? categorize(ing.name, cats),
        fromRecipeId: recipe.id,  // affiché dans badge 📅 + compat données existantes
        fromMealId:   mealId,     // rescaling/suppression précis par repas
        checked: false,
        sortOrder: ts() + Math.random(),
        addedAt: ts(),
      }));
    if (!items.length) return;
    // Détecte les fusions pour le snack (contre la valeur courante de shopping)
    const merges = items.filter(item => {
      const norm = item.name.trim().toLowerCase();
      const ex = shopping.find(s => !s.checked && s.name.trim().toLowerCase() === norm);
      return ex && tryMergeQty(ex.qty, ex.unit, item.qty, item.unit) !== null;
    });
    const incompatibles = items.filter(item => {
      const norm = item.name.trim().toLowerCase();
      const ex = shopping.find(s => !s.checked && s.name.trim().toLowerCase() === norm);
      return ex && tryMergeQty(ex.qty, ex.unit, item.qty, item.unit) === null;
    });
    if (merges.length === 1) {
      const item = merges[0];
      const norm = item.name.trim().toLowerCase();
      const ex = shopping.find(s => !s.checked && s.name.trim().toLowerCase() === norm);
      const merged = tryMergeQty(ex.qty, ex.unit, item.qty, item.unit);
      showSnack(`🔀 "${item.name}" · ${fmtQU(ex.qty, ex.unit)} + ${fmtQU(item.qty, item.unit)} → ${fmtQU(merged.qty, merged.unit)}`);
    } else if (merges.length > 1) {
      showSnack(`🔀 ${merges.length} ingrédients fusionnés avec la liste`);
    }
    if (incompatibles.length === 1) {
      showSnack(`⚠️ "${incompatibles[0].name}" ajouté séparément · unités incompatibles`);
    } else if (incompatibles.length > 1) {
      showSnack(`⚠️ ${incompatibles.length} articles ajoutés séparément · unités incompatibles`);
    }
    setShopping(p => items.reduce((list, item) => mergeOrAdd(list, item), p));
  };

  const updateMealPersons = (id, delta) => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;
    const oldPersons = meal.persons;
    const newPersons = Math.max(1, oldPersons + delta);
    if (newPersons === oldPersons) return;
    // Stock prélevé : proportionnel au nombre de personnes (plafonné à ce qui reste)
    let nextUsed = null;
    if (meal.stockUsed?.length) {
      const left = {}; stock.forEach(s => { left[s.id] = s.qty || 0; });
      const ratioS = newPersons / oldPersons;
      const give = [], take = [];
      nextUsed = meal.stockUsed.map(u => {
        const want = r1(u.qty * ratioS);
        let q = want;
        if (want > u.qty) { q = r1(u.qty + Math.min(want - u.qty, left[u.stockId] || 0)); left[u.stockId] = (left[u.stockId] || 0) - (q - u.qty); }
        if (q > u.qty) take.push({ ...u, qty: r1(q - u.qty) });
        if (q < u.qty) give.push({ ...u, qty: r1(u.qty - q) });
        return { ...u, qty: q };
      });
      if (take.length) deductStock(take);
      if (give.length) restoreStock(give);
    }
    setMeals(p => p.map(m => m.id === id ? { ...m, persons: newPersons, ...(nextUsed ? { stockUsed: nextUsed } : {}) } : m));
    // Repas personnalisés (recipeId=null) n'ont pas d'articles de courses liés
    if (!meal.recipeId) return;
    const ratio = newPersons / oldPersons;
    // fromMealId (nouveau) prioritaire sur fromRecipeId (legacy) pour éviter le rescaling croisé
    const linked = s => s.fromMealId ? s.fromMealId === id : s.fromRecipeId === meal.recipeId;
    const affected = shopping.filter(s => linked(s) && s.qty > 0);
    setShopping(p => p.map(s =>
      linked(s) && s.qty ? { ...s, qty: Math.round(s.qty * ratio * 10) / 10 } : s
    ));
    if (affected.length > 0)
      showSnack(`👥 ${oldPersons}→${newPersons} pers. · ${affected.length} quantité${affected.length>1?'s':''} de courses recalculée${affected.length>1?'s':''}`);
  };

  const toggleMealDone = id =>
    setMeals(p => p.map(m => m.id === id ? { ...m, done: !m.done } : m));

  const updateMeal = (id, changes) =>
    setMeals(p => p.map(m => m.id === id ? { ...m, ...changes } : m));

  const deleteMeal = id => {
    const meal     = meals.find(m => m.id === id);
    if (!meal) return;
    const hasOther = meal.recipeId
      ? meals.some(m => m.id !== id && m.weekKey === meal.weekKey && m.recipeId === meal.recipeId)
      : false;
    const linked   = s => s.fromMealId ? s.fromMealId === id : s.fromRecipeId === meal.recipeId;
    const removedShopping = (hasOther || !meal.recipeId) ? [] : shopping.filter(linked);
    if (!hasOther && meal.recipeId) setShopping(p => p.filter(s => !linked(s)));
    setMeals(p => p.filter(m => m.id !== id));
    if (meal.stockUsed?.length) restoreStock(meal.stockUsed);
    const name   = meal.customName || recipes.find(r => r.id === meal.recipeId)?.name || 'Repas';
    const suffix = (removedShopping.length > 0 ? ` · ${removedShopping.length} course${removedShopping.length>1?'s':''} retirée${removedShopping.length>1?'s':''}` : '')
      + (meal.stockUsed?.length ? ' · stock rendu' : '');
    showSnack(
      `"${name}" retiré du planning${suffix}`,
      () => {
        setMeals(p => [...p, meal]);
        if (removedShopping.length) setShopping(p => [...p, ...removedShopping]);
        if (meal.stockUsed?.length) deductStock(meal.stockUsed);
      }
    );
  };

  const duplicateWeek = (from, to) => {
    const src = meals.filter(m => m.weekKey === from);
    if (!src.length) { showSnack('ℹ️ Aucun repas à dupliquer sur cette semaine'); return; }
    const copies = src.map(({ stockUsed, ...m }) => ({ ...m, id: genId(), weekKey: to, done: false, addedAt: ts() }));
    setMeals(p => [...p, ...copies]);
    showSnack(`✅ ${src.length} repas dupliqués`, () => setMeals(p => p.filter(m => !copies.some(c => c.id === m.id))));
  };

  /** Reporte les repas sélectionnés (par id) d'une semaine vers la semaine suivante. */
  const reportMeals = (mealIds, weekKey) => {
    if (!mealIds.length) return;
    const target = shiftWeek(weekKey, 1);
    setMeals(p => p.map(m => mealIds.includes(m.id) ? { ...m, weekKey: target } : m));
    showSnack(
      `↷ ${mealIds.length} repas reporté${mealIds.length>1?'s':''} vers S${target.split('-W')[1]}`,
      () => setMeals(p => p.map(m => mealIds.includes(m.id) ? { ...m, weekKey } : m))
    );
  };

  /* ── Tags (renommer / fusionner / supprimer sur toutes les recettes) ── */
  const renameTag = (fromList, to) => {
    const target = String(to).trim();
    const from = [].concat(fromList);
    if (!target) return 0;
    const hit = r => (r.tags || []).some(t => from.includes(t));
    const prev = recipes.filter(hit).map(r => ({ id: r.id, tags: r.tags }));
    if (!prev.length) return 0;
    const rewrite = r => {
      if (!hit(r)) return r;
      const seen = new Set(), tags = [];
      r.tags.map(t => from.includes(t) ? target : t).forEach(t => { if (!seen.has(t)) { seen.add(t); tags.push(t); } });
      return { ...r, tags };
    };
    setRecipes(p => p.map(rewrite));
    showSnack(
      `🏷 « ${from.join('», «')} » → « ${target} » · ${prev.length} recette${prev.length>1?'s':''}`,
      () => setRecipes(p => p.map(r => { const o = prev.find(x => x.id === r.id); return o ? { ...r, tags: o.tags } : r; }))
    );
    return prev.length;
  };
  const deleteTag = (tag) => {
    const prev = recipes.filter(r => (r.tags || []).includes(tag)).map(r => ({ id: r.id, tags: r.tags }));
    if (!prev.length) return;
    setRecipes(p => p.map(r => (r.tags || []).includes(tag) ? { ...r, tags: r.tags.filter(t => t !== tag) } : r));
    showSnack(
      `🏷 « ${tag} » retiré de ${prev.length} recette${prev.length>1?'s':''}`,
      () => setRecipes(p => p.map(r => { const o = prev.find(x => x.id === r.id); return o ? { ...r, tags: o.tags } : r; }))
    );
  };

  /* ── Listes d'habituels (stockées dans settings.favLists → incluses dans export/import) ── */
  const saveFavList = (list) => {
    setSettings(p => {
      const cur = p.favLists || [];
      return { ...p, favLists: cur.some(l => l.id === list.id) ? cur.map(l => l.id === list.id ? list : l) : [...cur, list] };
    });
    showSnack(`✅ Liste « ${list.name} » enregistrée`);
  };
  const deleteFavList = (id) => {
    const cur = settings.favLists || [];
    const idx = cur.findIndex(l => l.id === id);
    if (idx < 0) return;
    const list = cur[idx];
    setSettings(p => ({ ...p, favLists: (p.favLists || []).filter(l => l.id !== id) }));
    showSnack(`Liste « ${list.name} » supprimée`, () => setSettings(p => {
      const c = (p.favLists || []).filter(l => l.id !== id);
      c.splice(Math.min(idx, c.length), 0, list);
      return { ...p, favLists: c };
    }));
  };

  /* ── Courses ── */
  const addShoppingItem = (name, qty, unit, catId) => {
    const newItem = {
      id: genId(), name, qty: parseFloat(qty)||0, unit: unit||'',
      categoryId: catId ?? categorize(name, cats),
      fromRecipeId: null, checked: false, sortOrder: ts(), addedAt: ts(),
    };
    // Snack si fusion détectée (vérification sur la valeur courante de shopping)
    const normName = name.trim().toLowerCase();
    const existing = shopping.find(s => !s.checked && s.name.trim().toLowerCase() === normName);
    if (existing) {
      const merged = tryMergeQty(existing.qty, existing.unit, newItem.qty, newItem.unit);
      if (merged) showSnack(`🔀 "${name}" · ${fmtQU(existing.qty, existing.unit)} + ${fmtQU(newItem.qty, newItem.unit)} → ${fmtQU(merged.qty, merged.unit)}`);
      else         showSnack(`⚠️ "${name}" ajouté séparément · unités incompatibles`);
    }
    setShopping(p => mergeOrAdd(p, newItem));
  };

  const deleteShoppingItem = id => {
    const item = shopping.find(s => s.id === id);
    setShopping(p => p.filter(s => s.id !== id));
    if (item) showSnack(`"${item.name}" supprimé`, () => setShopping(p => [...p, item]));
  };

  const deleteItemsByCategory = (catId) => {
    const toDelete = shopping.filter(s => s.categoryId === catId);
    if (!toDelete.length) return;
    setShopping(p => p.filter(s => s.categoryId !== catId));
    const catName = cats.find(c => c.id === catId)?.name || 'Catégorie';
    const label = `${toDelete.length} article${toDelete.length > 1 ? 's' : ''} de "${catName}" supprimés`;
    showSnack(label, () => setShopping(p => [...p, ...toDelete]));
  };

  const clearChecked = () => {
    const toDelete = shopping.filter(s => s.checked);
    if (!toDelete.length) { showSnack('ℹ️ Aucun article coché'); return; }
    setShopping(p => p.filter(s => !s.checked));
    showSnack(`${toDelete.length} article${toDelete.length>1?'s':''} cochés supprimés`, () => setShopping(p => [...p, ...toDelete]));
  };
  const clearAll = () => {
    if (!shopping.length) { showSnack('ℹ️ La liste est déjà vide'); return; }
    const toDelete = [...shopping];
    setShopping([]);
    showSnack(`Liste vidée (${toDelete.length} article${toDelete.length>1?'s':''})`, () => setShopping(toDelete));
  };
  const deleteShoppingItemsByIds = (ids) => {
    const removed = shopping.filter(s => ids.includes(s.id));
    if (!removed.length) return;
    setShopping(p => p.filter(s => !ids.includes(s.id)));
    showSnack(
      `${removed.length} ingrédient${removed.length>1?'s':''} retirés de la liste`,
      () => setShopping(p => [...p, ...removed])
    );
  };

  const updateShoppingItem = (id, patch) =>
    setShopping(p => p.map(s => s.id === id ? { ...s, ...patch } : s));

  const reorderItemsInCat = (catId, orderedIds) =>
    setShopping(prev => {
      const other = prev.filter(s => s.categoryId !== catId);
      const reordered = orderedIds
        .map((id, i) => { const s = prev.find(x => x.id === id); return s ? { ...s, sortOrder: i } : null; })
        .filter(Boolean);
      return [...other, ...reordered];
    });

  /* ── Catégories ── */
  const addCat = ({ id = genId(), name, emoji='📦', kw=[], stockZone }) =>
    setCats(p => [...p, { id, name, emoji, kw, order: p.length, ...(stockZone ? { stockZone } : {}) }]);
  const deleteCat = id => {
    const cat      = cats.find(c => c.id === id);
    if (!cat) return;
    const fb       = cats.find(c => c.id !== id && (!c.kw || c.kw.length === 0))?.id ?? cats.find(c => c.id !== id)?.id;
    const movedIds = shopping.filter(s => s.categoryId === id).map(s => s.id);
    const nMoved   = movedIds.length;
    setCats(p => p.filter(c => c.id !== id));
    setShopping(p => p.map(s => s.categoryId === id ? { ...s, categoryId: fb } : s));
    const suffix = nMoved > 0 ? ` · ${nMoved} article${nMoved>1?'s':''} déplacés` : '';
    showSnack(`🗑 "${cat.name}" supprimée${suffix}`, () => {
      // Annuler : la catégorie revient à sa place (son champ order est conservé) avec ses mots-clés
      setCats(p => p.some(c => c.id === cat.id) ? p : [...p, cat]);
      setShopping(p => p.map(s => movedIds.includes(s.id) ? { ...s, categoryId: cat.id } : s));
    });
  };
  const updateCat = c => {
    const oldCat  = cats.find(x => x.id === c.id);
    const newKws  = (c.kw || []).filter(k => !(oldCat?.kw || []).includes(k));
    let nMoved = 0;
    setCats(p => p.map(x => x.id === c.id ? c : x));
    // Recatégorisation rétroactive : articles existants qui matchent les nouveaux mots-clés
    if (newKws.length > 0) {
      const toRec = shopping.filter(s =>
        s.categoryId !== c.id &&
        newKws.some(k => matchesKeyword(s.name.toLowerCase(), k))
      );
      if (toRec.length > 0) {
        nMoved = toRec.length;
        const prev = toRec.map(s => ({ id: s.id, categoryId: s.categoryId }));
        setShopping(p => p.map(s => toRec.some(t => t.id === s.id) ? { ...s, categoryId: c.id } : s));
        showSnack(
          `${toRec.length} article${toRec.length>1?'s':''} déplacés vers ${c.emoji} ${c.name}`,
          () => setShopping(p => p.map(s => { const o = prev.find(x => x.id === s.id); return o ? { ...s, categoryId: o.categoryId } : s; }))
        );
      }
    }
    return nMoved; // permet à l'appelant de ne pas écraser le message « articles déplacés »
  };
  /**
   * Ajoute UN mot-clé à une catégorie sans déclencher le balayage rétroactif de updateCat.
   * updateCat() ferme `shopping` sur l'état du render en cours : appelé juste après un
   * setShopping() dans le même handler (ex: recatégoriser CET article puis enregistrer
   * son nom comme mot-clé), il voit encore l'ancienne categoryId de l'article qu'on vient
   * de déplacer et le re-traite inutilement (double calcul, double snack qui s'écrasent).
   * Ici on fait uniquement l'ajout de données, sans effet de bord, et on retourne un booléen
   * pour que l'appelant sache s'il doit informer l'utilisateur.
   */
  const addKeywordToCat = (catId, kw) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat || !kw) return false;
    const already = cat.kw?.some(k => matchesKeyword(kw, k.toLowerCase()));
    if (already) return false;
    setCats(p => p.map(c => c.id === catId ? { ...c, kw: [...(c.kw || []), kw] } : c));
    return true;
  };
  const reorderCats = list => setCats(list.map((c, i) => ({ ...c, order: i })));
  /* ── Menus cantine ── */
  const upsertCantineDay = (date, data) => {
    const hasContent = [data.entree, data.plat, data.fromage, data.dessert].some(v => v && v.trim());
    setCantine(p => {
      const without = p.filter(c => c.date !== date);
      return hasContent ? [...without, { id: genId(), date, ...data }] : without;
    });
  };
  const upsertCantineDays = (days) => { // import groupé (photo) : un seul setCantine pour tous les jours
    setCantine(p => {
      let list = p;
      days.forEach(({ date, ...data }) => {
        const hasContent = [data.entree, data.plat, data.fromage, data.dessert].some(v => v && v.trim());
        list = list.filter(c => c.date !== date);
        if (hasContent) list = [...list, { id: genId(), date, ...data }];
      });
      return list;
    });
  };
  const deleteCantineDay = (date) => {
    const removed = cantine.filter(c => c.date === date);
    setCantine(p => p.filter(c => c.date !== date));
    showSnack('🗑 Menu supprimé', () => setCantine(p => [...p.filter(c => !removed.some(r => r.id === c.id)), ...removed]));
  };
  const clearCantine = () => {
    if (!cantine.length) { showSnack('ℹ️ Aucun menu enregistré'); return; }
    const prev = [...cantine];
    setCantine([]);
    showSnack(`Menus cantine vidés (${prev.length} jour${prev.length>1?'s':''})`, () => setCantine(prev));
  };

  const updSettings = patch => setSettings(p => ({ ...p, ...patch }));

  /** Applique les sections présentes (les absentes ne sont pas touchées). */
  const applyBackup = (d) => {
    if (Array.isArray(d.recipes))  setRecipes(d.recipes);
    if (Array.isArray(d.meals))    setMeals(d.meals);
    if (Array.isArray(d.shopping)) setShopping(d.shopping);
    if (Array.isArray(d.cats))     setCats(d.cats);
    if (Array.isArray(d.cantine))  setCantine(d.cantine);
    if (Array.isArray(d.stock))    setStock(d.stock);
    if (d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings))
      setSettings({ weeksToShow: 4, householdSize: 6, ...d.settings });
  };

  /** Import : met d'abord les données actuelles de côté (récupérables plus tard), puis remplace. */
  const importAllData = (data) => {
    const prev = { recipes, meals, shopping, cats, settings, cantine, stock };
    const entry = { date: ts(), data: prev };
    _mem[PRE_IMPORT_KEY] = entry;
    if (_ls) { try { _ls.setItem(PRE_IMPORT_KEY, JSON.stringify(entry)); } catch {} }
    setPreImport({ date: entry.date });
    applyBackup(data);
    showSnack('✅ Données restaurées', () => applyBackup(prev));
  };

  /** Revient à l'état d'avant le dernier import. */
  const restorePreImport = () => {
    const v = loadFromStorage(PRE_IMPORT_KEY, null);
    if (!v || !v.data) { showSnack('ℹ️ Aucune copie d\u2019avant import'); setPreImport(null); return; }
    applyBackup(v.data);
    delete _mem[PRE_IMPORT_KEY];
    if (_ls) { try { _ls.removeItem(PRE_IMPORT_KEY); } catch {} }
    setPreImport(null);
    showSnack('↩ Import annulé · tes données d\u2019avant sont revenues');
  };

  return (
    <AppCtx.Provider value={{
      recipes, meals, shopping, cats, settings, cantine, stock, snack, setSnack, showSnack,
      addStockItem, updateStockItem, deleteStockItem, addStockBatch, stockFromShopping, restockItems, deductStock, restoreStock,
      addRecipe, updateRecipe, duplicateRecipe, deleteRecipe,
      addMeal, addIngredientsFromRecipe, updateMealPersons, toggleMealDone, updateMeal, deleteMeal, duplicateWeek, reportMeals,
      addShoppingItem, deleteShoppingItem, deleteShoppingItemsByIds, deleteItemsByCategory, updateShoppingItem, clearChecked, clearAll,
      reorderItemsInCat, addCat, deleteCat, updateCat, addKeywordToCat, reorderCats, updSettings, importAllData, preImport, restorePreImport, renameTag, deleteTag, saveFavList, deleteFavList,
      upsertCantineDay, upsertCantineDays, deleteCantineDay, clearCantine,
      planningTarget, setPlanningTarget,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ══════════════════════════════════════════════════════
//  PRIMITIVES UI
// ══════════════════════════════════════════════════════
function Btn({ onClick, children, variant='default', small, disabled, style, label }) {
  // Deux tailles seulement : normal (fenêtres, formulaires : 40 px) et compact (listes, planning : 32 px)
  const base = {
    display:'inline-flex', alignItems:'center', gap:5,
    minHeight: small ? 32 : 40,
    padding: small ? '6px 14px' : '9px 18px',
    borderRadius:C.rBtn, fontWeight:500, fontSize: small?13:15,
    transition:'all 0.15s', cursor: disabled?'not-allowed':'pointer',
    opacity: disabled?0.5:1, border:'none', flexShrink:0,
  };
  const vs = {
    default: { background:C.border,   color:C.text },
    primary: { background:C.accentDk, color:C.onAccent },
    green:   { background:C.greenBg,  color:C.green,  border:`1px solid ${C.green}44` },
    danger:  { background:C.redBg,    color:C.red,    border:`1px solid ${C.red}44` },
    ghost:   { background:'transparent', color:C.muted },
    accent:  { background:C.accentBg, color:C.accent, border:`1px solid ${C.accent}44` },
    orange:  { background:C.orangeBg, color:C.orange, border:`1px solid ${C.orange}44` },
  };
  return (
    <button onClick={disabled?undefined:onClick} aria-label={label} aria-disabled={disabled || undefined} style={{ ...base, ...vs[variant], ...style }}>
      {children}
    </button>
  );
}

function BottomSheet({ title, onClose, children }) {
  useBackHandler(onClose);
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{
      position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.65)',
      display:'flex', alignItems:'flex-end', animation:'fadeIn 0.15s',
    }}>
      <div style={{
        width:'100%', maxWidth:480, margin:'0 auto',
        background:C.card, borderRadius:`${C.rSheet}px ${C.rSheet}px 0 0`,
        maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column',
        animation:'slideUp 0.22s ease',
      }}>
        <div style={{
          padding:'14px 18px 12px', borderBottom:`1px solid ${C.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
        }}>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{title}</span>
          <button aria-label="Fermer" onClick={onClose} style={{
            background:C.border, border:'none', color:C.muted,
            width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:16, lineHeight:1,
          }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);

/** Style de champ de saisie partagé (remplace les objets `inp` dupliqués). */
function fieldStyle(o = {}) {
  return {
    padding: o.dense ? '7px 10px' : '10px 12px', background:C.bg, border:`1px solid ${C.border}`,
    borderRadius:9, color:C.text, fontSize: o.dense ? 13 : 14, outline:'none', width:'100%', ...o.style,
  };
}

// Champ libre pour saisir n'importe quel emoji
function EmojiInput({ value, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
      <div style={{
        fontSize:32, background:C.border, borderRadius:12,
        width:60, height:60,
        display:'flex', alignItems:'center', justifyContent:'center',
        userSelect:'none',
      }}>
        {value || '📦'}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="emoji"
        style={{
          width:60, textAlign:'center', fontSize:16,
          background:C.bg, border:`1px solid ${C.border}`,
          borderRadius:8, padding:'4px 0', color:C.text,
          outline:'none', caretColor:C.accent,
        }}
      />
    </div>
  );
}

function Stars({ value, onChange, small }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {[1,2,3,4,5].map(n => (
        <button aria-label="Favori" key={n} onClick={onChange ? () => onChange(n) : undefined} style={{
          background:'none', border:'none', fontSize: small?14:19,
          color: n<=value ? '#E8C858' : C.border, cursor: onChange?'pointer':'default', padding:2,
        }}>★</button>
      ))}
    </div>
  );
}

function SecTitle({ children }) {
  return <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10, marginTop:20 }}>{children}</div>;
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:'center', padding:'50px 20px', color:C.muted }}>
      <div style={{ fontSize:52, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14 }}>{text}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  HEADER & NAV
// ══════════════════════════════════════════════════════
const TABS = [
  { id:'planning', icon:'📅', label:'Planning' },
  { id:'recipes',  icon:'📖', label:'Recettes' },
  { id:'shopping', icon:'🛒', label:'Courses' },
  { id:'stock',    icon:'🥫', label:'Stock' },
  { id:'stats',    icon:'📊', label:'Stats' },
  { id:'settings', icon:'⚙️', label:'Options' },
];

/** Icônes en trait fin pour la barre du bas (thème moderne) — SVG intégré, aucun réseau */
function TabIcon({ id, size=22 }) {
  const paths = {
    planning: <><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/></>,
    recipes:  <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h10"/></>,
    shopping: <><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.2 10h10.3l1.8-7H6.2"/></>,
    stock:    <><path d="M6 4h12v4H6zM6 8h12v12H6z"/><path d="M9 12h6M9 16h6"/></>,
    stats:    <path d="M5 20v-8M12 20V5M19 20v-6"/>,
    settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink:0 }}>
      {paths[id]}
    </svg>
  );
}

function AppHeader({ tab }) {
  const { recipes, shopping, stock } = useApp();
  const stockAlerts = stock.filter(s => stockNeedsRestock(s) || (s.dlc && daysUntil(s.dlc) <= 1)).length;
  const t = TABS.find(x => x.id===tab);

  // Thème moderne : grand titre + petite ligne de contexte, pas de bandeau
  if (C.modern) {
    const wk = getISOWeekKey();
    const nbArt = shopping.filter(x => !x.checked).length;
    const ctx = {
      planning: `SEMAINE ${wk.split('-W')[1]} · ${getWeekRange(wk).toUpperCase()}`,
      recipes:  `${recipes.length} RECETTE${recipes.length > 1 ? 'S' : ''}`,
      shopping: `${nbArt} ARTICLE${nbArt > 1 ? 'S' : ''} À ACHETER`,
      stock:    `${stockAlerts} ALERTE${stockAlerts > 1 ? 'S' : ''} · ${stock.length} ARTICLE${stock.length > 1 ? 'S' : ''}`,
      stats:    'VOS HABITUDES',
      settings: 'RÉGLAGES',
    }[tab];
    return (
      <header style={{ padding:'22px 20px 10px', flexShrink:0, background:C.bg }}>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:'0.04em' }}>{ctx}</div>
        <div style={{ fontSize:28, fontWeight:500, color:C.text, marginTop:2, lineHeight:1.15 }}>{t?.label}</div>
      </header>
    );
  }

  return (
    <header style={{
      background: `linear-gradient(135deg, ${C.navDk} 0%, ${C.navHdr} 100%)`,
      borderBottom: `1px solid ${C.navBdr}`,
      padding: '16px 18px',
      display:'flex', justifyContent:'space-between', alignItems:'center',
      position:'sticky', top:0, zIndex:100, flexShrink:0,
    }}>
      <div>
        <div style={{ fontWeight:800, fontSize:22, color:'#FFFFFF', letterSpacing:'-0.02em', lineHeight:1.1 }}>
          🍽 Meal Plan
        </div>
        <div style={{ fontSize:15, color:C.sky, marginTop:3, fontWeight:500 }}>
          {t?.icon} {t?.label}
        </div>
      </div>
      <div style={{
        background: 'rgba(126,200,255,0.15)',
        color: C.sky,
        fontSize:13, fontWeight:700, padding:'5px 13px', borderRadius:20,
        border:'1px solid rgba(126,200,255,0.4)', letterSpacing:'0.02em',
      }}>v{VERSION}</div>
    </header>
  );
}

function BottomNav({ tab, setTab }) {
  const { shopping } = useApp();
  const shopCount = shopping.filter(s => !s.checked).length;

  // Thème moderne : barre flottante, onglet actif en pastille avec son libellé
  if (C.modern) {
    return (
      <nav style={{
        position:'fixed', bottom:14, left:'50%', transform:'translateX(-50%)',
        width:'calc(100% - 28px)', maxWidth:452, height:58,
        background:C.card, border:`1px solid ${C.border}`, borderRadius:26,
        display:'flex', alignItems:'center', justifyContent:'space-around',
        padding:'0 4px', zIndex:100,
      }}>
        {TABS.map(item => {
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} aria-label={item.label} style={{
              position:'relative', display:'flex', alignItems:'center', gap:6,
              background: active ? C.accent : 'transparent',
              color: active ? C.onAccent : C.muted,
              border:'none', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
              padding: active ? '9px 10px' : '9px 7px', fontSize:13, fontWeight:500,
              transition:'all 0.15s',
            }}>
              <TabIcon id={item.id} size={active ? 18 : 22} />
              {active && <span>{item.label}</span>}
              {item.id === 'shopping' && shopCount > 0 && !active && (
                <span style={{
                  position:'absolute', top:0, right:0, minWidth:16, height:16, padding:'0 4px',
                  background:C.accent, color:C.onAccent, borderRadius:8,
                  fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
                }}>{shopCount > 99 ? '99' : shopCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480,
      background: `linear-gradient(180deg, ${C.navMid} 0%, ${C.navDk} 100%)`,
      borderTop: `1px solid ${C.navBdr}`,
      display:'flex', zIndex:100, height:70,
    }}>
      {TABS.map(item => {
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex:1, background:'none', border:'none', padding:'0',
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:3,
            cursor:'pointer', position:'relative', transition:'all 0.15s',
          }}>
            {/* Indicateur actif en haut */}
            {active && (
              <div style={{
                position:'absolute', top:0, left:'22%', right:'22%',
                height:2, background:C.sky,
                borderRadius:'0 0 3px 3px',
              }} />
            )}
            {/* Icône + badge */}
            <div style={{ position:'relative' }}>
              <span style={{ fontSize:24 }}>{item.icon}</span>
              {item.id === 'shopping' && shopCount > 0 && (
                <span style={{
                  position:'absolute', top:-4, right:-7,
                  background:C.sky, color:C.navDk,
                  borderRadius:'50%', width:16, height:16,
                  fontSize:11, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>{shopCount > 99 ? '99' : shopCount}</span>
              )}
            </div>
            <span style={{
              fontSize:11, fontWeight: active ? 700 : 500,
              color: active ? C.sky : C.navMuted,
              letterSpacing:'0.02em',
            }}>
              {item.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ══════════════════════════════════════════════════════
//  INGREDIENT FILTER MODAL
//  Affiché après sélection d'une recette dans RecipePicker
//  Permet de choisir quels ingrédients ajouter aux courses
// ══════════════════════════════════════════════════════
function IngredientFilterModal({ selections, onConfirm, onSkip, onCancel, useStock = false }) {
  useBackHandler(onCancel);
  const { cats, stock } = useApp();

  // Construit la liste plate de tous les ingrédients avec catégorie
  const allItems = useMemo(() => selections.flatMap(({ recipe, persons }) =>
    (recipe.ingredients || []).map(ing => ({
      key:        `${recipe.id}_${ing.id}`,
      id:         ing.id,
      recipeId:   recipe.id,
      recipeName: recipe.name,
      recipeEmoji:recipe.emoji,
      name:       ing.name,
      qty:        ing.qty ? Math.round(ing.qty * (persons / (recipe.portions || 4)) * 10) / 10 : 0,
      unit:       ing.unit || '',
      catId:      categorize(ing.name, cats),
    }))
  ), [selections, cats]);

  // « Toujours là » (sel, huile…) : jamais ajouté aux courses sauf si on le coche soi-même
  const alwaysKeys = useMemo(() => new Set(allItems
    .filter(i => stock.some(s => s.always && stockNorm(s.name) === stockNorm(i.name))).map(i => i.key)), [allItems, stock]);
  // État des cases : tout coché par défaut, sauf les « toujours là »
  const [checked, setChecked] = useState(
    () => new Set(allItems.filter(i => !alwaysKeys.has(i.key)).map(i => i.key))
  );
  // Prélèvement dans le stock (planning uniquement) : une ligne peut être décochée individuellement
  const [stockOff, setStockOff] = useState(() => new Set());
  const toggleStock = (key) => setStockOff(p => { const ns = new Set(p); ns.has(key) ? ns.delete(key) : ns.add(key); return ns; });
  const plan = useMemo(() => useStock ? planStockUse(allItems.filter(i => checked.has(i.key)), stock, stockOff) : {},
    [useStock, allItems, checked, stock, stockOff]);
  const peeks = useMemo(() => {
    if (!useStock) return {};
    const o = {};
    allItems.forEach(i => { o[i.key] = planStockUse([i], stock)[i.key]; });
    return o;
  }, [useStock, allItems, stock]);
  const isCovered = i => plan[i.key]?.status === 'full';
  const usesStock = i => plan[i.key]?.status === 'full' || plan[i.key]?.status === 'partial';

  const toggle = (key) => setChecked(p => {
    const ns = new Set(p);
    ns.has(key) ? ns.delete(key) : ns.add(key);
    return ns;
  });

  // Groupement par catégorie de courses
  const sortedCats = useMemo(() => {
    const map = {};
    allItems.forEach(item => {
      if (!map[item.catId]) {
        const cat = cats.find(c => c.id === item.catId);
        map[item.catId] = { catId: item.catId, catName: cat?.name || '?', catEmoji: cat?.emoji || '📦', items: [] };
      }
      map[item.catId].items.push(item);
    });
    return Object.values(map).sort((a,b) => {
      const oa = cats.find(c=>c.id===a.catId)?.order ?? 99;
      const ob = cats.find(c=>c.id===b.catId)?.order ?? 99;
      return oa - ob;
    });
  }, [allItems, cats]);

  const toggleCat = (items) => {
    const allOn = items.every(i => checked.has(i.key));
    setChecked(p => {
      const ns = new Set(p);
      items.forEach(i => allOn ? ns.delete(i.key) : ns.add(i.key));
      return ns;
    });
  };

  const checkedCount = checked.size;
  const totalCount   = allItems.length;
  const multiRecipe  = selections.length > 1;
  const coveredCount = allItems.filter(i => checked.has(i.key) && isCovered(i)).length;
  const fromStockCount = allItems.filter(i => checked.has(i.key) && usesStock(i)).length;
  const toBuyCount   = checkedCount - coveredCount;

  const handleConfirm = () => {
    const selectedByRecipe = {};
    const stockUse = {};
    allItems.forEach(item => {
      if (!checked.has(item.key)) return;
      if (usesStock(item)) {
        const pl = plan[item.key];
        const su = stockUse[item.recipeId] || (stockUse[item.recipeId] = { overrides: {}, used: [] });
        if (pl.use > 0) {
          const ex = su.used.find(u => u.stockId === pl.item.id);
          if (ex) ex.qty = r1(ex.qty + pl.use);
          else su.used.push({ stockId: pl.item.id, name: pl.item.name, zone: pl.item.zone, unit: pl.item.unit || '', qty: pl.use });
        }
        if (pl.status === 'partial') su.overrides[item.id] = pl.remain;
        if (pl.status === 'full') return; // rien à acheter
      }
      if (!selectedByRecipe[item.recipeId]) selectedByRecipe[item.recipeId] = [];
      selectedByRecipe[item.recipeId].push(item.id);
    });
    onConfirm(selectedByRecipe, stockUse);
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1100,
      background:'rgba(0,0,0,0.65)', display:'flex',
      alignItems:'flex-end', justifyContent:'center',
    }}>
      <div style={{
        width:'100%', maxWidth:480,
        background:C.bg, borderRadius:'18px 18px 0 0',
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        animation:'slideUp 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg,${C.navDk},${C.navHdr})`,
          borderRadius:'18px 18px 0 0', padding:'16px 18px', flexShrink:0,
        }}>
          <div style={{ color:C.hi, fontWeight:700, fontSize:16, marginBottom:2 }}>
            🛒 Ingrédients à ajouter
          </div>
          <div style={{ color:C.sky, fontSize:12 }}>
            {multiRecipe
              ? `${selections.length} recettes · décochez ce que vous avez déjà`
              : `${selections[0].recipe.emoji} ${selections[0].recipe.name} · décochez ce que vous avez déjà`}
          </div>
        </div>

        {/* Liste scrollable */}
        <div style={{ overflowY:'auto', flex:1, paddingBottom:4 }}>
          {sortedCats.map(({ catId, catName, catEmoji, items }) => {
            const allOn  = items.every(i => checked.has(i.key));
            const someOn = items.some(i => checked.has(i.key));
            return (
              <div key={catId}>
                {/* En-tête catégorie */}
                <div
                  onClick={() => toggleCat(items)}
                  style={{
                    display:'flex', alignItems:'center', gap:9,
                    padding:'9px 16px', background:C.card,
                    borderBottom:`1px solid ${C.border}`, cursor:'pointer',
                    position:'sticky', top:0, zIndex:1,
                  }}>
                  {/* Checkbox catégorie */}
                  <div style={{
                    width:18, height:18, borderRadius:4, flexShrink:0,
                    background: allOn ? C.accentDk : someOn ? C.accentDkMid : 'transparent',
                    border:`2px solid ${allOn||someOn ? C.accentDk : C.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {allOn  && <span style={{color:C.onAccent,fontSize:10,fontWeight:700}}>✓</span>}
                    {someOn && !allOn && <span style={{color:C.onAccent,fontSize:10}}>–</span>}
                  </div>
                  <span style={{fontSize:16}}>{catEmoji}</span>
                  <span style={{fontSize:12, fontWeight:600, color:C.text, flex:1}}>{catName}</span>
                  <span style={{fontSize:11, color:C.muted}}>
                    {items.filter(i=>checked.has(i.key)).length}/{items.length}
                  </span>
                </div>

                {/* Ingrédients */}
                {items.map(item => {
                  const on = checked.has(item.key);
                  const pl = plan[item.key];
                  const pk = peeks[item.key];
                  const off = on && stockOff.has(item.key) && pk && (pk.status === 'full' || pk.status === 'partial');
                  return (
                    <div key={item.key} style={{ borderBottom:`1px solid ${C.border}22` }}>
                    <div onClick={() => toggle(item.key)} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'8px 16px 8px 44px', cursor:'pointer',
                      opacity: on ? 1 : 0.38,
                      transition:'opacity 0.15s',
                    }}>
                      <div style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        background: on ? C.accentDk : 'transparent',
                        border:`2px solid ${on ? C.accentDk : C.border}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {on && <span style={{color:C.onAccent,fontSize:9,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{flex:1, fontSize:13, color:C.text}}>{item.name}</span>
                      {multiRecipe && (
                        <span style={{fontSize:11, color:C.muted, marginRight:4}}>{item.recipeEmoji}</span>
                      )}
                      {!on && alwaysKeys.has(item.key)
                        ? <span style={{fontSize:11, color:C.muted}}>♾ toujours là</span>
                        : item.qty > 0 && <span style={{fontSize:11, color:C.muted}}>{item.qty} {item.unit}</span>}
                    </div>
                    {useStock && on && (pl || off || pk?.status === 'incompat') && (
                      <div
                        onClick={() => pl || off ? toggleStock(item.key) : undefined}
                        role={pl || off ? 'button' : undefined}
                        aria-label={pl || off ? `Stock : ${item.name}` : undefined}
                        style={{
                          margin:'-3px 16px 7px 70px', padding:'3px 9px', borderRadius:8, fontSize:11, lineHeight:1.4,
                          cursor: pl || off ? 'pointer' : 'default',
                          background: pl?.status === 'full' ? C.greenBg : pl?.status === 'partial' ? C.orangeBg : 'transparent',
                          color: pl?.status === 'full' ? C.green : pl?.status === 'partial' ? C.orange : C.muted,
                          border: pl ? 'none' : `1px dashed ${C.border}`,
                        }}>
                        {pl?.status === 'full' && `🥫 Couvert par le stock${pl.use > 0 ? ' · ' + fmtStockQty(pl.use, pl.item.unit) : ''} · rien à acheter`}
                        {pl?.status === 'partial' && `🥫 ${fmtStockQty(pl.use, pl.item.unit)} du stock · reste ${fmtQU(pl.remain, item.unit)} à acheter`}
                        {!pl && off && `🥫 En stock : ${fmtStockQty(pk.avail, pk.item.unit)} · non utilisé (toucher pour utiliser)`}
                        {!pl && !off && pk?.status === 'incompat' && `🥫 En stock : ${fmtStockQty(pk.avail, pk.item.unit)} · unité différente, non déduit`}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding:'12px 16px', borderTop:`1px solid ${C.border}`,
          background:C.card, flexShrink:0,
        }}>
          <div style={{fontSize:12, color:C.muted, marginBottom:10, textAlign:'center'}}>
            {checkedCount > 0
              ? <><span style={{color:C.accent, fontWeight:600}}>{toBuyCount}</span> à ajouter{fromStockCount > 0 && <> · <span style={{color:C.green, fontWeight:600}}>{fromStockCount}</span> pris au stock</>} · <span>{totalCount-checkedCount}</span> ignorés</>
              : <span style={{color:C.muted}}>Aucun ingrédient sélectionné</span>}
          </div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={onCancel} style={{
              flex:1, padding:'9px', borderRadius:10, border:`1px solid ${C.border}`,
              background:'transparent', color:C.muted, fontSize:13,
              cursor:'pointer', fontFamily:'inherit',
            }}>Annuler</button>
            <button onClick={onSkip} style={{
              flex:1, padding:'9px', borderRadius:10, border:`1px solid ${C.border}`,
              background:'transparent', color:C.soft, fontSize:13,
              cursor:'pointer', fontFamily:'inherit',
            }}>Ignorer les courses</button>
            <button onClick={handleConfirm} disabled={checkedCount === 0} style={{
              flex:2, padding:'9px', borderRadius:10, border:'none',
              background: checkedCount > 0 ? C.accentDk : C.border,
              color: checkedCount > 0 ? C.onAccent : C.muted,
              fontSize:13, fontWeight:600,
              cursor: checkedCount > 0 ? 'pointer' : 'default',
              fontFamily:'inherit', transition:'all 0.15s',
            }}>{toBuyCount > 0 ? `Ajouter ${toBuyCount} ✓` : checkedCount > 0 ? 'Valider ✓' : 'Ajouter ✓'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PLANNING TAB
// ══════════════════════════════════════════════════════
function PlanningTab() {
  const { meals, recipes, cats, settings, planningTarget, setPlanningTarget, addMeal, addIngredientsFromRecipe, duplicateWeek, showSnack, updSettings, addKeywordToCat } = useApp();
  const [pickerWeek,   setPickerWeek]   = useState(null);
  const [dupWeek,      setDupWeek]      = useState(null);
  const [filterData,   setFilterData]   = useState(null);
  const [multiCatData, setMultiCatData] = useState(null);
  const [viewRecipe,   setViewRecipe]   = useState(null);
  const [btnVisible,  setBtnVisible]  = useState(false);
  const currentWeek    = getISOWeekKey();
  const currentYear    = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const currentWeekRef = useRef(null);

  const weeksToShow = settings.weeksToShow || 0;

  // MIN_YEAR dynamique depuis les données (toujours au moins l'année précédente)
  const MIN_YEAR = useMemo(() => {
    const dataYears = meals.map(m => parseInt(m.weekKey.split('-W')[0])).filter(Boolean);
    return dataYears.length ? Math.min(Math.min(...dataYears), currentYear - 1) : currentYear - 1;
  }, [meals, currentYear]);
  const MAX_YEAR = 2050;

  // Navigation vers une semaine depuis WeeksBadge
  useEffect(() => {
    if (!planningTarget) return;
    const targetYear = parseInt(planningTarget.split('-W')[0]);
    // Si en mode fenêtre glissante, basculer en vue annuelle pour que la semaine soit visible
    if (weeksToShow > 0) updSettings({ weeksToShow: 0 });
    if (!isNaN(targetYear)) setYear(targetYear);
    setTimeout(() => {
      const el = document.querySelector(`[data-week="${planningTarget}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    setPlanningTarget(null);
  }, [planningTarget]);

  // Semaines ISO de l'année sélectionnée
  const allWeeks = useMemo(() => {
    const jan4  = new Date(year, 0, 4);
    const start = new Date(jan4);
    start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const weeks = [];
    for (let i = 0; i < 54; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i * 7);
      const key = getISOWeekKey(d);
      if (key.startsWith(String(year))) weeks.push(key);
    }
    return weeks;
  }, [year]);

  // Scroll vers la semaine en cours (si présente) ou vers le haut lors d'un changement d'année
  useEffect(() => {
    const t = setTimeout(() => {
      if (currentWeekRef.current) {
        currentWeekRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
      } else {
        // Année différente de l'année courante → scroll vers le haut
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
      }
    }, 80);
    return () => clearTimeout(t);
  }, [year]);

  // Bouton "Semaine en cours" — visible si hors écran OU si on n'est pas dans l'année courante
  useEffect(() => {
    if (year !== currentYear) { setBtnVisible(true); return; }
    const t = setTimeout(() => {
      const el = currentWeekRef.current;
      if (!el) return;
      const scroller = el.closest('main') || document.documentElement;
      const check = () => {
        if (!currentWeekRef.current) return;
        const elR  = currentWeekRef.current.getBoundingClientRect();
        const conR = scroller.getBoundingClientRect();
        setBtnVisible(!(elR.top < conR.bottom && elR.bottom > conR.top));
      };
      scroller.addEventListener('scroll', check, { passive: true });
      check();
      el._cleanupScroll = () => scroller.removeEventListener('scroll', check);
    }, 150);
    return () => { clearTimeout(t); currentWeekRef.current?._cleanupScroll?.(); };
  }, [year, currentYear]);

  const goToCurrentWeek = () => {
    if (year !== currentYear) setYear(currentYear);
    else currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Raccourcis d'années affichés dans la barre de navigation
  const shortcuts = useMemo(() => {
    const s = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2]);
    [2030, 2035, 2040, 2045, 2050].forEach(y => { if (y > currentYear + 2) s.add(y); });
    return [...s].filter(y => y >= MIN_YEAR && y <= MAX_YEAR).sort((a,b)=>a-b);
  }, [currentYear, MIN_YEAR, MAX_YEAR]);

  return (
    <div style={{ position:'relative' }}>
      {/* Bouton flottant "Semaine en cours" — masqué en mode rolling */}
      {btnVisible && weeksToShow === 0 && (
        <div style={{
          position:'sticky', top:4, zIndex:50,
          display:'flex', justifyContent:'flex-end',
          padding:'0 12px', pointerEvents:'none',
        }}>
          <Btn onClick={goToCurrentWeek} variant="accent" small
            style={{ pointerEvents:'all', boxShadow:'0 3px 14px rgba(0,0,0,0.45)' }}>
            📅 Semaine en cours
          </Btn>
        </div>
      )}

      {weeksToShow > 0 ? (
        /* ── Mode fenêtre glissante ── */
        <>
          <div style={{
            position:'sticky', top:0, zIndex:40, background:C.card,
            borderBottom:`1px solid ${C.border}`, padding:'9px 14px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            {C.modern ? <span /> : <span style={{ fontWeight:700, fontSize:14, color:C.text }}>📅 Planning</span>}
            <span style={{ fontSize:12, color:C.muted }}>
              {weeksToShow} semaine{weeksToShow>1?'s':''} à venir
            </span>
          </div>
          <div style={{ padding:'8px 12px 12px' }}>
            {Array.from({ length: weeksToShow }, (_, i) => shiftWeek(currentWeek, i - 1)).map(wk => (
              <div key={wk} ref={wk === currentWeek ? currentWeekRef : null}>
                <WeekCard weekKey={wk} isCurrent={wk === currentWeek}
                  onAdd={() => setPickerWeek(wk)}
                  onDup={() => setDupWeek(wk)}
                  onViewRecipe={setViewRecipe}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Mode vue annuelle (par défaut) ── */
        <>
          {/* ── Sélecteur d'année ── */}
          <div style={{ position:'sticky', top: btnVisible ? 36 : 0, zIndex:40, background:C.card, borderBottom:`1px solid ${C.border}` }}>
            {/* Ligne principale : flèches + année */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px' }}>
              <button aria-label="Précédent"
                onClick={() => year > MIN_YEAR && setYear(y => y - 1)}
                disabled={year <= MIN_YEAR}
                style={{
                  background:'none', border:`1px solid ${year > MIN_YEAR ? C.border : 'transparent'}`,
                  borderRadius:8, padding:'4px 12px', cursor: year > MIN_YEAR ? 'pointer' : 'default',
                  color: year > MIN_YEAR ? C.accent : C.border, fontSize:20, lineHeight:1,
                }}>‹</button>

              <div style={{ textAlign:'center', flex:1 }}>
                <span style={{
                  fontWeight:800, fontSize:21,
                  color: year === currentYear ? C.accent : C.text,
                  letterSpacing:'-0.02em',
                }}>{year}</span>
                {year === currentYear && (
                  <span style={{
                    marginLeft:7, fontSize:11, fontWeight:600,
                    background:C.accentBg, color:C.accent,
                    padding:'2px 8px', borderRadius:10,
                    border:`1px solid ${C.accent}33`,
                    verticalAlign:'middle',
                  }}>en cours</span>
                )}
                {year !== currentYear && (
                  <span style={{ marginLeft:6, fontSize:11, color:C.muted, verticalAlign:'middle' }}>
                    {year < currentYear ? `${currentYear - year} an${currentYear-year>1?'s':''} avant` : `dans ${year - currentYear} an${year-currentYear>1?'s':''}`}
                  </span>
                )}
              </div>

              <button aria-label="Suivant"
                onClick={() => year < MAX_YEAR && setYear(y => y + 1)}
                disabled={year >= MAX_YEAR}
                style={{
                  background:'none', border:`1px solid ${year < MAX_YEAR ? C.border : 'transparent'}`,
                  borderRadius:8, padding:'4px 12px', cursor: year < MAX_YEAR ? 'pointer' : 'default',
                  color: year < MAX_YEAR ? C.accent : C.border, fontSize:20, lineHeight:1,
                }}>›</button>
            </div>

            {/* Raccourcis rapides */}
            <div style={{ display:'flex', gap:5, padding:'0 10px 8px', overflowX:'auto' }}>
              {shortcuts.map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding:'3px 10px', borderRadius:20, flexShrink:0, cursor:'pointer',
                  fontSize:11, fontWeight: y === year ? 700 : 400,
                  background: y === year ? C.accentDk : 'transparent',
                  color: y === year ? C.onAccent : y === currentYear ? C.accent : C.muted,
                  border:`1px solid ${y === year ? C.accentDk : y === currentYear ? C.accent+'55' : C.border}`,
                }}>{y}</button>
              ))}
            </div>
          </div>

          {/* Liste des semaines */}
          <div style={{ padding:'8px 12px 12px' }}>
            {allWeeks.map(wk => (
              <div key={wk} ref={wk === currentWeek ? currentWeekRef : null}>
                <WeekCard weekKey={wk} isCurrent={wk === currentWeek}
                  onAdd={() => setPickerWeek(wk)}
                  onDup={() => setDupWeek(wk)}
                  onViewRecipe={setViewRecipe}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {pickerWeek && (
        <RecipePicker
          onClose={() => setPickerWeek(null)}
          onSelectFree={(customName, persons) => {
            addMeal(pickerWeek, null, persons, customName);
            setPickerWeek(null);
          }}
          onSelect={(recipeIds, persons) => {
            const selections = recipeIds
              .map(id => ({ recipe: recipes.find(r => r.id === id), persons }))
              .filter(s => s.recipe);
            const hasIngredients = selections.some(s => s.recipe.ingredients?.length > 0);
            setPickerWeek(null);
            if (hasIngredients) {
              setFilterData({ weekKey: pickerWeek, selections });
            } else {
              // Aucune recette n'a d'ingrédients → ajout direct
              selections.forEach(({ recipe, persons: p }) => addMeal(pickerWeek, recipe.id, p));
            }
          }}
        />
      )}
      {filterData && (
        <IngredientFilterModal
          useStock
          selections={filterData.selections}
          onSkip={() => {
            // Ajoute les repas sans ingrédients
            filterData.selections.forEach(({ recipe, persons: p }) => addMeal(filterData.weekKey, recipe.id, p));
            setFilterData(null);
            showSnack('ℹ️ Repas ajouté · ingrédients non ajoutés à la liste');
          }}
          onCancel={() => setFilterData(null)}
          onConfirm={(selectedByRecipe, stockUse = {}) => {
            // Ajoute tous les repas et capture leurs IDs pour fromMealId
            const mealIds = {};
            filterData.selections.forEach(({ recipe, persons: p }) => {
              mealIds[recipe.id] = addMeal(filterData.weekKey, recipe.id, p, '', stockUse[recipe.id]?.used);
            });
            // Collecte les ingrédients sans correspondance de mot-clé
            const uncatItems = [];
            filterData.selections.forEach(({ recipe, persons: p }) => {
              const ids = selectedByRecipe[recipe.id] || [];
              getUncatIngredients(recipe, ids, cats).forEach(ing =>
                uncatItems.push({ id: ing.id, name: ing.name, recipeEmoji: recipe.emoji, recipeName: recipe.name })
              );
            });
            if (uncatItems.length > 0) {
              // Stocke les données brutes — pas de closure sur addIngredientsFromRecipe
              // pour éviter un appel avec cats/context périmés
              setMultiCatData({
                uncatItems,
                selections: filterData.selections,
                selectedByRecipe,
                mealIds,
                stockUse,
              });
            } else {
              filterData.selections.forEach(({ recipe, persons: p }) => {
                const ids = selectedByRecipe[recipe.id] || [];
                if (ids.length) addIngredientsFromRecipe(recipe, p, ids, {}, mealIds[recipe.id], stockUse[recipe.id]?.overrides || {});
              });
            }
            const totalAdded = filterData.selections.reduce((s, { recipe }) => s + (selectedByRecipe[recipe.id]?.length || 0) + (stockUse[recipe.id]?.used?.length || 0), 0);
            if (totalAdded === 0) showSnack('ℹ️ Repas ajouté · aucun ingrédient sélectionné');
            setFilterData(null);
          }}
        />
      )}
      {multiCatData && (
        <MultiCategoryAssignModal
          uncatItems={multiCatData.uncatItems}
          onConfirm={(catOverrides) => {
            // 1. Ajoute les ingrédients à la liste de courses
            multiCatData.selections.forEach(({ recipe, persons: p }) => {
              const ids = multiCatData.selectedByRecipe[recipe.id] || [];
              if (ids.length) addIngredientsFromRecipe(recipe, p, ids, catOverrides, multiCatData.mealIds[recipe.id], multiCatData.stockUse?.[recipe.id]?.overrides || {});
            });
            // 2. Enregistre le nom de chaque ingrédient comme mot-clé dans sa catégorie assignée
            //    → la prochaine fois que cette recette est ajoutée, la catégorie sera reconnue automatiquement
            multiCatData.uncatItems.forEach(item => {
              const catId = catOverrides[item.id];
              if (!catId) return;
              addKeywordToCat(catId, item.name.trim().toLowerCase());
            });
            setMultiCatData(null);
          }}
          onCancel={() => {
            // Annulation : ajoute quand même les ingrédients sans catOverrides
            multiCatData.selections.forEach(({ recipe, persons: p }) => {
              const ids = multiCatData.selectedByRecipe[recipe.id] || [];
              if (ids.length) addIngredientsFromRecipe(recipe, p, ids, {}, multiCatData.mealIds[recipe.id], multiCatData.stockUse?.[recipe.id]?.overrides || {});
            });
            setMultiCatData(null);
          }}
        />
      )}
      {dupWeek && (
        <DupWeekModal fromKey={dupWeek} onClose={() => setDupWeek(null)}
          onDup={to => { duplicateWeek(dupWeek, to); setDupWeek(null); }}
        />
      )}
      {viewRecipe && (
        <RecipeDetail recipe={recipes.find(r => r.id === viewRecipe.id) || viewRecipe}
          onClose={() => setViewRecipe(null)}
          onEdit={null} onDelete={null} onDuplicate={null}
        />
      )}
    </div>
  );
}

function WeekCard({ weekKey, isCurrent, onAdd, onDup, onViewRecipe }) {
  const { meals, recipes, reportMeals, cantine } = useApp();
  const [expanded, setExpanded] = useState(isCurrent);
  const [reportOpen, setReportOpen] = useState(false);
  const weekMeals = meals.filter(m => m.weekKey === weekKey);
  const wn = weekKey.split('-W')[1];
  const currentWeek = getISOWeekKey();
  // "Reporter" n'a de sens que pour une semaine déjà entamée (passée ou en cours) —
  // une semaine future n'a par définition aucun repas cuisiné, ce n'est pas la même chose.
  const unfinishedMeals = weekKey <= currentWeek ? weekMeals.filter(m => !m.done) : [];

  // Menus cantine de la semaine (lundi→vendredi) — purement informatif, n'affiche que les jours renseignés
  const weekCantine = useMemo(() => getWeekdayDates(weekKey).map(d => {
    const dateStr = fmtISODate(d);
    return {
      date: dateStr,
      label: `${WEEKDAY_LABELS[d.getDay()-1]} ${d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}`,
      entry: cantine.find(c => c.date === dateStr) || null,
    };
  }).filter(w => w.entry), [weekKey, cantine]);

  const shareWeek = () => {
    const text = `📅 Semaine ${wn} — ${getWeekRange(weekKey)}\n\n` +
      weekMeals.map(m => {
        const r    = recipes.find(x => x.id === m.recipeId);
        const name = r ? `${r.emoji} ${r.name}` : `🍽 ${m.customName || 'Repas'}`;
        const note = m.note ? `\n   📝 ${m.note}` : '';
        return `${name} (${m.persons} pers.)${note}`;
      }).filter(Boolean).join('\n');
    if (navigator.share) navigator.share({ title: 'Menu semaine', text });
    else navigator.clipboard?.writeText(text).catch(() => {});
  };

  // Bleu ciel clair bien visible pour la semaine en cours
  const curBg  = C.curBg;
  const curBdr = C.curBdr;

  return (
    <div data-week={weekKey} style={{
      background: isCurrent ? curBg : C.card,
      border: `1px solid ${isCurrent ? curBdr : C.border}`,
      borderRadius:C.rCard, marginBottom:6, overflow:'hidden',
    }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        padding:'9px 13px', display:'flex', justifyContent:'space-between', alignItems:'center',
        cursor:'pointer', borderBottom: expanded ? `1px solid ${C.border}33` : 'none',
        userSelect:'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isCurrent && (
            <span style={{
              fontSize:11, background:C.curTagBg, color:C.skyCur,
              padding:'2px 8px', borderRadius:10, fontWeight:700, letterSpacing:'0.04em',
              border:`1px solid ${C.curTagBdr}`,
            }}>EN COURS</span>
          )}
          <span style={{ fontWeight:600, fontSize:15, color: isCurrent ? C.skyCur : C.text }}>
            S{wn}
          </span>
          <span style={{ fontSize:13, color:C.muted }}>{getWeekRange(weekKey)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {weekMeals.length > 0 && (
            <span style={{ fontSize:13, color:C.muted }}>{weekMeals.length} repas</span>
          )}
          <span style={{ color:C.muted, fontSize:13 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'8px 10px 12px' }}>
          {weekMeals.length === 0 && (
            <div style={{ padding:'8px 0', color:C.muted, fontSize:13, textAlign:'center' }}>
              Aucun repas — cliquez sur + pour ajouter
            </div>
          )}
          {weekMeals.map(meal => {
            const recipe = recipes.find(r => r.id === meal.recipeId);
            // Affiche les repas avec recette ET les repas personnalisés (customName)
            if (!recipe && !meal.customName) return null;
            return <MealItem key={meal.id} meal={meal} recipe={recipe || null} onViewRecipe={onViewRecipe} />;
          })}

          {weekCantine.length > 0 && (
            <div style={{ background:C.planBg, border:`1px solid ${C.planBdr}`, borderRadius:10, padding:'8px 10px', marginTop:6, marginBottom:2 }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
                🏫 Cantine
              </div>
              {weekCantine.map((w, i) => (
                <div key={w.date} style={{
                  marginBottom: i < weekCantine.length-1 ? 6 : 0,
                  paddingBottom: i < weekCantine.length-1 ? 6 : 0,
                  borderBottom: i < weekCantine.length-1 ? `1px solid ${C.border}33` : 'none',
                }}>
                  <div style={{ fontSize:12, color:C.accent, fontWeight:600, marginBottom:2 }}>{w.label}</div>
                  <div style={{ fontSize:12, color:C.soft, lineHeight:1.5 }}>
                    {[w.entry.entree, w.entry.plat, w.entry.fromage, w.entry.dessert].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <Btn onClick={onAdd} variant="primary" small>+ Ajouter</Btn>
            <Btn label="Dupliquer" onClick={onDup} variant="ghost" small>📋</Btn>
            {weekMeals.length > 0 && <Btn label="Partager" onClick={shareWeek} variant="ghost" small>📤</Btn>}
            {unfinishedMeals.length > 0 && (
              <Btn onClick={() => setReportOpen(true)} variant="orange" small>
                ↷ Reporter
              </Btn>
            )}
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportMealsModal
          weekKey={weekKey}
          unfinishedMeals={unfinishedMeals}
          recipes={recipes}
          onClose={() => setReportOpen(false)}
          onConfirm={(ids) => { reportMeals(ids, weekKey); setReportOpen(false); }}
        />
      )}
    </div>
  );
}

function MealItem({ meal, recipe, onViewRecipe }) {
  const { toggleMealDone, updateMealPersons, updateMeal, deleteMeal, meals } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  const openNote = () => { setDraftNote(meal.note || ''); setNoteOpen(true); };
  const saveNote = () => { updateMeal(meal.id, { note: draftNote.trim() }); setNoteOpen(false); };

  // Bouton retour Android ferme la note si ouverte
  useBackHandler(() => setNoteOpen(false), noteOpen);

  // Indicateur de re-planification : même recette la semaine précédente
  const prevWeek   = shiftWeek(meal.weekKey, -1);
  const wasLastWeek = meal.recipeId
    ? meals.some(m => m.id !== meal.id && m.recipeId === meal.recipeId && m.weekKey === prevWeek)
    : (meal.customName && meals.some(m => m.id !== meal.id && m.customName === meal.customName && m.weekKey === prevWeek));

  const isCustom  = !recipe;
  const mealEmoji = recipe?.emoji || '🍽';
  const mealName  = recipe?.name  || meal.customName || 'Repas';

  return (
    <>
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      background: meal.done ? C.cookedBg : C.planBg,
      border:`1px solid ${meal.done ? C.green+'33' : C.planBdr}`,
      borderRadius:C.rRow, padding:'8px 10px', marginBottom:4, transition:'all 0.2s',
    }}>
      <button onClick={() => toggleMealDone(meal.id)} style={{
        width:24, height:24, borderRadius:'50%',
        border:`2px solid ${meal.done ? C.green : C.ring}`,
        background: meal.done ? C.green : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color:C.onAccent, fontSize:12, flexShrink:0, transition:'all 0.2s',
      }}>
        {meal.done ? '✓' : ''}
      </button>

      <span style={{ fontSize:18, flexShrink:0 }}>{mealEmoji}</span>

      <div onClick={() => !isCustom && onViewRecipe?.(recipe)} style={{ flex:1, minWidth:0, cursor: isCustom ? 'default' : 'pointer' }}>
        <div style={{
          fontWeight:500, fontSize:15, color: meal.done ? C.muted : C.text,
          textDecoration: meal.done ? 'line-through' : 'none',
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          lineHeight:1.3, wordBreak:'break-word',
        }}>{mealName}</div>
        {(wasLastWeek || meal.note) && (
          <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
            {wasLastWeek && (
              <span style={{
                fontSize:11, color:C.orange, background:C.orangeBg,
                border:`1px solid ${C.orange}33`, borderRadius:5,
                padding:'1px 5px', fontWeight:600, flexShrink:0,
              }}>↩ S.{prevWeek.split('-W')[1]}</span>
            )}
            {meal.note && (
              <span style={{
                fontSize:11, color:C.orange, fontStyle:'italic',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>📝 {meal.note}</span>
            )}
          </div>
        )}
      </div>

      {/* Personnes */}
      <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
        <button aria-label="Moins de personnes" onClick={() => updateMealPersons(meal.id, -1)} style={{
          background:C.border, border:'none', color:C.text,
          width:20, height:20, borderRadius:4, cursor:'pointer', fontSize:13, lineHeight:1,
        }}>−</button>
        <span style={{ fontSize:12, color:C.muted, minWidth:22, textAlign:'center' }}>👥{meal.persons}</span>
        <button aria-label="Plus de personnes" onClick={() => updateMealPersons(meal.id, +1)} style={{
          background:C.border, border:'none', color:C.text,
          width:20, height:20, borderRadius:4, cursor:'pointer', fontSize:13, lineHeight:1,
        }}>+</button>
      </div>

      {/* Note */}
      <button aria-label="Note" onClick={openNote} style={{
        background: meal.note ? C.orangeBg : 'transparent',
        border: meal.note ? `1px solid ${C.orange}44` : '1px solid transparent',
        color: meal.note ? C.orange : C.muted,
        borderRadius:7, padding:'3px 7px', cursor:'pointer', fontSize:13,
        flexShrink:0, transition:'all 0.15s',
      }}>📝</button>

      {/* Supprimer */}
      <button aria-label="Supprimer" onClick={() => deleteMeal(meal.id)} style={{
        background:'transparent', border:'none',
        color:C.muted, borderRadius:6, padding:'2px 6px',
        cursor:'pointer', fontSize:12, flexShrink:0,
      }}>🗑</button>
    </div>

    {/* Bottom sheet note */}
    {noteOpen && (
      <div onClick={e => e.target===e.currentTarget && setNoteOpen(false)} style={{
        position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.65)',
        display:'flex', alignItems:'flex-end',
      }}>
        <div style={{
          width:'100%', maxWidth:480, margin:'0 auto',
          background:C.card, borderRadius:'20px 20px 0 0',
          padding:'20px 16px 28px', border:`1px solid ${C.border}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontWeight:700, color:C.text, fontSize:14 }}>
              📝 Note — {mealName}
            </span>
            <button aria-label="Fermer" onClick={() => setNoteOpen(false)} style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
          </div>
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            placeholder="Ex : sans gluten, doubler la sauce, acheté tout fait…"
            autoFocus
            rows={3}
            style={{
              width:'100%', background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:10, padding:'10px 12px', color:C.text, fontSize:13,
              outline:'none', resize:'none', fontFamily:'inherit',
              lineHeight:1.5, boxSizing:'border-box',
            }}
          />
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            {draftNote.trim() && (
              <button onClick={() => { setDraftNote(''); saveNote(); }} style={{
                flex:1, padding:'10px', background:C.redBg,
                border:`1px solid ${C.red}33`, color:C.red,
                borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:600,
              }}>🗑 Supprimer</button>
            )}
            <button onClick={saveNote} style={{
              flex:2, padding:'10px', background:C.accentDk,
              border:'none', color:C.onAccent,
              borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700,
            }}>✓ Enregistrer</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function RecipePicker({ onClose, onSelect, onSelectFree }) {
  const { recipes, meals, settings, stock } = useApp();
  const [search,      setSearch]      = useState('');
  const [persons,     setPersons]     = useState(settings.householdSize || 6);
  const [selected,    setSelected]    = useState(new Set());
  const [mode,        setMode]        = useState('browse'); // browse | suggest | stock
  const suggestMode = mode === 'suggest';
  const stockMode   = mode === 'stock';
  const stockSugg   = useMemo(() => suggestFromStock(recipes, stock), [recipes, stock]);
  const stockInfo   = useMemo(() => Object.fromEntries(stockSugg.map(x => [x.recipe.id, x])), [stockSugg]);
  const [tagFilter,   setTagFilter]   = useState(null);
  const [freeText,    setFreeText]    = useState('');

  const currentWeek = getISOWeekKey();
  const currentSeason = useMemo(() => getCurrentSeason(), []);

  // Pré-calcul O(meals) au lieu de O(recipes × meals)
  const scores = useMemo(() => {
    const [cy, cw] = currentWeek.split('-W').map(Number);
    const latestByRecipe = {};
    meals.forEach(m => {
      if (!m.recipeId) return;  // custom meals exclus
      if (!m.done) return;      // ne compte que les repas effectivement cuisinés
      if (!latestByRecipe[m.recipeId] || m.weekKey > latestByRecipe[m.recipeId])
        latestByRecipe[m.recipeId] = m.weekKey;
    });
    const map = {};
    recipes.forEach(r => {
      const latest = latestByRecipe[r.id];
      if (!latest) { map[r.id] = 52; return; }
      const [ly, lw] = latest.split('-W').map(Number);
      map[r.id] = Math.min((cy - ly) * 52 + (cw - lw), 52);
    });
    return map;
  }, [recipes, meals, currentWeek]);

  const recipeScore = r => scores[r.id] ?? 52;

  /** Libellé "dernière cuisson" affiché sous le nom */
  const lastUsedLabel = r => {
    const score = recipeScore(r);
    if (score === 52) return null; // jamais cuisiné → pas de label
    if (score === 0)  return { text: 'Cuisiné cette semaine', color: C.orange };
    if (score === 1)  return { text: 'Cuisiné la semaine passée', color: C.orange };
    if (score < 4)    return { text: `Cuisiné il y a ${score} sem.`, color: C.muted };
    return               { text: `Cuisiné il y a ${score} sem.`, color: C.green };
  };

  // Tags disponibles
  const allTags = useMemo(() => {
    const s = new Set(); recipes.forEach(r => (r.tags||[]).forEach(t => s.add(t))); return [...s];
  }, [recipes]);

  // Filtrage + tri
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = (stockMode ? stockSugg.map(x => x.recipe) : recipes).filter(r => {
      if (tagFilter && !(r.tags||[]).includes(tagFilter)) return false;
      if (q && !r.name.toLowerCase().includes(q) &&
          !(r.ingredients||[]).some(i => i.name.toLowerCase().includes(q))) return false;
      return true;
    });
    if (suggestMode) list = [...list].sort((a,b) => recipeScore(b) - recipeScore(a));
    return list;
  }, [recipes, search, tagFilter, suggestMode, stockMode, stockSugg, recipeScore]);

  const toggle = id => setSelected(s => { const ns=new Set(s); ns.has(id)?ns.delete(id):ns.add(id); return ns; });
  const count  = selected.size;

  /** Tirage aléatoire pondéré : score plus élevé = plus de chances */
  const pickRandom = () => {
    const pool = filtered.filter(r => !selected.has(r.id));
    if (!pool.length) return;
    const weights = pool.map(r => {
      const base = Math.max(recipeScore(r), 1);
      const rs = getRecipeSeasons(r);
      const seasonMatch = rs.includes('all') || rs.includes(currentSeason);
      return seasonMatch ? base : base * 0.2; // hors-saison : poids réduit, pas exclu
    });
    const total   = weights.reduce((a,b) => a+b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { toggle(pool[i].id); return; }
    }
    toggle(pool[pool.length - 1].id);
  };

  return (
    <BottomSheet title="Ajouter des repas" onClose={onClose}>
      <div style={{ padding:'10px 14px' }}>

        {/* ── Ligne 1 : personnes + mode ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ color:C.muted, fontSize:13 }}>👥</span>
          <button aria-label="Moins de personnes" onClick={() => setPersons(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:15 }}>−</button>
          <span style={{ fontWeight:700, color:C.text, minWidth:22, textAlign:'center', fontSize:14 }}>{persons}</span>
          <button aria-label="Plus de personnes" onClick={() => setPersons(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:15 }}>+</button>
          <div style={{ flex:1 }} />
          {/* Toggle mode */}
          <div style={{ display:'flex', background:C.border, borderRadius:9, padding:2, gap:2 }}>
            {[['browse','🗃 Toutes'],['suggest','💡 Suggestions'],['stock','🥫 Stock']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                background: mode===m ? C.accentDk : 'transparent',
                color:      mode===m ? C.onAccent : C.muted,
                border:'none', borderRadius:7, padding:'5px 8px',
                fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── Ligne 2 : recherche + 🎲 ── */}
        <div style={{ display:'flex', gap:6, marginBottom: allTags.length ? 8 : 0 }}>
          <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, padding:'7px 11px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none' }}
          />
          <button aria-label="Au hasard"
            onClick={pickRandom}
            title="Recette aléatoire (favorise les moins récentes)"
            style={{
              background: C.orangeBg, border:`1px solid ${C.orange}44`,
              color:C.orange, borderRadius:9, padding:'7px 12px',
              fontSize:18, cursor:'pointer', flexShrink:0, fontWeight:700,
              transition:'transform 0.15s',
            }}
          >🎲</button>
        </div>

        {/* ── Filtres par tag (tous modes) ── */}
        {allTags.length > 0 && (
          <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:6, marginBottom:4,
            scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}>
            <button onClick={() => setTagFilter(null)} style={{
              flexShrink:0, background: !tagFilter ? C.accentBg : C.border,
              color: !tagFilter ? C.accent : C.muted,
              border: !tagFilter ? `1px solid ${C.accent}44` : '1px solid transparent',
              borderRadius:20, padding:'4px 12px', fontSize:11, cursor:'pointer', fontWeight: !tagFilter?700:400,
            }}>Tous</button>
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(tagFilter===t ? null : t)} style={{
                flexShrink:0, background: tagFilter===t ? C.accentBg : C.border,
                color: tagFilter===t ? C.accent : C.muted,
                border: tagFilter===t ? `1px solid ${C.accent}44` : '1px solid transparent',
                borderRadius:20, padding:'4px 12px', fontSize:11, cursor:'pointer', fontWeight: tagFilter===t?700:400,
              }}>{t}</button>
            ))}
          </div>
        )}

        {/* ── Liste de recettes ── */}
        <div style={{ maxHeight:340, overflowY:'auto', marginTop: allTags.length ? 0 : 8 }}>
          {filtered.map((r, idx) => {
            const isSelected = selected.has(r.id);
            const lul        = lastUsedLabel(r);
            const score      = recipeScore(r);
            const isNew      = score === 52; // jamais planifiée
            return (
              <div key={r.id} onClick={() => toggle(r.id)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                borderRadius:9, marginBottom:4, cursor:'pointer', transition:'all 0.12s',
                background: isSelected ? C.accentBg : C.bg,
                border:`1px solid ${isSelected ? C.accent+'44' : C.border}`,
              }}>
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0,
                  background: isSelected ? C.accentDk : 'transparent',
                  border:`2px solid ${isSelected ? C.accentDk : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {isSelected && <span style={{ color:C.onAccent, fontSize:10, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:22, flexShrink:0 }}>{r.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <span style={{ fontWeight:500, fontSize:15, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{r.name}</span>
                    {isNew && suggestMode && (
                      <span style={{ fontSize:11, fontWeight:700, color:C.green, background:C.greenBg, border:`1px solid ${C.green}44`, borderRadius:6, padding:'1px 5px', flexShrink:0 }}>NOUVEAU</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, display:'flex', gap:8, marginTop:1 }}>
                    <span>{r.portions}p{r.cookTimeMinutes ? ` · ⏱ ${r.cookTimeMinutes}min` : ''}{r.favorite ? ' · ⭐' : ''}</span>
                    {lul && suggestMode && (
                      <span style={{ color: lul.color }}>• {lul.text}</span>
                    )}
                    {stockMode && stockInfo[r.id] && (
                      <span style={{ color: stockInfo[r.id].expiring.length ? C.orange : C.green }}>
                        • 🥫 {stockInfo[r.id].matched}/{stockInfo[r.id].total} en stock{stockInfo[r.id].expiring.length ? ` · ⏰ ${stockInfo[r.id].expiring.join(', ')}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:20, color:C.muted, fontSize:13 }}>
              {suggestMode ? '🎉 Toutes les recettes ont été faites récemment !' : stockMode ? '🥫 Aucune recette ne correspond à ton stock' : 'Aucune recette'}
            </div>
          )}
        </div>

        {/* ── Repas personnalisé ── */}
        {onSelectFree && (
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:6 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:6 }}>🍽 Repas sans recette</div>
            <div style={{ display:'flex', gap:6 }}>
              <input
                placeholder="Restaurant, restes, livraison…"
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && freeText.trim()) { onSelectFree(freeText.trim(), persons); onClose(); }}}
                style={{ flex:1, padding:'7px 10px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none' }}
              />
              <button aria-label="Ajouter"
                onClick={() => { if (freeText.trim()) { onSelectFree(freeText.trim(), persons); onClose(); }}}
                disabled={!freeText.trim()}
                style={{
                  background: freeText.trim() ? C.accentDk : C.border, border:'none',
                  color: freeText.trim() ? C.onAccent : C.hi, borderRadius:9, padding:'7px 13px',
                  cursor: freeText.trim() ? 'pointer' : 'default', fontSize:13, fontWeight:700,
                }}
              >+</button>
            </div>
          </div>
        )}

        <Btn
          onClick={() => count > 0 && onSelect([...selected], persons)}
          variant="primary" disabled={count === 0}
          style={{ width:'100%', justifyContent:'center', marginTop:10 }}
        >
          {count === 0 ? 'Sélectionne des recettes' : `Ajouter ${count} repas`}
        </Btn>
      </div>
    </BottomSheet>
  );
}

function DupWeekModal({ fromKey, onClose, onDup }) {
  const currentWeek = getISOWeekKey();
  const [target, setTarget] = useState(shiftWeek(currentWeek, 1));
  const options = [];
  for (let i = 0; i < 8; i++) options.push(shiftWeek(currentWeek, i));

  return (
    <BottomSheet title="Dupliquer la semaine" onClose={onClose}>
      <div style={{ padding:16 }}>
        <div style={{ color:C.muted, fontSize:13, marginBottom:12 }}>
          Copier la semaine {fromKey.split('-W')[1]} vers :
        </div>
        {options.filter(w => w !== fromKey).map(w => (
          <div key={w} onClick={() => setTarget(w)} style={{
            padding:'10px 14px', borderRadius:11, marginBottom:6, cursor:'pointer',
            background: target===w ? C.accentBg : C.bg,
            border:`1px solid ${target===w ? C.accent+'55' : C.border}`,
          }}>
            <span style={{ fontWeight:500, color:C.text }}>Semaine {w.split('-W')[1]}</span>
            <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>{getWeekRange(w)}</span>
          </div>
        ))}
        <Btn onClick={() => onDup(target)} variant="primary" style={{ width:'100%', justifyContent:'center', marginTop:12 }}>
          Dupliquer →
        </Btn>
      </div>
    </BottomSheet>
  );
}

/** Choix des repas non cuisinés à reporter vers la semaine suivante. Tout coché par défaut. */
function ReportMealsModal({ weekKey, unfinishedMeals, recipes, onClose, onConfirm }) {
  const targetWeek = shiftWeek(weekKey, 1);
  const [selected, setSelected] = useState(() => new Set(unfinishedMeals.map(m => m.id)));

  const toggle = id => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  const count = selected.size;

  return (
    <BottomSheet title={`Reporter vers S${targetWeek.split('-W')[1]}`} onClose={onClose}>
      <div style={{ padding:'10px 16px 20px' }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
          Décoche les repas que tu ne veux pas reporter.
        </div>
        {unfinishedMeals.map(meal => {
          const recipe = recipes.find(r => r.id === meal.recipeId);
          const name   = recipe?.name || meal.customName || 'Repas';
          const emoji  = recipe?.emoji || '🍽';
          const on     = selected.has(meal.id);
          return (
            <div key={meal.id} onClick={() => toggle(meal.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
              borderRadius:9, marginBottom:5, cursor:'pointer', transition:'all 0.12s',
              background: on ? C.accentBg : C.bg,
              border:`1px solid ${on ? C.accent+'44' : C.border}`,
            }}>
              <div style={{
                width:18, height:18, borderRadius:5, flexShrink:0,
                background: on ? C.accentDk : 'transparent',
                border:`2px solid ${on ? C.accentDk : C.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {on && <span style={{ color:C.onAccent, fontSize:10, fontWeight:700 }}>✓</span>}
              </div>
              <span style={{ fontSize:18, flexShrink:0 }}>{emoji}</span>
              <span style={{ flex:1, fontSize:14, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
              <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>👥{meal.persons}</span>
            </div>
          );
        })}
        <Btn onClick={() => count > 0 && onConfirm([...selected])} variant="orange" disabled={count === 0}
          style={{ width:'100%', justifyContent:'center', marginTop:10 }}>
          {count === 0 ? 'Sélectionne au moins un repas' : `↷ Reporter ${count} repas`}
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ══════════════════════════════════════════════════════
//  MENUS CANTINE — import automatique depuis une photo
// ══════════════════════════════════════════════════════

/**
 * Analyse une photo de menu cantine via OCR local (ML Kit embarqué côté
 * natif, zéro réseau, zéro clé API — voir Android.analyzeCantinePhoto dans
 * MainActivity.java / CantineMenuOcr.java) et ajoute automatiquement les
 * jours détectés. Pas d'étape de confirmation manuelle par jour — l'ajout
 * est direct ; la correction se fait ensuite via la liste (tap sur un jour
 * → CantineDayEditModal).
 */
function CantinePhotoImportModal({ onClose, upsertCantineDays }) {
  useBackHandler(onClose);
  const { showSnack } = useApp();
  const fileRef  = useRef(null);
  const abortRef = useRef(null);
  const [importing,  setImporting]  = useState(false);
  const [importStep, setImportStep] = useState('');
  const [elapsed,    setElapsed]    = useState(0);
  const [error,      setError]      = useState('');
  const [result,     setResult]     = useState(null); // { count, first, last }

  useEffect(() => {
    if (!importing) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [importing]);

  const withTimeout = (promise, ms = 45000) => Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`Délai dépassé (${ms/1000}s)`)), ms)),
    new Promise((_, rej) => {
      const ctrl = abortRef.current;
      if (!ctrl) return;
      if (ctrl.signal.aborted) { rej(new Error('Import annulé')); return; }
      ctrl.signal.addEventListener('abort', () => rej(new Error('Import annulé')));
    }),
  ]);

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result || '';
      const comma = r.indexOf(',');
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });

  // Pont vers Android.analyzeCantinePhoto (OCR local ML Kit, zéro réseau) — même
  // pattern callback que fetchViaAndroid/importRecipe, mais totalement indépendant.
  // Résout TOUJOURS (jamais de reject ici) : même un résultat en erreur peut porter
  // un champ `raw` (texte brut OCR) précieux pour diagnostiquer — un reject avec
  // juste un message le ferait perdre. L'appelant vérifie data.error lui-même.
  const analyzeCantinePhotoNative = (base64) => new Promise((resolve, reject) => {
    if (!window.Android?.analyzeCantinePhoto) {
      reject(new Error("Pont Android indisponible — la reconnaissance de texte n'est pas câblée dans cette build."));
      return;
    }
    const cbId = 'mp_cantine_' + Date.now();
    window.__mpCantineOCR = window.__mpCantineOCR || {};
    window.__mpCantineOCR[cbId] = (result) => resolve(result);
    window.Android.analyzeCantinePhoto(base64, cbId);
  });

  const handleFile = async (file) => {
    if (!file) return;
    abortRef.current = new AbortController();
    setImporting(true); setError(''); setResult(null);
    setImportStep('📷 Lecture de la photo…');
    try {
      const base64 = await withTimeout(readFileAsBase64(file));
      setImportStep('🔎 Reconnaissance de texte (local, hors-ligne)…');

      const data = await withTimeout(analyzeCantinePhotoNative(base64), 20000);
      if (data.error) throw new Error(data.error);

      const days = (data.days || []).filter(d => d && isValidISODate(d.date));
      if (!days.length) throw new Error('Aucun jour valide extrait de la photo.');

      upsertCantineDays(days.map(d => ({
        date:    d.date,
        entree:  (d.entree  || '').trim(),
        plat:    (d.plat    || '').trim(),
        fromage: (d.fromage || '').trim(),
        dessert: (d.dessert || '').trim(),
      })));

      const sortedDates = [...days].map(d => d.date).sort();
      setResult({ count: days.length, first: sortedDates[0], last: sortedDates[sortedDates.length-1] });
      setImportStep('');
    } catch (e) {
      setError(e.message || "Échec de l'import.");
      setImportStep('');
    } finally {
      setImporting(false);
    }
  };


  const fmt = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' });

  return (
    <BottomSheet title="📷 Importer depuis une photo" onClose={onClose}>
      <div style={{ padding:'10px 16px 24px' }}>
        <input ref={fileRef} type="file" accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; e.target.value=''; handleFile(f); }}
          style={{ position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', opacity:0, pointerEvents:'none' }} />

        {!importing && !result && (
          <>
            <div style={{ fontSize:12, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
              Prends ou choisis une photo du menu cantine (tableau hebdomadaire, jours en colonnes). Le texte est lu directement sur le téléphone (hors-ligne, sans compte ni clé) et les menus détectés sont ajoutés automatiquement.
            </div>
            {error && (
              <div style={{ color:C.red, fontSize:12, lineHeight:1.6, marginBottom:12, background:C.redBg, border:`1px solid ${C.red}33`, borderRadius:9, padding:10 }}>
                ⚠️ {error}
              </div>
            )}
            <Btn onClick={() => {
              try { fileRef.current?.click(); }
              catch (e) { setError(`Impossible d'ouvrir le sélecteur de fichier (${e.message || 'erreur inconnue'}).`); }
            }} variant="primary" style={{ width:'100%', justifyContent:'center' }}>
              📷 {error ? 'Réessayer avec une autre photo' : 'Choisir une photo'}
            </Btn>
          </>
        )}

        {importing && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, color:C.accent, fontSize:13, marginBottom:10 }}>
              <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⚙️</span>
              <span style={{ flex:1 }}>{importStep || 'Analyse en cours…'}</span>
              <span style={{ color:C.muted, fontSize:11 }}>{elapsed}s</span>
            </div>
            <button onClick={() => { abortRef.current?.abort(); setImporting(false); setImportStep(''); setError('Import annulé.'); }} style={{
              width:'100%', padding:'9px', background:C.redBg, border:`1px solid ${C.red}44`,
              color:C.red, borderRadius:9, fontSize:12, cursor:'pointer', fontFamily:'inherit',
            }}>✕ Annuler</button>
          </div>
        )}

        {result && !importing && (
          <div>
            <div style={{ color:C.green, fontSize:14, fontWeight:600, marginBottom:6 }}>
              ✅ {result.count} jour{result.count>1?'s':''} importé{result.count>1?'s':''}
            </div>
            <div style={{ color:C.muted, fontSize:12, marginBottom:16, lineHeight:1.5 }}>
              Du {fmt(result.first)} au {fmt(result.last)} · vérifie la liste ci-dessous et corrige si besoin (tap sur un jour).
            </div>
            <Btn onClick={onClose} variant="primary" style={{ width:'100%', justifyContent:'center' }}>Fermer</Btn>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/** Édition rapide d'un seul jour — correction après import photo, ou ajout ponctuel. */
function CantineDayEditModal({ date, existing, onClose, upsertCantineDay }) {
  const [form, setForm] = useState({
    entree:  existing?.entree  || '',
    plat:    existing?.plat    || '',
    fromage: existing?.fromage || '',
    dessert: existing?.dessert || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const d = new Date(date + 'T00:00:00');
  const inp = fieldStyle({ style:{ padding:'9px 12px' } });

  const save = () => { upsertCantineDay(date, form); onClose(); };

  return (
    <BottomSheet title={`${WEEKDAY_LABELS[d.getDay()-1]} ${d.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}`} onClose={onClose}>
      <div style={{ padding:'10px 16px 24px' }}>
        <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Entrée</label>
        <input value={form.entree} onChange={e=>set('entree',e.target.value)} style={{ ...inp, marginBottom:12 }} />
        <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Plat</label>
        <input value={form.plat} onChange={e=>set('plat',e.target.value)} style={{ ...inp, marginBottom:12 }} />
        <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Fromage / laitage</label>
        <input value={form.fromage} onChange={e=>set('fromage',e.target.value)} style={{ ...inp, marginBottom:12 }} />
        <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Dessert</label>
        <input value={form.dessert} onChange={e=>set('dessert',e.target.value)} style={{ ...inp, marginBottom:16 }} />
        <Btn onClick={save} variant="primary" style={{ width:'100%', justifyContent:'center' }}>Enregistrer</Btn>
      </div>
    </BottomSheet>
  );
}

// ══════════════════════════════════════════════════════
//  RECETTES TAB
// ══════════════════════════════════════════════════════
function RecipesTab() {
  const { recipes, meals, addRecipe, updateRecipe, deleteRecipe } = useApp();
  const [search,      setSearch]      = useState('');
  const [filterFav,   setFilterFav]   = useState(false);
  const [filterTags,  setFilterTags]  = useState([]);
  const [filterSeasons, setFilterSeasons] = useState([]);
  const [sort,        setSort]        = useState('newest');
  const [typeFilter,  setTypeFilter]  = useState('all'); // 'all' | 'savory' | 'sweet'
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [detailId,    setDetailId]    = useState(null);
  const [editRec,     setEditRec]     = useState(null);

  const allTags = useMemo(() => {
    const s = new Set(); recipes.forEach(r => (r.tags||[]).forEach(t => s.add(t))); return [...s];
  }, [recipes]);

  // Nombre de fois que chaque recette a été planifiée
  const recipeCount = useMemo(() => {
    const counts = {};
    meals.forEach(m => { counts[m.recipeId] = (counts[m.recipeId] || 0) + 1; });
    return counts;
  }, [meals]);

  const activeFilters = (filterFav ? 1 : 0) + filterTags.length + filterSeasons.length + (sort !== 'newest' ? 1 : 0);

  // Filtrage : nom OU ingrédient
  const filtered = useMemo(() => recipes.filter(r => {
    if (filterFav && !r.favorite) return false;
    if (filterTags.length && !filterTags.every(t => (r.tags||[]).includes(t))) return false;
    if (filterSeasons.length) {
      const rs = getRecipeSeasons(r);
      if (!filterSeasons.some(s => rs.includes(s))) return false; // OR, pas AND
    }
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inName = r.name.toLowerCase().includes(q);
      const inIng  = (r.ingredients||[]).some(i => i.name.toLowerCase().includes(q));
      if (!inName && !inIng) return false;
    }
    return true;
  }), [recipes, filterFav, filterTags, filterSeasons, search, typeFilter]);

  // Tri
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'name':      return arr.sort((a,b) => a.name.localeCompare(b.name, 'fr'));
      case 'most_used': return arr.sort((a,b) => (recipeCount[b.id]||0) - (recipeCount[a.id]||0));
      case 'rating':    return arr.sort((a,b) => (b.rating||0) - (a.rating||0));
      case 'time':      return arr.sort((a,b) => (a.cookTimeMinutes||999) - (b.cookTimeMinutes||999));
      default:          return arr.sort((a,b) => (b.createdAt||0) - (a.createdAt||0)); // newest
    }
  }, [filtered, sort, recipeCount]);

  const detailRecipe = recipes.find(r => r.id === detailId);

  const blankRecipe = () => ({
    name:'', emoji:'🍽️', portions:4, url:'', tags:[], favorite:false,
    rating:0, cookTimeMinutes:0, note:'', type: null, seasons: [],
    ingredients:[{ id:genId(), name:'', qty:'', unit:'' }],
    steps:[''],
  });

  return (
    <div style={{ padding:12 }}>
      {/* Recherche + Filtrer */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, padding:'7px 11px', background:C.card, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none' }}
        />
        <button onClick={() => setFilterOpen(true)} style={{
          position:'relative', background: activeFilters > 0 ? C.accentBg : C.card,
          border:`1px solid ${activeFilters > 0 ? C.accent+'55' : C.border}`,
          color: activeFilters > 0 ? C.accent : C.muted,
          padding:'7px 13px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:500,
          flexShrink:0,
        }}>
          ⚙ Filtrer
          {activeFilters > 0 && (
            <span style={{
              position:'absolute', top:-5, right:-5,
              background:C.accent, color:C.onAccent, borderRadius:'50%',
              width:16, height:16, fontSize:10, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>{activeFilters}</span>
          )}
        </button>
      </div>

      {/* ── Onglets Toutes / Salé / Sucré ── */}
      <div style={{ display:'flex', background:C.border, borderRadius:9, padding:3, gap:2, marginBottom:10 }}>
        {[
          { v:'all',    l:'Toutes' },
          { v:'savory', l:'🧂 Salé' },
          { v:'sweet',  l:'🍰 Sucré' },
        ].map(({ v, l }) => {
          const isSweet  = v === 'sweet';
          const isSavory = v === 'savory';
          const active   = typeFilter === v;
          return (
            <button key={v} onClick={() => setTypeFilter(v)} style={{
              flex:1,
              background: active ? (isSweet ? C.sweetBg : isSavory ? C.accentBg : C.card) : 'transparent',
              color:      active ? (isSweet ? C.sweet   : isSavory ? C.accent   : C.text)  : C.muted,
              border:     active ? `1px solid ${isSweet ? C.sweet+'44' : isSavory ? C.accent+'44' : C.border}` : '1px solid transparent',
              borderRadius:7, padding:'6px 4px', fontSize:11,
              fontWeight: active ? 700 : 400, cursor:'pointer',
            }}>{l}</button>
          );
        })}
      </div>

      {/* Banner recettes non classées */}
      {typeFilter === 'all' && (() => {
        const n = recipes.filter(r => !r.type).length;
        return n > 0 ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', marginBottom:10, background:C.orangeBg, border:`1px solid ${C.orange}33`, borderRadius:9 }}>
            <span style={{ fontSize:12 }}>🧂🍰</span>
            <span style={{ fontSize:11, color:C.orange, flex:1 }}>
              <strong>{n}</strong> recette{n>1?'s':''} non classée{n>1?'s':''} — utilise les boutons en bas de chaque carte
            </span>
          </div>
        ) : null;
      })()}

      <Btn onClick={() => setEditRec(blankRecipe())} variant="primary" small style={{ marginBottom:12 }}>
        + Nouvelle recette
      </Btn>

      {/* Grille compacte */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {sorted.map(r => (
          <RecipeCard key={r.id} recipe={r}
            onClick={() => setDetailId(r.id)}
            onDelete={() => deleteRecipe(r.id)}
            onTypeChange={type => updateRecipe({ ...r, type: r.type === type ? null : type })}
            onSeasonsChange={id => updateRecipe({ ...r, seasons: toggleSeasonInList(r.seasons || [], id) })}
          />
        ))}
      </div>
      {sorted.length === 0 && <EmptyState icon="📖" text="Aucune recette trouvée" />}

      {filterOpen && (
        <FilterModal
          onClose={() => setFilterOpen(false)}
          filterFav={filterFav} setFilterFav={setFilterFav}
          filterTags={filterTags} setFilterTags={setFilterTags}
          filterSeasons={filterSeasons} setFilterSeasons={setFilterSeasons}
          allTags={allTags}
          sort={sort} setSort={setSort}
        />
      )}

      {detailRecipe && (
        <RecipeDetail recipe={detailRecipe}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditRec({ ...detailRecipe }); setDetailId(null); }}
          onDelete={() => { deleteRecipe(detailRecipe.id); setDetailId(null); }}
          onDuplicate={copy => { setDetailId(null); setEditRec({ ...copy }); }}
        />
      )}

      {editRec && (
        <RecipeEditor recipe={editRec} onClose={() => setEditRec(null)}
          onSave={data => {
            if (data.id && recipes.find(r => r.id === data.id)) updateRecipe(data);
            else addRecipe(data);
            setEditRec(null);
          }}
        />
      )}
    </div>
  );
}

function FilterModal({ onClose, filterFav, setFilterFav, filterTags, setFilterTags, filterSeasons, setFilterSeasons, allTags, sort, setSort }) {
  const [tagSearch, setTagSearch] = useState('');
  const activeCount = (filterFav ? 1 : 0) + filterTags.length + filterSeasons.length + (sort !== 'newest' ? 1 : 0);

  const toggleTag = (t) =>
    setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleFilterSeason = (id) =>
    setFilterSeasons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const visibleTags = tagSearch
    ? allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : allTags;

  const inp = fieldStyle({ dense:true, style:{ padding:'8px 11px' } });

  const SORT_OPTIONS = [
    { v:'newest',    label:'📅 Plus récente' },
    { v:'name',      label:'🔤 A → Z' },
    { v:'most_used', label:'🔥 Plus cuisinée' },
    { v:'rating',    label:'⭐ Mieux notée' },
    { v:'time',      label:'⏱ Temps ↑' },
  ];

  return (
    <BottomSheet title="Filtrer & Trier" onClose={onClose}>
      <div style={{ padding:16 }}>

        {/* ── Tri ── */}
        <SecTitle>Tri</SecTitle>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {SORT_OPTIONS.map(({ v, label }) => {
            const active = sort === v;
            return (
              <button key={v} onClick={() => setSort(v)} style={{
                background: active ? C.accentBg : C.border,
                color:      active ? C.accent   : C.muted,
                border:     active ? `1px solid ${C.accent}44` : '1px solid transparent',
                padding:'6px 12px', borderRadius:20, fontSize:12,
                cursor:'pointer', fontWeight: active ? 700 : 400,
              }}>
                {active && '✓ '}{label}
              </button>
            );
          })}
        </div>

        {/* ── Affichage ── */}
        <SecTitle>Affichage</SecTitle>
        <div onClick={() => setFilterFav(f=>!f)} style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'11px 14px', marginBottom:8, cursor:'pointer', borderRadius:11,
          background: filterFav ? C.orangeBg : C.card,
          border:`1px solid ${filterFav ? C.orange+'44' : C.border}`,
        }}>
          <span style={{ color: filterFav ? C.orange : C.text, fontSize:14 }}>⭐ Favoris uniquement</span>
          {filterFav && <span style={{ color:C.orange, fontSize:16 }}>✓</span>}
        </div>

        <SecTitle>Saison</SecTitle>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {SEASONS.map(s => {
            const active = filterSeasons.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleFilterSeason(s.id)} style={{
                background: active ? C.accentBg : C.border,
                color: active ? C.accent : C.muted,
                border: active ? `1px solid ${C.accent}44` : '1px solid transparent',
                padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
                fontWeight: active ? 700 : 400,
              }}>{active && '✓ '}{s.emoji} {s.label}</button>
            );
          })}
          <button onClick={() => toggleFilterSeason('all')} style={{
            background: filterSeasons.includes('all') ? C.greenBg : C.border,
            color: filterSeasons.includes('all') ? C.green : C.muted,
            border: filterSeasons.includes('all') ? `1px solid ${C.green}44` : '1px solid transparent',
            padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
            fontWeight: filterSeasons.includes('all') ? 700 : 400,
          }}>{filterSeasons.includes('all') && '✓ '}🔄 Mixte</button>
        </div>

        {allTags.length > 0 && (<>
          <SecTitle>
            Tags
            {filterTags.length > 0 && (
              <span style={{ marginLeft:8, background:C.accentBg, color:C.accent, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, border:`1px solid ${C.accent}44`, verticalAlign:'middle' }}>
                {filterTags.length} sélectionné{filterTags.length > 1 ? 's' : ''}
              </span>
            )}
          </SecTitle>
          {filterTags.length > 1 && (
            <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
              Affiche les recettes qui ont <strong style={{ color:C.accent }}>tous</strong> les tags sélectionnés.
            </div>
          )}
          <input
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
            placeholder="Rechercher un tag..."
            style={{ ...inp, marginBottom:10 }}
          />
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
            {visibleTags.map(t => {
              const active = filterTags.includes(t);
              return (
                <button key={t} onClick={() => toggleTag(t)} style={{
                  background: active ? C.accentBg : C.border,
                  color: active ? C.accent : C.muted,
                  border: active ? `1px solid ${C.accent}44` : '1px solid transparent',
                  padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
                  fontWeight: active ? 700 : 400,
                }}>
                  {active && <span style={{ marginRight:4 }}>✓</span>}
                  {t}
                </button>
              );
            })}
            {visibleTags.length === 0 && (
              <span style={{ fontSize:12, color:C.muted }}>Aucun tag trouvé</span>
            )}
          </div>
        </>)}

        {activeCount > 0 && (
          <button onClick={() => { setFilterFav(false); setFilterTags([]); setFilterSeasons([]); setSort('newest'); }} style={{
            width:'100%', padding:'10px', background:C.redBg, color:C.red,
            border:`1px solid ${C.red}33`, borderRadius:10, cursor:'pointer', fontSize:13, marginBottom:8,
          }}>✕ Effacer les filtres et le tri</button>
        )}
        <Btn onClick={onClose} variant="primary" style={{ width:'100%', justifyContent:'center' }}>Appliquer</Btn>
      </div>
    </BottomSheet>
  );
}

function AssignToWeekModal({ recipe, viewPortions, onClose }) {
  const { addMeal, addIngredientsFromRecipe, cats, showSnack, settings } = useApp();
  const currentWeek = getISOWeekKey();
  const [selWeek,      setSelWeek]      = useState(currentWeek);
  const [persons,      setPersons]      = useState(viewPortions || settings.householdSize || 6);
  const [done,         setDone]         = useState(false);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [multiCatData, setMultiCatData] = useState(null);
  const weeks = [];
  for (let i = 0; i < 8; i++) weeks.push(shiftWeek(currentWeek, i));

  const doAdd = (ingredientIds = null, catOverrides = {}, su = null) => {
    const mealId = addMeal(selWeek, recipe.id, persons, '', su?.used);
    if (ingredientIds?.length) {
      addIngredientsFromRecipe(recipe, persons, ingredientIds, catOverrides, mealId, su?.overrides || {});
    } else if (su?.used?.length) {
      showSnack('🥫 Recette ajoutée · ingrédients pris dans le stock');
    } else {
      showSnack('ℹ️ Recette ajoutée · ingrédients non ajoutés à la liste');
    }
    setDone(true);
    setTimeout(onClose, 900);
  };

  const handleIngredientConfirm = (ingredientIds, su = null) => {
    setFilterOpen(false); // Ferme immédiatement le filtre pour éviter un double-appel
    const uncat = getUncatIngredients(recipe, ingredientIds, cats);
    if (uncat.length > 0) {
      setMultiCatData({
        uncatItems: uncat.map(ing => ({ id: ing.id, name: ing.name, recipeEmoji: recipe.emoji })),
        ingredientIds, su,
      });
    } else {
      doAdd(ingredientIds, {}, su);
    }
  };

  const handle = () => {
    if (recipe.ingredients?.length > 0) setFilterOpen(true);
    else doAdd();
  };

  return (
    <>
      <BottomSheet title="Affecter au planning" onClose={onClose}>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:14,
            background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'10px 14px',
          }}>
            <span style={{ fontSize:22 }}>{recipe.emoji}</span>
            <span style={{ fontWeight:600, color:C.text, fontSize:14, marginLeft:6, flex:1 }}>{recipe.name}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span style={{ color:C.muted, fontSize:13, flex:1 }}>👥 Personnes</span>
            <button aria-label="Moins de personnes" onClick={() => setPersons(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>−</button>
            <span style={{ fontWeight:700, color:C.text, minWidth:24, textAlign:'center' }}>{persons}</span>
            <button aria-label="Plus de personnes" onClick={() => setPersons(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>+</button>
          </div>
          <SecTitle>Semaine</SecTitle>
          {weeks.map(w => (
            <div key={w} onClick={() => setSelWeek(w)} style={{
              padding:'9px 14px', borderRadius:10, marginBottom:5, cursor:'pointer',
              background: selWeek===w ? C.accentBg : C.bg,
              border:`1px solid ${selWeek===w ? C.accent+'55' : C.border}`,
            }}>
              <span style={{ fontWeight:500, color: w===currentWeek ? C.accent : C.text, fontSize:13 }}>
                {w===currentWeek ? '📅 ' : ''}S{w.split('-W')[1]}
              </span>
              <span style={{ fontSize:11, color:C.muted, marginLeft:8 }}>{getWeekRange(w)}</span>
            </div>
          ))}
          {done
            ? <div style={{ textAlign:'center', color:C.green, fontSize:14, fontWeight:600, marginTop:12 }}>✅ Ajouté !</div>
            : <Btn onClick={handle} variant="primary" style={{ width:'100%', justifyContent:'center', marginTop:10 }}>Ajouter au planning</Btn>
          }
        </div>
      </BottomSheet>
      {filterOpen && (
        <IngredientFilterModal
          key={persons}
          useStock
          selections={[{ recipe, persons }]}
          onConfirm={(selectedByRecipe, stockUse = {}) => handleIngredientConfirm(selectedByRecipe[recipe.id] || [], stockUse[recipe.id] || null)}
          onSkip={() => { setFilterOpen(false); doAdd(); }}
          onCancel={() => setFilterOpen(false)}
        />
      )}
      {multiCatData && (
        <MultiCategoryAssignModal
          uncatItems={multiCatData.uncatItems}
          onConfirm={(catOverrides) => { doAdd(multiCatData.ingredientIds, catOverrides, multiCatData.su); setMultiCatData(null); }}
          onCancel={() => { doAdd(multiCatData.ingredientIds, {}, multiCatData.su); setMultiCatData(null); }}
        />
      )}
    </>
  );
}

function RecipeCard({ recipe, onClick, onDelete, onTypeChange, onSeasonsChange }) {
  const { meals } = useApp();
  const mealCount = meals.filter(m => m.recipeId === recipe.id).length;

  return (
    <div onClick={onClick} style={{
      background:C.card, border:`1px solid ${C.border}`,
      borderRadius:C.rRecipe, padding:'10px 9px 9px', cursor:'pointer', transition:'all 0.12s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        {/* Emoji */}
        <span style={{ fontSize:28, flexShrink:0, lineHeight:'1.1' }}>{recipe.emoji}</span>

        {/* Texte */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:12, color:C.text, lineHeight:1.35, marginBottom:4 }}>
            {recipe.name}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:C.muted }}>
              🍽 {recipe.portions}p{recipe.cookTimeMinutes > 0 ? ` · ⏱ ${recipe.cookTimeMinutes}m` : ''}
            </span>
            {mealCount > 0 && (
              <span style={{
                fontSize:11, fontWeight:700, color:C.accent,
                background:C.accentBg, border:`1px solid ${C.accent}33`,
                borderRadius:8, padding:'1px 6px', letterSpacing:'0.02em',
              }}>
                ×{mealCount}
              </span>
            )}
          </div>
          {(() => {
            const rs = getRecipeSeasons(recipe);
            if (rs.includes('all')) return null; // pas de badge si "toutes saisons"
            return (
              <div style={{ display:'flex', gap:2, marginTop:3 }}>
                {rs.map(sid => {
                  const s = SEASONS.find(x => x.id === sid);
                  return s ? <span key={sid} title={s.label} style={{ fontSize:11 }}>{s.emoji}</span> : null;
                })}
              </div>
            );
          })()}
          {(recipe.tags||[]).length > 0 && (
            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:4 }}>
              {recipe.tags.slice(0,2).map(t => (
                <span key={t} style={{ fontSize:9, color:C.accent, background:C.accentBg, padding:'1px 6px', borderRadius:10 }}>{t}</span>
              ))}
              {recipe.tags.length > 2 && <span style={{ fontSize:9, color:C.muted }}>+{recipe.tags.length-2}</span>}
            </div>
          )}
        </div>

        {/* Étoile favoris + suppression */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
          {recipe.favorite
            ? <span style={{ fontSize:12, lineHeight:1 }}>⭐</span>
            : <span style={{ width:12 }} />
          }
          <button aria-label="Supprimer" onClick={e => { e.stopPropagation(); onDelete(); }} style={{
            background:'transparent', border:'none',
            color:C.muted, borderRadius:5, padding:'1px 4px',
            cursor:'pointer', fontSize:11,
          }}>🗑</button>
        </div>
      </div>

      {/* Toggle Salé / Sucré */}
      <div style={{ display:'flex', gap:4, marginTop:8, borderTop:`1px solid ${C.border}`, paddingTop:7 }}>
        <button onClick={e => { e.stopPropagation(); onTypeChange?.('savory'); }} style={{
          flex:1, padding:'4px 0', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
          background: recipe.type==='savory' ? C.accentBg : 'transparent',
          border:`1px solid ${recipe.type==='savory' ? C.accent+'55' : C.border}`,
          color: recipe.type==='savory' ? C.accent : C.muted,
          transition:'all 0.12s',
        }}>🧂 Salé</button>
        <button onClick={e => { e.stopPropagation(); onTypeChange?.('sweet'); }} style={{
          flex:1, padding:'4px 0', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
          background: recipe.type==='sweet' ? C.sweetBg : 'transparent',
          border:`1px solid ${recipe.type==='sweet' ? C.sweet+'55' : C.border}`,
          color: recipe.type==='sweet' ? C.sweet : C.muted,
          transition:'all 0.12s',
        }}>🍰 Sucré</button>
      </div>

      {/* Toggle rapide Saisons */}
      <div style={{ display:'flex', gap:3, marginTop:5 }}>
        {SEASONS.map(s => {
          const active = (recipe.seasons||[]).includes(s.id);
          return (
            <button key={s.id}
              onClick={e => { e.stopPropagation(); onSeasonsChange?.(s.id); }}
              title={s.label}
              style={{
                flex:1, padding:'4px 0', borderRadius:6, fontSize:13, cursor:'pointer',
                lineHeight:1, transition:'all 0.12s',
                background: active ? C.accentBg : 'transparent',
                border:`1px solid ${active ? C.accent+'66' : C.border}`,
              }}>{s.emoji}</button>
          );
        })}
        <button
          onClick={e => { e.stopPropagation(); onSeasonsChange?.('all'); }}
          title="Mixte (toutes saisons)"
          style={{
            flex:1, padding:'4px 0', borderRadius:6, fontSize:13, cursor:'pointer',
            lineHeight:1, transition:'all 0.12s',
            background: (recipe.seasons||[]).includes('all') ? C.greenBg : 'transparent',
            border:`1px solid ${(recipe.seasons||[]).includes('all') ? C.green+'66' : C.border}`,
          }}>🔄</button>
      </div>
    </div>
  );
}

/** Ajouter les ingrédients d'une recette à la liste sans planifier de repas */
function AddToListModal({ recipe, defaultPersons, onClose }) {
  const { cats, addIngredientsFromRecipe, showSnack, settings } = useApp();
  const [persons,      setPersons]      = useState(defaultPersons || settings.householdSize || 4);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [multiCatData, setMultiCatData] = useState(null);

  const handleIngConfirm = (selectedByRecipe) => {
    const ids = selectedByRecipe[recipe.id] || [];
    setFilterOpen(false);
    const uncat = getUncatIngredients(recipe, ids, cats);
    if (uncat.length > 0) {
      setMultiCatData({
        ingredientIds: ids,
        uncatItems: uncat.map(i => ({ id:i.id, name:i.name, recipeEmoji:recipe.emoji, recipeName:recipe.name })),
      });
    } else {
      addIngredientsFromRecipe(recipe, persons, ids, {});
      showSnack(`📋 ${ids.length} ingrédient${ids.length>1?'s':''} ajoutés à la liste`);
      onClose();
    }
  };

  const finish = (ids, catOverrides = {}) => {
    addIngredientsFromRecipe(recipe, persons, ids, catOverrides);
    showSnack(`📋 ${ids.length} ingrédient${ids.length>1?'s':''} ajoutés à la liste`);
    onClose();
  };

  return (
    <>
      {/* Étape 1 : sélection des portions */}
      {!filterOpen && !multiCatData && (
        <BottomSheet title={`📋 Ajouter à la liste`} onClose={onClose}>
          <div style={{ padding:'12px 16px 20px' }}>
            <div style={{ fontSize:13, color:C.muted, marginBottom:14 }}>
              {recipe.emoji} {recipe.name}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <span style={{ fontSize:13, color:C.muted, flex:1 }}>👥 Pour combien de personnes ?</span>
              <button aria-label="Moins de personnes" onClick={() => setPersons(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>−</button>
              <span style={{ fontWeight:700, fontSize:18, color:C.accent, minWidth:24, textAlign:'center' }}>{persons}</span>
              <button aria-label="Plus de personnes" onClick={() => setPersons(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>+</button>
            </div>
            <Btn onClick={() => setFilterOpen(true)} variant="primary" style={{ width:'100%', justifyContent:'center' }}>
              Choisir les ingrédients →
            </Btn>
          </div>
        </BottomSheet>
      )}

      {/* Étape 2 : sélection des ingrédients */}
      {filterOpen && (
        <IngredientFilterModal
          selections={[{ recipe, persons }]}
          onConfirm={handleIngConfirm}
          onSkip={() => { setFilterOpen(false); onClose(); }}
          onCancel={() => setFilterOpen(false)}
        />
      )}

      {/* Étape 3 (optionnelle) : catégorisation des articles inconnus */}
      {multiCatData && (
        <MultiCategoryAssignModal
          uncatItems={multiCatData.uncatItems}
          onConfirm={catOverrides => finish(multiCatData.ingredientIds, catOverrides)}
          onCancel={() => { setMultiCatData(null); setFilterOpen(true); }}
        />
      )}
    </>
  );
}

function RecipeDetail({ recipe, onClose, onEdit, onDelete, onDuplicate }) {
  useBackHandler(onClose);
  const { meals, shopping, cats, showSnack, updateRecipe, duplicateRecipe, addIngredientsFromRecipe, deleteShoppingItemsByIds } = useApp();
  const [checked,      setChecked]      = useState(new Set());
  const [viewPortions, setViewPortions] = useState(recipe.portions || 4);
  const [assignOpen,   setAssignOpen]   = useState(false);
  const [addToList,    setAddToList]    = useState(false);
  const [badgeOpen,    setBadgeOpen]    = useState(false);
  const [cookMode,     setCookMode]     = useState(false);

  // Ingrédients manquants dans la liste de courses
  const shoppingNames = useMemo(() => new Set(
    shopping.filter(s => !s.checked).map(s => stemFrName(s.name.toLowerCase()))
  ), [shopping]);
  const missingIngredients = useMemo(() =>
    (recipe.ingredients||[]).filter(i => !shoppingNames.has(stemFrName(i.name.toLowerCase())))
  , [recipe.ingredients, shoppingNames]);
  const presentIngredients = useMemo(() =>
    (recipe.ingredients||[]).filter(i =>  shoppingNames.has(stemFrName(i.name.toLowerCase())))
  , [recipe.ingredients, shoppingNames]);

  // Ajout direct des ingrédients manquants (sans passer par la modale si tout est catégorisé)
  const handleAddMissing = () => {
    const ids = missingIngredients.map(i => i.id);
    if (!ids.length) return;
    const uncat = getUncatIngredients(recipe, ids, cats);
    if (uncat.length > 0) {
      setBadgeOpen(false);
      setAddToList(true);
    } else {
      addIngredientsFromRecipe(recipe, viewPortions, ids, {});
      showSnack(`📋 ${ids.length} ingrédient${ids.length>1?'s':''} ajouté${ids.length>1?'s':''}`);
      setBadgeOpen(false);
    }
  };

  // Suppression des ingrédients déjà présents dans la liste
  const handleRemovePresent = () => {
    const stemmed = presentIngredients.map(i => stemFrName(i.name.toLowerCase()));
    const ids = shopping
      .filter(s => !s.checked && stemmed.includes(stemFrName(s.name.toLowerCase())))
      .map(s => s.id);
    if (!ids.length) return;
    deleteShoppingItemsByIds(ids);
    setBadgeOpen(false);
  };

  const base  = recipe.portions || 4;
  const scale = viewPortions / base;

  const timesCookedCount = meals.filter(m => m.recipeId === recipe.id && m.done).length;
  const toggle = i => setChecked(s => { const n=new Set(s); n.has(i)?n.delete(i):n.add(i); return n; });

  const fmtQty = qty => {
    if (!qty) return 0;
    const v = qty * scale;
    return Math.round(v * 10) / 10;
  };

  const share = () => {
    const text = [
      `${recipe.emoji} ${recipe.name}`,
      `🍽 ${viewPortions} portions${recipe.cookTimeMinutes ? ` · ⏱ ${recipe.cookTimeMinutes} min` : ''}`,
      '', 'Ingrédients :',
      ...(recipe.ingredients||[]).map(i => {
        const q = fmtQty(i.qty);
        return `• ${q?q+(i.unit?' '+i.unit:''):''} ${i.name}`.trim();
      }),
      '', 'Étapes :',
      ...(recipe.steps||[]).map((s,i) => `${i+1}. ${s}`),
      recipe.note ? `\n📝 ${recipe.note}` : '',
      recipe.url  ? `\n🔗 ${recipe.url}`  : '',
    ].filter(Boolean).join('\n');
    if (navigator.share) navigator.share({ title: recipe.name, text });
    else navigator.clipboard?.writeText(text).then(() => showSnack('Recette copiée'));
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:C.bg, overflowY:'auto', animation:'fadeIn 0.18s' }}>
      {/* Barre sticky */}
      <div style={{
        background:C.card, borderBottom:`1px solid ${C.border}`,
        padding:'9px 14px', display:'flex', justifyContent:'space-between', alignItems:'center',
        position:'sticky', top:0, zIndex:10,
      }}>
        <Btn onClick={onClose} small>← Retour</Btn>
        <div style={{ display:'flex', gap:6 }}>
          <Btn onClick={() => setAssignOpen(true)} variant="green" small>📅 Affecter</Btn>
          <Btn label="Partager" onClick={share} variant="accent" small>📤</Btn>
          {onEdit && <Btn label="Modifier" onClick={onEdit} small>✏️</Btn>}
        </div>
      </div>

      <div style={{ padding:18 }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <div style={{ fontSize:52, marginBottom:6 }}>{recipe.emoji}</div>
          <h1 style={{ fontSize:19, fontWeight:800, color:C.text, marginBottom:6 }}>{recipe.name}</h1>
          <Stars value={recipe.rating} />
        </div>

        {/* Chips */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12, justifyContent:'center' }}>
          {recipe.cookTimeMinutes > 0 && <Chip>⏱ {recipe.cookTimeMinutes} min</Chip>}
          {timesCookedCount > 0 && <Chip color={C.green}>✅ Cuisiné {timesCookedCount}×</Chip>}
          {/* Favori — tap direct sans passer par l'éditeur */}
          <button onClick={() => updateRecipe({ ...recipe, favorite: !recipe.favorite })} style={{
            background: recipe.favorite ? C.orangeBg : C.border,
            color: recipe.favorite ? C.orange : C.muted,
            border: recipe.favorite ? `1px solid ${C.orange}44` : '1px solid transparent',
            fontSize:12, padding:'4px 12px', borderRadius:20, fontWeight:500,
            cursor:'pointer', transition:'all 0.15s',
          }}>{recipe.favorite ? '⭐ Favori' : '☆ Favori'}</button>
          <WeeksBadge recipeId={recipe.id} />
        </div>

        {/* Boutons d'action rapide */}
        <div style={{ display:'flex', gap:8, marginBottom: badgeOpen ? 8 : 18 }}>
          {(recipe.ingredients||[]).length > 0 && (
            <button onClick={() => setBadgeOpen(v => !v)} style={{
              flex:1, padding:'10px 8px', borderRadius:11,
              background:C.accentBg, border:`1px solid ${C.accent}44`,
              color:C.accent, fontSize:12, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
              📋 Ajouter à la liste
              {missingIngredients.length > 0 && (
                <span style={{
                  background:C.accentDk, color:C.onAccent,
                  borderRadius:12, fontSize:11, fontWeight:800,
                  padding:'1px 6px', minWidth:18, textAlign:'center', flexShrink:0,
                }}>{missingIngredients.length}</span>
              )}
            </button>
          )}
          {(recipe.steps||[]).length > 0 && (
            <button onClick={() => setCookMode(true)} style={{
              flex:1, padding:'10px', borderRadius:11,
              background:'rgba(92,196,160,0.10)', border:`1px solid ${C.green}44`,
              color:C.green, fontSize:12, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>🍳 Cuisiner</button>
          )}
        </div>

        {/* Accordéon ingrédients manquants */}
        {badgeOpen && (recipe.ingredients||[]).length > 0 && (
          <div style={{
            background:C.card, border:`1px solid ${C.border}`,
            borderRadius:12, padding:'12px 14px', marginBottom:18,
          }}>
            {missingIngredients.length > 0 && (
              <>
                <div style={{ fontSize:11, color:C.orange, fontWeight:700, marginBottom:8 }}>
                  🛒 {missingIngredients.length} ingrédient{missingIngredients.length>1?'s':''} manquant{missingIngredients.length>1?'s':''}
                </div>
                {missingIngredients.map(i => {
                  const q = fmtQty(i.qty);
                  return (
                    <div key={i.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ width:16, height:16, borderRadius:4, background:C.orangeBg, border:`1px solid ${C.orange}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:C.orange, flexShrink:0 }}>✕</span>
                      <span style={{ flex:1, fontSize:13, color:C.text }}>{i.name}</span>
                      {q > 0 && <span style={{ fontSize:11, color:C.muted }}>{q}{i.unit?' '+i.unit:''}</span>}
                    </div>
                  );
                })}
              </>
            )}
            {presentIngredients.length > 0 && (
              <>
                <div style={{ fontSize:11, color:C.green, fontWeight:700, margin:`${missingIngredients.length>0?8:0}px 0 8px` }}>
                  ✅ {presentIngredients.length} déjà dans la liste
                </div>
                {presentIngredients.map(i => (
                  <div key={i.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', opacity:0.55 }}>
                    <span style={{ width:16, height:16, borderRadius:4, background:C.greenBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:C.green, flexShrink:0 }}>✓</span>
                    <span style={{ flex:1, fontSize:13, color:C.muted, textDecoration:'line-through' }}>{i.name}</span>
                  </div>
                ))}
              </>
            )}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              {missingIngredients.length > 0 && (
                <button onClick={handleAddMissing} style={{
                  flex:2, padding:'10px', background:C.accentDk, border:'none',
                  color:C.onAccent, borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                }}>Ajouter les {missingIngredients.length} manquants →</button>
              )}
              {presentIngredients.length > 0 && (
                <button onClick={handleRemovePresent} style={{
                  flex:2, padding:'10px', background:C.redBg,
                  border:`1px solid ${C.red}33`, color:C.red,
                  borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                }}>🗑 Retirer les {presentIngredients.length}</button>
              )}
              <button onClick={() => { setBadgeOpen(false); setAddToList(true); }} style={{
                flex:1, padding:'10px', background:C.border, border:'none',
                color:C.muted, borderRadius:10, fontSize:12, cursor:'pointer',
              }}>Tout choisir</button>
            </div>
          </div>
        )}

        {/* Tags */}
        {(recipe.tags||[]).length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {recipe.tags.map(t => (
              <span key={t} style={{ background:C.accentBg, color:C.accent, fontSize:11, padding:'3px 10px', borderRadius:20 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Ajusteur de portions */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:C.card, border:`1px solid ${C.border}`, borderRadius:11,
          padding:'10px 14px', marginBottom:4,
        }}>
          <div>
            <span style={{ color:C.text, fontSize:13, fontWeight:500 }}>🍽 Portions</span>
            {scale !== 1 && (
              <span style={{ fontSize:11, color:C.accent, marginLeft:7, fontWeight:600 }}>
                ×{Math.round(scale*10)/10}
              </span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <button aria-label="Moins de portions" onClick={() => setViewPortions(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:16 }}>−</button>
            <span style={{ fontWeight:700, color:C.text, minWidth:26, textAlign:'center', fontSize:14 }}>{viewPortions}</span>
            <button aria-label="Plus de portions" onClick={() => setViewPortions(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:16 }}>+</button>
            {viewPortions !== base && (
              <button onClick={() => setViewPortions(base)} title="Réinitialiser" style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:13, paddingLeft:4 }}>↺</button>
            )}
          </div>
        </div>

        {/* Ingrédients (recalculés) */}
        <SecTitle>Ingrédients</SecTitle>
        {(recipe.ingredients||[]).map(ing => {
          const q      = fmtQty(ing.qty);
          const inList = shoppingNames.has(stemFrName(ing.name.toLowerCase()));
          return (
            <div key={ing.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color: inList ? C.muted : C.text, fontSize:13, display:'flex', gap:6, alignItems:'center' }}>
                {shopping.length > 0 && <span style={{ fontSize:11, opacity:0.7 }}>{inList ? '✅' : '⬜'}</span>}
                <span style={{ textDecoration: inList ? 'line-through' : 'none' }}>{ing.name}</span>
              </span>
              {q > 0 && (
                <span style={{
                  fontSize:13, fontWeight: scale!==1 ? 600 : 400,
                  color: scale!==1 ? C.accent : C.muted,
                }}>
                  {q}{ing.unit ? ' '+ing.unit : ''}
                </span>
              )}
            </div>
          );
        })}

        {/* Étapes */}
        <SecTitle>Préparation</SecTitle>
        {(recipe.steps||[]).map((step, i) => (
          <div key={i} onClick={() => toggle(i)} style={{
            display:'flex', gap:10, padding:'9px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer',
          }}>
            <div style={{
              width:22, height:22, borderRadius:'50%', flexShrink:0,
              background: checked.has(i) ? C.green : C.border,
              color: checked.has(i) ? C.onAccent : C.hi, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, transition:'all 0.2s',
            }}>
              {checked.has(i) ? '✓' : i+1}
            </div>
            <span style={{
              color: checked.has(i) ? C.muted : C.text,
              textDecoration: checked.has(i) ? 'line-through' : 'none',
              fontSize:13, lineHeight:1.6, flex:1,
            }}>{step}</span>
          </div>
        ))}

        {recipe.note && (<>
          <SecTitle>Note</SecTitle>
          <p style={{ color:C.soft, fontSize:13, lineHeight:1.7, background:C.card, borderRadius:11, padding:12, border:`1px solid ${C.border}` }}>{recipe.note}</p>
        </>)}

        {recipe.url && (
          <div style={{ marginTop:14 }}>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{ color:C.accent, fontSize:12 }}>🔗 {recipe.url}</a>
          </div>
        )}

        <div style={{ marginTop:20, paddingTop:14, borderTop:`1px solid ${C.border}`, display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn onClick={() => {
            const copy = duplicateRecipe(recipe.id);
            if (copy && onDuplicate) onDuplicate(copy);
            else onClose();
          }} small>📋 Dupliquer</Btn>
          {onDelete && (
            <Btn onClick={onDelete} variant="danger" small>🗑 Supprimer la recette</Btn>
          )}
        </div>
      </div>

      {assignOpen && (
        <AssignToWeekModal recipe={recipe} viewPortions={viewPortions} onClose={() => setAssignOpen(false)} />
      )}
      {addToList && (
        <AddToListModal recipe={recipe} defaultPersons={viewPortions} onClose={() => setAddToList(false)} />
      )}
      {cookMode && (
        <CookModeOverlay recipe={recipe} portions={viewPortions} onClose={() => setCookMode(false)} />
      )}
    </div>
  );
}

/** Mode cuisine plein écran — étapes une à une */
function CookModeOverlay({ recipe, portions, onClose }) {
  useBackHandler(onClose);
  const [stepIdx, setStepIdx] = useState(0);
  const [done,    setDone]    = useState(new Set());
  const [timerSec,   setTimerSec]   = useState(null);
  const [timerTotal, setTimerTotal] = useState(null);
  const [timerOn,    setTimerOn]    = useState(false);
  const [ingOpen,    setIngOpen]    = useState(false);
  const timerRef = useRef(null);

  const scale = (portions || recipe.portions || 4) / (recipe.portions || 4);

  const steps  = recipe.steps || [];
  const total  = steps.length;
  const allDone   = done.size === total;
  const isDone    = done.has(stepIdx);
  const progress  = done.size / total;
  const stepDur   = parseStepDuration(steps[stepIdx] || '');

  // Reset timer quand on change d'étape
  useEffect(() => {
    clearTimeout(timerRef.current);
    setTimerSec(null); setTimerTotal(null); setTimerOn(false);
  }, [stepIdx]);

  // Tick timer
  useEffect(() => {
    if (!timerOn) return;
    if (timerSec > 0) {
      timerRef.current = setTimeout(() => setTimerSec(s => s-1), 1000);
    } else {
      setTimerOn(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerOn, timerSec]);

  const startTimer = () => {
    if (!stepDur) return;
    setTimerSec(stepDur); setTimerTotal(stepDur); setTimerOn(true);
  };
  const toggleTimer = () => {
    if (timerSec === null) { startTimer(); return; }
    setTimerOn(v => !v);
  };
  const resetTimer = () => { clearTimeout(timerRef.current); setTimerSec(null); setTimerTotal(null); setTimerOn(false); };

  const fmtTimer = s => {
    if (s === null) {
      const m = Math.floor(stepDur/60), sec = stepDur%60;
      return `${m}:${String(sec).padStart(2,'0')}`;
    }
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  const timerDone  = timerSec === 0;
  const timerProg  = timerSec !== null && timerTotal > 0 ? 1 - timerSec/timerTotal : 0;
  const timerColor = timerDone ? C.green : timerOn ? C.orange : C.accent;

  const markDone = () => {
    setDone(s => { const n=new Set(s); n.add(stepIdx); return n; });
    if (stepIdx < total - 1) setStepIdx(i => i+1);
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:700,
      background:'linear-gradient(180deg, #0C1A14 0%, #0D1A1F 100%)',
      display:'flex', flexDirection:'column', animation:'fadeIn 0.18s',
    }}>
      {/* Header */}
      <div style={{ padding:'8px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'rgba(92,196,160,0.7)', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕ Quitter</button>
        <span style={{ fontWeight:700, fontSize:13, color:C.green }}>{recipe.emoji} {recipe.name}</span>
        <button onClick={() => setIngOpen(v => !v)} style={{
          background: ingOpen ? 'rgba(92,196,160,0.2)' : 'rgba(92,196,160,0.08)',
          border:`1px solid rgba(92,196,160,${ingOpen ? '0.4' : '0.18'})`,
          color:C.green, borderRadius:8, padding:'4px 9px',
          fontSize:11, fontWeight:600, cursor:'pointer',
        }}>📋 {done.size}/{total}</button>
      </div>

      {/* Barre de progression */}
      <div style={{ height:3, background:'rgba(92,196,160,0.12)', flexShrink:0 }}>
        <div style={{ height:'100%', background:C.green, width:`${progress*100}%`, transition:'width 0.4s', borderRadius:2 }} />
      </div>

      {allDone ? (
        /* ── Écran de fin ── */
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, gap:14 }}>
          <div style={{ fontSize:64 }}>🎉</div>
          <div style={{ fontSize:20, fontWeight:800, color:C.green, textAlign:'center' }}>Recette terminée !</div>
          <div style={{ fontSize:13, color:'rgba(92,196,160,0.6)' }}>Bon appétit 🍽</div>
          <button onClick={onClose} style={{
            marginTop:12, background:C.green, border:'none', color:C.onAccent,
            borderRadius:13, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer',
          }}>← Retour à la fiche</button>
        </div>
      ) : (
        <>
          {/* Navigation par points */}
          <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'12px 14px 4px', flexShrink:0 }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStepIdx(i)} style={{
                width: i===stepIdx ? 22 : 8, height:8, borderRadius:4, border:'none',
                cursor:'pointer', padding:0, transition:'all 0.25s',
                background: done.has(i) ? C.green : i===stepIdx ? C.accent : 'rgba(255,255,255,0.15)',
              }} />
            ))}
          </div>

          {/* Label étape */}
          <div style={{ textAlign:'center', padding:'10px 16px 0', flexShrink:0 }}>
            <span style={{ fontSize:11, color:'rgba(92,196,160,0.55)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
              Étape {stepIdx+1} sur {total}
            </span>
          </div>

          {/* Texte de l'étape — tap pour marquer comme fait */}
          <div onClick={markDone} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px', cursor:'pointer' }}>
            <p style={{
              fontSize:19, lineHeight:1.75, color: isDone ? 'rgba(200,230,220,0.45)' : '#D8F0E8',
              fontWeight:500, textAlign:'center',
              textDecoration: isDone ? 'line-through' : 'none',
              transition:'all 0.2s', userSelect:'none',
            }}>
              {steps[stepIdx]}
            </p>
          </div>

          {/* ── Timer (si durée détectée dans l'étape) ── */}
          {stepDur && (
            <div style={{ margin:'0 16px 8px', borderRadius:14, overflow:'hidden', background:'rgba(0,0,0,0.25)', border:`1px solid ${timerColor}33`, flexShrink:0 }}>
              {timerSec !== null && (
                <div style={{ height:3, background:'rgba(255,255,255,0.06)' }}>
                  <div style={{ height:'100%', background:timerColor, width:`${timerProg*100}%`, transition:'width 1s linear', borderRadius:2 }} />
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:26, fontWeight:800, color:timerColor, letterSpacing:'-0.02em', lineHeight:1 }}>
                    {timerDone ? '✓ Terminé !' : fmtTimer(timerSec)}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>
                    {timerSec === null ? `⏱ ${Math.round(stepDur/60)} min suggérées` : timerOn ? 'En cours…' : timerDone ? '' : 'En pause'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:7 }}>
                  {timerSec !== null && !timerDone && (
                    <button onClick={resetTimer} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', borderRadius:9, width:36, height:36, cursor:'pointer', fontSize:14 }}>↺</button>
                  )}
                  {!timerDone && (
                    <button onClick={toggleTimer} style={{
                      background: timerSec === null ? timerColor : timerOn ? `${C.orange}33` : `${timerColor}33`,
                      border:`1px solid ${timerColor}55`, color: timerSec === null ? C.onAccent : timerColor,
                      borderRadius:9, padding:'0 14px', height:36, cursor:'pointer', fontSize:12, fontWeight:700,
                    }}>
                      {timerSec === null ? '▶ Démarrer' : timerOn ? '⏸' : '▶'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Boutons de navigation */}
          <div style={{ padding:'4px 16px 28px', display:'flex', gap:8, flexShrink:0 }}>
            <button aria-label="Retour" onClick={() => stepIdx > 0 && setStepIdx(i=>i-1)} disabled={stepIdx===0} style={{
              flex:1, padding:'13px', borderRadius:13,
              background:'rgba(92,196,160,0.07)', border:'1px solid rgba(92,196,160,0.18)',
              color: stepIdx===0 ? 'rgba(92,196,160,0.2)' : C.green,
              fontSize:18, cursor: stepIdx===0 ? 'default' : 'pointer',
            }}>←</button>

            <button onClick={markDone} style={{
              flex:3, padding:'13px', borderRadius:13,
              background: isDone ? 'rgba(92,196,160,0.12)' : C.green,
              border: isDone ? `1px solid ${C.green}44` : 'none',
              color: isDone ? C.green : C.onAccent,
              fontSize:14, fontWeight:800, cursor:'pointer', transition:'all 0.15s',
            }}>
              {isDone ? (stepIdx < total-1 ? '→ Suivante' : '✓ Terminer') : '✓ Fait'}
            </button>

            {stepIdx < total-1 && (
              <button aria-label="Suivant" onClick={() => setStepIdx(i=>i+1)} style={{
                flex:1, padding:'13px', borderRadius:13,
                background:'rgba(92,196,160,0.07)', border:'1px solid rgba(92,196,160,0.18)',
                color:C.green, fontSize:18, cursor:'pointer',
              }}>→</button>
            )}
          </div>
        </>
      )}
      {/* ── Overlay ingrédients ── */}
      {ingOpen && (recipe.ingredients||[]).length > 0 && (
        <div onClick={() => setIngOpen(false)} style={{
          position:'absolute', inset:0, zIndex:10,
          background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'100%', background:'#0F1F18',
            border:'1px solid rgba(92,196,160,0.2)',
            borderRadius:'20px 20px 0 0',
            padding:'16px 16px 28px', maxHeight:'60vh', overflowY:'auto',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontWeight:700, fontSize:14, color:C.green }}>
                📋 Ingrédients
                {portions && portions !== recipe.portions && (
                  <span style={{ fontSize:11, color:'rgba(92,196,160,0.5)', marginLeft:6 }}>({portions} pers.)</span>
                )}
              </span>
              <button aria-label="Fermer" onClick={() => setIngOpen(false)} style={{ background:'transparent', border:'none', color:'rgba(92,196,160,0.5)', fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
            {(recipe.ingredients||[]).map((ing, i) => {
              const q = ing.qty ? Math.round(ing.qty * scale * 10) / 10 : 0;
              return (
                <div key={ing.id || i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 0', borderBottom:'1px solid rgba(92,196,160,0.1)',
                }}>
                  <span style={{ fontSize:14, color:'#C8E8D8' }}>{ing.name}</span>
                  {q > 0 && (
                    <span style={{ fontSize:13, color:'rgba(92,196,160,0.7)', fontWeight:600 }}>
                      {q}{ing.unit ? '\u202f'+ing.unit : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, color }) {
  return (
    <span style={{ background:C.border, color:color||C.muted, fontSize:12, padding:'4px 12px', borderRadius:20, fontWeight:500 }}>
      {children}
    </span>
  );
}

/**
 * Badge cliquable affichant la prochaine (ou dernière) semaine planifiée.
 * Un tap ouvre un BottomSheet listant toutes les semaines.
 */
function WeeksBadge({ recipeId }) {
  const { meals, setPlanningTarget } = useApp();
  const [open, setOpen] = useState(false);
  const currentWeek = getISOWeekKey();

  // Semaines uniques : futures/en cours d'abord (proche → loin), puis passées (récente → ancienne)
  const weeks = useMemo(() => {
    const seen = new Set();
    return meals
      .filter(m => m.recipeId === recipeId)
      .map(m => m.weekKey)
      .filter(w => { if (seen.has(w)) return false; seen.add(w); return true; })
      .sort((a, b) => {
        const af = a >= currentWeek, bf = b >= currentWeek;
        if (af !== bf) return af ? -1 : 1;       // futur/présent avant passé
        return af ? a.localeCompare(b) : b.localeCompare(a); // futur: croissant; passé: décroissant
      });
  }, [meals, recipeId, currentWeek]);

  if (!weeks.length) return null;

  const top  = weeks[0];
  const rest = weeks.length - 1;
  const isCurrent  = top === currentWeek;
  const weekStart  = getWeekStart(top);
  const shortLabel = isCurrent
    ? 'Cette semaine'
    : weekStart.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: C.accentBg, border:`1px solid ${C.accent}55`,
        color: C.accent, fontSize:12, fontWeight:600,
        padding:'4px 10px', borderRadius:20, cursor:'pointer',
        display:'flex', alignItems:'center', gap:5,
      }}>
        📅 {shortLabel}
        {rest > 0 && (
          <span style={{
            background:C.accent, color:C.onAccent,
            borderRadius:10, fontSize:11, fontWeight:700,
            padding:'0 5px', lineHeight:'16px',
          }}>+{rest}</span>
        )}
      </button>

      {open && (
        <BottomSheet title="Semaines planifiées" onClose={() => setOpen(false)}>
          <div style={{ padding:'8px 16px 20px' }}>
            {weeks.map(w => {
              const past    = w < currentWeek;
              const current = w === currentWeek;
              const future  = w > currentWeek;
              const [, wn]  = w.split('-W');
              return (
                <div key={w} onClick={() => { setPlanningTarget(w); setOpen(false); }} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 0', borderBottom:`1px solid ${C.border}`,
                  cursor:'pointer',
                }}>
                  <span style={{ fontSize:16, width:22, textAlign:'center', flexShrink:0 }}>
                    {current ? '▶️' : past ? '✅' : '📅'}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{
                      fontSize:13, fontWeight: current ? 700 : 500,
                      color: past ? C.muted : current ? C.accent : C.text,
                    }}>
                      {current ? 'Cette semaine' : getWeekRange(w)}
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Semaine {parseInt(wn)}</div>
                  </div>
                  <span style={{
                    fontSize:11, fontWeight:600, flexShrink:0,
                    color: current ? C.accent : past ? C.muted : C.green,
                  }}>
                    {current ? 'En cours' : past ? 'Passé' : 'Planifié'}
                  </span>
                  <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>›</span>
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════
//  INGREDIENT PARSER  (fractions → regex → unité longest-first)
// ══════════════════════════════════════════════════════
const FRAC_MAP = {
  '½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,
  '⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875,
};
const UNIT_NORM = {
  'càs':'cs','c.à.s.':'cs','cuillère à soupe':'cs','cuillères à soupe':'cs','cuillere a soupe':'cs','cuilleres a soupe':'cs',
  'càc':'cc','c.à.c.':'cc','cuillère à café':'cc','cuillères à café':'cc','cuillere a cafe':'cc','cuilleres a cafe':'cc',
  'gramme':'g','grammes':'g','kilogramme':'kg','kilogrammes':'kg',
  'millilitre':'ml','millilitres':'ml','centilitre':'cl','centilitres':'cl',
  'litre':'L','litres':'L','liter':'L','liters':'L',
  'sachet':'sachet','sachets':'sachet','bouquet':'bouquet','bouquets':'bouquet',
  'gousse':'gousse','gousses':'gousse','tranche':'tranche','tranches':'tranche',
  'boîte':'boîte','boîtes':'boîte','boite':'boîte','boites':'boîte',
  'tasse':'tasse','tasses':'tasse',
  'pincée':'pincée','pincées':'pincée','pincee':'pincée','pincees':'pincée',
};
// Ordonnés du plus long au plus court pour éviter "g" avant "gousses"
const UNIT_LIST = [
  'cuillères à soupe','cuillère à soupe','cuilleres a soupe','cuillere a soupe',
  'cuillères à café','cuillère à café','cuilleres a cafe','cuillere a cafe',
  'c.à.s.','c.à.c.','càs','càc',
  'kilogrammes','kilogramme','millilitres','millilitre','centilitres','centilitre','litres','litre','liters','liter',
  'grammes','gramme',
  'sachets','sachet','bouquets','bouquet','gousses','gousse','tranches','tranche',
  'boîtes','boîte','boites','boite','tasses','tasse',
  'pincées','pincée','pincees','pincee',
  'kg','ml','cl','cs','cc','g','L','l',
];

function parseIngredient(raw) {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  for (const [f, v] of Object.entries(FRAC_MAP))
    s = s.replace(new RegExp(f, 'g'), v + ' ');
  s = s.replace(/\b(\d+)\/(\d+)\b/g, (_, n, d) => String(parseFloat(n) / parseFloat(d)));
  s = s.replace(/\b(\d+)\s+(0\.\d+)\b/g, (_, w, f) => String(parseFloat(w) + parseFloat(f)));
  const numM = s.match(/^([\d.,]+)\s*/);
  let qty = 0, rest = s;
  if (numM) { qty = parseFloat(numM[1].replace(',', '.')) || 0; rest = s.slice(numM[0].length); }
  let unit = '', name = rest;
  for (const u of UNIT_LIST) {
    const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^(?:${esc})s?\\s+(?:(?:de|d')\\s*)?`, 'i');
    const m = rest.match(re);
    if (m) { unit = UNIT_NORM[u.toLowerCase()] ?? u; name = rest.slice(m[0].length).trim(); break; }
  }
  name = name.replace(/^(?:de la|de l'|des|du|de|d')\s+/i, '').trim();
  if (!name) name = raw.trim();
  return { id: genId(), name, qty, unit };
}

// ══════════════════════════════════════════════════════
//  EMOJI GUESSER  (mots-clés sur le nom du plat)
// ══════════════════════════════════════════════════════
const EMOJI_RULES = [
  { kw:['poulet','volaille','dinde','pintade'],                                    e:'🍗' },
  { kw:['bœuf','boeuf','steak','entrecôte','veau','viande hachée'],                e:'🥩' },
  { kw:['porc','lardons','jambon','cochon','saucisse','chorizo'],                  e:'🥓' },
  { kw:['saumon','thon','cabillaud','daurade','truite','poisson','sole'],           e:'🐟' },
  { kw:['crevette','homard','crabe','moule','fruits de mer','langoustine'],        e:'🦐' },
  { kw:['pâtes','spaghetti','tagliatelle','carbonara','bolognaise','lasagne','rigatoni','linguine'], e:'🍝' },
  { kw:['riz','risotto','paella'],                                                 e:'🍚' },
  { kw:['soupe','velouté','potage','bouillon','gazpacho','bisque'],                e:'🥣' },
  { kw:['salade','taboulé'],                                                       e:'🥗' },
  { kw:['pizza'],                                                                  e:'🍕' },
  { kw:['burger','sandwich','croque'],                                             e:'🍔' },
  { kw:['tarte','quiche','flamiche'],                                              e:'🥧' },
  { kw:['gâteau','gateau','cake','fondant','moelleux','brownie'],                  e:'🎂' },
  { kw:['crêpe','crepe','gaufre'],                                                 e:'🥞' },
  { kw:['cookie','biscuit','sablé'],                                               e:'🍪' },
  { kw:['chocolat','truffes'],                                                     e:'🍫' },
  { kw:['glace','sorbet'],                                                         e:'🍦' },
  { kw:['gratin','soufflé','souffle'],                                             e:'🫕' },
  { kw:['omelette','frittata'],                                                    e:'🍳' },
  { kw:['œuf','oeuf','cocotte'],                                                   e:'🥚' },
  { kw:['curry','wok','thaï','thai','japonais','chinois','nems','sushi'],          e:'🍛' },
  { kw:['tacos','burrito','fajita','mexicain'],                                    e:'🌮' },
  { kw:['couscous','tajine'],                                                      e:'🫕' },
  { kw:['pomme de terre','patate','purée','puree','dauphinois'],                   e:'🥔' },
  { kw:['pain','brioche','baguette','focaccia'],                                   e:'🥖' },
  { kw:['tiramisu','panna cotta','crème brûlée'],                                 e:'🍮' },
  { kw:['crumble','compote'],                                                      e:'🍏' },
];
function guessEmoji(name) {
  const low = (name||'').toLowerCase();
  for (const { kw, e } of EMOJI_RULES) if (kw.some(k => low.includes(k))) return e;
  return '🍽️';
}

// ══════════════════════════════════════════════════════
//  TEXT PARSER  (fallback copier-coller)
// ══════════════════════════════════════════════════════
function parseTextRecipe(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let name = '', ingredients = [], steps = [], section = null;
  for (const line of lines) {
    if (!name && !/^[-•*\d]/.test(line) && line.length > 2 && line.length < 100) { name = line; continue; }
    if (/^ingr[eé]dients?\s*:?$/i.test(line))                                     { section = 'ing';  continue; }
    if (/^(pr[eé]paration|[eé]tapes?|instructions?)\s*:?$/i.test(line))           { section = 'step'; continue; }
    if (section === 'ing') {
      const p = parseIngredient(line.replace(/^[-•*·]\s*/, ''));
      if (p?.name) ingredients.push(p);
    } else if (section === 'step') {
      const s = line.replace(/^\d+[\.\)]\s*/, '').trim();
      if (s) steps.push(s);
    }
  }
  return { name, servings: 4, cookTimeMinutes: 0, tags: [], ingredients, steps, note: '' };
}

function RecipeEditor({ recipe, onClose, onSave }) {
  useBackHandler(tryClose);
  const { recipes } = useApp();
  const [form, setForm] = useState({
    ...recipe,
    tagsStr: (recipe.tags||[]).join(', '),
    ingredients: recipe.ingredients?.length ? recipe.ingredients.map(i=>({...i})) : [{ id:genId(), name:'', qty:'', unit:'' }],
    steps: recipe.steps?.length ? [...recipe.steps] : [''],
    seasons: recipe.seasons ? [...recipe.seasons] : [],
  });
  const [closeWarning, setCloseWarning] = useState(false);

  // Snapshot initial pour détecter les modifications non sauvegardées
  const initialRef = useRef(null);
  const snapshot = () => JSON.stringify({
    name: form.name, emoji: form.emoji, portions: form.portions,
    cookTimeMinutes: form.cookTimeMinutes, rating: form.rating,
    tagsStr: form.tagsStr, note: form.note, url: form.url,
    type: form.type || null,
    ingredients: form.ingredients.filter(i => i.name.trim()),
    steps: form.steps.filter(s => s.trim()),
    seasons: [...(form.seasons||[])].sort(),
  });
  if (initialRef.current === null) initialRef.current = snapshot();

  const hasChanges = () => snapshot() !== initialRef.current;

  function tryClose() {
    if (hasChanges()) setCloseWarning(true);
    else onClose();
  }

  // ── Import state ──────────────────────────────────
  const [importUrl,   setImportUrl]   = useState(recipe.url || '');
  const [importing,   setImporting]   = useState(false);
  const [importDone,  setImportDone]  = useState(false);
  const [importError, setImportError] = useState('');
  const [importMode,  setImportMode]  = useState('url');   // 'url' | 'paste'
  const [pasteText,   setPasteText]   = useState('');
  const [importStep,  setImportStep]  = useState('');
  const [elapsed,     setElapsed]     = useState(0);
  const [dupWarning,  setDupWarning]  = useState(null);
  const abortRef = useRef(null); // AbortController pour annuler l'import

  // Compteur de secondes pendant l'import
  useEffect(() => {
    if (!importing) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [importing]);

  /** Race contre un timeout de 30 s et un AbortController optionnel */
  const withTimeout = (promise, ms = 30000) => Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`Délai dépassé (${ms/1000}s) — essaie de coller le texte manuellement`)), ms)),
    new Promise((_, rej) => {
      const ctrl = abortRef.current;
      if (!ctrl) return;
      if (ctrl.signal.aborted) { rej(new Error('Import annulé')); return; }
      ctrl.signal.addEventListener('abort', () => rej(new Error('Import annulé')));
    }),
  ]);

  // Détecte un doublon par URL exacte ou par nom identique (hors modification d'une recette existante)
  const checkDuplicate = (url, name) => {
    const u = url?.trim();
    const n = name?.trim().toLowerCase();
    return recipes.find(r =>
      r.id !== recipe.id && (
        (u && r.url?.trim() === u) ||
        (n && r.name.trim().toLowerCase() === n)
      )
    ) || null;
  };

  // ── Étape 1 : Jow (API officielle) ────────────────
  const fetchJow = async (url) => {
    const m = url.match(/\/recipes\/[^/?#]+-([A-Za-z0-9]{4,})/);
    if (!m) throw new Error("ID Jow introuvable dans l'URL");
    setImportStep('📡 Appel API Jow…');
    const res = await fetch(`https://api.jow.fr/public/recipe/${m[1]}`);
    if (!res.ok) throw new Error(`API Jow inaccessible (${res.status})`);
    const d = await res.json();
    return {
      name: d.title || d.name || '',
      cookTimeMinutes: Math.round((d.cookingTime || d.totalTime || 0) / 60),
      servings: d.serves || d.servings || 4,
      ingredients: (d.constituents || d.ingredients || []).map(i => {
        const qty  = i.quantity || 0;
        const unit = (i.quantityUnit && i.quantityUnit !== 'unit') ? i.quantityUnit : '';
        const n    = i.ingredient?.name || i.name || '';
        return `${qty} ${unit} ${n}`.trim();
      }),
      steps: (d.steps || []).map(s => s.description || s.label || String(s)).filter(Boolean),
      tags:  (d.tags  || []).map(t => t.name || t).filter(Boolean),
    };
  };

  // ── Étape 2 : pont natif Android (OkHttp + Jsoup, pas de CORS) ──
  // RecipeImporter.java exécute le pipeline complet :
  //   Jow API → JSON-LD (récursif 10 niveaux) → __NEXT_DATA__ → Microdata
  // Le résultat est retourné via callback car @JavascriptInterface est async.
  const fetchViaAndroid = (url) => new Promise((resolve, reject) => {
    if (!window.Android?.importRecipe) {
      reject(new Error('Pont Android indisponible'));
      return;
    }
    setImportStep('📱 Import natif Android (OkHttp + Jsoup)…');
    const cbId = 'mp_' + Date.now();
    window.__mpImport = window.__mpImport || {};
    window.__mpImport[cbId] = (result) => {
      if (result?.error) reject(new Error(result.error));
      else resolve(result);
    };
    // Lance l'import Java ; MainActivity rappelle window.__mpImport[cbId](result)
    window.Android.importRecipe(url, cbId);
  });

  // ── Mise à l'échelle → 6 personnes + IngredientParser ──
  const applyScale = (raw) => {
    const src   = raw.servings || raw.portions || 4;
    const scale = 6 / src;
    const ingredients = (raw.ingredients || [])
      .map(i => typeof i === 'string' ? parseIngredient(i) : i)
      .filter(Boolean)
      .map(i => ({ ...i, qty: i.qty ? Math.round(i.qty * scale * 10) / 10 : 0 }));
    return { ...raw, ingredients };
  };

  // ── Handler principal ──────────────────────────────
  const handleImport = async () => {
    abortRef.current = new AbortController();
    setImporting(true); setImportError(''); setImportDone(false); setImportStep('');
    try {
      let raw = null;

      if (importMode === 'paste') {
        if (!pasteText.trim()) { setImportError('Colle du texte dans la zone.'); return; }
        raw = parseTextRecipe(pasteText);
        if (!raw.name && !raw.ingredients.length)
          throw new Error('Sections "Ingrédients" et "Préparation" introuvables dans le texte.');
      } else {
        const url = importUrl.trim();
        if (!url) return;

        // ── Jow : API dédiée ──────────────────────────
        if (url.includes('jow.fr')) {
          try { raw = await withTimeout(fetchJow(url)); }
          catch (e) {
            setImportStep('↩ API Jow inaccessible, essai HTML…');
            raw = await withTimeout(tryHtmlPipeline(url));
          }
        } else {
          raw = await withTimeout(tryHtmlPipeline(url));
        }
      }

      const scaled         = applyScale(raw);
      const newPortions    = 6;
      const newIngredients = scaled.ingredients.length ? scaled.ingredients : form.ingredients;
      // Réinitialise la base de référence pour le recalcul des portions
      portionsBaseRef.current = {
        portions:    newPortions,
        ingredients: newIngredients.map(i => ({ id: i.id, qty: parseFloat(i.qty) || 0 })),
      };
      // Détection de doublon après import
      const dup = checkDuplicate(importMode === 'url' ? importUrl.trim() : '', scaled.name || '');
      setDupWarning(dup);
      setForm(f => ({
        ...f,
        name:            scaled.name || f.name,
        emoji:           guessEmoji(scaled.name || f.name),
        portions:        newPortions,
        cookTimeMinutes: scaled.cookTimeMinutes || 0,
        tagsStr:         (scaled.tags || []).join(', '),
        ingredients:     newIngredients,
        steps:           (scaled.steps || []).filter(s => s?.trim()),
        note:            scaled.note || '',
        url:             importMode === 'url' ? importUrl.trim() : f.url,
      }));
      setImportDone(true);
      setImportStep('');
    } catch (e) {
      const isBadJson = e.message?.includes('JSON') || e.message?.includes('parse') || e instanceof SyntaxError;
      setImportError(isBadJson
        ? 'Données structurées introuvables. Essaie le mode "Coller le texte".'
        : (e.message || "Impossible d'extraire la recette."));
      setImportStep('');
    } finally {
      setImporting(false);
    }
  };

  // Import via le pont Android ; en cas d'échec, on affiche la vraie cause + une piste de secours
  const tryHtmlPipeline = async (url) => {
    try   { return await fetchViaAndroid(url); }
    catch (e) { throw new Error(`${e.message}. Essaie le mode "Coller le texte".`); }
  };

  // ── Base de référence pour le recalcul des portions ──
  const portionsBaseRef = useRef({
    portions:    parseInt(recipe.portions) || 1,
    ingredients: (recipe.ingredients || []).map(i => ({ id: i.id, qty: parseFloat(i.qty) || 0 })),
  });

  const adjustPortions = (delta) => {
    setForm(f => {
      const newP = Math.max(1, parseInt(f.portions) + delta);
      const base = portionsBaseRef.current;
      if (!base || !base.portions) return { ...f, portions: newP };
      const ratio = newP / base.portions;
      return {
        ...f, portions: newP,
        ingredients: f.ingredients.map(ing => {
          const b = base.ingredients.find(x => x.id === ing.id);
          const bQty = b !== undefined ? b.qty : parseFloat(ing.qty) || 0;
          const scaled = bQty ? Math.round(bQty * ratio * 10) / 10 : 0;
          return { ...ing, qty: scaled || ing.qty };
        }),
      };
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleSeason = (id) => setForm(f => ({ ...f, seasons: toggleSeasonInList(f.seasons || [], id) }));
  const addIng  = () => {
    const newIng = { id:genId(), name:'', qty:'', unit:'' };
    set('ingredients', [...form.ingredients, newIng]);
    portionsBaseRef.current = {
      ...portionsBaseRef.current,
      ingredients: [...portionsBaseRef.current.ingredients, { id: newIng.id, qty: 0 }],
    };
  };
  const remIng  = id => set('ingredients', form.ingredients.filter(i => i.id !== id));
  const updIng  = (id, k, v) => {
    const newIngs = form.ingredients.map(i => i.id===id ? {...i,[k]:v} : i);
    set('ingredients', newIngs);
    // Édition manuelle d'une quantité : on recalibre toute la base de référence
    // pour que le prochain +/- parte d'un état cohérent pour tous les ingrédients
    if (k === 'qty') {
      portionsBaseRef.current = {
        portions:    parseInt(form.portions) || 1,
        ingredients: newIngs.map(i => ({
          id:  i.id,
          qty: i.id === id ? parseFloat(v) || 0 : parseFloat(i.qty) || 0,
        })),
      };
    }
  };
  const addStep = () => set('steps', [...form.steps, '']);
  const remStep = i => set('steps', form.steps.filter((_,j) => j !== i));
  const updStep = (i,v) => set('steps', form.steps.map((s,j) => j===i?v:s));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      tags: canonTags(form.tagsStr.split(',').map(t=>t.trim()).filter(Boolean),
        recipes.filter(r => r.id !== recipe.id).flatMap(r => r.tags || [])),
      ingredients: form.ingredients.filter(i=>i.name.trim()),
      steps: form.steps.filter(s=>s.trim()),
      portions: parseInt(form.portions)||6,
      cookTimeMinutes: parseInt(form.cookTimeMinutes)||0,
      seasons: form.seasons || [],
    });
  };

  const inp = fieldStyle({ style:{ padding:'8px 12px' } });

  return (
    <>
    <div style={{ position:'fixed', inset:0, zIndex:600, background:C.bg, overflowY:'auto', animation:'fadeIn 0.18s' }}>
      <div style={{
        background:C.card, borderBottom:`1px solid ${C.border}`,
        padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center',
        position:'sticky', top:0, zIndex:10,
      }}>
        <Btn onClick={tryClose} small>Annuler</Btn>
        <span style={{ fontWeight:700, color:C.text }}>{form.id ? 'Modifier la recette' : 'Nouvelle recette'}</span>
        <Btn onClick={handleSave} variant="primary" small disabled={!form.name.trim() || !!dupWarning}>Enregistrer</Btn>
      </div>

      <div style={{ padding:20 }}>

        {/* ══ Bloc import (nouvelles recettes uniquement) ══ */}
        {!form.id && (
          <div style={{
            background: importDone ? C.greenBg : C.planBg,
            border: `1px solid ${importDone ? C.green+'55' : C.planBdr}`,
            borderRadius:14, padding:14, marginBottom:20, transition:'all 0.3s',
          }}>
            {/* Titre + toggle URL / Texte */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                🔗 Importer une recette
              </div>
              <div style={{ display:'flex', background:C.border, borderRadius:8, padding:2, gap:2 }}>
                {[['url','🔗 URL'],['paste','📋 Texte']].map(([m, label]) => (
                  <button key={m} onClick={() => { setImportMode(m); setImportError(''); setImportDone(false); }} style={{
                    background: importMode===m ? C.accent : 'transparent',
                    color: importMode===m ? C.onAccent : C.muted,
                    border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Mode URL */}
            {importMode === 'url' && (<>
              <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
                Marmiton · 750g · CuisineAZ · Jow · Cuisine JDF · BBC Good Food · AllRecipes…
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={importUrl}
                  onChange={e => { setImportUrl(e.target.value); setImportDone(false); setImportError(''); }}
                  onKeyDown={e => e.key==='Enter' && handleImport()}
                  placeholder="https://www.marmiton.org/recettes/..."
                  style={{ ...inp, flex:1 }} disabled={importing}
                />
                <Btn onClick={handleImport} variant="primary" small disabled={importing || !importUrl.trim()}>
                  {importing ? '⏳' : '⬇ Importer'}
                </Btn>
              </div>
            </>)}

            {/* Mode Coller */}
            {importMode === 'paste' && (<>
              <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
                Colle le texte de la page (titre, section Ingrédients, section Préparation)
              </div>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={"Bœuf bourguignon\n\nIngrédients\n- 800 g de bœuf\n- 2 oignons\n\nPréparation\n1. Couper le bœuf en cubes..."}
                rows={7} style={{ ...inp, resize:'vertical', marginBottom:8, fontFamily:'monospace', fontSize:12 }}
              />
              <Btn onClick={handleImport} variant="primary" small disabled={importing || !pasteText.trim()}>
                {importing ? '⏳ Analyse…' : '⚙️ Analyser le texte'}
              </Btn>
            </>)}

            {/* Étape en cours + chrono + annuler */}
            {importing && (
              <div style={{ marginTop:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, color:C.accent, fontSize:12 }}>
                  <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⚙️</span>
                  <span style={{ flex:1 }}>{importStep || 'Analyse en cours…'}</span>
                  <span style={{ color:C.muted, fontSize:11, flexShrink:0 }}>{elapsed}s / 30s</span>
                  <button onClick={() => { abortRef.current?.abort(); setImporting(false); setImportStep(''); setImportError('Import annulé.'); }} style={{
                    background:C.redBg, border:`1px solid ${C.red}44`, color:C.red,
                    borderRadius:7, padding:'3px 9px', fontSize:11, cursor:'pointer', flexShrink:0,
                  }}>✕ Annuler</button>
                </div>
                <div style={{ marginTop:6, height:3, background:C.border, borderRadius:2, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:2, background: elapsed > 20 ? C.orange : C.accent,
                    width:`${Math.min((elapsed/30)*100,100)}%`, transition:'width 1s linear',
                  }} />
                </div>
              </div>
            )}
            {/* Succès */}
            {importDone && !importing && (
              <div style={{ marginTop:10, color:C.green, fontSize:13, fontWeight:500 }}>
                ✅ Recette importée pour 6 personnes — vérifiez et ajustez si besoin
              </div>
            )}
            {/* Erreur + bouton bascule */}
            {importError && !importing && (
              <div style={{ marginTop:10 }}>
                <div style={{ color:C.red, fontSize:12, lineHeight:1.6 }}>⚠️ {importError}</div>
                {importMode === 'url' && (
                  <button onClick={() => setImportMode('paste')} style={{
                    marginTop:6, background:'none', border:`1px solid ${C.red}44`,
                    color:C.red, borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:11,
                  }}>
                    Essayer en collant le texte manuellement →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ Bandeau doublon ══ */}
        {dupWarning && (
          <div style={{
            background: C.orangeBg, border:`1px solid ${C.orange}44`,
            borderRadius:13, padding:14, marginBottom:18, animation:'fadeIn 0.2s',
          }}>
            <div style={{ fontSize:13, color:C.orange, fontWeight:700, marginBottom:6 }}>
              ⚠️ Cette recette existe déjà
            </div>
            <div style={{ fontSize:12, color:C.soft, marginBottom:12 }}>
              {dupWarning.emoji} <strong style={{ color:C.text }}>{dupWarning.name}</strong> est déjà dans ta liste.
              Choisis une action pour pouvoir enregistrer.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { set('id', dupWarning.id); setDupWarning(null); }} style={{
                flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.orange}55`,
                background:'rgba(232,168,123,0.18)', color:C.orange,
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              }}>↻ Mettre à jour "{dupWarning.name}"</button>
              <button onClick={() => setDupWarning(null)} style={{
                flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`,
                background:'transparent', color:C.soft,
                fontSize:12, cursor:'pointer', fontFamily:'inherit',
              }}>+ Créer quand même</button>
            </div>
          </div>
        )}

        {/* ══ Emoji & Nom ══ */}
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:18 }}>
          <EmojiInput value={form.emoji} onChange={v => set('emoji', v)} />
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Nom *</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nom de la recette" style={inp} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>🍽 Portions</label>
            <div style={{ display:'flex', alignItems:'center', gap:8, height:36 }}>
              <button aria-label="Moins de portions" onClick={() => adjustPortions(-1)} style={{
                background:C.border, border:'none', color:C.text, width:32, height:32,
                borderRadius:8, cursor:'pointer', fontSize:18, flexShrink:0, lineHeight:1,
              }}>−</button>
              <span style={{ fontWeight:700, color:C.text, minWidth:28, textAlign:'center', fontSize:16 }}>
                {parseInt(form.portions)||1}
              </span>
              <button aria-label="Plus de portions" onClick={() => adjustPortions(1)} style={{
                background:C.border, border:'none', color:C.text, width:32, height:32,
                borderRadius:8, cursor:'pointer', fontSize:18, flexShrink:0, lineHeight:1,
              }}>+</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>⏱ Durée (min)</label>
            <input type="number" min="0" value={form.cookTimeMinutes} onChange={e=>set('cookTimeMinutes',e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          {/* ── Type : Salé / Sucré ── */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:8 }}>Type de recette</label>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => set('type', form.type==='savory' ? null : 'savory')} style={{
                flex:1, padding:'9px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:13,
                background: form.type==='savory' ? C.accentBg : C.card,
                border:`1px solid ${form.type==='savory' ? C.accent+'55' : C.border}`,
                color: form.type==='savory' ? C.accent : C.muted,
              }}>🧂 Salé</button>
              <button onClick={() => set('type', form.type==='sweet' ? null : 'sweet')} style={{
                flex:1, padding:'9px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:13,
                background: form.type==='sweet' ? C.sweetBg : C.card,
                border:`1px solid ${form.type==='sweet' ? C.sweet+'55' : C.border}`,
                color: form.type==='sweet' ? C.sweet : C.muted,
              }}>🍰 Sucré</button>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:8 }}>Saison</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {SEASONS.map(s => {
                const active = (form.seasons||[]).includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSeason(s.id)} style={{
                    padding:'7px 12px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:12,
                    background: active ? C.accentBg : C.card,
                    border:`1px solid ${active ? C.accent+'55' : C.border}`,
                    color: active ? C.accent : C.muted,
                  }}>{s.emoji} {s.label}</button>
                );
              })}
              <button onClick={() => toggleSeason('all')} style={{
                padding:'7px 12px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:12,
                background: (form.seasons||[]).includes('all') ? C.greenBg : C.card,
                border:`1px solid ${(form.seasons||[]).includes('all') ? C.green+'55' : C.border}`,
                color: (form.seasons||[]).includes('all') ? C.green : C.muted,
              }}>🔄 Mixte</button>
            </div>
          </div>

          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>🏷 Tags (séparés par virgule)</label>
          <input value={form.tagsStr} onChange={e=>set('tagsStr',e.target.value)} placeholder="volaille, rapide, four..." style={inp} />
        </div>

        <div style={{ display:'flex', gap:20, alignItems:'center', marginBottom:18 }}>
          <div>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Note</label>
            <Stars value={form.rating} onChange={v=>set('rating',v)} />
          </div>
          <div>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Favori</label>
            <button onClick={() => set('favorite',!form.favorite)} style={{
              background: form.favorite ? C.orangeBg : C.border,
              color: form.favorite ? C.orange : C.muted,
              border: form.favorite ? `1px solid ${C.orange}44` : 'none',
              padding:'6px 12px', borderRadius:9, cursor:'pointer', fontSize:13,
            }}>
              {form.favorite ? '⭐ Favori' : '☆ Favori'}
            </button>
          </div>
        </div>

        <SecTitle>Ingrédients</SecTitle>
        {form.ingredients.map(ing => (
          <div key={ing.id} style={{ display:'flex', gap:6, marginBottom:7, alignItems:'center' }}>
            <input value={ing.name} onChange={e=>updIng(ing.id,'name',e.target.value)} placeholder="Nom" style={{ ...inp, flex:3 }} />
            <input type="number" value={ing.qty} onChange={e=>updIng(ing.id,'qty',e.target.value)} placeholder="Qté" style={{ ...inp, flex:1 }} />
            <select value={ing.unit} onChange={e=>updIng(ing.id,'unit',e.target.value)} style={{ ...inp, flex:1 }}>
              {UNITS.map(u => <option key={u} value={u}>{u||'—'}</option>)}
            </select>
            <button aria-label="Supprimer l’ingrédient" onClick={()=>remIng(ing.id)} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:18, padding:'0 4px' }}>×</button>
          </div>
        ))}
        <Btn onClick={addIng} variant="ghost" small style={{ marginBottom:20 }}>+ Ingrédient</Btn>

        <SecTitle>Étapes</SecTitle>
        {form.steps.map((step, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
            <span style={{ color:C.muted, fontWeight:700, fontSize:13, paddingTop:9, minWidth:18 }}>{i+1}.</span>
            <textarea value={step} onChange={e=>updStep(i,e.target.value)} placeholder={`Étape ${i+1}...`} rows={2}
              style={{ ...inp, resize:'vertical', flex:1 }} />
            <button aria-label="Supprimer l’étape" onClick={()=>remStep(i)} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:18, paddingTop:6 }}>×</button>
          </div>
        ))}
        <Btn onClick={addStep} variant="ghost" small style={{ marginBottom:20 }}>+ Étape</Btn>

        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>📝 Note personnelle</label>
          <textarea value={form.note} onChange={e=>set('note',e.target.value)} placeholder="Conseils, variantes..." rows={3} style={{ ...inp }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>🔗 Source (URL)</label>
          <input value={form.url} onChange={e=>set('url',e.target.value)} placeholder="https://..." style={inp} />
        </div>
      </div>
    </div>

    {/* ── Confirmation quitter sans sauvegarder ── */}
    {closeWarning && (
      <BottomSheet title="⚠️ Modifications non sauvegardées" onClose={() => setCloseWarning(false)}>
        <div style={{ padding:'10px 16px 24px' }}>
          <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.5 }}>
            Tu as des modifications en cours.<br/>Quitter sans sauvegarder ?
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={() => setCloseWarning(false)} style={{ flex:1, justifyContent:'center' }}>
              Continuer l'édition
            </Btn>
            <Btn onClick={onClose} variant="danger" style={{ flex:1, justifyContent:'center' }}>
              Quitter
            </Btn>
          </div>
        </div>
      </BottomSheet>
    )}
  </>
  );
}

function MultiCategoryAssignModal({ uncatItems, onConfirm, onCancel }) {
  // uncatItems : [{ id, name, recipeEmoji, recipeName }]
  const { cats, addCat } = useApp();
  const sortedCats = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);
  const [assignments, setAssignments] = useState({});
  const [bulkCat,     setBulkCat]     = useState('');
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newEmoji,    setNewEmoji]    = useState('📦');

  // Après création d'une catégorie, elle apparaît dans sortedCats via context —
  // on la sélectionne automatiquement comme bulk
  const prevCatCount = useRef(cats.length);
  useEffect(() => {
    if (cats.length > prevCatCount.current) {
      const newest = [...cats].sort((a,b) => b.order-a.order)[0];
      if (newest) setBulkCat(newest.id);
    }
    prevCatCount.current = cats.length;
  }, [cats]);

  const allAssigned = uncatItems.every(i => assignments[i.id]);
  const inp = fieldStyle({ style:{ padding:'7px 10px', fontSize:12, borderRadius:8, width:'auto' } });

  const applyBulk = () => {
    if (!bulkCat) return;
    const all = {};
    uncatItems.forEach(i => { all[i.id] = bulkCat; });
    setAssignments(all);
  };

  const handleCreateAndSelect = () => {
    if (!newName.trim()) return;
    const newId = genId();
    addCat({ id: newId, name: newName.trim(), emoji: newEmoji, kw: [] });
    setBulkCat(newId);
    setCreating(false);
    setNewName(''); setNewEmoji('📦');
    // Bulk-apply immédiatement
    const all = {};
    uncatItems.forEach(i => { all[i.id] = newId; });
    setAssignments(all);
  };

  return (
    <BottomSheet title="Catégoriser les ingrédients" onClose={onCancel}>
      <div style={{ padding:16 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
          {uncatItems.length} ingrédient{uncatItems.length>1?'s':''} sans correspondance — choisis une catégorie pour chacun.
        </div>

        {/* Bulk assign */}
        <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
          <select value={bulkCat} onChange={e=>setBulkCat(e.target.value)}
            style={{ ...inp, flex:1 }}>
            <option value="">Tout mettre dans...</option>
            {sortedCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <button onClick={applyBulk} disabled={!bulkCat} style={{
            padding:'7px 12px', borderRadius:8, border:'none', cursor: bulkCat?'pointer':'default',
            background: bulkCat ? C.accentDk : C.border, color: bulkCat?C.onAccent:C.muted,
            fontSize:12, fontWeight:600, fontFamily:'inherit', flexShrink:0,
          }}>Appliquer</button>
        </div>

        {/* Créer une catégorie */}
        {!creating ? (
          <button onClick={() => setCreating(true)} style={{
            width:'100%', padding:'8px', borderRadius:9, marginBottom:14,
            border:`1px dashed ${C.accent}55`, background:C.accentBg,
            color:C.accent, fontSize:12, cursor:'pointer', fontFamily:'inherit',
          }}>+ Créer une nouvelle catégorie</button>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:12, marginBottom:14 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <EmojiInput value={newEmoji} onChange={setNewEmoji} />
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Nom de la catégorie" autoFocus
                style={{ ...inp, flex:1, fontSize:13 }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setCreating(false); setNewName(''); }} style={{
                flex:1, padding:'7px', borderRadius:8, border:`1px solid ${C.border}`,
                background:'transparent', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'inherit',
              }}>Annuler</button>
              <button onClick={handleCreateAndSelect} disabled={!newName.trim()} style={{
                flex:2, padding:'7px', borderRadius:8, border:'none',
                background: newName.trim() ? C.accentDk : C.border,
                color: newName.trim() ? C.onAccent : C.muted,
                fontSize:12, fontWeight:600, cursor: newName.trim()?'pointer':'default', fontFamily:'inherit',
              }}>Créer et assigner à tous</button>
            </div>
          </div>
        )}

        {/* Par ingrédient */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
          {uncatItems.map(item => (
            <div key={item.id} style={{
              display:'flex', alignItems:'center', gap:8,
              background:C.card, border:`1px solid ${assignments[item.id] ? C.accent+'44' : C.border}`,
              borderRadius:9, padding:'8px 10px',
            }}>
              {item.recipeEmoji && <span style={{ fontSize:13, flexShrink:0 }}>{item.recipeEmoji}</span>}
              <span style={{ flex:1, fontSize:13, color:C.text }}>{item.name}</span>
              <select value={assignments[item.id] || ''} onChange={e => setAssignments(p => ({ ...p, [item.id]: e.target.value }))}
                style={{ ...inp, width:120, flexShrink:0 }}>
                <option value="">— catégorie —</option>
                {sortedCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
          ))}
        </div>

        <Btn onClick={() => onConfirm(assignments)} variant="primary"
          disabled={!allAssigned} style={{ width:'100%', justifyContent:'center' }}>
          Ajouter {uncatItems.length} ingrédient{uncatItems.length>1?'s':''} ✓
        </Btn>
      </div>
    </BottomSheet>
  );
}

function CategoryAssignModal({ item, onConfirm, onCancel }) {
  const { cats, addCat, showSnack } = useApp();
  const sortedCats = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newEmoji,  setNewEmoji]  = useState('📦');

  const inp = fieldStyle({ dense:true, style:{ padding:'8px 11px', width:'auto' } });

  const handleCreateAndAdd = () => {
    if (!newName.trim()) return;
    const newId = genId();
    // Ajoute le nom de l'article comme premier mot-clé de la nouvelle catégorie
    const autoKw = item.name.trim().toLowerCase();
    addCat({ id: newId, name: newName.trim(), emoji: newEmoji, kw: autoKw ? [autoKw] : [] });
    if (autoKw) showSnack(`🏷 "${autoKw}" ajouté aux mots-clés de ${newEmoji} ${newName.trim()}`);
    onConfirm(newId);
  };

  return (
    <BottomSheet title="Choisir une catégorie" onClose={onCancel}>
      <div style={{ padding:16 }}>
        {/* Article en attente */}
        <div style={{
          background:C.card, border:`1px solid ${C.border}`, borderRadius:11,
          padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{ fontSize:20 }}>🛒</span>
          <div>
            <div style={{ fontWeight:600, color:C.text, fontSize:14 }}>{item.name}</div>
            {(item.qty || item.unit) && (
              <div style={{ fontSize:12, color:C.muted }}>{item.qty} {item.unit}</div>
            )}
          </div>
        </div>

        <div style={{ fontSize:12, color:C.muted, marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Aucun mot-clé ne correspond — assigne à une catégorie :
        </div>

        {/* Catégories existantes */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
          {sortedCats.map(cat => (
            <button key={cat.id} onClick={() => onConfirm(cat.id)} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 14px', borderRadius:10, cursor:'pointer',
              background:C.card, border:`1px solid ${C.border}`,
              color:C.text, fontSize:13, fontFamily:'inherit', textAlign:'left',
            }}>
              <span style={{ fontSize:18 }}>{cat.emoji}</span>
              <span style={{ flex:1 }}>{cat.name}</span>
              <span style={{ color:C.muted, fontSize:11 }}>→</span>
            </button>
          ))}
        </div>

        {/* Créer nouvelle catégorie */}
        {!creating ? (
          <button onClick={() => setCreating(true)} style={{
            width:'100%', padding:'10px', borderRadius:10,
            border:`1px dashed ${C.accent}55`, background:C.accentBg,
            color:C.accent, fontSize:13, cursor:'pointer', fontFamily:'inherit',
          }}>+ Créer une nouvelle catégorie</button>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:600, marginBottom:10, textTransform:'uppercase' }}>
              Nouvelle catégorie
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
              <EmojiInput value={newEmoji} onChange={setNewEmoji} />
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Nom de la catégorie" autoFocus
                style={{ ...inp, flex:1 }}
              />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setCreating(false)} style={{
                flex:1, padding:'8px', borderRadius:9, border:`1px solid ${C.border}`,
                background:'transparent', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'inherit',
              }}>Annuler</button>
              <button onClick={handleCreateAndAdd} disabled={!newName.trim()} style={{
                flex:2, padding:'8px', borderRadius:9, border:'none',
                background: newName.trim() ? C.accentDk : C.border,
                color: newName.trim() ? C.onAccent : C.muted,
                fontSize:12, fontWeight:600,
                cursor: newName.trim() ? 'pointer' : 'default', fontFamily:'inherit',
              }}>Créer et ajouter</button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ══════════════════════════════════════════════════════
//  COURSES TAB
// ══════════════════════════════════════════════════════
function ShoppingTab() {
  const { shopping, cats, recipes, meals, settings, addShoppingItem, deleteItemsByCategory, updateShoppingItem, clearChecked, clearAll, showSnack, reorderCats, addKeywordToCat, saveFavList, deleteFavList } = useApp();
  const favLists = settings.favLists || [];
  const [favOpenId, setFavOpenId] = useState(null);   // liste ouverte pour sélection
  const [favEdit,   setFavEdit]   = useState(null);   // null | 'new' | id de liste en édition
  const [favUncat,  setFavUncat]  = useState(null);   // { list, items } à catégoriser
  const [newName,  setNewName]  = useState('');
  const [newQty,   setNewQty]   = useState('');
  const [newUnit,  setNewUnit]  = useState('');
  const [shopMode,      setShopMode]      = useState(false);
  const [shopSearch,    setShopSearch]    = useState('');
  const [shopSearchOpen,setShopSearchOpen]= useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [intakeOpen,    setIntakeOpen]    = useState(false);
  const [dragOverCat,  setDragOverCat]  = useState(null);
  const [dragLineCat,  setDragLineCat]  = useState(null); // 'before'|'after' relative to dragOverCat
  const dragRef    = useRef({ type: null, id: null, catId: null });
  const scrollRef  = useRef(null); // auto-scroll interval

  const sortedCats  = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);
  const checkedCount = shopping.filter(s=>s.checked).length;

  // ── Auto-scroll ──────────────────────────────────────
  const startScroll = (container, speed) => {
    stopScroll();
    scrollRef.current = setInterval(() => { container.scrollTop += speed; }, 14);
  };
  const stopScroll = () => {
    clearInterval(scrollRef.current); scrollRef.current = null;
  };
  const checkAutoScroll = (e) => {
    const main = e.currentTarget?.closest?.('main') || document.querySelector('main');
    if (!main) return;
    const r = main.getBoundingClientRect(), zone = 70;
    if (e.clientY - r.top < zone)    startScroll(main, -7);
    else if (r.bottom - e.clientY < zone) startScroll(main,  7);
    else stopScroll();
  };

  // ── DnD catégories ──────────────────────────────────
  const onCatDragStart = (e, catId) => {
    if (dragRef.current.type === 'item') return; // item drag en cours
    dragRef.current = { type:'cat', id:catId, catId:null };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onCatDragOver = (e, catId) => {
    e.preventDefault();
    if (dragRef.current.type !== 'cat' || dragRef.current.id === catId) return;
    checkAutoScroll(e);
    // Avant ou après la cible selon la position Y de la souris
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDragOverCat(catId);
    setDragLineCat(after ? 'after' : 'before');
  };
  const onCatDrop = (e, targetId) => {
    e.preventDefault();
    stopScroll();
    if (dragRef.current.type !== 'cat') return;
    const fromId = dragRef.current.id;
    dragRef.current = { type:null, id:null, catId:null };
    setDragOverCat(null); setDragLineCat(null);
    if (fromId === targetId) return;

    const ids = sortedCats.map(c => c.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;

    // Recalcule la position sans le fromId
    const without = ids.filter(id => id !== fromId);
    let toIdx = without.indexOf(targetId);
    if (insertAfter) toIdx += 1;
    without.splice(toIdx, 0, fromId);

    reorderCats(without.map(id => cats.find(c => c.id === id)).filter(Boolean));
  };
  const onCatDragEnd = () => {
    stopScroll();
    setDragOverCat(null); setDragLineCat(null);
    dragRef.current = { type:null, id:null, catId:null };
  };

  const moveCatInShopping = (id, dir) => {
    const list = [...cats].sort((a,b) => a.order - b.order);
    const idx  = list.findIndex(c => c.id === id);
    const next = idx + dir;
    if (next < 0 || next >= list.length) return;
    [list[idx], list[next]] = [list[next], list[idx]];
    reorderCats(list);
  };

  const [catAssignItem, setCatAssignItem] = useState(null); // { name, qty, unit }

  const handleAdd = () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    if (!hasKeywordMatch(name, cats)) {
      setCatAssignItem({ name, qty: newQty, unit: newUnit });
    } else {
      addShoppingItem(name, newQty, newUnit, categorize(name, cats));
      setNewName(''); setNewQty(''); setNewUnit('');
    }
  };

  const shareList = () => {
    // En-tête : recettes planifiées cette semaine
    const currentWeek = getISOWeekKey();
    const weekMeals   = meals.filter(m => m.weekKey === currentWeek);
    const recipeLines = weekMeals.map(m => {
      const r = recipes.find(x => x.id === m.recipeId);
      return r ? `  ${r.emoji} ${r.name} (${m.persons} pers.)` : '';
    }).filter(Boolean);

    let text = '🛒 Liste de courses\n';
    if (recipeLines.length) {
      text += `\n📅 Recettes de la semaine\n${recipeLines.join('\n')}\n`;
    }

    // Articles non cochés, groupés par catégorie, avec nom de recette si applicable
    const catText = sortedCats.map(cat => {
      const items = shopping.filter(s => s.categoryId === cat.id && !s.checked);
      if (!items.length) return '';
      const lines = items.map(i => {
        const qtyStr    = i.qty ? ` – ${i.qty}${i.unit ? '\u202f' + i.unit : ''}` : '';
        const recipeName = i.fromRecipeId ? recipes.find(r => r.id === i.fromRecipeId)?.name : null;
        const srcStr    = recipeName ? ` (${recipeName})` : '';
        return `  · ${i.name}${qtyStr}${srcStr}`;
      }).join('\n');
      return `\n${cat.emoji} ${cat.name}\n${lines}`;
    }).filter(Boolean).join('');

    text += catText || '\n(liste vide)';
    if (navigator.share) navigator.share({ title:'Liste de courses', text });
    else navigator.clipboard?.writeText(text).then(() => showSnack('Liste copiée'));
  };

  return (
    <div style={{ padding:'10px 12px' }}>

      {/* ── Ajout rapide (toujours en haut, compact) ── */}
      <div style={{
        display:'flex', gap:5, marginBottom:10, alignItems:'center',
        background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'9px 11px',
        position:'sticky', top:0, zIndex:10,
      }}>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleAdd()}
          placeholder="Ajouter un article..."
          style={{ flex:1, minWidth:0, padding:'5px 8px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, outline:'none' }}
        />
        <input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} placeholder="Qté"
          style={{ width:36, flexShrink:0, padding:'5px 4px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:12, outline:'none' }}
        />
        <select value={newUnit} onChange={e=>setNewUnit(e.target.value)}
          style={{ width:44, flexShrink:0, padding:'5px 2px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:11, outline:'none' }}>
          {UNITS.map(u => <option key={u} value={u}>{u||'—'}</option>)}
        </select>
        <button aria-label="Ajouter" onClick={handleAdd} style={{
          background:C.accentDk, color:C.onAccent, border:'none', borderRadius:7,
          width:28, height:28, fontSize:18, cursor:'pointer', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>+</button>
      </div>

      {/* ── Listes d'habituels ── */}
      <FavListsBar lists={favLists} onOpen={setFavOpenId} onNew={() => setFavEdit('new')} />

      {/* ── Barre articles + actions ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:11, color:C.muted }}>
          {shopping.length} article{shopping.length!==1?'s':''}
          {checkedCount > 0 && <span style={{ color:C.green }}> · {checkedCount} coché{checkedCount>1?'s':''}</span>}
        </span>
        <div style={{ display:'flex', gap:5, position:'relative' }}>
          {shopping.filter(s=>!s.checked).length > 0 && (
            <button onClick={() => setShopMode(true)} style={{
              background:`linear-gradient(135deg, ${C.accentDk}, ${C.accent})`,
              border:'none', color:C.onAccent, borderRadius:9,
              padding:'5px 11px', fontSize:12, fontWeight:700,
              cursor:'pointer', display:'flex', alignItems:'center', gap:4,
            }}>🛍 Faire les courses</button>
          )}
          <Btn label="Rechercher" onClick={() => { setShopSearchOpen(v => !v); if (shopSearchOpen) setShopSearch(''); }}
            small variant={shopSearchOpen ? 'accent' : 'ghost'}>🔍</Btn>
          <Btn label="Partager" onClick={shareList} small variant="ghost">📤</Btn>
          <div style={{ position:'relative' }}>
            <Btn label="Plus d’actions" onClick={() => setMenuOpen(m=>!m)} small variant="ghost">⋯</Btn>
            {menuOpen && (
              <div style={{
                position:'absolute', right:0, top:'110%', background:C.card,
                border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden',
                minWidth:190, zIndex:200, boxShadow:'0 12px 32px rgba(0,0,0,0.5)',
                animation:'fadeIn 0.12s',
              }}>
                {checkedCount > 0 && (
                  <button onClick={() => { setIntakeOpen(true); setMenuOpen(false); }} style={{
                    display:'block', width:'100%', padding:'10px 14px', background:'none',
                    color:C.text, border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                    borderBottom:`1px solid ${C.border}`,
                  }}>🥫 Ranger les cochés au stock…</button>
                )}
                {checkedCount > 0 && (
                  <button onClick={() => { clearChecked(); setMenuOpen(false); }} style={{
                    display:'block', width:'100%', padding:'10px 14px', background:'none',
                    color:C.text, border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                    borderBottom:`1px solid ${C.border}`,
                  }}>✅ Vider les cochés ({checkedCount})</button>
                )}
                  <button onClick={() => { clearAll(); setMenuOpen(false); }} style={{
                    display:'block', width:'100%', padding:'10px 14px', background:'none',
                    color:C.red, border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                  }}>🗑 Tout vider</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {shopping.length === 0 && <EmptyState icon="🛒" text="La liste est vide" />}

      {/* ── Recherche ── */}
      {shopSearchOpen && (
        <div style={{ marginBottom:8 }}>
          <input
            autoFocus
            placeholder="🔍 Filtrer les articles…"
            value={shopSearch}
            onChange={e => setShopSearch(e.target.value)}
            style={{ width:'100%', padding:'8px 12px', background:C.card, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none' }}
          />
        </div>
      )}

      {/* ── Catégories draggables ── */}
      {sortedCats.map((cat, idx) => {
        const q = shopSearch.toLowerCase();
        const items = shopping.filter(s => s.categoryId===cat.id && (!q || s.name.toLowerCase().includes(q)));
        if (!items.length) return null;
        const over  = dragOverCat === cat.id;
        const line  = over ? dragLineCat : null;
        return (
          <CategorySection
            key={cat.id} cat={cat} items={items}
            isDragOver={over} dragLine={line}
            onCatDragStart={e => onCatDragStart(e, cat.id)}
            onCatDragOver={e => onCatDragOver(e, cat.id)}
            onCatDrop={e => onCatDrop(e, cat.id)}
            onCatDragEnd={onCatDragEnd}
            dragRef={dragRef}
            onMoveUp={idx > 0 ? () => moveCatInShopping(cat.id, -1) : null}
            onMoveDown={idx < sortedCats.length - 1 ? () => moveCatInShopping(cat.id, +1) : null}
            onDeleteAll={() => deleteItemsByCategory(cat.id)}
          />
        );
      })}

      {/* ── Articles sans catégorie valide (filet de sécurité) ── */}
      {(() => {
        const orphans = shopping.filter(s => !cats.find(c => c.id === s.categoryId) && (!shopSearch || s.name.toLowerCase().includes(shopSearch.toLowerCase())));
        if (!orphans.length) return null;
        return (
          <div style={{ marginBottom:7, borderRadius:10, overflow:'hidden', border:`1px dashed ${C.orange}66` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:C.orangeBg }}>
              <span style={{ fontSize:15 }}>⚠️</span>
              <span style={{ fontWeight:600, fontSize:12, color:C.orange, flex:1 }}>Non catégorisé</span>
              <span style={{ fontSize:11, fontWeight:700, color:C.onAccent, background:C.orange, padding:'1px 7px', borderRadius:20 }}>{orphans.length}</span>
            </div>
            <div style={{ background:C.bg }}>
              {orphans.map(item => (
                <ItemRow key={item.id} item={item} isDragOver={false}
                  onDragStart={()=>{}} onDragOver={()=>{}} onDrop={()=>{}} onDragEnd={()=>{}}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {catAssignItem && (
        <CategoryAssignModal
          item={catAssignItem}
          onConfirm={(catId) => {
            const normName = catAssignItem.name.trim().toLowerCase();
            const willMerge = shopping.some(s => !s.checked && s.name.trim().toLowerCase() === normName);
            addShoppingItem(catAssignItem.name, catAssignItem.qty, catAssignItem.unit, catId);
            // Auto-ajoute le nom comme mot-clé dans la catégorie existante (la nouvelle catégorie
            // reçoit déjà le mot-clé directement dans handleCreateAndAdd de CategoryAssignModal)
            const cat = cats.find(c => c.id === catId);
            let kwSuffix = '';
            if (cat) {
              const added = addKeywordToCat(cat.id, normName);
              if (added) kwSuffix = ` · 🏷 "${normName}" ajouté aux mots-clés de ${cat.emoji} ${cat.name}`;
            }
            // Si fusion avec un article existant, addShoppingItem a déjà affiché son propre
            // snack (🔀 ou ⚠️) — on ne l'écrase que si on a une info supplémentaire à donner.
            if (!willMerge) showSnack(`✅ "${catAssignItem.name}" ajouté à la liste${kwSuffix}`);
            else if (kwSuffix) showSnack(`✅ Fusionné${kwSuffix}`);
            setNewName(''); setNewQty(''); setNewUnit('');
            setCatAssignItem(null);
          }}
          onCancel={() => setCatAssignItem(null)}
        />
      )}

      {favOpenId && favLists.find(l => l.id === favOpenId) && (
        <FavListPicker
          list={favLists.find(l => l.id === favOpenId)}
          onClose={() => setFavOpenId(null)}
          onEdit={() => { setFavEdit(favOpenId); setFavOpenId(null); }}
          onAdd={(picked) => {
            const list = favLists.find(l => l.id === favOpenId);
            setFavOpenId(null);
            const unknown = picked.filter(it => !hasKeywordMatch(it.name, cats));
            if (unknown.length) { setFavUncat({ list, items: picked, unknown }); return; }
            picked.forEach(it => addShoppingItem(it.name, '', '', categorize(it.name, cats)));
            showSnack(`✅ ${picked.length} article${picked.length>1?'s':''} ajouté${picked.length>1?'s':''} · ${list.emoji} ${list.name}`);
          }}
        />
      )}
      {favUncat && (
        <MultiCategoryAssignModal
          uncatItems={favUncat.unknown.map(it => ({ id: it.id, name: it.name, recipeEmoji: favUncat.list.emoji, recipeName: favUncat.list.name }))}
          onCancel={() => setFavUncat(null)}
          onConfirm={(overrides) => {
            const { list, items } = favUncat;
            items.forEach(it => addShoppingItem(it.name, '', '', overrides[it.id] || categorize(it.name, cats)));
            favUncat.unknown.forEach(it => { if (overrides[it.id]) addKeywordToCat(overrides[it.id], it.name.trim().toLowerCase()); });
            showSnack(`✅ ${items.length} article${items.length>1?'s':''} ajouté${items.length>1?'s':''} · ${list.emoji} ${list.name}`);
            setFavUncat(null);
          }}
        />
      )}
      {favEdit && (
        <FavListEditor
          list={favEdit === 'new' ? null : favLists.find(l => l.id === favEdit)}
          onClose={() => setFavEdit(null)}
          onSave={(l) => { saveFavList(l); setFavEdit(null); }}
          onDelete={(id) => { deleteFavList(id); setFavEdit(null); }}
        />
      )}

      {intakeOpen && (
        <StockIntakeSheet items={shopping.filter(s => s.checked)} onClose={() => setIntakeOpen(false)} onDone={() => setIntakeOpen(false)} />
      )}

      {/* ══ MODE COURSES — overlay plein écran ══ */}
      {shopMode && <ShoppingModeOverlay
        shopping={shopping}
        cats={sortedCats}
        onCheck={id => updateShoppingItem(id, { checked: true })}
        onExit={() => setShopMode(false)}
      />}
    </div>
  );
}

/** Rangée compacte des listes d'habituels (Courses). */
function FavListsBar({ lists, onOpen, onNew }) {
  const chip = {
    display:'inline-flex', alignItems:'center', gap:5, height:30, padding:'0 11px', borderRadius:20,
    fontSize:13, background:C.card, border:`1px solid ${C.border}`, color:C.text,
    whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', fontFamily:'inherit',
  };
  return (
    <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:8, paddingBottom:2 }}>
      {lists.map(l => (
        <button key={l.id} onClick={() => onOpen(l.id)} style={chip} aria-label={`Liste ${l.name}`}>
          <span>{l.emoji}</span><span>{l.name}</span>
          <span style={{ fontSize:11, color:C.muted }}>{l.items.length}</span>
        </button>
      ))}
      <button onClick={onNew} style={{ ...chip, background:'transparent', borderStyle:'dashed', color:C.accent }}>
        + Liste{lists.length ? '' : ' d\u2019habituels'}
      </button>
    </div>
  );
}

/** Fenêtre : on coche ce qu'il faut cette fois, puis « Ajouter ». */
function FavListPicker({ list, onClose, onEdit, onAdd }) {
  const { shopping } = useApp();
  const present = useMemo(() => new Set(shopping.filter(s => !s.checked).map(s => stemFrName(s.name))), [shopping]);
  const isIn = (it) => present.has(stemFrName(it.name));
  const [sel, setSel] = useState(() => new Set());
  const avail = list.items.filter(it => !isIn(it));
  const toggle = (id) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = avail.length > 0 && avail.every(it => sel.has(it.id));
  const n = [...sel].filter(id => avail.some(it => it.id === id)).length;
  return (
    <BottomSheet title={`${list.emoji} ${list.name}`} onClose={onClose}>
      <div style={{ padding:'12px 18px 18px' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <button onClick={onEdit} style={{ background:'none', border:'none', color:C.accent, fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:'4px 0' }}>✏️ Modifier</button>
        </div>
        {list.items.length === 0 && <div style={{ fontSize:13, color:C.muted, padding:'10px 0 16px' }}>Cette liste est vide. Appuie sur Modifier pour ajouter des articles.</div>}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
          {list.items.map(it => {
            const inList = isIn(it), on = sel.has(it.id) && !inList;
            return (
              <button key={it.id} onClick={() => !inList && toggle(it.id)} aria-pressed={on} style={{
                minHeight:36, padding:'0 14px', borderRadius:20, fontSize:14, fontFamily:'inherit',
                cursor: inList ? 'default' : 'pointer',
                background: on ? C.accentBg : C.border, color: on ? C.accent : C.text,
                border: on ? `1px solid ${C.accent}` : inList ? `1px dashed ${C.muted}` : '1px solid transparent',
                opacity: inList ? 0.55 : 1,
              }}>{on && '✓ '}{it.name}{inList && <span style={{ fontSize:11, color:C.muted }}> · déjà dans la liste</span>}</button>
            );
          })}
        </div>
        {list.items.length > 0 && <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Chaque article est rangé dans son rayon automatiquement.</div>}
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={() => setSel(allOn ? new Set() : new Set(avail.map(it => it.id)))} disabled={!avail.length} style={{ flex:1, justifyContent:'center' }}>
            {allOn ? 'Tout décocher' : 'Tout cocher'}
          </Btn>
          <Btn variant="primary" disabled={!n} onClick={() => onAdd(avail.filter(it => sel.has(it.id)))} style={{ flex:2, justifyContent:'center' }}>
            {n ? `Ajouter ${n} article${n>1?'s':''}` : 'Ajouter'}
          </Btn>
        </div>
      </div>
    </BottomSheet>
  );
}

/** Création / modification d'une liste d'habituels. */
function FavListEditor({ list, onClose, onSave, onDelete }) {
  const [emoji, setEmoji] = useState(list ? list.emoji : '🧺');
  const [name,  setName]  = useState(list ? list.name : '');
  const [items, setItems] = useState(list ? list.items : []);
  const [draft, setDraft] = useState('');

  const addNames = (raw) => {
    const names = raw.split(',').map(x => x.trim()).filter(Boolean);
    if (!names.length) return;
    setItems(prev => {
      const seen = new Set(prev.map(i => normTag(i.name)));
      const add = [];
      names.forEach(n => { const k = normTag(n); if (!seen.has(k)) { seen.add(k); add.push({ id: genId(), name: capFirst(n) }); } });
      return [...prev, ...add];
    });
  };
  const onDraft = (v) => {
    if (v.includes(',')) { const i = v.lastIndexOf(','); addNames(v.slice(0, i)); setDraft(v.slice(i + 1).trimStart()); }
    else setDraft(v);
  };
  const canSave = name.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    const extra = draft.split(',').map(x => x.trim()).filter(Boolean);
    let finalItems = items;
    if (extra.length) {
      const seen = new Set(items.map(i => normTag(i.name)));
      finalItems = [...items];
      extra.forEach(n => { const k = normTag(n); if (!seen.has(k)) { seen.add(k); finalItems.push({ id: genId(), name: capFirst(n) }); } });
    }
    onSave({ id: list ? list.id : genId(), name: name.trim(), emoji: emoji.trim() || '🧺', items: finalItems });
  };

  return (
    <BottomSheet title={list ? 'Modifier la liste' : 'Nouvelle liste'} onClose={onClose}>
      <div style={{ padding:'14px 18px 18px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
          <EmojiInput value={emoji} onChange={setEmoji} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Nom de la liste</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Fromage, Fruits…" style={fieldStyle()} aria-label="Nom de la liste" />
          </div>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Articles</div>
        {items.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {items.map(it => (
              <span key={it.id} style={{ display:'inline-flex', alignItems:'center', gap:6, minHeight:32, padding:'0 6px 0 12px', borderRadius:20, fontSize:13, background:C.border, color:C.text }}>
                {it.name}
                <button onClick={() => setItems(p => p.filter(x => x.id !== it.id))} aria-label={`Retirer ${it.name}`} style={{
                  background:'none', border:'none', color:C.muted, fontSize:17, lineHeight:1, cursor:'pointer', padding:'0 6px', fontFamily:'inherit',
                }}>×</button>
              </span>
            ))}
          </div>
        )}
        <input value={draft} onChange={e => onDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { addNames(draft); setDraft(''); } }}
          placeholder="Ajouter : emmental, chèvre…" style={fieldStyle()} aria-label="Ajouter des articles" />
        <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>Sépare les articles par des virgules.</div>
        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          {list && <Btn variant="danger" onClick={() => onDelete(list.id)} style={{ flex:1, justifyContent:'center' }}>Supprimer</Btn>}
          <Btn variant="primary" disabled={!canSave} onClick={save} style={{ flex:2, justifyContent:'center' }}>Enregistrer</Btn>
        </div>
      </div>
    </BottomSheet>
  );
}

function ShoppingModeOverlay({ shopping, cats, onCheck, onExit }) {
  useBackHandler(onExit);
  const { clearChecked } = useApp();
  const [clearPrompt, setClearPrompt] = useState(false);
  const [intakeOpen,  setIntakeOpen]  = useState(false);

  const unchecked  = shopping.filter(s => !s.checked);
  const checkedCnt = shopping.filter(s =>  s.checked).length;
  const total      = shopping.length;
  const done       = total - unchecked.length;
  const allGone    = unchecked.length === 0;

  const handleExit = () => {
    if (checkedCnt > 0) setClearPrompt(true);
    else onExit();
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:C.bg, overflowY:'auto',
      display:'flex', flexDirection:'column',
      animation:'fadeIn 0.15s',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navDeep}, ${C.navMid})`,
        padding:'12px 16px 10px', flexShrink:0,
        borderBottom:`1px solid ${C.navBdr}`,
        position:'sticky', top:0, zIndex:10,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.sky }}>🛍 Mode courses</div>
            <div style={{ fontSize:12, color:C.navMuted, marginTop:1 }}>
              {allGone ? 'Tout est dans le chariot !' : `${unchecked.length} article${unchecked.length>1?'s':''} restant${unchecked.length>1?'s':''}`}
            </div>
          </div>
          <button onClick={handleExit} style={{
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
            color:C.sky, borderRadius:10, padding:'7px 14px',
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>✕ Quitter</button>
        </div>

        {/* Barre de progression */}
        <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:4, transition:'width 0.3s',
            width: total > 0 ? `${(done/total)*100}%` : '0%',
            background: allGone
              ? `linear-gradient(90deg, #3DA882, ${C.green})`
              : `linear-gradient(90deg, ${C.accentDk}, ${C.sky})`,
          }} />
        </div>
      </div>

      {/* ── Liste ── */}
      <div style={{ flex:1, padding:'10px 12px 80px' }}>
        {allGone ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.green, marginBottom:8 }}>Courses terminées !</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Tous les articles ont été récupérés.</div>
            <button onClick={handleExit} style={{
              background:C.accentDk, border:'none', color:C.onAccent,
              borderRadius:12, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer',
            }}>← Retour à la liste</button>
          </div>
        ) : (
          cats.map(cat => {
            const items = unchecked.filter(s => s.categoryId === cat.id);
            if (!items.length) return null;
            return (
              <div key={cat.id} style={{ marginBottom:16 }}>
                <div style={{
                  fontSize:11, color:C.muted, fontWeight:700, letterSpacing:'0.07em',
                  textTransform:'uppercase', marginBottom:7,
                  display:'flex', alignItems:'center', gap:7,
                }}>
                  <span style={{ fontSize:16 }}>{cat.emoji}</span>{cat.name}
                </div>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onCheck(item.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:14,
                      background:C.card, border:`1px solid ${C.border}`,
                      borderRadius:14, padding:'14px 16px', marginBottom:7,
                      cursor:'pointer', userSelect:'none', transition:'opacity 0.15s',
                      WebkitTapHighlightColor:'transparent',
                      active: { opacity: 0.7 },
                    }}
                  >
                    {/* Cercle vide (invite au tap) */}
                    <div style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      border:`2.5px solid ${C.border}`, background:'transparent',
                    }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:17, color:C.text, fontWeight:500, lineHeight:1.25 }}>{item.name}</div>
                      {item.qty > 0 && (
                        <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
                          {item.qty}{item.unit ? '\u202f' + item.unit : ''}
                        </div>
                      )}
                    </div>
                    {item.fromRecipeId && (
                      <span style={{ fontSize:12, color:C.accent, opacity:0.7, flexShrink:0 }}>📅</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* ── Prompt de nettoyage à la sortie ── */}
      {clearPrompt && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          background:C.card, borderTop:`1px solid ${C.border}`,
          padding:'16px 16px 28px',
        }}>
          <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:4 }}>
            {checkedCnt} article{checkedCnt>1?'s':''} récupérés
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
            Les ranger dans ton stock, ou simplement les retirer de la liste ?
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => setIntakeOpen(true)} style={{
              flex:'1 1 100%', padding:'11px', background:C.accentDk, border:'none',
              color:C.onAccent, borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer',
            }}>🥫 Ranger au stock…</button>
            <button onClick={() => { clearChecked(); onExit(); }} style={{
              flex:2, padding:'11px', background:C.green, border:'none',
              color:C.onAccent, borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer',
            }}>🗑 Vider ({checkedCnt})</button>
            <button onClick={onExit} style={{
              flex:1, padding:'11px', background:C.border, border:'none',
              color:C.muted, borderRadius:10, fontSize:13, cursor:'pointer',
            }}>Garder</button>
          </div>
        </div>
      )}
      {intakeOpen && (
        <StockIntakeSheet items={shopping.filter(s => s.checked)} onClose={() => setIntakeOpen(false)}
          onDone={() => { setIntakeOpen(false); onExit(); }} />
      )}
    </div>
  );
}

function CategorySection({ cat, items, isDragOver, dragLine, onCatDragStart, onCatDragOver, onCatDrop, onCatDragEnd, dragRef, onMoveUp, onMoveDown, onDeleteAll }) {
  const { reorderItemsInCat } = useApp();
  const [open, setOpen] = useState(true);
  const [dragOverItem, setDragOverItem] = useState(null);

  const sorted   = [...items].sort((a,b) => (a.sortOrder??0) - (b.sortOrder??0));
  const allItems = [...sorted.filter(i=>!i.checked), ...sorted.filter(i=>i.checked)];

  // ── DnD articles (isolation stricte) ──────────────
  const onItemDragStart = (e, itemId) => {
    dragRef.current = { type:'item', id:itemId, catId:cat.id };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // empêche le cat dragStart de se déclencher
  };
  const onItemDragOver = (e, itemId) => {
    if (dragRef.current.type !== 'item') return; // laisser passer le cat drag
    e.preventDefault(); e.stopPropagation();
    if (dragRef.current.catId === cat.id && dragRef.current.id !== itemId)
      setDragOverItem(itemId);
  };
  const onItemDrop = (e, targetId) => {
    if (dragRef.current.type !== 'item') return; // laisser le cat drop gérer
    e.preventDefault(); e.stopPropagation();
    if (dragRef.current.catId !== cat.id) return;
    const fromId = dragRef.current.id;
    dragRef.current = { type:null, id:null, catId:null };
    setDragOverItem(null);
    if (fromId === targetId) return;

    const ids = allItems.map(i => i.id);
    // Insérer avant ou après selon Y
    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const without = ids.filter(id => id !== fromId);
    let toIdx = without.indexOf(targetId);
    if (insertAfter) toIdx += 1;
    without.splice(toIdx, 0, fromId);
    reorderItemsInCat(cat.id, without);
  };
  const onItemDragEnd = () => {
    setDragOverItem(null);
    if (dragRef.current.type === 'item') dragRef.current = { type:null, id:null, catId:null };
  };

  // Bordure indicatrice : tirets sur le bord haut ou bas selon dragLine
  const borderStyle = isDragOver
    ? dragLine === 'before'
      ? { borderTop:`2px solid ${C.accent}`, borderBottom:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }
      : { borderBottom:`2px solid ${C.accent}`, borderTop:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }
    : { border:`1px solid ${C.border}` };

  return (
    <div
      draggable
      onDragStart={onCatDragStart}
      onDragOver={onCatDragOver}
      onDrop={onCatDrop}
      onDragEnd={onCatDragEnd}
      style={{ marginBottom:7, borderRadius:10, overflow:'hidden', ...borderStyle, transition:'border 0.1s' }}
    >
      {/* En-tête */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 12px', background:C.catHdr, borderLeft:`3px solid ${C.accent}`, userSelect:'none' }}>
        <span style={{ color:C.muted, fontSize:14, cursor:'grab', paddingRight:2 }}>≡</span>
        {/* Tout supprimer la catégorie */}
        <button aria-label="Valider"
          onPointerDown={e => { e.stopPropagation(); onDeleteAll?.(); }}
          title="Tout supprimer"
          style={{
            width:22, height:22, borderRadius:'50%', border:`1.5px solid ${C.green}`,
            background:'transparent', color:C.green, fontSize:11, fontWeight:700,
            cursor:'pointer', lineHeight:1, padding:0, flexShrink:0, display:'flex',
            alignItems:'center', justifyContent:'center',
          }}>✓</button>
        <span onClick={() => setOpen(o=>!o)} style={{ flex:1, display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
          <span style={{ fontSize:17 }}>{cat.emoji}</span>
          <span style={{ fontWeight:700, fontSize:14, color:C.accent }}>{cat.name}</span>
          <span style={{
            fontSize:11, fontWeight:700, color:C.onAccent,
            background:C.accent, padding:'1px 7px', borderRadius:20, marginLeft:'auto',
          }}>{items.length}</span>
          <span style={{ color:C.muted, fontSize:10 }}>{open?'▲':'▼'}</span>
        </span>
        {/* Boutons de réordonnancement */}
        <div style={{ display:'flex', flexDirection:'column', gap:1, flexShrink:0, marginLeft:4 }}>
          <button aria-label="Monter" onPointerDown={e => { e.stopPropagation(); onMoveUp?.(); }} style={{
            background: onMoveUp ? C.border : 'transparent', border:'none',
            color: onMoveUp ? C.soft : C.border, borderRadius:4,
            width:22, height:18, fontSize:10, cursor: onMoveUp ? 'pointer' : 'default',
            lineHeight:1, padding:0, fontFamily:'inherit',
          }}>▲</button>
          <button aria-label="Descendre" onPointerDown={e => { e.stopPropagation(); onMoveDown?.(); }} style={{
            background: onMoveDown ? C.border : 'transparent', border:'none',
            color: onMoveDown ? C.soft : C.border, borderRadius:4,
            width:22, height:18, fontSize:10, cursor: onMoveDown ? 'pointer' : 'default',
            lineHeight:1, padding:0, fontFamily:'inherit',
          }}>▼</button>
        </div>
      </div>

      {/* Articles */}
      {open && (
        <div style={{ background:C.bg }}>
          {allItems.map(item => (
            <ItemRow
              key={item.id} item={item}
              isDragOver={dragOverItem===item.id}
              onDragStart={e => onItemDragStart(e, item.id)}
              onDragOver={e => onItemDragOver(e, item.id)}
              onDrop={e => onItemDrop(e, item.id)}
              onDragEnd={onItemDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const { deleteShoppingItem, updateShoppingItem, addKeywordToCat, showSnack, cats } = useApp();
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty,  setEditQty]  = useState(item.qty || '');
  const [editUnit, setEditUnit] = useState(item.unit || '');
  const [editCat,  setEditCat]  = useState(item.categoryId || '');

  const sortedCats = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);

  const saveEdit = () => {
    const name = editName.trim();
    if (!name) {
      showSnack('❌ Le nom ne peut pas être vide — modification annulée');
      return;
    }
    if (!editCat) {
      showSnack('❌ Choisis une catégorie — modification annulée');
      return;
    }
    updateShoppingItem(item.id, {
      name, qty: parseFloat(editQty)||0,
      unit: editUnit, categoryId: editCat,
    });
    // Si la catégorie a changé, enregistre le nom comme mot-clé dans la nouvelle catégorie
    let kwSuffix = '';
    if (editCat !== item.categoryId) {
      const cat = cats.find(c => c.id === editCat);
      if (cat) {
        const added = addKeywordToCat(cat.id, name.toLowerCase());
        if (added) kwSuffix = ` · 🏷 "${name.toLowerCase()}" ajouté aux mots-clés de ${cat.emoji} ${cat.name}`;
      }
    }
    showSnack(`✅ "${name}" mis à jour${kwSuffix}`);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding:'8px 12px', background:C.cardHov, borderBottom:`1px solid ${C.border}22` }}>
        <div style={{ display:'flex', gap:5, marginBottom:6 }}>
          <input autoFocus value={editName} onChange={e=>setEditName(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') setEditing(false); }}
            style={{ flex:1, minWidth:0, padding:'5px 8px', background:C.bg, border:`1px solid ${C.accent}66`, borderRadius:6, color:C.text, fontSize:13, outline:'none' }}
          />
          <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)}
            style={{ width:42, flexShrink:0, padding:'5px 4px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:12, outline:'none' }}
          />
          <select value={editUnit} onChange={e=>setEditUnit(e.target.value)}
            style={{ width:46, flexShrink:0, padding:'5px 3px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:11, outline:'none' }}>
            {UNITS.map(u => <option key={u} value={u}>{u||'—'}</option>)}
          </select>
        </div>
        <select value={editCat} onChange={e=>setEditCat(e.target.value)}
          style={{ width:'100%', padding:'5px 8px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:12, outline:'none', marginBottom:6 }}>
          {sortedCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <div style={{ display:'flex', gap:5 }}>
          <Btn onClick={saveEdit} variant="primary" small>✓ OK</Btn>
          <Btn onClick={() => setEditing(false)} variant="ghost" small>Annuler</Btn>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver}
      onDrop={onDrop} onDragEnd={onDragEnd}
      style={{
        display:'flex', alignItems:'center', gap:7, padding:'10px 12px',
        borderBottom:`1px solid ${C.border}22`,
        opacity: item.checked ? 0.42 : 1, transition:'all 0.12s',
        borderTop: isDragOver ? `2px solid ${C.accent}88` : '2px solid transparent',
      }}
    >
      <span style={{ color:C.border, fontSize:12, cursor:'grab', flexShrink:0, userSelect:'none' }}>⋮⋮</span>
      <button onClick={() => deleteShoppingItem(item.id)} style={{
        width:20, height:20, borderRadius:'50%', flexShrink:0,
        background: item.checked ? C.green : 'transparent',
        border:`2px solid ${item.checked ? C.green : C.ring}`,
        color:C.onAccent, cursor:'pointer', fontSize:11,
        display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
      }}>
        {item.checked ? '✓' : ''}
      </button>
      <span onClick={() => !item.checked && setEditing(true)} style={{
        flex:1, color:C.text, fontSize:13, lineHeight:1.3, textAlign:'center',
        textDecoration: item.checked ? 'line-through' : 'none',
        cursor: item.checked ? 'default' : 'pointer',
      }}>{item.name}</span>
      {item.fromRecipeId && <span style={{ fontSize:11, color:C.accent, flexShrink:0 }}>📅</span>}
      {item.qty > 0 && (
        <span onClick={() => !item.checked && setEditing(true)} style={{
          color:C.hi, fontSize:13, flexShrink:0, cursor: item.checked?'default':'pointer',
        }}>{item.qty}{item.unit?' '+item.unit:''}</span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  STATS TAB
// ══════════════════════════════════════════════════════
function StatsTab() {
  const { recipes, meals } = useApp();
  const [assignFromStats, setAssignFromStats] = useState(null);
  const [viewFromStats,   setViewFromStats]   = useState(null);

  // ── Calculs de base ──
  const favCount     = recipes.filter(r => r.favorite).length;
  const totalPersons = meals.reduce((s, m) => s + (m.persons || 0), 0);
  const activeWeeks  = new Set(meals.map(m => m.weekKey)).size;

  const recipeMeals = meals.filter(m => m.recipeId); // exclut les repas personnalisés
  const recipeCount   = {};
  const recipePersons = {};
  const recipeLastTs  = {};
  recipeMeals.forEach(m => {
    recipeCount[m.recipeId]   = (recipeCount[m.recipeId]   || 0) + 1;
    recipePersons[m.recipeId] = (recipePersons[m.recipeId] || 0) + (m.persons || 0);
    if (m.done && (m.addedAt || 0) > (recipeLastTs[m.recipeId] || 0))
      recipeLastTs[m.recipeId] = m.addedAt;
  });
  const sortedByCount = Object.entries(recipeCount).sort(([,a],[,b]) => b-a);
  const favRecipe  = sortedByCount[0] ? recipes.find(r => r.id === sortedByCount[0][0]) : null;
  const top5 = sortedByCount.slice(0,5)
    .map(([id,n]) => ({ r: recipes.find(x => x.id === id), n, persons: recipePersons[id]||0 }))
    .filter(x => x.r);

  // Répartition tags
  const tagCount = {};
  recipeMeals.forEach(m => {
    const r = recipes.find(x => x.id === m.recipeId);
    (r?.tags||[]).forEach(t => { tagCount[t] = (tagCount[t]||0)+1; });
  });
  const topTags    = Object.entries(tagCount).sort(([,a],[,b]) => b-a).slice(0,8);
  const maxTagCnt  = topTags[0]?.[1] || 1;

  // ── Activité : 8 dernières semaines en bar chart ──
  const cw = getISOWeekKey();
  const activityWeeks = Array.from({ length:8 }, (_, i) => {
    const key   = shiftWeek(cw, i - 7);
    const count = meals.filter(m => m.weekKey === key).length;
    const start = getWeekStart(key);
    const label = start.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
    return { key, label, count };
  });
  const maxActivity = Math.max(...activityWeeks.map(w => w.count), 1);

  // ── Recettes jamais planifiées ──
  const usedIds      = new Set(recipeMeals.map(m => m.recipeId));
  const neverPlanned = recipes
    .filter(r => !usedIds.has(r.id))
    .sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });

  const fmtDate = ts => ts
    ? new Date(ts).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
    : null;

  return (
    <div style={{ padding:14 }}>
      {meals.length === 0 && <EmptyState icon="📊" text="Planifiez des repas pour voir des statistiques" />}

      {/* ── 3 KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
        <KpiCard icon="📖" value={recipes.length} label="Recettes"    sub={`dont ${favCount} ⭐`}          color={C.accent} />
        <KpiCard icon="🍽"  value={meals.length}   label="Repas"       sub={`${totalPersons} portions`}      color={C.green} />
        <KpiCard icon="📅" value={activeWeeks}    label="Semaines"    sub="avec repas"                       color={C.orange} />
      </div>

      {/* ── Activité 8 semaines — bar chart ── */}
      {meals.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            🗓 Activité — 8 dernières semaines
          </div>
          {activityWeeks.map(({ key, label, count }) => {
            const isCurrent = key === cw;
            return (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <span style={{
                  fontSize:11, flexShrink:0, width:52, textAlign:'right',
                  color: isCurrent ? C.accent : C.muted,
                  fontWeight: isCurrent ? 700 : 400,
                }}>{isCurrent ? '▶ ' + label : label}</span>
                <div style={{ flex:1, height:16, background:C.border, borderRadius:4, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:4, transition:'width 0.5s',
                    width: count > 0 ? `${(count / maxActivity) * 100}%` : '0%',
                    background: isCurrent
                      ? `linear-gradient(90deg, ${C.accentDk}, ${C.accent})`
                      : `${C.accent}8C`,
                  }} />
                </div>
                <span style={{ fontSize:12, color: count>0 ? C.text : C.muted, width:16, textAlign:'right', flexShrink:0, fontWeight: count>0 ? 600 : 400 }}>
                  {count || '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recette favorite enrichie ── */}
      {favRecipe && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            🏆 Recette la plus cuisinée
          </div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <span style={{ fontSize:40, flexShrink:0 }}>{favRecipe.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:3 }}>{favRecipe.name}</div>
              <Stars value={favRecipe.rating} small />
              <div style={{ fontSize:12, color:C.muted, marginTop:5, lineHeight:1.7 }}>
                Planifiée <span style={{ color:C.accent, fontWeight:700 }}>{sortedByCount[0][1]}×</span>
                {recipePersons[favRecipe.id] > 0 && (
                  <span> · <span style={{ color:C.text }}>{recipePersons[favRecipe.id]}</span> portions</span>
                )}
                {recipeLastTs[favRecipe.id] && (
                  <span> · dernière fois le <span style={{ color:C.text }}>{fmtDate(recipeLastTs[favRecipe.id])}</span></span>
                )}
              </div>
              {(favRecipe.tags||[]).length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:7 }}>
                  {favRecipe.tags.map(t => (
                    <span key={t} style={{ background:C.accentBg, color:C.accent, fontSize:11, padding:'2px 8px', borderRadius:20 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top 5 avec portions ── */}
      {top5.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            📊 Recettes les plus cuisinées
          </div>
          {top5.map(({ r, n, persons }) => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{r.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:6 }}>{r.name}</span>
                  <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>{n}× · {persons}p</span>
                </div>
                <div style={{ height:5, background:C.border, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, transition:'width 0.6s',
                    background:`linear-gradient(90deg, ${C.accentDk}, ${C.accent})`,
                    width:`${(n/top5[0].n)*100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Répartition par tags (barres horizontales) ── */}
      {topTags.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            🏷 Répartition par type de plat
          </div>
          {topTags.map(([tag, count]) => (
            <div key={tag} style={{ marginBottom:9 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:12, color:C.text }}>{tag}</span>
                <span style={{ fontSize:11, color:C.muted }}>{count} repas</span>
              </div>
              <div style={{ height:7, background:C.border, borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:4, transition:'width 0.6s',
                  background:`linear-gradient(90deg, ${C.accentDk}, ${C.green})`,
                  width:`${(count/maxTagCnt)*100}%`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recettes jamais planifiées ── */}
      {neverPlanned.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>
            💤 Jamais planifiées
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
            {neverPlanned.length} recette{neverPlanned.length>1?'s':''} en attente de leur première fois.
          </div>
          {neverPlanned.map((r, i) => (
            <div key={r.id} style={{
              display:'flex', alignItems:'center', gap:9, padding:'7px 0',
              borderTop: i>0 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize:18 }}>{r.emoji}</span>
              <span
                onClick={() => setViewFromStats(r)}
                style={{ fontSize:12, color:C.soft, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}
              >{r.name}</span>
              {r.favorite && <span style={{ fontSize:12 }}>⭐</span>}
              {(r.tags||[]).length > 0 && (
                <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>{r.tags[0]}</span>
              )}
              <button onClick={() => setAssignFromStats(r)} style={{
                background:C.accentBg, border:`1px solid ${C.accent}44`,
                color:C.accent, borderRadius:8, padding:'4px 9px',
                cursor:'pointer', fontSize:11, fontWeight:600, flexShrink:0,
              }}>📅</button>
            </div>
          ))}
        </div>
      )}

      {/* Fiche recette depuis les stats */}
      {viewFromStats && (
        <RecipeDetail recipe={recipes.find(r => r.id === viewFromStats.id) || viewFromStats}
          onClose={() => setViewFromStats(null)}
          onEdit={null} onDelete={null} onDuplicate={null}
        />
      )}

      {/* Modal d'affectation depuis les stats */}
      {assignFromStats && (
        <AssignToWeekModal
          recipe={assignFromStats}
          viewPortions={assignFromStats.portions || 4}
          onClose={() => setAssignFromStats(null)}
        />
      )}
    </div>
  );
}

function KpiCard({ icon, value, label, sub, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
      <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:24, fontWeight:800, color:color||C.text, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:3, lineHeight:1.3 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:2, opacity:0.75 }}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  OPTIONS TAB — menu liste + navigation par section
// ══════════════════════════════════════════════════════
function SettingsSectionShell({ title, onBack, children }) {
  useBackHandler(onBack);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:C.bg, overflowY:'auto', animation:'fadeIn 0.18s' }}>
      <div style={{
        background:C.card, borderBottom:`1px solid ${C.border}`,
        padding:'9px 14px', display:'flex', alignItems:'center', gap:10,
        position:'sticky', top:0, zIndex:10,
      }}>
        <Btn onClick={onBack} small>← Retour</Btn>
        <span style={{ fontWeight:700, color:C.text, fontSize:15 }}>{title}</span>
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

const SETTINGS_SECTION_TITLES = {
  planning:   '📅 Vue du planning',
  foyer:      '👥 Taille du foyer',
  categories: '🛒 Catégories de courses',
  tags:       '🏷 Tags des recettes',
  cantine:    '🏫 Menus cantine',
  apparence:  '🎨 Apparence',
  sauvegarde: '💾 Sauvegarde & Restauration',
  apropos:    'ℹ️ À propos',
};

function SettingsTab() {
  const { settings, cats, cantine, recipes } = useApp();
  const [activeSection, setActiveSection] = useState(null);
  const nTags = useMemo(() => new Set(recipes.flatMap(r => r.tags || [])).size, [recipes]);

  const weeksLabel = (settings.weeksToShow || 0) === 0 ? 'vue annuelle' : `${settings.weeksToShow} semaines`;
  const rows = [
    { id:'planning',   emoji:'📅', title:'Vue du planning',          desc:`Actuellement : ${weeksLabel}` },
    { id:'foyer',      emoji:'👥', title:'Taille du foyer',           desc:`${settings.householdSize || 6} personnes par défaut` },
    { id:'categories', emoji:'🛒', title:'Catégories de courses',    desc:`${cats.length} catégorie${cats.length!==1?'s':''} · ordre, mots-clés` },
    { id:'tags',       emoji:'🏷', title:'Tags des recettes',         desc: nTags ? `${nTags} tag${nTags!==1?'s':''} · renommer, fusionner, supprimer` : 'Aucun tag pour le moment' },
    { id:'cantine',    emoji:'🏫', title:'Menus cantine',             desc: cantine.length ? `${cantine.length} jour${cantine.length!==1?'s':''} enregistré${cantine.length!==1?'s':''}` : 'Aucun menu enregistré' },
    { id:'apparence',  emoji:'🎨', title:'Apparence',                 desc:`Thème : ${(THEMES[settings.theme] || THEMES.classic).label}` },
    { id:'sauvegarde', emoji:'💾', title:'Sauvegarde & Restauration', desc:'Export et import JSON complet' },
    { id:'apropos',    emoji:'ℹ️', title:'À propos',                  desc:`Version ${VERSION} · historique des changements` },
  ];

  if (activeSection) {
    return (
      <SettingsSectionShell title={SETTINGS_SECTION_TITLES[activeSection]} onBack={() => setActiveSection(null)}>
        {activeSection === 'planning'   && <SettingsPlanningSection />}
        {activeSection === 'foyer'      && <SettingsFoyerSection />}
        {activeSection === 'categories' && <SettingsCategoriesSection />}
        {activeSection === 'tags'       && <SettingsTagsSection />}
        {activeSection === 'cantine'    && <SettingsCantineSection />}
        {activeSection === 'apparence'  && <SettingsAppearanceSection />}
        {activeSection === 'sauvegarde' && <SettingsBackupSection />}
        {activeSection === 'apropos'    && <SettingsAboutSection />}
      </SettingsSectionShell>
    );
  }

  return (
    <div style={{ padding:16 }}>
      {rows.map(s => (
        <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
          display:'flex', alignItems:'center', gap:12, width:'100%',
          background:C.card, border:`1px solid ${C.border}`, borderRadius:C.rBig,
          padding:'14px', marginBottom:10, cursor:'pointer', textAlign:'left', fontFamily:'inherit',
        }}>
          <span style={{ fontSize:24, flexShrink:0 }}>{s.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, color:C.text, fontSize:14 }}>{s.title}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.desc}</div>
          </div>
          <span style={{ color:C.muted, fontSize:20, flexShrink:0 }}>›</span>
        </button>
      ))}
    </div>
  );
}

function SettingsTagsSection() {
  const { recipes, renameTag, deleteTag } = useApp();
  const [editTag, setEditTag] = useState(null);
  const tags = useMemo(() => {
    const m = {};
    recipes.forEach(r => (r.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; }));
    return Object.entries(m).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
  }, [recipes]);
  const dupGroups = useMemo(() => {
    const g = {};
    tags.forEach(t => { const k = normTag(t.name); (g[k] = g[k] || []).push(t); });
    return Object.values(g).filter(a => a.length > 1);
  }, [tags]);

  if (!tags.length) return <EmptyState icon="🏷" text="Aucun tag. Ajoutes-en dans l'éditeur d'une recette." />;

  return (
    <>
      {dupGroups.map(g => (
        <div key={g[0].name} style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:8,
          background:C.orangeBg, border:`1px solid ${C.orange}44`, borderRadius:C.rRow,
        }}>
          <div style={{ flex:1, fontSize:12, lineHeight:1.5, color:C.soft }}>
            Ces tags se ressemblent : {g.map(t => `« ${t.name} »`).join(' et ')}
          </div>
          <Btn small variant="orange" onClick={() => renameTag(g.slice(1).map(t => t.name), g[0].name)}>Fusionner</Btn>
        </div>
      ))}
      <div style={{ fontSize:11, color:C.muted, letterSpacing:'0.05em', fontWeight:600, padding:'2px 4px 6px' }}>
        {tags.length} TAG{tags.length>1?'S':''} · TAP POUR MODIFIER
      </div>
      {tags.map(t => (
        <button key={t.name} onClick={() => setEditTag(t)} style={{
          display:'flex', alignItems:'center', gap:10, width:'100%', minHeight:40, padding:'6px 12px',
          marginBottom:5, background:C.card, border:`1px solid ${C.border}`, borderRadius:C.rRow,
          cursor:'pointer', fontFamily:'inherit', textAlign:'left',
        }}>
          <span style={{ fontSize:13, color:C.text, background:C.border, borderRadius:20, padding:'2px 10px' }}>{t.name}</span>
          <span style={{ flex:1, fontSize:12, color:C.muted }}>{t.count} recette{t.count>1?'s':''}</span>
          <span style={{ color:C.muted, fontSize:18 }}>›</span>
        </button>
      ))}
      {editTag && (
        <TagEditSheet
          tag={editTag}
          others={tags.filter(t => t.name !== editTag.name)}
          onClose={() => setEditTag(null)}
          onRename={(to) => { renameTag([editTag.name], to); setEditTag(null); }}
          onDelete={() => { deleteTag(editTag.name); setEditTag(null); }}
        />
      )}
    </>
  );
}

function TagEditSheet({ tag, others, onClose, onRename, onDelete }) {
  const [name, setName] = useState(tag.name);
  const clean  = name.trim();
  const target = others.find(o => normTag(o.name) === normTag(clean) && o.name !== tag.name);
  const unchanged = !clean || clean === tag.name;
  return (
    <BottomSheet title={`Modifier « ${tag.name} »`} onClose={onClose}>
      <div style={{ padding:'14px 18px 18px' }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Nom</div>
        <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle()} aria-label="Nom du tag" />
        {others.length > 0 && (<>
          <div style={{ fontSize:12, color:C.muted, margin:'14px 0 6px' }}>
            Ou fusionner dans un tag existant ({tag.count} recette{tag.count>1?'s':''} concernée{tag.count>1?'s':''})
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {others.map(o => {
              const on = o.name === (target && target.name);
              return (
                <button key={o.name} onClick={() => setName(o.name)} style={{
                  fontSize:13, padding:'5px 12px', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
                  background: on ? C.accentDk : C.border, color: on ? C.onAccent : C.text,
                  border:'1px solid transparent',
                }}>{o.name}</button>
              );
            })}
          </div>
        </>)}
        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          <Btn variant="danger" onClick={onDelete} style={{ flex:1, justifyContent:'center' }}>Supprimer</Btn>
          <Btn variant="primary" disabled={unchanged} onClick={() => onRename(target ? target.name : clean)} style={{ flex:2, justifyContent:'center' }}>
            {target ? `Fusionner dans « ${target.name} »` : 'Renommer'}
          </Btn>
        </div>
      </div>
    </BottomSheet>
  );
}

function SettingsPlanningSection() {
  const { settings, updSettings } = useApp();
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {[
        { v:0,  l:'📅 Vue annuelle' },
        { v:4,  l:'4 sem.' },
        { v:8,  l:'8 sem.' },
        { v:13, l:'13 sem.' },
      ].map(({ v, l }) => {
        const active = (settings.weeksToShow || 0) === v;
        return (
          <button key={v} onClick={() => updSettings({ weeksToShow: v })} style={{
            background: active ? C.accentBg : C.border,
            color:      active ? C.accent   : C.muted,
            border:     active ? `1px solid ${C.accent}44` : '1px solid transparent',
            borderRadius:20, padding:'6px 14px', fontSize:12,
            cursor:'pointer', fontWeight: active ? 700 : 400,
          }}>{active && '✓ '}{l}</button>
        );
      })}
    </div>
  );
}

function SettingsFoyerSection() {
  const { settings, updSettings } = useApp();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:13, color:C.muted, flex:1 }}>
        Nombre de personnes par défaut pour les repas planifiés
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button aria-label="Moins de personnes" onClick={() => updSettings({ householdSize: Math.max(1, (settings.householdSize||6) - 1) })} style={{
          background:C.border, border:'none', color:C.text,
          width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:18, lineHeight:1,
        }}>−</button>
        <span style={{ fontWeight:700, fontSize:18, color:C.accent, minWidth:28, textAlign:'center' }}>
          {settings.householdSize || 6}
        </span>
        <button aria-label="Plus de personnes" onClick={() => updSettings({ householdSize: Math.min(20, (settings.householdSize||6) + 1) })} style={{
          background:C.border, border:'none', color:C.text,
          width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:18, lineHeight:1,
        }}>+</button>
      </div>
    </div>
  );
}

const THEME_DESC = {
  classic: 'Le thème d\'origine : bleu nuit, en-tête et barre du bas colorés.',
  minuit:  'Gris neutre et vert menthe, grands titres, barre du bas flottante, coins plus arrondis.',
};

function SettingsAppearanceSection() {
  const { settings, updSettings, showSnack } = useApp();
  const current = THEMES[settings.theme] ? settings.theme : 'classic';
  return (
    <div>
      {THEME_IDS.map(id => {
        const T = THEMES[id];
        const active = current === id;
        return (
          <button key={id} onClick={() => {
            if (active) return;
            updSettings({ theme: id });
            showSnack(`🎨 Thème ${T.label} appliqué`);
          }} style={{
            display:'block', width:'100%', textAlign:'left', fontFamily:'inherit', cursor:'pointer',
            background: active ? C.accentBg : C.card,
            border: `1px solid ${active ? C.accent : C.border}`,
            borderRadius:C.rBig, padding:14, marginBottom:10,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                border:`2px solid ${active ? C.accent : C.ring}`,
                background: active ? C.accent : 'transparent',
                color:C.onAccent, fontSize:12, textAlign:'center', lineHeight:'18px',
              }}>{active ? '✓' : ''}</div>
              <span style={{ fontWeight:700, fontSize:15, color:C.text, flex:1 }}>{T.label}</span>
              {active && <span style={{ fontSize:12, color:C.accent }}>Actif</span>}
            </div>
            {/* Aperçu : fond, carte, accent */}
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:10, marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Aperçu</div>
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rRow, padding:'8px 10px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:16, height:16, borderRadius:'50%', background:T.green, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:12, color:T.text }}>Gratin de courgettes</span>
                <span style={{ fontSize:11, color:T.onAccent, background:T.accentDk, borderRadius:T.rBtn, padding:'3px 10px' }}>Ajouter</span>
              </div>
            </div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{THEME_DESC[id]}</div>
          </button>
        );
      })}
      <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
        Le changement est immédiat et réversible. Tes données ne sont pas touchées.
      </div>
    </div>
  );
}

function SettingsCategoriesSection() {
  const { cats, shopping, reorderCats } = useApp();
  const [editCat,  setEditCat]  = useState(null);
  const [addOpen,  setAddOpen]  = useState(false);
  const [testName, setTestName] = useState('');
  const [dragId,   setDragId]   = useState(null);
  const [overId,   setOverId]   = useState(null);
  const [overPos,  setOverPos]  = useState('before');
  const sorted = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);

  // Nombre d'articles de la liste actuelle par catégorie
  const counts = useMemo(() => {
    const m = {};
    shopping.forEach(s => { m[s.categoryId] = (m[s.categoryId] || 0) + 1; });
    return m;
  }, [shopping]);

  // « Où serait rangé cet article ? » — même logique que l'ajout manuel
  const testTrim = testName.trim();
  const testResult = useMemo(() => {
    if (!testTrim) return null;
    const low  = testTrim.toLowerCase();
    const cat  = cats.find(c => c.id === categorize(testTrim, cats));
    const matched = hasKeywordMatch(testTrim, cats);
    const kw = matched ? cat?.kw?.find(k => matchesKeyword(low, k.toLowerCase())) : null;
    return { cat, matched, kw };
  }, [testTrim, cats]);

  // ── Glisser-déposer (même principe que dans l'onglet Courses) ──
  const autoScroll = (e) => {
    const main = document.querySelector('main');
    if (!main) return;
    if (e.clientY < 120) main.scrollTop -= 14;
    else if (e.clientY > window.innerHeight - 130) main.scrollTop += 14;
  };
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    autoScroll(e);
    const r = e.currentTarget.getBoundingClientRect();
    setOverId(id);
    setOverPos(e.clientY > r.top + r.height / 2 ? 'after' : 'before');
  };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = dragId;
    setDragId(null); setOverId(null);
    if (!fromId || fromId === targetId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    const moving  = sorted.find(c => c.id === fromId);
    const without = sorted.filter(c => c.id !== fromId);
    let idx = without.findIndex(c => c.id === targetId);
    if (idx < 0 || !moving) return;
    if (after) idx += 1;
    without.splice(idx, 0, moving);
    reorderCats(without);
  };
  const onDragEnd = () => { setDragId(null); setOverId(null); };

  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

  return (
    <>
      {/* Test : où serait rangé un article ? */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:C.rBig, padding:12, marginBottom:14 }}>
        <input
          value={testName} onChange={e => setTestName(e.target.value)}
          placeholder="🔍 Tester un article (ex : mozzarella)"
          style={{
            width:'100%', padding:'9px 12px', background:C.bg, border:`1px solid ${C.border}`,
            borderRadius:C.rBtn, color:C.text, fontSize:13, outline:'none', fontFamily:'inherit',
          }}
        />
        {testResult ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap' }}>
            <span style={{
              fontSize:13, fontWeight:600, borderRadius:C.rBtn, padding:'5px 12px',
              background: testResult.matched ? C.accent : C.orangeBg,
              color:      testResult.matched ? C.onAccent : C.orange,
            }}>{testResult.cat?.emoji} {testResult.cat?.name}</span>
            <span style={{ fontSize:12, color:C.muted, flex:1, minWidth:120, lineHeight:1.4 }}>
              {testResult.matched
                ? <>Mot-clé : « {testResult.kw} »</>
                : "Aucun mot-clé ne correspond : à l'ajout, l'appli te demandera le rayon."}
            </span>
          </div>
        ) : (
          <div style={{ fontSize:11, color:C.muted, marginTop:7 }}>Vérifie dans quel rayon un article serait rangé, sans rien modifier.</div>
        )}
      </div>

      <div style={{ fontSize:11, color:C.muted, letterSpacing:'0.05em', fontWeight:600, padding:'0 4px 8px' }}>
        ORDRE DES RAYONS · MAINTIENS ⋮⋮ PUIS GLISSE
      </div>

      {sorted.map(cat => {
        const isDefault = cat.name === 'Autre';
        const nKw  = cat.kw?.length || 0;
        const nArt = counts[cat.id] || 0;
        const isOver = overId === cat.id && dragId && dragId !== cat.id;
        return (
          <div key={cat.id}
            draggable
            onDragStart={e => onDragStart(e, cat.id)}
            onDragOver={e => onDragOver(e, cat.id)}
            onDrop={e => onDrop(e, cat.id)}
            onDragEnd={onDragEnd}
            onClick={() => setEditCat(cat)}
            style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:6,
              background: dragId === cat.id ? C.cardHov : C.card,
              border:`1px solid ${C.border}`, borderRadius:C.rBig, cursor:'pointer',
              opacity: dragId === cat.id ? 0.5 : 1,
              boxShadow: isOver ? `0 ${overPos === 'before' ? '-' : ''}2px 0 ${C.accent}` : 'none',
              transition:'opacity 0.12s',
            }}>
            <svg width="16" height="22" viewBox="0 0 16 22" fill={C.muted} aria-hidden="true" style={{ flexShrink:0, cursor:'grab' }}>
              <circle cx="4" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/>
              <circle cx="4" cy="11" r="1.6"/><circle cx="12" cy="11" r="1.6"/>
              <circle cx="4" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/>
            </svg>
            <span style={{
              width:38, height:38, borderRadius:12, background:C.accentBg, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
            }}>{cat.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, color:C.text, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                {isDefault && (
                  <span style={{ fontSize:11, color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px', flexShrink:0 }}>par défaut</span>
                )}
              </div>
              <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>
                {isDefault
                  ? `Reçoit les articles sans rayon · ${plural(nArt, 'article', 'articles')}`
                  : `${plural(nKw, 'mot-clé', 'mots-clés')} · ${plural(nArt, 'article', 'articles')}`}
              </div>
            </div>
            <span style={{ color:C.muted, fontSize:22, flexShrink:0, lineHeight:1 }}>›</span>
          </div>
        );
      })}

      <button onClick={() => setAddOpen(true)} style={{
        width:'100%', marginTop:6, padding:'13px 0', background:'transparent',
        border:`1px dashed ${C.ring}`, borderRadius:C.rBig, color:C.accent,
        fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
      }}>+ Nouvelle catégorie</button>

      {editCat && <CategoryForm cat={editCat} onClose={() => setEditCat(null)} />}
      {addOpen && <CategoryForm cat={null} onClose={() => setAddOpen(false)} />}
    </>
  );
}

function SettingsCantineSection() {
  const { cantine, upsertCantineDay, upsertCantineDays, deleteCantineDay, clearCantine } = useApp();
  const [cantinePhotoOpen, setCantinePhotoOpen] = useState(false);
  const [cantineEditDate,  setCantineEditDate]  = useState(null);
  const sortedCantine = useMemo(() => [...cantine].sort((a,b) => a.date.localeCompare(b.date)), [cantine]);

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
        <Btn onClick={() => setCantinePhotoOpen(true)} variant="primary" small>📷 Importer</Btn>
      </div>
      <div style={{
        background:C.accentBg, border:`1px solid ${C.accent}33`,
        borderRadius:10, padding:'8px 12px', marginBottom:10,
        display:'flex', gap:8, alignItems:'center',
      }}>
        <span style={{ fontSize:15 }}>📷</span>
        <span style={{ fontSize:12, color:C.soft, lineHeight:1.5 }}>
          Prends une photo du menu de l'école : le texte est lu directement sur le téléphone (hors-ligne) et les jours sont ajoutés automatiquement — purement informatif, n'apparaît pas dans tes recettes, juste en rappel dans chaque semaine du Planning.
        </span>
      </div>
      {sortedCantine.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16, textAlign:'center' }}>
          <div style={{ color:C.muted, fontSize:13 }}>Aucun menu enregistré.</div>
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'4px 0', marginBottom:10 }}>
          {sortedCantine.map((c, idx) => {
            const d = new Date(c.date + 'T00:00:00');
            return (
              <div key={c.id} style={{
                display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                borderBottom: idx<sortedCantine.length-1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div onClick={() => setCantineEditDate(c.date)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
                  <div style={{ fontWeight:500, color:C.text, fontSize:13 }}>
                    {WEEKDAY_LABELS[d.getDay()-1]} {d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {c.plat || c.entree || '—'}
                  </div>
                </div>
                <button aria-label="Supprimer le menu" onClick={() => deleteCantineDay(c.date)} style={{
                  background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16, opacity:0.7, flexShrink:0,
                }}>×</button>
              </div>
            );
          })}
        </div>
      )}
      {sortedCantine.length > 0 && (
        <Btn onClick={clearCantine} variant="danger" small>🗑 Tout vider</Btn>
      )}
      {cantinePhotoOpen && (
        <CantinePhotoImportModal
          onClose={() => setCantinePhotoOpen(false)}
          upsertCantineDays={upsertCantineDays}
        />
      )}
      {cantineEditDate && (
        <CantineDayEditModal
          date={cantineEditDate}
          existing={cantine.find(c => c.date === cantineEditDate)}
          onClose={() => setCantineEditDate(null)}
          upsertCantineDay={upsertCantineDay}
        />
      )}
    </>
  );
}

function SettingsBackupSection() {
  const { recipes, meals, shopping, cats, settings, cantine, stock, importAllData, preImport, restorePreImport, showSnack } = useApp();
  const [importErr, setImportErr] = useState('');
  const [pending,   setPending]   = useState(null); // { data, info } en attente de confirmation
  const [busy,      setBusy]      = useState(false);
  const fileRef = useRef(null);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    const data = { version: VERSION, exportDate: new Date().toISOString(), recipes, meals, shopping, cats, settings, cantine, stock };
    const res = await saveTextFile(`meal-plan-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data, null, 2));
    setBusy(false);
    if (res.ok)             showSnack('✅ Sauvegarde enregistrée');
    else if (res.cancelled) showSnack('Export annulé');
    else                    showSnack(`❌ Export impossible · ${res.error || 'erreur inconnue'}`);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportErr('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      let data;
      try { data = JSON.parse(ev.target.result); }
      catch { setImportErr('Ce fichier n\u2019est pas un JSON valide.'); return; }
      const info = validateBackup(data);
      if (info.error) { setImportErr(info.error); return; }
      setPending({ data, info });
    };
    reader.onerror = () => setImportErr('Impossible de lire le fichier.');
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const { data } = pending;
    setPending(null);
    importAllData(data);
  };

  const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }); } catch { return ''; } };
  const fmtDateTime = (v) => { try { return new Date(v).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch { return ''; } };
  const current = { recipes: recipes.length, meals: meals.length, shopping: shopping.length, cats: cats.length, cantine: cantine.length, stock: stock.length };
  const LABELS = { recipes:'Recettes', meals:'Repas planifiés', shopping:'Articles de courses', cats:'Catégories', cantine:'Menus cantine', stock:'Articles en stock' };

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
      <div style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
        Exportez toutes vos données (recettes, planning, courses, catégories) dans un fichier JSON. Vous pourrez les restaurer à tout moment.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <Btn onClick={handleExport} variant="primary" disabled={busy} style={{ flex:1, justifyContent:'center' }}>
          📤 Exporter
        </Btn>
        <Btn onClick={() => fileRef.current?.click()} variant="default" style={{ flex:1, justifyContent:'center' }}>
          📥 Importer
        </Btn>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display:'none' }} />
      </div>
      {importErr && (
        <div style={{ marginTop:10, color:C.red, fontSize:12, lineHeight:1.5 }}>⚠️ {importErr}</div>
      )}
      {preImport && (
        <div style={{
          marginTop:12, padding:'10px 12px', background:C.orangeBg, border:`1px solid ${C.orange}44`,
          borderRadius:10, display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{ flex:1, fontSize:12, color:C.soft, lineHeight:1.5 }}>
            Tes données d'avant le dernier import ({fmtDateTime(preImport.date)}) sont gardées de côté.
          </div>
          <Btn onClick={restorePreImport} variant="orange" small>↩ Annuler l'import</Btn>
        </div>
      )}
      <div style={{ marginTop:12, fontSize:11, color:C.muted, lineHeight:1.6 }}>
        {recipes.length} recette{recipes.length!==1?'s':''} · {meals.length} repas · {shopping.length} article{shopping.length!==1?'s':''} · {cats.length} catégorie{cats.length!==1?'s':''}
      </div>

      {pending && (
        <BottomSheet title="Remplacer tes données ?" onClose={() => setPending(null)}>
          <div style={{ padding:'14px 18px 18px' }}>
            <div style={{ fontSize:13, color:C.soft, lineHeight:1.6, marginBottom:12 }}>
              Sauvegarde{pending.info.exportDate ? ` du ${fmtDate(pending.info.exportDate)}` : ''}{pending.info.version ? ` (v${pending.info.version})` : ''}.
              Elle va <b style={{ color:C.text }}>remplacer</b> ce que contient l'appli aujourd'hui :
            </div>
            <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', marginBottom:12 }}>
              <div style={{ display:'flex', padding:'7px 12px', fontSize:11, color:C.muted, background:C.bg }}>
                <span style={{ flex:1 }} /><span style={{ width:70, textAlign:'right' }}>Fichier</span><span style={{ width:70, textAlign:'right' }}>Actuel</span>
              </div>
              {Object.keys(pending.info.counts).map(k => (
                <div key={k} style={{ display:'flex', padding:'8px 12px', fontSize:13, borderTop:`1px solid ${C.border}` }}>
                  <span style={{ flex:1, color:C.soft }}>{LABELS[k]}</span>
                  <span style={{ width:70, textAlign:'right', color:C.text, fontWeight:600 }}>{pending.info.counts[k]}</span>
                  <span style={{ width:70, textAlign:'right', color:C.muted }}>{current[k]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:16 }}>
              Les rubriques absentes du fichier ne sont pas touchées. Tes données actuelles sont mises de côté automatiquement :
              tu pourras annuler juste après, ou plus tard depuis cet écran.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={() => setPending(null)} style={{ flex:1, justifyContent:'center' }}>Annuler</Btn>
              <Btn onClick={confirmImport} variant="danger" style={{ flex:1, justifyContent:'center' }}>Remplacer</Btn>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

const CHANGELOG = [
  ['3.9.0', 'Nouvel onglet Stock (Sec, Frigo, Congélateur, Maison) : jauges, seuils de réachat, « toujours là », dates limites, cuisiner avec ton stock · fin de courses → stock · au planning, le stock est proposé et déduit (rendu si on retire le repas)'],
  ['3.8.0', 'Tags : écran de gestion (renommer, fusionner, supprimer, doublons) · listes d\'habituels dans Courses · boutons à 2 tailles, champs et textes harmonisés, libellés d\'accessibilité'],
  ['3.7.1', 'Sécurité : écran de secours en cas de plantage · import vérifié, confirmé et annulable · export par la fenêtre « Enregistrer sous » · Annuler sur duplication de semaine et menu cantine · nettoyage du diagnostic OCR'],
  ['3.7.0', 'Catégories : liste glisser-déposer avec compteurs, test d\'un article, éditeur à pastilles, suppression annulable'],
  ['3.6.0', 'Thèmes : Classique (inchangé) et Minuit (nouveau) au choix dans Options > Apparence'],
  ['3.5.4', 'Fix plantage note sur repas libre · noms de repas sur 2 lignes · nettoyage code mort et couleurs · journal complété'],
  ['3.5.3', 'Import cantine : reconstruction des dates par la structure (5 jours consécutifs)'],
  ['3.5.2', 'Import cantine : corrections OCR (mois, jours déformés) et fusion de lignes recalibrée'],
  ['3.5.1', 'Import cantine : texte brut OCR consultable pour le diagnostic'],
  ['3.5.0', 'Options en menu liste avec sous-écrans'],
  ['3.4.2', 'Import cantine : fusion des lignes coupées et colonnes plafonnées'],
  ['3.4.1', 'Import cantine : OCR embarqué (ML Kit) corrigé pour la compilation'],
  ['3.4.0', 'Import cantine par photo avec OCR local (sans réseau ni clé API)'],
  ['3.3.1', 'Bouton photo : sélecteur de fichiers Android réparé'],
  ['3.3.0', 'Menus cantine : import par photo · affichage dans le Planning · correction par jour'],
  ['3.2.1', 'Reporter : choix des repas à reporter à la semaine suivante'],
  ['3.2.0', 'Bouton ↷ Reporter les repas non cuisinés vers la semaine suivante'],
  ['3.1.3', 'Catégorie d\'un article modifiée : mot-clé ajouté + messages succès/échec'],
  ['3.1.2', 'Ajout manuel d\'un article inconnu : fenêtre de choix de catégorie'],
  ['3.1.1', 'Saisons : toggle rapide sur chaque carte recette'],
  ['3.1.0', 'Saisons des recettes (4 saisons + Mixte) · filtre · tirage 🎲 pondéré par la saison'],
  ['3.0.7', 'Fix catégorisation recette planning : enregistrement du mot-clé à la confirmation'],
  ['3.0.6', 'Fix catégorisation recette planning : multiCatData données brutes (plus de closure stale)'],
  ['3.0.5', 'Fix catégorisation : handleAdd sans catId · mergeOrAdd préserve catégorie existante'],
  ['3.0.4', 'Score recettes basé sur date de cuisson (✓ coché) et non date de planification'],
  ['3.0.3', 'Onglets Salé/Sucré · toggle 🧂🍰 sur chaque carte · classification rapide'],
  ['3.0.2', 'En-têtes catégories courses : fond accentué + bordure gauche'],
  ['3.0.1', 'Fix updateMealPersons repas personnalisés (null recipeId)'],
  ['3.0.0', 'Ingrédients dans mode cuisine · Filtre tags AND'],
  ['2.9.6', 'Retirer ingrédients de la liste depuis fiche recette'],
  ['2.9.5', 'url dans snapshot · suppression console.error · INIT_ dead code · onDuplicate explicite'],
  ['2.9.4', 'Badge ingrédients manquants · Timer mode cuisine'],
  ['2.9.3', 'Fix saut de ligne avertissement éditeur · Tap zone étape mode cuisine'],
  ['2.9.2', 'Ajouter à la liste depuis fiche recette · Mode cuisine plein écran'],
  ['2.9.1', 'Fix planningTarget mode rolling · Orphelins search · scores custom meals'],
  ['2.9.0', 'Repas sans recette · Recherche courses · Navigation semaine depuis WeeksBadge'],
  ['2.8.0', 'Dupliquer → éditeur · Recatégorisation rétroactive · Annuler import · Tags RecipeCard · Tri jamais planifiées · Vider à la sortie mode courses'],
  ['2.7.8', 'Dupliquer une recette · Partage liste courses enrichi'],
  ['2.7.7', 'Tags RecipePicker dans les deux modes · Stats jamais planifiées → fiche recette'],
  ['2.7.6', 'Taille du foyer configurable dans Options (défaut : 6)'],
  ['2.7.5', 'RecipeEditor avertissement changements non sauvegardés · viewRecipe live'],
  ['2.7.4', 'Suppression doubles confirmations deleteRecipe + clearAll'],
  ['2.7.3', 'Retour inter-onglets via historique de navigation'],
  ['2.7.2', 'Bouton retour Android via bridge JS (fix file:// popstate)'],
  ['2.7.1', 'Bouton retour Android (toutes modals/overlays)'],
  ['2.7.0', 'fromMealId (rescaling précis) · deleteRecipe undo · RecipeCard direct delete · RecipeDetail favori inline · null guards onEdit/onDelete · MIN_YEAR dynamique · weeksToShow · recipeScore O(N)'],
  ['2.6.6', 'Alerte re-planification semaine consécutive'],
  ['2.6.5', 'Suggestions recettes (tri ancienneté + filtres tags) · 🎲 tirage pondéré'],
  ['2.6.4', 'Mode courses (overlay) · Note par repas · Tap = suppression en mode courses'],
  ['2.6.3', 'Stats bar chart · Jamais planifiées → 📅 direct · Import timeout 30s + chrono'],
  ['2.6.2', 'Tri recettes · Recherche par ingrédient · Feedback stepper 👥'],
  ['2.6.1', 'Suppression parseHtml (code mort) · deleteMeal → snack + Annuler'],
  ['2.6.0', 'Badge semaines planifiées dans la fiche recette'],
  ['2.5.9', 'Gestion singulier/pluriel français (mots-clés + fusion)'],
  ['2.5.8', 'Snacks succès/erreur sur toutes les actions · Détection quota localStorage'],
  ['2.5.7', 'Snacks d\'erreur/info · unités incompatibles · ingrédients non ajoutés'],
  ['2.5.6', 'Info-bulles fusion · Info-bulles mot-clé automatique'],
  ['2.5.5', 'Fusion avec conversion d\'unités (g/kg, ml/cl/L) · Fusion sur articles recette'],
  ['2.5.4', 'Fusion automatique des doublons dans la liste · Mise à jour mot-clé à l\'édition de catégorie'],
  ['2.5.3', 'Mot-clé auto lors de l\'assignation d\'un article à une catégorie'],
  ['2.5.2', 'Fix double ajout repas/ingrédients depuis fiche recette'],
  ['2.5.1', 'Import HTML brut (Overblog, Canalblog…) · Fix @type URL schema · Extraction JSON Claude robustifiée'],
  ['2.5.0', 'Ouvrir recette depuis planning · UX courses · Corrections'],
  ['2.4.0', 'Catégorisation intelligente · Doublon import · Ordre rayons'],
  ['2.3.0', 'Stepper portions · Multi-tags · Filtre ingrédients depuis recette'],
  ['2.2.0', 'Persistance localStorage · Emoji libre'],
  ['2.1.0', 'Édition catégories · Export/Import JSON'],
  ['2.0.0', 'IngredientParser · EmojiGuesser · Jow API'],
  ['1.9.0', 'Import recettes depuis sites web'],
  ['1.8.0', 'Planning annuel · compacité · multi-ajout'],
];

function SettingsAboutSection() {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontWeight:800, fontSize:17, color:C.text }}>🍽 Meal Plan</span>
        <span style={{ background:C.accentBg, color:C.accent, fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:20, border:`1px solid ${C.accent}33` }}>v{VERSION}</span>
      </div>
      <p style={{ color:C.muted, fontSize:13, lineHeight:1.7, marginBottom:12 }}>
        Application de planification de repas hebdomadaire.
      </p>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
        <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:6 }}>Historique</div>
        <div style={{ fontSize:11, color:C.muted, lineHeight:1.9 }}>
          {CHANGELOG.map(([v, t]) => (
            <div key={v}><span style={{ color:C.accent }}>{v}</span> — {t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Emojis proposés pour une catégorie de courses (la saisie libre reste possible)
const CAT_EMOJIS_QUICK = ['🥩','🥦','🧀','🥚','🍝','🫙'];
const CAT_EMOJIS_ALL = [
  '🥩','🍗','🐟','🦐','🥦','🥕','🍅','🍎','🍌','🍇','🥬','🍋',
  '🧀','🥛','🧈','🥚','🍝','🍚','🥖','🥐','🫙','🧂','🍯','🥫',
  '🍶','🥤','🍷','☕','🧃','🍫','🍪','🍦','🧊','🌿','🧴','🧻',
  '🧼','🐶','🐱','👶','💊','🛍️','📦','🎉',
];

/** Mots-clés saisis → liste propre (minuscules, sans doublon, séparés par , ; ou retour ligne) */
function splitKeywords(raw) {
  return String(raw).split(/[,;\n]+/).map(k => k.trim().toLowerCase()).filter(Boolean);
}

/** Création / édition d'une catégorie de courses (feuille du bas) */
function CategoryForm({ cat, onClose }) {
  const { cats, shopping, addCat, updateCat, deleteCat, showSnack } = useApp();
  const isEdit = !!cat;
  const isDefault = cat?.name === 'Autre';
  const [emoji,      setEmoji]      = useState(cat?.emoji || '📦');
  const [name,       setName]       = useState(cat?.name || '');
  const [kws,        setKws]        = useState(cat?.kw || []);
  const [kwInput,    setKwInput]    = useState('');
  const [showAllKw,  setShowAllKw]  = useState(false);
  const [emojiOpen,  setEmojiOpen]  = useState(false);
  const [sz,         setSz]         = useState(cat ? catStockZone(cat) : 'none'); // zone de stock proposée en fin de courses

  const inp = fieldStyle({ style:{ borderRadius:C.rBtn + 3, fontFamily:'inherit' } });

  // Ajoute un ou plusieurs mots-clés ; retourne la liste à jour
  const addKw = (raw) => {
    const incoming = splitKeywords(raw);
    const next = [...kws];
    incoming.forEach(k => { if (!next.includes(k)) next.push(k); });
    if (next.length !== kws.length) setKws(next);
    setKwInput('');
    return next;
  };
  const removeKw = (k) => setKws(list => list.filter(x => x !== k));

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const finalKws = kwInput.trim() ? addKw(kwInput) : kws;
    if (isEdit) {
      const moved = updateCat({ ...cat, emoji, name:trimmed, kw:finalKws, stockZone: sz });
      // updateCat affiche déjà son propre message (avec Annuler) quand des articles sont déplacés
      if (!moved) showSnack('✅ Catégorie mise à jour');
    } else {
      addCat({ name:trimmed, emoji, kw:finalKws, stockZone: sz });
      showSnack(`✅ Catégorie "${trimmed}" créée`);
    }
    onClose();
  };

  const remove = () => {
    deleteCat(cat.id);   // message avec bouton Annuler
    onClose();
  };

  const quick = CAT_EMOJIS_QUICK.includes(emoji) ? CAT_EMOJIS_QUICK : [emoji, ...CAT_EMOJIS_QUICK.slice(0, 5)];
  const visibleKws = showAllKw ? kws : kws.slice(0, 8);
  const hiddenCount = kws.length - visibleKws.length;
  const nArt = isEdit ? shopping.filter(s => s.categoryId === cat.id).length : 0;
  const fbCat = isEdit
    ? (cats.find(c => c.id !== cat.id && (!c.kw || c.kw.length === 0)) || cats.find(c => c.id !== cat.id))
    : null;

  const emojiChip = (e) => (
    <button key={e} onClick={() => setEmoji(e)} style={{
      width:38, height:38, borderRadius:12, fontSize:19, cursor:'pointer', fontFamily:'inherit',
      background: emoji === e ? C.accentBg : C.bg,
      border:`1px solid ${emoji === e ? C.accent : C.border}`,
      display:'flex', alignItems:'center', justifyContent:'center', padding:0,
    }}>{e}</button>
  );

  return (
    <BottomSheet title={isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <div style={{ padding:16 }}>
        {/* Emoji + nom */}
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
          <span style={{
            width:56, height:56, borderRadius:18, background:C.accentBg, border:`1px solid ${C.accent}44`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0,
          }}>{emoji}</span>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:4 }}>Nom</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Surgelés, Épices, Apéro…" style={inp} />
          </div>
        </div>

        {/* Zone de stock proposée quand on a acheté un article de cette catégorie */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>🥫 Rangé dans le stock en fin de courses</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <StockPill on={sz === 'none'} color={C.soft} onClick={() => setSz('none')}>Pas suivi</StockPill>
            {STOCK_ZONES.map(zz => <StockPill key={zz.id} on={sz === zz.id} color={zz.color} onClick={() => setSz(zz.id)}>{zz.icon} {zz.label}</StockPill>)}
          </div>
        </div>

        {/* Emojis suggérés */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: emojiOpen ? 8 : 18 }}>
          {quick.map(emojiChip)}
          <button onClick={() => setEmojiOpen(o => !o)} style={{
            height:38, padding:'0 12px', borderRadius:12, fontSize:12, cursor:'pointer', fontFamily:'inherit',
            background:'transparent', border:`1px solid ${C.border}`, color:C.muted,
          }}>{emojiOpen ? 'Moins' : 'Plus'}</button>
        </div>
        {emojiOpen && (
          <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:C.rBtn + 3, padding:10, marginBottom:18 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>{CAT_EMOJIS_ALL.map(emojiChip)}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
              <span style={{ fontSize:12, color:C.muted }}>Autre emoji</span>
              <input value="" onChange={e => { const v = e.target.value.trim(); if (v) setEmoji(Array.from(v).slice(0, 2).join('')); }}
                placeholder="Colle-le ici" style={{ ...inp, width:110, padding:'6px 10px', fontSize:13 }} />
            </div>
          </div>
        )}

        {/* Mots-clés */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
          <span style={{ fontSize:14, color:C.text, fontWeight:600 }}>🔑 Mots-clés</span>
          <span style={{ fontSize:12, color:C.muted }}>{kws.length}</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', background:C.bg, border:`1px solid ${C.border}`, borderRadius:C.rBtn + 3, padding:'4px 4px 4px 12px', marginBottom:10 }}>
          <input
            value={kwInput}
            onChange={e => {
              const v = e.target.value;
              if (/[,;\n]/.test(v)) addKw(v); else setKwInput(v);
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw(kwInput); } }}
            placeholder="Ajouter un mot-clé…"
            style={{ flex:1, minWidth:0, background:'transparent', border:'none', outline:'none', color:C.text, fontSize:14, padding:'6px 0', fontFamily:'inherit' }}
          />
          <button onClick={() => addKw(kwInput)} aria-label="Ajouter le mot-clé" style={{
            width:34, height:34, borderRadius:'50%', border:'none', cursor:'pointer', fontSize:20, lineHeight:1,
            background:C.accentDk, color:C.onAccent, flexShrink:0, fontFamily:'inherit',
          }}>+</button>
        </div>
        {kws.length === 0 ? (
          <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Aucun mot-clé pour l'instant.</div>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:6 }}>
            {visibleKws.map(k => (
              <span key={k} style={{
                display:'inline-flex', alignItems:'center', gap:4, fontSize:13, color:C.text,
                background:C.cardHov, borderRadius:14, padding:'5px 6px 5px 12px',
              }}>
                {k}
                <button onClick={() => removeKw(k)} aria-label={`Retirer ${k}`} style={{
                  background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 4px', fontFamily:'inherit',
                }}>×</button>
              </span>
            ))}
            {hiddenCount > 0 && (
              <button onClick={() => setShowAllKw(true)} style={{
                fontSize:12, color:C.accent, background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:14, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit',
              }}>Voir les {hiddenCount} autres</button>
            )}
            {showAllKw && kws.length > 8 && (
              <button onClick={() => setShowAllKw(false)} style={{
                fontSize:12, color:C.muted, background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:14, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit',
              }}>Réduire</button>
            )}
          </div>
        )}
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginBottom:18 }}>
          {isDefault
            ? "« Autre » reçoit les articles qui ne correspondent à aucun mot-clé."
            : 'Un article dont le nom contient un de ces mots est rangé ici automatiquement.'}
        </div>

        <Btn onClick={save} variant="primary" disabled={!name.trim()} style={{ width:'100%', justifyContent:'center', padding:'12px 18px' }}>
          {isEdit ? 'Enregistrer' : 'Créer la catégorie'}
        </Btn>

        {isEdit && !isDefault && (
          <div style={{ textAlign:'center', marginTop:12 }}>
            <button onClick={remove} style={{
              background:'none', border:'none', color:C.red, fontSize:14, cursor:'pointer', padding:'8px 12px', fontFamily:'inherit',
            }}>Supprimer la catégorie</button>
            <div style={{ fontSize:11, color:C.muted, marginTop:2, lineHeight:1.5 }}>
              {nArt > 0 && fbCat
                ? `Les ${nArt} article${nArt > 1 ? 's' : ''} de la liste passent dans « ${fbCat.name} ». Tu peux annuler.`
                : 'Tu peux annuler juste après.'}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ══════════════════════════════════════════════════════
//  SNACKBAR
// ══════════════════════════════════════════════════════
function Snackbar() {
  const { snack, setSnack } = useApp();
  if (!snack) return null;
  return (
    <div style={{
      position:'fixed', bottom: C.modern ? 90 : 84, left:'50%', transform:'translateX(-50%)',
      background:C.snackBg, color:C.text, padding:'12px 16px',
      borderRadius:14, display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 28px rgba(0,0,0,0.5)', zIndex:600,
      animation:'slideUp 0.2s ease', maxWidth:360, width:'calc(100% - 32px)',
      border:`1px solid ${C.border}`,
    }}>
      <span style={{ flex:1, fontSize:13 }}>{snack.msg}</span>
      {snack.undo && (
        <button onClick={() => { snack.undo(); setSnack(null); }} style={{
          background:C.accent, color:C.onAccent, border:'none',
          padding:'5px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700,
        }}>Annuler</button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  STOCK — onglet garde-manger (Sec · Frigo · Congélateur · Maison)
// ══════════════════════════════════════════════════════
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

/** Emoji de la pastille d'un article : groupe (Maison), sinon emoji de sa catégorie de courses, sinon celui de la zone */
function stockEmoji(it, cats) {
  if (it.zone === 'maison') return MAISON_GROUPS.find(g => g.id === it.grp)?.icon || '🏠';
  if (hasKeywordMatch(it.name, cats)) return cats.find(c => c.id === categorize(it.name, cats))?.emoji || stockZone(it.zone).icon;
  return stockZone(it.zone).icon;
}

/** Recettes réalisables (en partie) avec le stock : ingrédients déjà là, et priorité à ce qui se périme. */
function suggestFromStock(recipes, stock) {
  const byName = new Map();
  stock.filter(s => s.zone !== 'maison' && (s.always || (s.qty || 0) > 0) && !(s.dlc && daysUntil(s.dlc) < 0))
    .forEach(s => { const k = stockNorm(s.name); if (!byName.has(k) || s.dlc) byName.set(k, s); });
  return recipes.map(r => {
    const ings = r.ingredients || [];
    if (!ings.length) return null;
    const hits = ings.filter(i => byName.has(stockNorm(i.name)));
    if (!hits.length) return null;
    const exp = [...new Set(hits.map(i => byName.get(stockNorm(i.name))).filter(s => s.dlc && daysUntil(s.dlc) <= 3).map(s => s.name))];
    const score = hits.length / ings.length + 0.3 * Math.min(exp.length, 2);
    return { recipe: r, matched: hits.length, total: ings.length, expiring: exp, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.matched - a.matched);
}

const MAISON_CATS = [
  { name:'Chiens',    emoji:'🐕', kw:['croquettes','pâtée','friandises chien','os à mâcher','antipuces','shampoing chien'] },
  { name:'Entretien', emoji:'🧽', kw:['lessive','liquide vaisselle','pastilles lave-vaisselle','éponge','javel','sopalin','essuie-tout','produit vitres','sac poubelle','adoucissant','détergent','nettoyant','dégraissant','produit sol','produit multi-usage','liquide de rinçage'] },
  { name:'Hygiène',   emoji:'🧴', kw:['shampoing','gel douche','savon','dentifrice','brosse à dents','papier toilette','papier wc','coton','déodorant','mouchoirs','rasoir','après-shampoing','cotons-tiges','lingettes','bain de bouche'] },
];

function StockPill({ on, color, onClick, children, style }) {
  const col = color || C.accent;
  return (
    <button onClick={onClick} style={{
      padding:'5px 11px', borderRadius:16, cursor:'pointer', fontSize:12, fontWeight: on ? 700 : 500,
      background: on ? col + '26' : 'transparent', color: on ? col : C.soft,
      border:`1px solid ${on ? col : C.border}`, fontFamily:'inherit', flexShrink:0, ...style,
    }}>{children}</button>
  );
}

/** Jauge à 4 segments : rouge quand c'est presque vide ou sous le seuil */
function StockGauge({ item }) {
  const z = stockZone(item.zone);
  const cap = item.zone === 'maison' ? 4 : Math.max(item.cap || 0, item.qty || 0, 0.0001);
  const pct = Math.max(0, Math.min(1, (item.qty || 0) / cap));
  const lit = (item.qty || 0) <= 0 ? 0 : Math.max(1, Math.round(pct * 4));
  const low = (item.qty || 0) <= 0 || lit <= 1 || stockNeedsRestock(item);
  const col = low ? C.red : z.color;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
      <div style={{ display:'flex', gap:2 }} aria-hidden="true">
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width:9, height:16, borderRadius:3, background: i < lit ? col : C.border, opacity: i < lit ? 1 : 0.55 }} />
        ))}
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:34, textAlign:'right' }}>
        {(item.qty || 0) <= 0 ? 'vide' : `${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}

function stockStep(it) {
  if (it.zone === 'maison') return 1;
  if (it.unit === 'g' || it.unit === 'ml') return (it.qty || 0) >= 1000 ? 250 : 100;
  return 1;
}

function StockRow({ item, onEdit, onAdjust }) {
  const { cats } = useApp();
  const z = stockZone(item.zone);
  const dn = daysUntil(item.dlc);
  const dlcCol = dn === null ? C.muted : dn <= 1 ? C.red : dn <= 3 ? C.orange : C.muted;
  const restock = stockNeedsRestock(item);
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'4px 10px', minHeight:42,
      background:C.card, border:`1px solid ${restock || (dn !== null && dn <= 1) ? C.red + '66' : C.border}`,
      borderRadius:C.rRow, marginBottom:4,
    }}>
      <div onClick={onEdit} style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{ width:30, height:30, borderRadius:8, background:z.color + '22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
          {stockEmoji(item, cats)}
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
          <div style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {item.zone !== 'maison' && <span style={{ color:C.soft }}>{fmtStockQty(item.qty, item.unit)}</span>}
            {item.min != null && <span>{item.zone !== 'maison' ? ' · ' : ''}seuil {fmtStockQty(item.min, item.unit)}</span>}
            {item.dlc && <span style={{ color:dlcCol, fontWeight: dn <= 3 ? 700 : 400 }}>{(item.zone !== 'maison' || item.min != null) ? ' · ' : ''}⏰ {fmtDlcLabel(item.dlc)}</span>}
          </div>
        </div>
        <StockGauge item={item} />
      </div>
      <div style={{ display:'flex', gap:3, flexShrink:0 }}>
        <button aria-label={`Moins de ${item.name}`} onClick={() => onAdjust(-stockStep(item))} style={stepBtn}>−</button>
        <button aria-label={`Plus de ${item.name}`}  onClick={() => onAdjust(+stockStep(item))} style={stepBtn}>+</button>
      </div>
    </div>
  );
}
const stepBtn = { width:28, height:28, borderRadius:8, border:'none', background:'rgba(128,140,170,0.18)', color:'inherit', fontSize:16, cursor:'pointer', fontFamily:'inherit', lineHeight:1 };

const STOCK_UNITS = [
  { id:'g', label:'g' }, { id:'kg', label:'kg' }, { id:'ml', label:'ml' }, { id:'L', label:'L' }, { id:'', label:'pièces' },
];

/** Fenêtre d'ajout / modification d'un article de stock */
function StockEditSheet({ item, zone: zone0, onClose }) {
  const { addStockItem, updateStockItem, deleteStockItem } = useApp();
  const isNew = !item;
  const dispUnit = !item ? 'g' : item.unit === 'g' ? (item.qty >= 1000 ? 'kg' : 'g') : item.unit === 'ml' ? (item.qty >= 1000 ? 'L' : 'ml') : (item.unit === 'q' ? '' : item.unit);
  const fac = u => (u === 'kg' || u === 'L') ? 1000 : 1;
  const [name,   setName]   = useState(item?.name || '');
  const [zone,   setZone]   = useState(item?.zone || zone0 || 'sec');
  const [grp,    setGrp]    = useState(item?.grp || 'Ménage');
  const [always, setAlways] = useState(!!item?.always);
  const [unit,   setUnit]   = useState(dispUnit);
  const [qty,    setQty]    = useState(item && !item.always && item.zone !== 'maison' ? String(r1(item.qty / fac(dispUnit))) : '');
  const [minTxt, setMinTxt] = useState(item && item.min != null && item.zone !== 'maison' ? String(r1(item.min / fac(dispUnit))) : '');
  const [level,  setLevel]  = useState(item?.zone === 'maison' ? item.qty : 4);
  const [minQ,   setMinQ]   = useState(item?.zone === 'maison' ? item.min : null);
  const [dlc,    setDlc]    = useState(item?.dlc || '');
  const maison = zone === 'maison';
  const cold = zone === 'frigo' || zone === 'congel';

  const save = () => {
    const nm = name.trim();
    if (!nm) return;
    let q = 0, u = '', mn = null;
    if (maison) { q = level; u = 'q'; mn = minQ; }
    else {
      u = unit === 'kg' ? 'g' : unit === 'L' ? 'ml' : unit;
      if (!always) { q = parseNum(qty) * fac(unit); mn = minTxt.trim() ? parseNum(minTxt) * fac(unit) : null; }
    }
    const patch = {
      name: nm, zone, grp: maison ? grp : null, qty: always ? 0 : q, unit: u, always: maison ? false : always,
      min: always ? null : mn, dlc: cold && dlc ? dlc : null,
    };
    if (isNew) addStockItem(patch);
    else updateStockItem(item.id, { ...patch, cap: Math.max(item.cap || 0, patch.qty) });
    onClose();
  };
  const lab = { fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'12px 0 6px' };
  const zc = stockZone(zone).color;

  return (
    <BottomSheet title={isNew ? '🥫 Ajouter au stock' : `${stockEmoji(item, []) } Modifier`} onClose={onClose}>
      <div style={{ padding:'4px 16px 16px' }}>
        <div style={lab}>Nom</div>
        <input autoFocus={isNew} value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Pâtes, Lait, Liquide vaisselle…"
          style={fieldStyle()} aria-label="Nom de l'article" />

        <div style={lab}>Où ?</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {STOCK_ZONES.map(z => (
            <StockPill key={z.id} on={zone === z.id} color={z.color} onClick={() => {
              if (z.id === 'maison' && zone !== 'maison') { setAlways(false); setLevel(4); setMinQ(null); }
              if (z.id !== 'maison' && zone === 'maison') { setUnit(''); }
              setZone(z.id);
            }}>{z.icon} {z.label}</StockPill>
          ))}
        </div>

        {maison && (<>
          <div style={lab}>Rayon</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {MAISON_GROUPS.map(g => <StockPill key={g.id} on={grp === g.id} color={zc} onClick={() => setGrp(g.id)}>{g.icon} {g.id}</StockPill>)}
          </div>
          <div style={lab}>Niveau</div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2,3,4].map(q => <StockPill key={q} on={level === q} color={zc} onClick={() => setLevel(q)} style={{ flex:1, padding:'7px 0' }}>{q * 25}%</StockPill>)}
          </div>
          <div style={lab}>Racheter quand il reste…</div>
          <div style={{ display:'flex', gap:6 }}>
            <StockPill on={minQ == null} color={zc} onClick={() => setMinQ(null)}>Jamais</StockPill>
            <StockPill on={minQ === 1} color={zc} onClick={() => setMinQ(1)}>25 %</StockPill>
            <StockPill on={minQ === 2} color={zc} onClick={() => setMinQ(2)}>50 %</StockPill>
          </div>
        </>)}

        {!maison && (<>
          <div onClick={() => setAlways(a => !a)} style={{
            display:'flex', alignItems:'center', gap:10, marginTop:14, padding:'9px 12px', cursor:'pointer',
            background: always ? zc + '1f' : C.bg, border:`1px solid ${always ? zc : C.border}`, borderRadius:10,
          }}>
            <span style={{ fontSize:18, color:C.soft }}>♾</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Toujours là</div>
              <div style={{ fontSize:11, color:C.muted }}>Sel, huile, épices… jamais ajouté aux courses, pas de quantité</div>
            </div>
            <div aria-hidden="true" style={{ width:34, height:20, borderRadius:10, background: always ? zc : C.border, position:'relative' }}>
              <div style={{ position:'absolute', top:2, left: always ? 16 : 2, width:16, height:16, borderRadius:8, background:'#fff', transition:'left .15s' }} />
            </div>
          </div>

          {!always && (<>
            <div style={lab}>Quantité</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
                style={fieldStyle({ style:{ width:90, textAlign:'center' } })} aria-label="Quantité" />
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {STOCK_UNITS.map(u => <StockPill key={u.id || 'pc'} on={unit === u.id} color={zc} onClick={() => setUnit(u.id)} style={{ padding:'5px 9px' }}>{u.label}</StockPill>)}
              </div>
            </div>
            <div style={lab}>Seuil de réachat <span style={{ textTransform:'none', fontWeight:400 }}>(en {unit || 'pièces'}, vide = aucun)</span></div>
            <input inputMode="decimal" value={minTxt} onChange={e => setMinTxt(e.target.value)} placeholder="Ex : 200"
              style={fieldStyle({ style:{ width:120, textAlign:'center' } })} aria-label="Seuil de réachat" />
          </>)}
          {always && (<>
            <div style={lab}>Unité habituelle</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {STOCK_UNITS.map(u => <StockPill key={u.id || 'pc'} on={unit === u.id} color={zc} onClick={() => setUnit(u.id)} style={{ padding:'5px 9px' }}>{u.label}</StockPill>)}
            </div>
          </>)}
        </>)}

        {cold && (<>
          <div style={lab}>À consommer avant (DLC)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {(zone === 'frigo'
              ? [['+2 j', () => addDaysISO(2)], ['+5 j', () => addDaysISO(5)], ['+7 j', () => addDaysISO(7)], ['+14 j', () => addDaysISO(14)]]
              : [['+1 mois', () => addMonthsISO(1)], ['+3 mois', () => addMonthsISO(3)], ['+6 mois', () => addMonthsISO(6)]]
            ).map(([l, f]) => <StockPill key={l} on={dlc === f()} color={zc} onClick={() => setDlc(f())}>{l}</StockPill>)}
            <StockPill on={!dlc} color={zc} onClick={() => setDlc('')}>Aucune</StockPill>
          </div>
          <input type="date" value={dlc} onChange={e => setDlc(e.target.value)} aria-label="Date limite"
            style={fieldStyle({ dense:true, style:{ marginTop:8, colorScheme:'dark', width:170 } })} />
        </>)}

        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          {!isNew && <Btn variant="danger" onClick={() => { deleteStockItem(item.id); onClose(); }}>🗑 Retirer</Btn>}
          <Btn variant="primary" onClick={save} disabled={!name.trim()} style={{ flex:1, justifyContent:'center' }}>{isNew ? 'Ajouter' : 'OK'}</Btn>
        </div>
      </div>
    </BottomSheet>
  );
}

/** « Cuisiner avec ton stock » : recettes qui utilisent ce que tu as, en priorité ce qui se périme */
function StockCookSheet({ onClose }) {
  const { recipes, stock } = useApp();
  const [assign, setAssign] = useState(null);
  const sugg = useMemo(() => suggestFromStock(recipes, stock).slice(0, 15), [recipes, stock]);
  return (
    <>
      <BottomSheet title="🍳 Cuisiner avec ton stock" onClose={onClose}>
        <div style={{ padding:'4px 12px 14px' }}>
          {sugg.length === 0 && <EmptyState icon="🥫" text="Aucune recette ne correspond à ton stock pour l'instant" />}
          {sugg.length > 0 && <div style={{ fontSize:11, color:C.muted, margin:'4px 4px 8px' }}>Classées : ce qui se périme d'abord, puis le plus d'ingrédients déjà en stock.</div>}
          {sugg.map(({ recipe, matched, total, expiring }) => (
            <div key={recipe.id} onClick={() => setAssign(recipe)} style={{
              display:'flex', alignItems:'center', gap:9, padding:'6px 10px', minHeight:44, cursor:'pointer',
              background:C.bg, border:`1px solid ${expiring.length ? C.orange + '66' : C.border}`, borderRadius:C.rRow, marginBottom:4,
            }}>
              <span style={{ fontSize:22 }}>{recipe.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{recipe.name}</div>
                {expiring.length > 0 && <div style={{ fontSize:11, color:C.orange }}>⏰ utilise : {expiring.join(', ')}</div>}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color: matched === total ? C.green : C.soft, flexShrink:0 }}>{matched}/{total}</span>
            </div>
          ))}
        </div>
      </BottomSheet>
      {assign && <AssignToWeekModal recipe={assign} onClose={() => { setAssign(null); onClose(); }} />}
    </>
  );
}

/** Fin de courses : range les articles récupérés dans le stock (zone proposée selon la catégorie, modifiable) */
function StockIntakeSheet({ items, onClose, onDone }) {
  const { cats, stock, stockFromShopping } = useApp();
  const ZONE_CYCLE = ['sec', 'frigo', 'congel', 'maison', 'none'];
  const [rows, setRows] = useState(() => items.map(it => {
    const cat = cats.find(c => c.id === it.categoryId);
    const alwaysThere = stock.some(s => s.always && stockNorm(s.name) === stockNorm(it.name));
    const zone = catStockZone(cat);
    return { id: it.id, name: it.name, qty: it.qty || 0, unit: it.unit || '', catId: it.categoryId,
      zone, grp: catMaisonGroup(cat), dlc: '', on: zone !== 'none' && !alwaysThere, alwaysThere };
  }));
  const set = (id, patch) => setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x));
  const nOn = rows.filter(r => r.on && r.zone !== 'none').length;

  const confirm = () => {
    const entries = rows.filter(r => r.on && r.zone !== 'none').map(r => {
      const b = r.qty > 0 ? stockBase(r.qty, r.unit) : { qty: 1, unit: '' };
      return { name: r.name, zone: r.zone, grp: r.grp, qty: b.qty, unit: b.unit, dlc: (r.zone === 'frigo' || r.zone === 'congel') ? r.dlc : null,
        buy: r.qty > 0 ? { qty: r.qty, unit: r.unit } : null, catId: r.catId };
    });
    stockFromShopping(entries, items.map(i => i.id));
    onDone();
  };
  const skip = () => { stockFromShopping([], items.map(i => i.id)); onDone(); };

  return (
    <BottomSheet title="🥫 Ranger dans le stock" onClose={onClose}>
      <div style={{ padding:'2px 12px 0' }}>
        <div style={{ fontSize:11, color:C.muted, margin:'2px 4px 8px', lineHeight:1.45 }}>
          Touche la zone pour la changer. Les articles non cochés sont juste retirés de la liste.
        </div>
        {rows.map(r => {
          const zz = r.zone === 'none' ? null : stockZone(r.zone);
          const cold = r.zone === 'frigo' || r.zone === 'congel';
          return (
            <div key={r.id} style={{ padding:'5px 8px', marginBottom:4, background:C.bg, border:`1px solid ${r.on ? (zz?.color || C.border) + '77' : C.border}`, borderRadius:C.rRow, opacity: r.on ? 1 : 0.55 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, minHeight:32 }}>
                <button aria-label={`${r.on ? 'Ne pas ranger' : 'Ranger'} ${r.name}`} aria-pressed={r.on} onClick={() => set(r.id, { on: !r.on, zone: !r.on && r.zone === 'none' ? 'sec' : r.zone })} style={{
                  width:20, height:20, borderRadius:5, flexShrink:0, cursor:'pointer', padding:0, fontFamily:'inherit',
                  background: r.on ? C.accentDk : 'transparent', border:`2px solid ${r.on ? C.accentDk : C.border}`,
                  color:C.onAccent, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
                }}>{r.on ? '✓' : ''}</button>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.alwaysThere ? '♾ déjà « toujours là »' : r.qty > 0 ? fmtQU(r.qty, r.unit) : 'sans quantité → 1'}</div>
                </div>
                <button aria-label={`Zone de ${r.name}`} onClick={() => {
                  const z2 = ZONE_CYCLE[(ZONE_CYCLE.indexOf(r.zone) + 1) % ZONE_CYCLE.length];
                  set(r.id, { zone: z2, on: z2 !== 'none' });
                }} style={{
                  padding:'4px 10px', borderRadius:14, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0,
                  background: zz ? zz.color + '26' : 'transparent', color: zz ? zz.color : C.muted, border:`1px solid ${zz ? zz.color : C.border}`,
                }}>{zz ? `${zz.icon} ${zz.label}` : 'Aucune'}</button>
              </div>
              {r.on && cold && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', margin:'4px 0 2px 28px' }}>
                  <span style={{ fontSize:11, color:C.muted }}>⏰</span>
                  {(r.zone === 'frigo'
                    ? [['+2 j', () => addDaysISO(2)], ['+5 j', () => addDaysISO(5)], ['+7 j', () => addDaysISO(7)], ['+14 j', () => addDaysISO(14)]]
                    : [['+1 mois', () => addMonthsISO(1)], ['+3 mois', () => addMonthsISO(3)], ['+6 mois', () => addMonthsISO(6)]]
                  ).map(([l, f]) => (
                    <StockPill key={l} on={r.dlc === f()} color={zz.color} onClick={() => set(r.id, { dlc: r.dlc === f() ? '' : f() })} style={{ padding:'2px 8px', fontSize:11 }}>{l}</StockPill>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position:'sticky', bottom:0, background:C.card, borderTop:`1px solid ${C.border}`, padding:'10px 12px', display:'flex', gap:8 }}>
        <Btn variant="primary" onClick={confirm} disabled={nOn === 0} style={{ flex:2, justifyContent:'center' }}>🥫 Ajouter {nOn} au stock et vider</Btn>
        <Btn variant="default" onClick={skip} style={{ flex:1, justifyContent:'center' }}>Vider</Btn>
      </div>
    </BottomSheet>
  );
}

function StockTab() {
  const { stock, cats, shopping, settings, updSettings, addCat, updateStockItem, restockItems } = useApp();
  const [zone,    setZone]    = useState('sec');
  const [grp,     setGrp]     = useState('all');
  const [editing, setEditing] = useState(null);   // item | 'new'
  const [cookOpen, setCookOpen] = useState(false);
  const z = stockZone(zone);

  const inList = it => shopping.some(s => stockNorm(s.name) === stockNorm(it.name));
  const zoneItems = stock.filter(s => s.zone === zone);
  const always = zoneItems.filter(s => s.always).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const shown = zoneItems.filter(s => !s.always && (zone !== 'maison' || grp === 'all' || s.grp === grp))
    .sort((a, b) => (a.dlc || '9999').localeCompare(b.dlc || '9999') || a.name.localeCompare(b.name, 'fr'));
  const toBuy  = zoneItems.filter(stockNeedsRestock);
  const toBuyNew = toBuy.filter(it => !inList(it));
  const soon = zoneItems.filter(s => s.dlc && daysUntil(s.dlc) <= 3).sort((a, b) => a.dlc.localeCompare(b.dlc));
  const alertCount = id => stock.filter(s => s.zone === id && (stockNeedsRestock(s) || (s.dlc && daysUntil(s.dlc) <= 1))).length;
  const hasMaisonCats = cats.some(c => catStockZone(c) === 'maison');
  const showMaisonBanner = zone === 'maison' && !hasMaisonCats && !settings.maisonCatsDismissed;

  const adjust = (it, delta) => {
    const next = it.zone === 'maison' ? Math.max(0, Math.min(4, it.qty + delta)) : Math.max(0, r1((it.qty || 0) + delta));
    updateStockItem(it.id, { qty: next, cap: Math.max(it.cap || 0, next) });
  };
  const createMaisonCats = () => {
    MAISON_CATS.forEach(c => addCat({ ...c, stockZone:'maison' }));
    updSettings({ maisonCatsDismissed: true });
  };

  return (
    <div style={{ padding:'8px 12px 16px' }}>
      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <Btn small variant="accent" onClick={() => setCookOpen(true)} style={{ flex:1, justifyContent:'center' }}>🍳 Cuisiner avec mon stock</Btn>
        <Btn small variant="primary" onClick={() => setEditing('new')}>＋ Ajouter</Btn>
      </div>

      {/* Zones */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6, marginBottom:8 }}>
        {STOCK_ZONES.map(zz => {
          const on = zone === zz.id, n = stock.filter(s => s.zone === zz.id).length, al = alertCount(zz.id);
          return (
            <button key={zz.id} onClick={() => { setZone(zz.id); setGrp('all'); }} aria-label={zz.label} aria-pressed={on} style={{
              position:'relative', padding:'6px 2px 5px', borderRadius:C.rRow, cursor:'pointer', fontFamily:'inherit',
              background: on ? zz.color + '26' : C.card, border:`1.5px solid ${on ? zz.color : C.border}`,
              display:'flex', flexDirection:'column', alignItems:'center', gap:1,
            }}>
              <span style={{ fontSize:20, lineHeight:1.15 }}>{zz.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color: on ? zz.color : C.soft, letterSpacing:'-0.01em' }}>{zz.label}</span>
              <span style={{ fontSize:10, color:C.muted }}>{n} article{n > 1 ? 's' : ''}</span>
              {al > 0 && <span style={{ position:'absolute', top:-5, right:-3, minWidth:16, height:16, padding:'0 4px', borderRadius:8, background:C.red, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{al}</span>}
            </button>
          );
        })}
      </div>

      {/* Rayons Maison : tous visibles */}
      {zone === 'maison' && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
          <StockPill on={grp === 'all'} color={z.color} onClick={() => setGrp('all')}>Tout · {zoneItems.length}</StockPill>
          {MAISON_GROUPS.map(g => (
            <StockPill key={g.id} on={grp === g.id} color={z.color} onClick={() => setGrp(g.id)}>
              {g.icon} {g.id} · {zoneItems.filter(s => s.grp === g.id).length}
            </StockPill>
          ))}
        </div>
      )}

      {showMaisonBanner && (
        <div style={{ padding:'9px 12px', marginBottom:8, background:C.accentBg, border:`1px solid ${C.accent}44`, borderRadius:C.rRow }}>
          <div style={{ fontSize:12, color:C.soft, lineHeight:1.5, marginBottom:7 }}>
            Crée les catégories <b>Entretien</b>, <b>Hygiène</b> et <b>Chiens</b> pour que tes achats de la maison soient rangés à part dans les courses (avec des mots-clés prêts).
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn small variant="primary" onClick={createMaisonCats}>Créer</Btn>
            <Btn small variant="ghost" onClick={() => updSettings({ maisonCatsDismissed: true })}>Plus tard</Btn>
          </div>
        </div>
      )}

      {/* À racheter */}
      {toBuy.length > 0 && (
        <div style={{ padding:'8px 10px', marginBottom:8, background:C.redBg, border:`1px solid ${C.red}44`, borderRadius:C.rRow }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.red, flex:1 }}>🛒 À racheter ({toBuy.length})</span>
            {toBuyNew.length > 0
              ? <Btn small variant="danger" onClick={() => restockItems(toBuyNew)}>Ajouter aux courses</Btn>
              : <span style={{ fontSize:11, color:C.green }}>✓ tout est dans la liste</span>}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
            {toBuy.map(it => (
              <span key={it.id} onClick={() => setEditing(it)} style={{ fontSize:11, padding:'2px 8px', borderRadius:10, cursor:'pointer', background:C.card, color:C.text, border:`1px solid ${C.border}` }}>
                {it.name}{inList(it) ? ' · dans la liste' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* À consommer vite */}
      {soon.length > 0 && (
        <div style={{ padding:'8px 10px', marginBottom:8, background:C.orangeBg, border:`1px solid ${C.orange}44`, borderRadius:C.rRow }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.orange }}>⏰ À consommer vite ({soon.length})</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
            {soon.map(it => (
              <span key={it.id} onClick={() => setEditing(it)} style={{ fontSize:11, padding:'2px 8px', borderRadius:10, cursor:'pointer', background:C.card, color: daysUntil(it.dlc) < 0 ? C.red : C.text, border:`1px solid ${C.border}` }}>
                {it.name} · {fmtDlcLabel(it.dlc)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toujours là */}
      {always.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:5, marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.muted, marginRight:2 }}>♾ Toujours là</span>
          {always.map(it => (
            <span key={it.id} onClick={() => setEditing(it)} style={{ fontSize:12, padding:'3px 10px', borderRadius:12, cursor:'pointer', background:z.color + '1f', color:z.color, border:`1px solid ${z.color}55`, fontWeight:600 }}>
              {it.name}
            </span>
          ))}
        </div>
      )}

      {/* Liste */}
      {shown.length === 0 && always.length === 0 && (
        <EmptyState icon={z.icon} text={zone === 'maison' ? 'Rien dans cette partie de la maison' : `${z.label} : rien en stock. Ajoute à la main ou à la fin de tes courses.`} />
      )}
      {shown.map(it => <StockRow key={it.id} item={it} onEdit={() => setEditing(it)} onAdjust={d => adjust(it, d)} />)}

      {editing && <StockEditSheet item={editing === 'new' ? null : editing} zone={zone} onClose={() => setEditing(null)} />}
      {cookOpen && <StockCookSheet onClose={() => setCookOpen(false)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  APP SHELL
// ══════════════════════════════════════════════════════
function AppShell() {
  const [tab,        setTab]        = useState('shopping');
  const [tabHistory, setTabHistory] = useState([]);
  const mainRef = useRef(null);
  const { planningTarget } = useApp();

  // Navigation d'onglet avec historique pour le bouton retour
  const changeTab = (newTab) => {
    if (newTab === tab) return;
    setTabHistory(h => [...h, tab]);
    setTab(newTab);
  };

  const popTab = () => {
    const prev = tabHistory[tabHistory.length - 1];
    setTabHistory(h => h.slice(0, -1));
    if (prev) setTab(prev);
  };

  // Enregistre le retour inter-onglets (priorité basse : les modals prennent la main)
  useBackHandler(popTab, tabHistory.length > 0);

  // Navigation depuis WeeksBadge → onglet Planning
  useEffect(() => {
    if (planningTarget) changeTab('planning');
  }, [planningTarget]);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [tab]);

  return (
    <div style={{ height:'100vh', background:C.bg, display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', overflow:'hidden' }}>
      <AppHeader tab={tab} />
      <main ref={mainRef} style={{ flex:1, overflowY:'auto', paddingBottom: C.modern ? 92 : 70 }}>
        {tab === 'planning' && <PlanningTab />}
        {tab === 'recipes'  && <RecipesTab />}
        {tab === 'shopping' && <ShoppingTab />}
        {tab === 'stock'    && <StockTab />}
        {tab === 'stats'    && <StatsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav tab={tab} setTab={changeTab} />
      <Snackbar />
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  EXPORT PRINCIPAL
// ══════════════════════════════════════════════════════
function GlobalStyle() {
  useApp(); // se met à jour quand le thème change
  return (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: ${C.bg}; font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; }
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
          @keyframes fadeIn  { from { opacity: 0; }              to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
  );
}

// ══════════════════════════════════════════════════════
//  ÉCRAN DE SECOURS — évite l'écran blanc si un composant plante
// ══════════════════════════════════════════════════════
function CrashScreen({ error, onRetry }) {
  const [msg, setMsg] = useState('');
  const hasPre = !!loadFromStorage(PRE_IMPORT_KEY, null)?.data;
  const col = (k, d) => (C && C[k]) || d;

  const rescueExport = async () => {
    const data = { version: VERSION, exportDate: new Date().toISOString() };
    BACKUP_KEYS.forEach(k => { const v = loadFromStorage('mp_' + k, undefined); if (v !== undefined) data[k] = v; });
    const res = await saveTextFile(`meal-plan-secours-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data, null, 2));
    setMsg(res.ok ? '✅ Données enregistrées' : res.cancelled ? 'Export annulé' : `❌ ${res.error || 'échec'}`);
  };
  const rollbackImport = () => {
    const v = loadFromStorage(PRE_IMPORT_KEY, null);
    if (!v?.data) return;
    BACKUP_KEYS.forEach(k => {
      if (v.data[k] === undefined) return;
      _mem['mp_' + k] = v.data[k];
      if (_ls) { try { _ls.setItem('mp_' + k, JSON.stringify(v.data[k])); } catch {} }
    });
    delete _mem[PRE_IMPORT_KEY];
    if (_ls) { try { _ls.removeItem(PRE_IMPORT_KEY); } catch {} }
    window.location.reload();
  };
  const bStyle = (primary) => ({
    width:'100%', padding:'12px 16px', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer',
    border: primary ? 'none' : `1px solid ${col('border','#2C3A52')}`, fontFamily:'inherit',
    background: primary ? col('accentDk','#2563EB') : col('card','#18202E'),
    color: primary ? col('onAccent','#fff') : col('text','#E8EEF7'),
  });

  return (
    <div style={{
      minHeight:'100vh', background:col('bg','#0F1621'), color:col('text','#E8EEF7'),
      display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'system-ui, sans-serif',
    }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>😵</div>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Oups, l'appli a rencontré un problème</div>
        <div style={{ fontSize:14, color:col('muted','#8A99B3'), lineHeight:1.6, marginBottom:18 }}>
          Tes données sont normalement toujours sur ton téléphone.
          Essaie de réafficher l'appli ; si ça plante encore, sauvegarde d'abord tes données.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onRetry} style={bStyle(true)}>🔄 Réessayer</button>
          <button onClick={() => window.location.reload()} style={bStyle(false)}>↻ Recharger l'appli</button>
          <button onClick={rescueExport} style={bStyle(false)}>💾 Sauvegarder mes données</button>
          {hasPre && <button onClick={rollbackImport} style={bStyle(false)}>↩ Revenir à avant le dernier import</button>}
        </div>
        {msg && <div style={{ marginTop:12, fontSize:13, color:col('soft','#B8C4D8') }}>{msg}</div>}
        <div style={{
          marginTop:18, padding:10, borderRadius:10, background:col('card','#18202E'),
          fontFamily:'monospace', fontSize:11, color:col('muted','#8A99B3'), wordBreak:'break-word', lineHeight:1.5,
        }}>
          v{VERSION} · {String(error?.message || error).slice(0, 240)}
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { console.error('[MealPlan] plantage', error, info && info.componentStack); } catch {}
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen error={this.state.error} onRetry={() => this.setState({ error: null })} />;
  }
}

export default function MealPlanApp() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <>
          <GlobalStyle />
          <AppShell />
        </>
      </AppProvider>
    </ErrorBoundary>
  );
}
