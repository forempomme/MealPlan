import { useState, useRef, useMemo, useCallback, createContext, useContext, useEffect } from "react"; // v20

// ══════════════════════════════════════════════════════
//  VERSIONING — source unique de vérité
// ══════════════════════════════════════════════════════
const VERSION = "2.5.0"; // v15

// ══════════════════════════════════════════════════════
//  PALETTE "ACIER NOCTURNE"
// ══════════════════════════════════════════════════════
const C = {
  bg:       '#111419',
  card:     '#181C24',
  cardHov:  '#1E2432',
  border:   '#2A3040',
  accent:   '#7BA8E8',
  accentDk: '#4878C8',
  accentBg: 'rgba(123,168,232,0.11)',
  green:    '#5CC4A0',
  greenBg:  'rgba(92,196,160,0.12)',
  text:     '#E8EAF2',
  soft:     '#B0BDD8',
  muted:    '#7888A8',
  orange:   '#E8A87B',
  orangeBg: 'rgba(232,168,123,0.12)',
  red:      '#E87878',
  redBg:    'rgba(232,120,120,0.10)',
  planBg:   '#151B28',
  planBdr:  '#243048',
  cookedBg: 'rgba(92,196,160,0.14)',
  yellow:   '#E8D878',
};


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

/** Vérifie qu'un mot-clé correspond à un nom entier (pas une sous-chaîne d'un mot) */
function matchesKeyword(name, kw) {
  const e = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![a-zA-ZÀ-ÿ0-9])' + e + '(?![a-zA-ZÀ-ÿ0-9])', 'i').test(name);
}

function categorize(name, cats) {
  const low = name.toLowerCase();
  for (const c of [...cats].sort((a, b) => a.order - b.order)) {
    if (!c.kw || c.kw.length === 0) continue;
    if (c.kw.some(k => matchesKeyword(low, k.toLowerCase()))) return c.id;
  }
  return cats.find(c => !c.kw || c.kw.length === 0)?.id ?? cats[cats.length - 1]?.id;
}

/** Retourne les ingrédients sélectionnés sans correspondance de mot-clé */
function getUncatIngredients(recipe, ingIds, cats) {
  return (recipe.ingredients || [])
    .filter(ing => ingIds.includes(ing.id))
    .filter(ing => !cats.some(c =>
      c.kw?.length > 0 && c.kw.some(k => matchesKeyword(ing.name.toLowerCase(), k.toLowerCase()))
    ));
}

// ══════════════════════════════════════════════════════
//  DONNÉES INITIALES (démo)
// ══════════════════════════════════════════════════════


const INIT_RECIPES = [];
const INIT_MEALS   = [];

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

function saveToStorage(key, value) {
  _mem[key] = value;
  if (_ls) { try { _ls.setItem(key, JSON.stringify(value)); } catch {} }
}

// ══════════════════════════════════════════════════════
//  CONTEXT
// ══════════════════════════════════════════════════════
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children }) {
  const [recipes,  setRecipes]  = useState(() => loadFromStorage('mp_recipes',  INIT_RECIPES));
  const [meals,    setMeals]    = useState(() => loadFromStorage('mp_meals',     INIT_MEALS));
  const [shopping, setShopping] = useState(() => loadFromStorage('mp_shopping',  []));
  const [cats,     setCats]     = useState(() => loadFromStorage('mp_cats',      DEFAULT_CATS));
  const [settings, setSettings] = useState(() => loadFromStorage('mp_settings',  { weeksToShow: 4 }));

  // ── Sauvegarde automatique ────────────────────────────
  useEffect(() => saveToStorage('mp_recipes',  recipes),  [recipes]);
  useEffect(() => saveToStorage('mp_meals',    meals),    [meals]);
  useEffect(() => saveToStorage('mp_shopping', shopping), [shopping]);
  useEffect(() => saveToStorage('mp_cats',     cats),     [cats]);
  useEffect(() => saveToStorage('mp_settings', settings), [settings]);
  const [snack,    setSnack]    = useState(null);
  const snackRef = useRef(null);

  const showSnack = useCallback((msg, undo) => {
    clearTimeout(snackRef.current);
    setSnack({ msg, undo });
    snackRef.current = setTimeout(() => setSnack(null), 3500);
  }, []);

  /* ── Recettes ── */
  const addRecipe    = d => setRecipes(p => [{ ...d, id: genId(), createdAt: ts() }, ...p]);
  const updateRecipe = d => setRecipes(p => p.map(r => r.id === d.id ? d : r));
  const deleteRecipe = id => {
    setRecipes(p  => p.filter(r => r.id !== id));
    setMeals(p    => p.filter(m => m.recipeId !== id));
    setShopping(p => p.filter(s => s.fromRecipeId !== id));
  };

  /* ── Repas ── */
  const addMeal = (weekKey, recipeId, persons) => {
    // N'ajoute QUE le repas au planning — les ingrédients sont ajoutés
    // séparément via addIngredientsFromRecipe après sélection utilisateur.
    setMeals(p => [...p, { id: genId(), weekKey, recipeId, persons, done: false, addedAt: ts() }]);
  };

  const addIngredientsFromRecipe = (recipe, persons, selectedIngIds, catOverrides = {}) => {
    const scale = persons / (recipe.portions || 4);
    const items = (recipe.ingredients || [])
      .filter(ing => selectedIngIds.includes(ing.id))
      .map(ing => ({
        id: genId(), name: ing.name,
        qty:  ing.qty ? Math.round(ing.qty * scale * 10) / 10 : 0,
        unit: ing.unit || '',
        categoryId:  catOverrides[ing.id] ?? categorize(ing.name, cats),
        fromRecipeId: recipe.id,
        checked: false,
        sortOrder: ts() + Math.random(),
        addedAt: ts(),
      }));
    if (items.length) setShopping(p => [...p, ...items]);
  };

  const updateMealPersons = (id, delta) => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;
    const oldPersons = meal.persons;
    const newPersons = Math.max(1, oldPersons + delta);
    if (newPersons === oldPersons) return;
    setMeals(p => p.map(m => m.id === id ? { ...m, persons: newPersons } : m));
    // Rescale les articles de courses liés à cette recette
    const ratio = newPersons / oldPersons;
    setShopping(p => p.map(s =>
      s.fromRecipeId === meal.recipeId && s.qty
        ? { ...s, qty: Math.round(s.qty * ratio * 10) / 10 }
        : s
    ));
  };

  const toggleMealDone = id =>
    setMeals(p => p.map(m => m.id === id ? { ...m, done: !m.done } : m));

  const deleteMeal = id => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;
    const hasOther = meals.some(m => m.id !== id && m.weekKey === meal.weekKey && m.recipeId === meal.recipeId);
    if (!hasOther) setShopping(p => p.filter(s => s.fromRecipeId !== meal.recipeId));
    setMeals(p => p.filter(m => m.id !== id));
  };

  const duplicateWeek = (from, to) => {
    const src = meals.filter(m => m.weekKey === from);
    setMeals(p => [...p, ...src.map(m => ({ ...m, id: genId(), weekKey: to, done: false, addedAt: ts() }))]);
  };

  /* ── Courses ── */
  const addShoppingItem = (name, qty, unit, catId) =>
    setShopping(p => [...p, {
      id: genId(), name, qty: parseFloat(qty)||0, unit: unit||'',
      categoryId: catId ?? categorize(name, cats),
      fromRecipeId: null, checked: false, sortOrder: ts(), addedAt: ts(),
    }]);

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

  const clearChecked = () => setShopping(p => p.filter(s => !s.checked));
  const clearAll     = () => setShopping([]);

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
  const addCat = ({ id = genId(), name, emoji='📦', kw=[] }) =>
    setCats(p => [...p, { id, name, emoji, kw, order: p.length }]);
  const deleteCat = id => {
    const fb = cats.find(c => c.id !== id && (!c.kw || c.kw.length === 0))?.id ?? cats.find(c => c.id !== id)?.id;
    setCats(p => p.filter(c => c.id !== id));
    setShopping(p => p.map(s => s.categoryId === id ? { ...s, categoryId: fb } : s));
  };
  const updateCat   = c    => setCats(p => p.map(x => x.id === c.id ? c : x));
  const reorderCats = list => setCats(list.map((c, i) => ({ ...c, order: i })));
  const updSettings = patch => setSettings(p => ({ ...p, ...patch }));

  const importAllData = (data) => {
    if (data.recipes)  setRecipes(data.recipes);
    if (data.meals)    setMeals(data.meals);
    if (data.shopping) setShopping(data.shopping);
    if (data.cats)     setCats(data.cats);
    if (data.settings) setSettings(data.settings);
  };

  return (
    <AppCtx.Provider value={{
      recipes, meals, shopping, cats, settings, snack, setSnack, showSnack,
      addRecipe, updateRecipe, deleteRecipe,
      addMeal, addIngredientsFromRecipe, updateMealPersons, toggleMealDone, deleteMeal, duplicateWeek,
      addShoppingItem, deleteShoppingItem, deleteItemsByCategory, updateShoppingItem, clearChecked, clearAll,
      reorderItemsInCat, addCat, deleteCat, updateCat, reorderCats, updSettings, importAllData,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ══════════════════════════════════════════════════════
//  PRIMITIVES UI
// ══════════════════════════════════════════════════════
function Btn({ onClick, children, variant='default', small, disabled, style }) {
  const base = {
    display:'inline-flex', alignItems:'center', gap:5,
    padding: small ? '7px 14px' : '9px 18px',
    borderRadius:9, fontWeight:500, fontSize: small?13:15,
    transition:'all 0.15s', cursor: disabled?'not-allowed':'pointer',
    opacity: disabled?0.5:1, border:'none', flexShrink:0,
  };
  const vs = {
    default: { background:C.border,   color:C.text },
    primary: { background:C.accentDk, color:'#fff' },
    green:   { background:C.greenBg,  color:C.green,  border:`1px solid ${C.green}44` },
    danger:  { background:C.redBg,    color:C.red,    border:`1px solid ${C.red}44` },
    ghost:   { background:'transparent', color:C.muted },
    accent:  { background:C.accentBg, color:C.accent, border:`1px solid ${C.accent}44` },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{ ...base, ...vs[variant], ...style }}>
      {children}
    </button>
  );
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{
      position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.65)',
      display:'flex', alignItems:'flex-end', animation:'fadeIn 0.15s',
    }}>
      <div style={{
        width:'100%', maxWidth:480, margin:'0 auto',
        background:C.card, borderRadius:'20px 20px 0 0',
        maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column',
        animation:'slideUp 0.22s ease',
      }}>
        <div style={{
          padding:'14px 18px 12px', borderBottom:`1px solid ${C.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
        }}>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{title}</span>
          <button onClick={onClose} style={{
            background:C.border, border:'none', color:C.muted,
            width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:16, lineHeight:1,
          }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  );
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
        <button key={n} onClick={onChange ? () => onChange(n) : undefined} style={{
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
  { id:'stats',    icon:'📊', label:'Stats' },
  { id:'settings', icon:'⚙️', label:'Options' },
];

function AppHeader({ tab }) {
  const t = TABS.find(x => x.id===tab);
  return (
    <header style={{
      background: 'linear-gradient(135deg, #0F2137 0%, #1A3A6C 100%)',
      borderBottom: '1px solid #1E4070',
      padding: '16px 18px',
      display:'flex', justifyContent:'space-between', alignItems:'center',
      position:'sticky', top:0, zIndex:100, flexShrink:0,
    }}>
      <div>
        <div style={{ fontWeight:800, fontSize:22, color:'#FFFFFF', letterSpacing:'-0.02em', lineHeight:1.1 }}>
          🍽 Meal Plan
        </div>
        <div style={{ fontSize:15, color:'#7EC8FF', marginTop:3, fontWeight:500 }}>
          {t?.icon} {t?.label}
        </div>
      </div>
      <div style={{
        background: 'rgba(126,200,255,0.15)',
        color: '#7EC8FF',
        fontSize:13, fontWeight:700, padding:'5px 13px', borderRadius:20,
        border:'1px solid rgba(126,200,255,0.4)', letterSpacing:'0.02em',
      }}>v{VERSION}</div>
    </header>
  );
}

function BottomNav({ tab, setTab }) {
  const { shopping } = useApp();
  const shopCount = shopping.filter(s => !s.checked).length;
  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480,
      background: 'linear-gradient(180deg, #152E52 0%, #0F2137 100%)',
      borderTop: '1px solid #1E4070',
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
                height:2, background:'#7EC8FF',
                borderRadius:'0 0 3px 3px',
              }} />
            )}
            {/* Icône + badge */}
            <div style={{ position:'relative' }}>
              <span style={{ fontSize:26 }}>{item.icon}</span>
              {item.id === 'shopping' && shopCount > 0 && (
                <span style={{
                  position:'absolute', top:-4, right:-7,
                  background:'#7EC8FF', color:'#0F2137',
                  borderRadius:'50%', width:16, height:16,
                  fontSize:9, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>{shopCount > 99 ? '99' : shopCount}</span>
              )}
            </div>
            <span style={{
              fontSize:13, fontWeight: active ? 700 : 400,
              color: active ? '#7EC8FF' : '#3A6080',
              letterSpacing:'0.04em',
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
function IngredientFilterModal({ selections, onConfirm, onSkip, onCancel }) {
  const { cats } = useApp();

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

  // État des cases : tout coché par défaut
  const [checked, setChecked] = useState(
    () => new Set(allItems.map(i => i.key))
  );

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

  const handleConfirm = () => {
    const selectedByRecipe = {};
    allItems.forEach(item => {
      if (checked.has(item.key)) {
        if (!selectedByRecipe[item.recipeId]) selectedByRecipe[item.recipeId] = [];
        selectedByRecipe[item.recipeId].push(item.id);
      }
    });
    onConfirm(selectedByRecipe);
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
          background:'linear-gradient(135deg,#0F2137,#1A3A6C)',
          borderRadius:'18px 18px 0 0', padding:'16px 18px', flexShrink:0,
        }}>
          <div style={{ color:'#fff', fontWeight:700, fontSize:16, marginBottom:2 }}>
            🛒 Ingrédients à ajouter
          </div>
          <div style={{ color:'#7EC8FF', fontSize:12 }}>
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
                    background: allOn ? C.accentDk : someOn ? 'rgba(72,120,200,0.4)' : 'transparent',
                    border:`2px solid ${allOn||someOn ? C.accentDk : C.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {allOn  && <span style={{color:'#fff',fontSize:10,fontWeight:700}}>✓</span>}
                    {someOn && !allOn && <span style={{color:'#fff',fontSize:10}}>–</span>}
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
                  return (
                    <div key={item.key} onClick={() => toggle(item.key)} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'8px 16px 8px 44px', cursor:'pointer',
                      borderBottom:`1px solid ${C.border}22`,
                      opacity: on ? 1 : 0.38,
                      transition:'opacity 0.15s',
                    }}>
                      <div style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        background: on ? C.accentDk : 'transparent',
                        border:`2px solid ${on ? C.accentDk : C.border}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {on && <span style={{color:'#fff',fontSize:9,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{flex:1, fontSize:13, color:C.text}}>{item.name}</span>
                      {multiRecipe && (
                        <span style={{fontSize:10, color:C.muted, marginRight:4}}>{item.recipeEmoji}</span>
                      )}
                      {item.qty > 0 && (
                        <span style={{fontSize:11, color:C.muted}}>{item.qty} {item.unit}</span>
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
              ? <><span style={{color:C.accent, fontWeight:600}}>{checkedCount}</span> à ajouter · <span>{totalCount-checkedCount}</span> ignorés</>
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
              color: checkedCount > 0 ? '#fff' : C.muted,
              fontSize:13, fontWeight:600,
              cursor: checkedCount > 0 ? 'pointer' : 'default',
              fontFamily:'inherit', transition:'all 0.15s',
            }}>Ajouter {checkedCount > 0 ? checkedCount : ''} ✓</button>
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
  const { meals, recipes, cats, addMeal, addIngredientsFromRecipe, duplicateWeek } = useApp();
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

  const MIN_YEAR = currentYear - 1;
  const MAX_YEAR = 2050;

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
      {/* Bouton flottant */}
      {btnVisible && (
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

      {/* ── Sélecteur d'année ── */}
      <div style={{ position:'sticky', top: btnVisible ? 36 : 0, zIndex:40, background:C.card, borderBottom:`1px solid ${C.border}` }}>
        {/* Ligne principale : flèches + année */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px' }}>
          <button
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
                marginLeft:7, fontSize:10, fontWeight:600,
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

          <button
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
              color: y === year ? '#fff' : y === currentYear ? C.accent : C.muted,
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

      {pickerWeek && (
        <RecipePicker
          onClose={() => setPickerWeek(null)}
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
          selections={filterData.selections}
          onSkip={() => {
            // Ajoute les repas sans ingrédients
            filterData.selections.forEach(({ recipe, persons: p }) => addMeal(filterData.weekKey, recipe.id, p));
            setFilterData(null);
          }}
          onCancel={() => setFilterData(null)}
          onConfirm={(selectedByRecipe) => {
            // Ajoute tous les repas au planning
            filterData.selections.forEach(({ recipe, persons: p }) =>
              addMeal(filterData.weekKey, recipe.id, p)
            );
            // Collecte les ingrédients sans correspondance de mot-clé
            const uncatItems = [];
            filterData.selections.forEach(({ recipe, persons: p }) => {
              const ids = selectedByRecipe[recipe.id] || [];
              getUncatIngredients(recipe, ids, cats).forEach(ing =>
                uncatItems.push({ id: ing.id, name: ing.name, recipeEmoji: recipe.emoji, recipeName: recipe.name })
              );
            });
            if (uncatItems.length > 0) {
              setMultiCatData({
                uncatItems,
                addAll: (catOverrides) => {
                  filterData.selections.forEach(({ recipe, persons: p }) => {
                    const ids = selectedByRecipe[recipe.id] || [];
                    if (ids.length) addIngredientsFromRecipe(recipe, p, ids, catOverrides);
                  });
                },
              });
            } else {
              filterData.selections.forEach(({ recipe, persons: p }) => {
                const ids = selectedByRecipe[recipe.id] || [];
                if (ids.length) addIngredientsFromRecipe(recipe, p, ids);
              });
            }
            setFilterData(null);
          }}
        />
      )}
      {multiCatData && (
        <MultiCategoryAssignModal
          uncatItems={multiCatData.uncatItems}
          onConfirm={(catOverrides) => { multiCatData.addAll(catOverrides); setMultiCatData(null); }}
          onCancel={() => { multiCatData.addAll({}); setMultiCatData(null); }}
        />
      )}
      {dupWeek && (
        <DupWeekModal fromKey={dupWeek} onClose={() => setDupWeek(null)}
          onDup={to => { duplicateWeek(dupWeek, to); setDupWeek(null); }}
        />
      )}
      {viewRecipe && (
        <RecipeDetail recipe={viewRecipe}
          onClose={() => setViewRecipe(null)}
          onEdit={null}
          onDelete={null}
        />
      )}
    </div>
  );
}

function WeekCard({ weekKey, isCurrent, onAdd, onDup, onViewRecipe }) {
  const { meals, recipes } = useApp();
  const [expanded, setExpanded] = useState(isCurrent);
  const weekMeals = meals.filter(m => m.weekKey === weekKey);
  const wn = weekKey.split('-W')[1];

  const shareWeek = () => {
    const text = `📅 Semaine ${wn} — ${getWeekRange(weekKey)}\n\n` +
      weekMeals.map(m => {
        const r = recipes.find(x => x.id === m.recipeId);
        return r ? `${r.emoji} ${r.name} (${m.persons} pers.)` : '';
      }).filter(Boolean).join('\n');
    if (navigator.share) navigator.share({ title: 'Menu semaine', text });
    else navigator.clipboard?.writeText(text).catch(() => {});
  };

  // Bleu ciel clair bien visible pour la semaine en cours
  const curBg  = 'rgba(100, 185, 255, 0.13)';
  const curBdr = 'rgba(100, 185, 255, 0.55)';

  return (
    <div style={{
      background: isCurrent ? curBg : C.card,
      border: `1px solid ${isCurrent ? curBdr : C.border}`,
      borderRadius:12, marginBottom:6, overflow:'hidden',
    }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        padding:'9px 13px', display:'flex', justifyContent:'space-between', alignItems:'center',
        cursor:'pointer', borderBottom: expanded ? `1px solid ${C.border}33` : 'none',
        userSelect:'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isCurrent && (
            <span style={{
              fontSize:11, background:'rgba(100,185,255,0.2)', color:'#64B9FF',
              padding:'2px 8px', borderRadius:10, fontWeight:700, letterSpacing:'0.04em',
              border:'1px solid rgba(100,185,255,0.4)',
            }}>EN COURS</span>
          )}
          <span style={{ fontWeight:600, fontSize:15, color: isCurrent ? '#64B9FF' : C.text }}>
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
            return recipe ? <MealItem key={meal.id} meal={meal} recipe={recipe} onViewRecipe={onViewRecipe} /> : null;
          })}
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <Btn onClick={onAdd} variant="primary" small>+ Ajouter</Btn>
            <Btn onClick={onDup} variant="ghost" small>📋</Btn>
            {weekMeals.length > 0 && <Btn onClick={shareWeek} variant="ghost" small>📤</Btn>}
          </div>
        </div>
      )}
    </div>
  );
}

function MealItem({ meal, recipe, onViewRecipe }) {
  const { toggleMealDone, updateMealPersons, deleteMeal } = useApp();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = () => {
    if (confirm) { deleteMeal(meal.id); }
    else { setConfirm(true); setTimeout(() => setConfirm(false), 3000); }
  };

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      background: meal.done ? C.cookedBg : C.planBg,
      border:`1px solid ${meal.done ? C.green+'33' : C.planBdr}`,
      borderRadius:9, padding:'8px 10px', marginBottom:4, transition:'all 0.2s',
    }}>
      {/* Bouton cuisinée */}
      <button onClick={() => toggleMealDone(meal.id)} style={{
        width:24, height:24, borderRadius:'50%',
        border:`2px solid ${meal.done ? C.green : C.border}`,
        background: meal.done ? C.green : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color:'#fff', fontSize:12, flexShrink:0, transition:'all 0.2s',
      }}>
        {meal.done ? '✓' : ''}
      </button>

      <span style={{ fontSize:18, flexShrink:0 }}>{recipe.emoji}</span>

      <div onClick={() => onViewRecipe?.(recipe)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{
          fontWeight:500, fontSize:15, color: meal.done ? C.muted : C.text,
          textDecoration: meal.done ? 'line-through' : 'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>{recipe.name}</div>
      </div>

      {/* Personnes */}
      <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
        <button onClick={() => updateMealPersons(meal.id, -1)} style={{
          background:C.border, border:'none', color:C.text,
          width:20, height:20, borderRadius:4, cursor:'pointer', fontSize:13, lineHeight:1,
        }}>−</button>
        <span style={{ fontSize:12, color:C.muted, minWidth:22, textAlign:'center' }}>👥{meal.persons}</span>
        <button onClick={() => updateMealPersons(meal.id, +1)} style={{
          background:C.border, border:'none', color:C.text,
          width:20, height:20, borderRadius:4, cursor:'pointer', fontSize:13, lineHeight:1,
        }}>+</button>
      </div>

      {/* Supprimer */}
      <button onClick={handleDelete} style={{
        background: confirm ? C.redBg : 'transparent',
        border: confirm ? `1px solid ${C.red}33` : 'none',
        color: confirm ? C.red : C.muted,
        borderRadius:6, padding:'2px 6px', cursor:'pointer', fontSize:12, flexShrink:0, transition:'all 0.2s',
      }}>
        {confirm ? '✓' : '🗑'}
      </button>
    </div>
  );
}

function RecipePicker({ onClose, onSelect }) {
  const { recipes } = useApp();
  const [search,   setSearch]   = useState('');
  const [persons,  setPersons]  = useState(6);
  const [selected, setSelected] = useState(new Set()); // multi-sélection

  const toggle = id => setSelected(s => {
    const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns;
  });

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const count = selected.size;

  return (
    <BottomSheet title="Ajouter des repas" onClose={onClose}>
      <div style={{ padding:'10px 14px' }}>
        {/* Personnes */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ color:C.muted, fontSize:13, flex:1 }}>👥 Personnes pour tous</span>
          <button onClick={() => setPersons(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:15 }}>−</button>
          <span style={{ fontWeight:700, color:C.text, minWidth:22, textAlign:'center', fontSize:14 }}>{persons}</span>
          <button onClick={() => setPersons(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:15 }}>+</button>
        </div>

        <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ marginBottom:8, padding:'7px 11px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, width:'100%', fontSize:13, outline:'none' }}
        />

        {/* Recettes avec cases à cocher */}
        <div style={{ maxHeight:360, overflowY:'auto' }}>
          {filtered.map(r => {
            const checked = selected.has(r.id);
            return (
              <div key={r.id} onClick={() => toggle(r.id)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                borderRadius:9, marginBottom:4, cursor:'pointer', transition:'all 0.12s',
                background: checked ? C.accentBg : C.bg,
                border:`1px solid ${checked ? C.accent+'44' : C.border}`,
              }}>
                {/* Checkbox */}
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0,
                  background: checked ? C.accentDk : 'transparent',
                  border:`2px solid ${checked ? C.accentDk : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s',
                }}>
                  {checked && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:22, flexShrink:0 }}>{r.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, fontSize:15, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {r.portions}p{r.cookTimeMinutes ? ` · ⏱ ${r.cookTimeMinutes}min` : ''}{r.favorite ? ' · ⭐' : ''}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign:'center', padding:20, color:C.muted, fontSize:13 }}>Aucune recette</div>}
        </div>

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

// ══════════════════════════════════════════════════════
//  RECETTES TAB
// ══════════════════════════════════════════════════════
function RecipesTab() {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useApp();
  const [search,      setSearch]      = useState('');
  const [filterFav,   setFilterFav]   = useState(false);
  const [filterTags,  setFilterTags]  = useState([]);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [detailId,    setDetailId]    = useState(null);
  const [editRec,     setEditRec]     = useState(null);

  const allTags = useMemo(() => {
    const s = new Set(); recipes.forEach(r => (r.tags||[]).forEach(t => s.add(t))); return [...s];
  }, [recipes]);

  const activeFilters = (filterFav ? 1 : 0) + filterTags.length;

  const filtered = recipes.filter(r =>
    (!filterFav || r.favorite) &&
    (!filterTags.length || (r.tags||[]).some(t => filterTags.includes(t))) &&
    (!search    || r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const detailRecipe = recipes.find(r => r.id === detailId);

  const blankRecipe = () => ({
    name:'', emoji:'🍽️', portions:4, url:'', tags:[], favorite:false,
    rating:0, cookTimeMinutes:0, note:'',
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
              background:C.accent, color:'#fff', borderRadius:'50%',
              width:16, height:16, fontSize:10, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>{activeFilters}</span>
          )}
        </button>
      </div>

      <Btn onClick={() => setEditRec(blankRecipe())} variant="primary" small style={{ marginBottom:12 }}>
        + Nouvelle recette
      </Btn>

      {/* Grille compacte */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {filtered.map(r => (
          <RecipeCard key={r.id} recipe={r}
            onClick={() => setDetailId(r.id)}
            onDelete={() => deleteRecipe(r.id)}
          />
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon="📖" text="Aucune recette trouvée" />}

      {filterOpen && (
        <FilterModal
          onClose={() => setFilterOpen(false)}
          filterFav={filterFav} setFilterFav={setFilterFav}
          filterTags={filterTags} setFilterTags={setFilterTags}
          allTags={allTags}
        />
      )}

      {detailRecipe && (
        <RecipeDetail recipe={detailRecipe}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditRec({ ...detailRecipe }); setDetailId(null); }}
          onDelete={() => { deleteRecipe(detailRecipe.id); setDetailId(null); }}
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

function FilterModal({ onClose, filterFav, setFilterFav, filterTags, setFilterTags, allTags }) {
  const [tagSearch, setTagSearch] = useState('');
  const activeCount = (filterFav ? 1 : 0) + filterTags.length;

  const toggleTag = (t) =>
    setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const visibleTags = tagSearch
    ? allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : allTags;

  const inp = { padding:'8px 11px', background:'#111419', border:`1px solid #2A3040`, borderRadius:9, color:'#E8EAF2', fontSize:13, outline:'none', width:'100%' };

  return (
    <BottomSheet title="Filtrer les recettes" onClose={onClose}>
      <div style={{ padding:16 }}>
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

        {allTags.length > 0 && (<>
          <SecTitle>
            Tags
            {filterTags.length > 0 && (
              <span style={{ marginLeft:8, background:C.accentBg, color:C.accent, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, border:`1px solid ${C.accent}44`, verticalAlign:'middle' }}>
                {filterTags.length} sélectionné{filterTags.length > 1 ? 's' : ''}
              </span>
            )}
          </SecTitle>
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
          <button onClick={() => { setFilterFav(false); setFilterTags([]); }} style={{
            width:'100%', padding:'10px', background:C.redBg, color:C.red,
            border:`1px solid ${C.red}33`, borderRadius:10, cursor:'pointer', fontSize:13, marginBottom:8,
          }}>✕ Effacer les filtres</button>
        )}
        <Btn onClick={onClose} variant="primary" style={{ width:'100%', justifyContent:'center' }}>Appliquer</Btn>
      </div>
    </BottomSheet>
  );
}

function AssignToWeekModal({ recipe, viewPortions, onClose }) {
  const { addMeal, addIngredientsFromRecipe, cats } = useApp();
  const currentWeek = getISOWeekKey();
  const [selWeek,      setSelWeek]      = useState(currentWeek);
  const [persons,      setPersons]      = useState(viewPortions || 6);
  const [done,         setDone]         = useState(false);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [multiCatData, setMultiCatData] = useState(null);
  const weeks = [];
  for (let i = 0; i < 8; i++) weeks.push(shiftWeek(currentWeek, i));

  const doAdd = (ingredientIds = null, catOverrides = {}) => {
    addMeal(selWeek, recipe.id, persons);
    if (ingredientIds?.length) addIngredientsFromRecipe(recipe, persons, ingredientIds, catOverrides);
    setDone(true);
    setTimeout(onClose, 900);
  };

  const handleIngredientConfirm = (ingredientIds) => {
    const uncat = getUncatIngredients(recipe, ingredientIds, cats);
    if (uncat.length > 0) {
      setMultiCatData({
        uncatItems: uncat.map(ing => ({ id: ing.id, name: ing.name, recipeEmoji: recipe.emoji })),
        ingredientIds,
      });
    } else {
      doAdd(ingredientIds);
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
            <button onClick={() => setPersons(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>−</button>
            <span style={{ fontWeight:700, color:C.text, minWidth:24, textAlign:'center' }}>{persons}</span>
            <button onClick={() => setPersons(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:16 }}>+</button>
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
          selections={[{ recipe, persons }]}
          onConfirm={selectedByRecipe => handleIngredientConfirm(selectedByRecipe[recipe.id] || [])}
          onSkip={() => doAdd()}
          onCancel={() => setFilterOpen(false)}
        />
      )}
      {multiCatData && (
        <MultiCategoryAssignModal
          uncatItems={multiCatData.uncatItems}
          onConfirm={(catOverrides) => { doAdd(multiCatData.ingredientIds, catOverrides); setMultiCatData(null); }}
          onCancel={() => { doAdd(multiCatData.ingredientIds); setMultiCatData(null); }}
        />
      )}
    </>
  );
}

function RecipeCard({ recipe, onClick, onDelete }) {
  const { meals } = useApp();
  const [confirmDel, setConfirmDel] = useState(false);

  const mealCount = meals.filter(m => m.recipeId === recipe.id).length;

  const handleDelete = e => {
    e.stopPropagation();
    if (confirmDel) { onDelete(); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500); }
  };

  return (
    <div onClick={onClick} style={{
      background:C.card, border:`1px solid ${C.border}`,
      borderRadius:11, padding:'10px 9px 9px', cursor:'pointer', transition:'all 0.12s',
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
            <span style={{ fontSize:10, color:C.muted }}>
              🍽 {recipe.portions}p{recipe.cookTimeMinutes > 0 ? ` · ⏱ ${recipe.cookTimeMinutes}m` : ''}
            </span>
            {mealCount > 0 && (
              <span style={{
                fontSize:9, fontWeight:700, color:C.accent,
                background:C.accentBg, border:`1px solid ${C.accent}33`,
                borderRadius:8, padding:'1px 6px', letterSpacing:'0.02em',
              }}>
                ×{mealCount}
              </span>
            )}
          </div>
        </div>

        {/* Étoile favoris + suppression */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
          {recipe.favorite
            ? <span style={{ fontSize:12, lineHeight:1 }}>⭐</span>
            : <span style={{ width:12 }} />
          }
          <button onClick={handleDelete} style={{
            background: confirmDel ? C.redBg : 'transparent',
            border: confirmDel ? `1px solid ${C.red}44` : 'none',
            color: confirmDel ? C.red : C.muted,
            borderRadius:5, padding:'1px 4px', cursor:'pointer', fontSize:11, transition:'all 0.2s',
          }}>
            {confirmDel ? '✓' : '🗑'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeDetail({ recipe, onClose, onEdit, onDelete }) {
  const { meals, showSnack } = useApp();
  const [checked,     setChecked]     = useState(new Set());
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [viewPortions, setViewPortions] = useState(recipe.portions || 4);
  const [assignOpen,  setAssignOpen]  = useState(false);

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
          <Btn onClick={share} variant="accent" small>📤</Btn>
          <Btn onClick={onEdit} small>✏️</Btn>
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
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:14, justifyContent:'center' }}>
          {recipe.cookTimeMinutes > 0 && <Chip>⏱ {recipe.cookTimeMinutes} min</Chip>}
          {timesCookedCount > 0 && <Chip color={C.green}>✅ Cuisiné {timesCookedCount}×</Chip>}
          {recipe.favorite && <Chip color={C.orange}>⭐ Favori</Chip>}
        </div>

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
            <button onClick={() => setViewPortions(p=>Math.max(1,p-1))} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:16 }}>−</button>
            <span style={{ fontWeight:700, color:C.text, minWidth:26, textAlign:'center', fontSize:14 }}>{viewPortions}</span>
            <button onClick={() => setViewPortions(p=>p+1)} style={{ background:C.border, border:'none', color:C.text, width:26, height:26, borderRadius:7, cursor:'pointer', fontSize:16 }}>+</button>
            {viewPortions !== base && (
              <button onClick={() => setViewPortions(base)} title="Réinitialiser" style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:13, paddingLeft:4 }}>↺</button>
            )}
          </div>
        </div>

        {/* Ingrédients (recalculés) */}
        <SecTitle>Ingrédients</SecTitle>
        {(recipe.ingredients||[]).map(ing => {
          const q = fmtQty(ing.qty);
          return (
            <div key={ing.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.text, fontSize:13 }}>{ing.name}</span>
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
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
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

        <div style={{ marginTop:20, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
          <Btn onClick={() => { if(confirmDel) onDelete(); else { setConfirmDel(true); setTimeout(()=>setConfirmDel(false),3000); } }}
            variant="danger" small>
            {confirmDel ? '⚠️ Confirmer' : '🗑 Supprimer la recette'}
          </Btn>
        </div>
      </div>

      {assignOpen && (
        <AssignToWeekModal recipe={recipe} viewPortions={viewPortions} onClose={() => setAssignOpen(false)} />
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

// ══════════════════════════════════════════════════════
//  HTML PARSERS  (JSON-LD → __NEXT_DATA__ → Microdata)
// ══════════════════════════════════════════════════════

/** Durée ISO 8601 → minutes  (PT1H30M → 90) */
function parseDuration(iso) {
  if (!iso) return 0;
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? (parseInt(m[1]||0) * 60) + parseInt(m[2]||0) : 0;
}

/** Extrait le nombre de portions depuis une valeur brute */
function parseServings(raw) {
  if (!raw) return 4;
  if (typeof raw === 'number') return raw;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0]) : 4;
}

/** Aplatis les instructions Schema.org (HowToStep, HowToSection, string…) */
function parseInstructions(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  if (Array.isArray(raw)) {
    return raw.flatMap(item => {
      if (!item) return [];
      if (typeof item === 'string') return [item.trim()];
      if (item['@type'] === 'HowToSection') return parseInstructions(item.itemListElement);
      return [(item.text || item.name || item.description || '').trim()];
    }).filter(Boolean);
  }
  return [];
}

/** Normalise un objet Schema.org Recipe → format interne */
function normalizeSchemaRecipe(s) {
  const rawIng = s.recipeIngredient || s.ingredients || [];
  const ingredients = (Array.isArray(rawIng) ? rawIng : [rawIng])
    .map(i => typeof i === 'string' ? i : i.name || '')
    .filter(Boolean);

  const steps = parseInstructions(s.recipeInstructions || s.instructions || s.steps);

  const tags = [];
  const cat = s.recipeCategory || s.category;
  if (cat) (Array.isArray(cat) ? cat : [cat]).forEach(c => typeof c==='string' && tags.push(c));

  return {
    name:            (typeof s.name === 'string' ? s.name : '').trim(),
    cookTimeMinutes: parseDuration(s.totalTime || s.cookTime),
    servings:        parseServings(s.recipeYield),
    ingredients,
    steps,
    tags,
    note:            s.description ? '' : '',
  };
}

/**
 * Cherche récursivement un objet { "@type": "Recipe" } dans n'importe quelle
 * structure JSON jusqu'à `depth` niveaux (gère @graph, tableaux, objets imbriqués).
 */
function findRecipeInObj(obj, depth = 10) {
  if (!obj || typeof obj !== 'object' || depth === 0) return null;
  const t = obj['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) { const r = findRecipeInObj(item, depth-1); if (r) return r; }
    return null;
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') { const r = findRecipeInObj(val, depth-1); if (r) return r; }
  }
  return null;
}

/**
 * Heuristique pour __NEXT_DATA__ : trouve un objet avec name + recipeIngredient/ingredients
 * sans forcément avoir @type = Recipe.
 */
function findRecipeHeuristic(obj, depth = 12) {
  if (!obj || typeof obj !== 'object' || depth === 0) return null;
  if (!Array.isArray(obj)) {
    if (obj.name && typeof obj.name === 'string' &&
        (obj.recipeIngredient || obj.ingredients) &&
        (obj.recipeInstructions || obj.instructions || obj.steps)) {
      return obj;
    }
  }
  const items = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of items) {
    if (val && typeof val === 'object') {
      const r = findRecipeHeuristic(val, depth-1);
      if (r) return r;
    }
  }
  return null;
}

/** Étape 2 — JSON-LD : <script type="application/ld+json"> */
function parseJsonLd(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const recipe = findRecipeInObj(json);
      if (recipe) return normalizeSchemaRecipe(recipe);
    } catch (_) {}
  }
  return null;
}

/** Étape 3 — __NEXT_DATA__ : <script id="__NEXT_DATA__"> (sites Next.js) */
function parseNextData(doc) {
  const script = doc.getElementById('__NEXT_DATA__');
  if (!script) return null;
  try {
    const json = JSON.parse(script.textContent);
    const byType = findRecipeInObj(json, 12);
    if (byType) return normalizeSchemaRecipe(byType);
    const byHeuristic = findRecipeHeuristic(json, 12);
    if (byHeuristic) return normalizeSchemaRecipe(byHeuristic);
  } catch (_) {}
  return null;
}

/** Étape 4 — Microdata : [itemtype*="schema.org/Recipe"] */
function parseMicrodata(doc) {
  const root = doc.querySelector('[itemtype*="schema.org/Recipe"],[itemtype*="Recipe"]');
  if (!root) return null;
  const get    = prop => root.querySelector(`[itemprop="${prop}"]`);
  const getVal = prop => { const el=get(prop); return el ? (el.getAttribute('content')||el.textContent.trim()) : null; };
  const getAll = prop => Array.from(root.querySelectorAll(`[itemprop="${prop}"]`))
                              .map(el => el.getAttribute('content')||el.textContent.trim())
                              .filter(Boolean);
  const name = getVal('name');
  if (!name) return null;
  return {
    name,
    cookTimeMinutes: parseDuration(getVal('totalTime') || getVal('cookTime')),
    servings:        parseServings(getVal('recipeYield')),
    ingredients:     getAll('recipeIngredient'),
    steps:           getAll('recipeInstructions'),
    tags:            getAll('recipeCategory'),
    note:            '',
  };
}

/** Pipeline complet HTML → ParsedRecipe (JSON-LD → __NEXT_DATA__ → Microdata) */
function parseHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseJsonLd(doc) || parseNextData(doc) || parseMicrodata(doc) || null;
}

function RecipeEditor({ recipe, onClose, onSave }) {
  const { recipes } = useApp();
  const [form, setForm] = useState({
    ...recipe,
    tagsStr: (recipe.tags||[]).join(', '),
    ingredients: recipe.ingredients?.length ? recipe.ingredients.map(i=>({...i})) : [{ id:genId(), name:'', qty:'', unit:'' }],
    steps: recipe.steps?.length ? [...recipe.steps] : [''],
  });

  // ── Import state ──────────────────────────────────
  const [importUrl,   setImportUrl]   = useState(recipe.url || '');
  const [importing,   setImporting]   = useState(false);
  const [importDone,  setImportDone]  = useState(false);
  const [importError, setImportError] = useState('');
  const [importMode,  setImportMode]  = useState('url');   // 'url' | 'paste'
  const [pasteText,   setPasteText]   = useState('');
  const [importStep,  setImportStep]  = useState('');
  const [dupWarning,  setDupWarning]  = useState(null); // recette existante en doublon

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

  // ── Fallback : Claude API (web_search) ────────────────────
  const fetchViaClaude = async (url) => {
    setImportStep('🤖 Analyse via Claude AI (fallback)…');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `Tu es un parseur de recettes de cuisine. Accède à l'URL fournie et extrais la recette.
Stratégie : JSON-LD (@type:Recipe) → __NEXT_DATA__ → Microdata → texte brut.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown.
Format : {"name":"...","servings":4,"cookTimeMinutes":30,"tags":["tag"],"ingredients":["200 g de farine"],"steps":["Étape 1"],"note":""}
- ingredients : chaînes BRUTES telles qu'elles apparaissent sur le site
- servings : nombre ORIGINAL du site`,
        messages: [{ role: 'user', content: `Extrais la recette de : ${url}` }],
      }),
    });
    const data = await res.json();
    const texts = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    const raw   = (texts[texts.length - 1] || '').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    const rec   = JSON.parse(raw);
    rec.ingredients = (rec.ingredients || []).map(i =>
      typeof i === 'string' ? i : [i.qty||'', i.unit||'', i.name||''].filter(Boolean).join(' ')
    );
    return rec;
  };

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
          try { raw = await fetchJow(url); }
          catch (e) {
            setImportStep('↩ API Jow inaccessible, essai HTML…');
            raw = await tryHtmlPipeline(url);
          }
        } else {
          raw = await tryHtmlPipeline(url);
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
      console.error(e);
      const isBadJson = e.message?.includes('JSON') || e.message?.includes('parse') || e instanceof SyntaxError;
      setImportError(isBadJson
        ? 'Données structurées introuvables. Essaie le mode "Coller le texte".'
        : (e.message || "Impossible d'extraire la recette."));
      setImportStep('');
    } finally {
      setImporting(false);
    }
  };

  // Essaie le pont Android, puis Claude en fallback
  const tryHtmlPipeline = async (url) => {
    try   { return await fetchViaAndroid(url); }
    catch (e) {
      setImportStep(`↩ ${e.message} — bascule sur Claude AI…`);
      return await fetchViaClaude(url);
    }
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
      tags: form.tagsStr.split(',').map(t=>t.trim()).filter(Boolean),
      ingredients: form.ingredients.filter(i=>i.name.trim()),
      steps: form.steps.filter(s=>s.trim()),
      portions: parseInt(form.portions)||6,
      cookTimeMinutes: parseInt(form.cookTimeMinutes)||0,
    });
  };

  const inp = { padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:14, outline:'none', width:'100%' };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:600, background:C.bg, overflowY:'auto', animation:'fadeIn 0.18s' }}>
      <div style={{
        background:C.card, borderBottom:`1px solid ${C.border}`,
        padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center',
        position:'sticky', top:0, zIndex:10,
      }}>
        <Btn onClick={onClose} small>Annuler</Btn>
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
                    color: importMode===m ? '#fff' : C.muted,
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

            {/* Étape en cours */}
            {importing && importStep && (
              <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, color:C.accent, fontSize:12 }}>
                <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⚙️</span>
                {importStep}
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
              <button onClick={() => adjustPortions(-1)} style={{
                background:C.border, border:'none', color:C.text, width:32, height:32,
                borderRadius:8, cursor:'pointer', fontSize:18, flexShrink:0, lineHeight:1,
              }}>−</button>
              <span style={{ fontWeight:700, color:C.text, minWidth:28, textAlign:'center', fontSize:16 }}>
                {parseInt(form.portions)||1}
              </span>
              <button onClick={() => adjustPortions(1)} style={{
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
            <button onClick={()=>remIng(ing.id)} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:18, padding:'0 4px' }}>×</button>
          </div>
        ))}
        <Btn onClick={addIng} variant="ghost" small style={{ marginBottom:20 }}>+ Ingrédient</Btn>

        <SecTitle>Étapes</SecTitle>
        {form.steps.map((step, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
            <span style={{ color:C.muted, fontWeight:700, fontSize:13, paddingTop:9, minWidth:18 }}>{i+1}.</span>
            <textarea value={step} onChange={e=>updStep(i,e.target.value)} placeholder={`Étape ${i+1}...`} rows={2}
              style={{ ...inp, resize:'vertical', flex:1 }} />
            <button onClick={()=>remStep(i)} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:18, paddingTop:6 }}>×</button>
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
  const inp = { padding:'7px 10px', background:'#111419', border:`1px solid #2A3040`, borderRadius:8, color:'#E8EAF2', fontSize:12, outline:'none' };

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
            background: bulkCat ? C.accentDk : C.border, color: bulkCat?'#fff':C.muted,
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
                color: newName.trim() ? '#fff' : C.muted,
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
  const { cats, addCat } = useApp();
  const sortedCats = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newEmoji,  setNewEmoji]  = useState('📦');

  const inp = { padding:'8px 11px', background:'#111419', border:`1px solid #2A3040`, borderRadius:9, color:'#E8EAF2', fontSize:13, outline:'none' };

  const handleCreateAndAdd = () => {
    if (!newName.trim()) return;
    const newId = genId();
    addCat({ id: newId, name: newName.trim(), emoji: newEmoji, kw: [] });
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
                color: newName.trim() ? '#fff' : C.muted,
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
  const { shopping, cats, addShoppingItem, deleteItemsByCategory, clearChecked, clearAll, showSnack, reorderCats } = useApp();
  const [newName,  setNewName]  = useState('');
  const [newQty,   setNewQty]   = useState('');
  const [newUnit,  setNewUnit]  = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
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
    const hasKeywordMatch = cats.some(c =>
      c.kw?.length > 0 && c.kw.some(k => matchesKeyword(name.toLowerCase(), k.toLowerCase()))
    );
    if (!hasKeywordMatch) {
      setCatAssignItem({ name, qty: newQty, unit: newUnit });
    } else {
      addShoppingItem(name, newQty, newUnit);
      setNewName(''); setNewQty(''); setNewUnit('');
    }
  };

  const shareList = () => {
    const text = sortedCats.map(cat => {
      const items = shopping.filter(s => s.categoryId===cat.id);
      if (!items.length) return '';
      return `${cat.emoji} ${cat.name}\n${items.map(i => `  · ${i.name}${i.qty?` – ${i.qty}${i.unit?' '+i.unit:''}`:''}${i.fromRecipeId?' 📅':''}`).join('\n')}`;
    }).filter(Boolean).join('\n\n');
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
        <button onClick={handleAdd} style={{
          background:C.accentDk, color:'#fff', border:'none', borderRadius:7,
          width:28, height:28, fontSize:18, cursor:'pointer', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>+</button>
      </div>

      {/* ── Barre articles + actions ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:11, color:C.muted }}>
          {shopping.length} article{shopping.length!==1?'s':''}
          {checkedCount > 0 && <span style={{ color:C.green }}> · {checkedCount} coché{checkedCount>1?'s':''}</span>}
        </span>
        <div style={{ display:'flex', gap:5, position:'relative' }}>
          <Btn onClick={shareList} small variant="ghost">📤</Btn>
          <div style={{ position:'relative' }}>
            <Btn onClick={() => setMenuOpen(m=>!m)} small variant="ghost">⋯</Btn>
            {menuOpen && (
              <div style={{
                position:'absolute', right:0, top:'110%', background:C.card,
                border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden',
                minWidth:190, zIndex:200, boxShadow:'0 12px 32px rgba(0,0,0,0.5)',
                animation:'fadeIn 0.12s',
              }}>
                {checkedCount > 0 && (
                  <button onClick={() => { clearChecked(); setMenuOpen(false); }} style={{
                    display:'block', width:'100%', padding:'10px 14px', background:'none',
                    color:C.text, border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                    borderBottom:`1px solid ${C.border}`,
                  }}>✅ Vider les cochés ({checkedCount})</button>
                )}
                {!confirmClear ? (
                  <button onClick={() => setConfirmClear(true)} style={{
                    display:'block', width:'100%', padding:'10px 14px', background:'none',
                    color:C.red, border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                  }}>🗑 Tout vider</button>
                ) : (
                  <div style={{ padding:'10px 14px' }}>
                    <div style={{ fontSize:12, color:C.red, marginBottom:8, fontWeight:600 }}>Vider toute la liste ?</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { clearAll(); setMenuOpen(false); setConfirmClear(false); }} style={{
                        flex:1, padding:'6px', borderRadius:7, border:'none',
                        background:C.red, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                      }}>Confirmer</button>
                      <button onClick={() => setConfirmClear(false)} style={{
                        flex:1, padding:'6px', borderRadius:7, border:`1px solid ${C.border}`,
                        background:'transparent', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                      }}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {shopping.length === 0 && <EmptyState icon="🛒" text="La liste est vide" />}

      {/* ── Catégories draggables ── */}
      {sortedCats.map((cat, idx) => {
        const items = shopping.filter(s => s.categoryId===cat.id);
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
        const orphans = shopping.filter(s => !cats.find(c => c.id === s.categoryId));
        if (!orphans.length) return null;
        return (
          <div style={{ marginBottom:7, borderRadius:10, overflow:'hidden', border:`1px dashed ${C.orange}66` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:C.orangeBg }}>
              <span style={{ fontSize:15 }}>⚠️</span>
              <span style={{ fontWeight:600, fontSize:12, color:C.orange, flex:1 }}>Non catégorisé</span>
              <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:C.orange, padding:'1px 7px', borderRadius:20 }}>{orphans.length}</span>
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
            addShoppingItem(catAssignItem.name, catAssignItem.qty, catAssignItem.unit, catId);
            setNewName(''); setNewQty(''); setNewUnit('');
            setCatAssignItem(null);
          }}
          onCancel={() => setCatAssignItem(null)}
        />
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
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 12px', background:C.card, userSelect:'none' }}>
        <span style={{ color:C.muted, fontSize:14, cursor:'grab', paddingRight:2 }}>≡</span>
        {/* Tout supprimer la catégorie */}
        <button
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
          <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{cat.name}</span>
          <span style={{
            fontSize:10, fontWeight:700, color:'#fff',
            background:C.accent, padding:'1px 7px', borderRadius:20, marginLeft:'auto',
          }}>{items.length}</span>
          <span style={{ color:C.muted, fontSize:10 }}>{open?'▲':'▼'}</span>
        </span>
        {/* Boutons de réordonnancement */}
        <div style={{ display:'flex', flexDirection:'column', gap:1, flexShrink:0, marginLeft:4 }}>
          <button onPointerDown={e => { e.stopPropagation(); onMoveUp?.(); }} style={{
            background: onMoveUp ? C.border : 'transparent', border:'none',
            color: onMoveUp ? C.soft : C.border, borderRadius:4,
            width:22, height:18, fontSize:10, cursor: onMoveUp ? 'pointer' : 'default',
            lineHeight:1, padding:0, fontFamily:'inherit',
          }}>▲</button>
          <button onPointerDown={e => { e.stopPropagation(); onMoveDown?.(); }} style={{
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
  const { deleteShoppingItem, updateShoppingItem, cats } = useApp();
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty,  setEditQty]  = useState(item.qty || '');
  const [editUnit, setEditUnit] = useState(item.unit || '');
  const [editCat,  setEditCat]  = useState(item.categoryId || '');

  const sortedCats = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);

  const saveEdit = () => {
    if (editName.trim()) updateShoppingItem(item.id, {
      name: editName.trim(), qty: parseFloat(editQty)||0,
      unit: editUnit, categoryId: editCat,
    });
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
        border:`2px solid ${item.checked ? C.green : C.border}`,
        color:'#fff', cursor:'pointer', fontSize:10,
        display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
      }}>
        {item.checked ? '✓' : ''}
      </button>
      <span onClick={() => !item.checked && setEditing(true)} style={{
        flex:1, color:C.text, fontSize:13, lineHeight:1.3, textAlign:'center',
        textDecoration: item.checked ? 'line-through' : 'none',
        cursor: item.checked ? 'default' : 'pointer',
      }}>{item.name}</span>
      {item.fromRecipeId && <span style={{ fontSize:10, color:C.accent, flexShrink:0 }}>📅</span>}
      {item.qty > 0 && (
        <span onClick={() => !item.checked && setEditing(true)} style={{
          color:'#fff', fontSize:13, flexShrink:0, cursor: item.checked?'default':'pointer',
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

  // ── Calculs de base ──
  const favCount     = recipes.filter(r => r.favorite).length;
  const totalPersons = meals.reduce((s, m) => s + (m.persons || 0), 0);
  const activeWeeks  = new Set(meals.map(m => m.weekKey)).size;

  // ── Stats par recette ──
  const recipeCount   = {};
  const recipePersons = {};
  const recipeLastTs  = {}; // dernier repas cuisiné (done)
  meals.forEach(m => {
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

  // ── Répartition tags ──
  const tagCount = {};
  meals.forEach(m => {
    const r = recipes.find(x => x.id === m.recipeId);
    (r?.tags||[]).forEach(t => { tagCount[t] = (tagCount[t]||0)+1; });
  });
  const topTags    = Object.entries(tagCount).sort(([,a],[,b]) => b-a).slice(0,8);
  const maxTagCnt  = topTags[0]?.[1] || 1;

  // ── Heatmap 12 semaines ──
  const cw = getISOWeekKey();
  const heatWeeks = Array.from({ length:12 }, (_, i) => {
    const key   = shiftWeek(cw, i - 11);
    const count = meals.filter(m => m.weekKey === key).length;
    return { key, wn: key.split('-W')[1], count };
  });
  const maxHeat = Math.max(...heatWeeks.map(w => w.count), 1);
  const heatColor = (count) => {
    if (count === 0) return C.border;
    const t = Math.min(count / maxHeat, 1);
    return `rgba(123,168,232,${0.2 + t * 0.8})`;
  };

  // ── Recettes jamais planifiées ──
  const usedIds      = new Set(meals.map(m => m.recipeId));
  const neverPlanned = recipes.filter(r => !usedIds.has(r.id));

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

      {/* ── Heatmap ── */}
      {meals.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
            🗓 Activité — 12 dernières semaines
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:3 }}>
            {heatWeeks.map(({ key, wn, count }) => (
              <div key={key} title={`S${wn} — ${count} repas`} style={{
                aspectRatio:'1', borderRadius:5,
                background: heatColor(count),
                border: key===cw ? `2px solid ${C.accent}` : '1px solid transparent',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ fontSize:7, color: count>0?C.text:C.muted, lineHeight:1.2 }}>S{wn}</span>
                {count > 0 && <span style={{ fontSize:8, fontWeight:700, color:C.text }}>{count}</span>}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:10, justifyContent:'flex-end' }}>
            <span style={{ fontSize:10, color:C.muted }}>0</span>
            {[0.15, 0.4, 0.7, 1].map(i => (
              <div key={i} style={{ width:11, height:11, borderRadius:3, background:`rgba(123,168,232,${i})` }} />
            ))}
            <span style={{ fontSize:10, color:C.muted }}>max</span>
          </div>
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
                    <span key={t} style={{ background:C.accentBg, color:C.accent, fontSize:10, padding:'2px 8px', borderRadius:20 }}>{t}</span>
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
                  <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{n}× · {persons}p</span>
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
              <span style={{ fontSize:12, color:C.soft, flex:1 }}>{r.name}</span>
              {r.favorite && <span style={{ fontSize:12 }}>⭐</span>}
              {(r.tags||[]).length > 0 && (
                <span style={{ fontSize:10, color:C.muted }}>{r.tags[0]}</span>
              )}
            </div>
          ))}
        </div>
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
      {sub && <div style={{ fontSize:10, color:C.muted, marginTop:2, opacity:0.75 }}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  OPTIONS TAB
// ══════════════════════════════════════════════════════
function SettingsTab() {
  const { cats, settings, recipes, meals, shopping, deleteCat, updSettings, importAllData, showSnack, reorderCats } = useApp();
  const [editCat,  setEditCat]  = useState(null); // cat object en édition
  const [addOpen,  setAddOpen]  = useState(false);
  const [importErr, setImportErr] = useState('');
  const fileRef = useRef(null);

  const sorted = useMemo(() => [...cats].sort((a,b) => a.order-b.order), [cats]);

  const moveCat = (id, dir) => {
    const list = [...cats].sort((a,b) => a.order - b.order);
    const idx  = list.findIndex(c => c.id === id);
    const next = idx + dir;
    if (next < 0 || next >= list.length) return;
    [list[idx], list[next]] = [list[next], list[idx]];
    reorderCats(list);
  };

  // ── Export JSON ──────────────────────────────────────
  const handleExport = () => {
    const data = {
      version: VERSION,
      exportDate: new Date().toISOString(),
      recipes, meals, shopping, cats, settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `meal-plan-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSnack('✅ Sauvegarde exportée');
  };

  // ── Import JSON ──────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.recipes && !data.cats) throw new Error('Fichier invalide');
        importAllData(data);
        showSnack('✅ Données restaurées avec succès');
        setImportErr('');
      } catch {
        setImportErr('Fichier JSON invalide ou corrompu.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding:16 }}>

      {/* ── Catégories ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <SecTitle style={{ margin:0 }}>Catégories de courses</SecTitle>
        <Btn onClick={() => setAddOpen(true)} variant="primary" small>+ Nouvelle</Btn>
      </div>
      <div style={{
        background:C.accentBg, border:`1px solid ${C.accent}33`,
        borderRadius:10, padding:'8px 12px', marginBottom:10,
        display:'flex', gap:8, alignItems:'center',
      }}>
        <span style={{ fontSize:15 }}>🛒</span>
        <span style={{ fontSize:12, color:C.soft, lineHeight:1.5 }}>
          Glisse ≡ ou utilise ▲▼ pour définir l'ordre des rayons — il s'applique automatiquement dans la liste de courses.
        </span>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'4px 0', marginBottom:16 }}>
        {sorted.map((cat, idx) => (
          <div key={cat.id}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
              borderBottom: idx<sorted.length-1 ? `1px solid ${C.border}` : 'none',
            }}>
            <span style={{ fontSize:11, color:C.muted, minWidth:16, textAlign:'right', flexShrink:0 }}>{idx+1}</span>
            <span style={{ fontSize:20, flexShrink:0 }}>{cat.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:500, color:C.text, fontSize:13 }}>{cat.name}</div>
              <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {cat.kw?.length > 0 ? cat.kw.slice(0,5).join(', ') + (cat.kw.length > 5 ? '…' : '') : 'Aucun mot-clé'}
              </div>
            </div>
            {/* Boutons ↑↓ */}
            <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
              <button onClick={() => moveCat(cat.id, -1)} disabled={idx===0} style={{
                background: idx===0 ? 'transparent' : C.border, border:'none',
                color: idx===0 ? C.border : C.soft, borderRadius:4,
                width:22, height:18, fontSize:10, cursor: idx===0?'default':'pointer',
                lineHeight:1, padding:0, fontFamily:'inherit',
              }}>▲</button>
              <button onClick={() => moveCat(cat.id, +1)} disabled={idx===sorted.length-1} style={{
                background: idx===sorted.length-1 ? 'transparent' : C.border, border:'none',
                color: idx===sorted.length-1 ? C.border : C.soft, borderRadius:4,
                width:22, height:18, fontSize:10, cursor: idx===sorted.length-1?'default':'pointer',
                lineHeight:1, padding:0, fontFamily:'inherit',
              }}>▼</button>
            </div>
            <button onClick={() => setEditCat(cat)} style={{
              background:C.accentBg, border:`1px solid ${C.accent}33`, color:C.accent,
              borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:12, flexShrink:0,
            }}>✏️</button>
            {cat.name !== 'Autre' && (
              <button onClick={() => deleteCat(cat.id)} style={{
                background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16, opacity:0.7, flexShrink:0,
              }}>×</button>
            )}
          </div>
        ))}
      </div>

      {/* ── Sauvegarde ── */}
      <SecTitle>Sauvegarde & Restauration</SecTitle>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
          Exportez toutes vos données (recettes, planning, courses, catégories) dans un fichier JSON. Vous pourrez les restaurer à tout moment.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={handleExport} variant="primary" style={{ flex:1, justifyContent:'center' }}>
            📤 Exporter
          </Btn>
          <Btn onClick={() => fileRef.current?.click()} variant="default" style={{ flex:1, justifyContent:'center' }}>
            📥 Importer
          </Btn>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display:'none' }} />
        </div>
        {importErr && (
          <div style={{ marginTop:10, color:C.red, fontSize:12 }}>⚠️ {importErr}</div>
        )}
        <div style={{ marginTop:12, fontSize:11, color:C.muted, lineHeight:1.6 }}>
          {recipes.length} recette{recipes.length!==1?'s':''} · {meals.length} repas · {shopping.length} article{shopping.length!==1?'s':''} · {cats.length} catégorie{cats.length!==1?'s':''}
        </div>
      </div>

      {/* ── À propos ── */}
      <SecTitle>À propos</SecTitle>
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
            <span style={{ color:C.accent }}>1.8.0</span> — Planning annuel · compacité · multi-ajout<br/>
            <span style={{ color:C.accent }}>1.9.0</span> — Import recettes depuis sites web<br/>
            <span style={{ color:C.accent }}>2.0.0</span> — IngredientParser · EmojiGuesser · Jow API<br/>
            <span style={{ color:C.accent }}>2.1.0</span> — Édition catégories · Export/Import JSON<br/>
            <span style={{ color:C.accent }}>2.2.0</span> — Persistance localStorage · Emoji libre<br/>
            <span style={{ color:C.accent }}>2.3.0</span> — Stepper portions · Multi-tags · Filtre ingrédients depuis recette<br/>
            <span style={{ color:C.accent }}>2.4.0</span> — Catégorisation intelligente · Doublon import · Ordre rayons<br/>
            <span style={{ color:C.accent }}>2.5.0</span> — Ouvrir recette depuis planning · UX courses · Corrections
          </div>
        </div>
      </div>

      {/* ── Modaux ── */}
      {editCat && (
        <CategoryEditModal cat={editCat} onClose={() => setEditCat(null)} />
      )}
      {addOpen && (
        <CategoryAddModal onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}

function CategoryEditModal({ cat, onClose }) {
  const { updateCat } = useApp();
  const [emoji, setEmoji] = useState(cat.emoji || '📦');
  const [name,  setName]  = useState(cat.name || '');
  const [kwStr, setKwStr] = useState((cat.kw || []).join(', '));
  const inp = { padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none', width:'100%' };

  const save = () => {
    if (!name.trim()) return;
    updateCat({ ...cat, emoji, name:name.trim(), kw:kwStr.split(/[,\n]+/).map(k=>k.trim().toLowerCase()).filter(Boolean) });
    onClose();
  };

  return (
    <BottomSheet title={`Modifier la catégorie`} onClose={onClose}>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
          <EmojiInput value={emoji} onChange={setEmoji} />
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Nom</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>
            🔑 Mots-clés <span style={{ fontWeight:400 }}>(séparés par virgule)</span>
          </label>
          <textarea value={kwStr} onChange={e=>setKwStr(e.target.value)} rows={4}
            placeholder="poulet, bœuf, saumon, dinde..."
            style={{ ...inp, resize:'vertical', lineHeight:1.7 }}
          />
          <div style={{ fontSize:11, color:C.muted, marginTop:5, lineHeight:1.5 }}>
            Les articles dont le nom contient un de ces mots sont classés automatiquement dans cette catégorie.
          </div>
        </div>
        <Btn onClick={save} variant="primary" disabled={!name.trim()} style={{ width:'100%', justifyContent:'center' }}>
          Enregistrer
        </Btn>
      </div>
    </BottomSheet>
  );
}

function CategoryAddModal({ onClose }) {
  const { addCat } = useApp();
  const [emoji, setEmoji] = useState('📦');
  const [name,  setName]  = useState('');
  const [kwStr, setKwStr] = useState('');
  const inp = { padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:13, outline:'none', width:'100%' };

  const create = () => {
    if (!name.trim()) return;
    addCat({ name:name.trim(), emoji, kw:kwStr.split(/[,\n]+/).map(k=>k.trim().toLowerCase()).filter(Boolean) });
    onClose();
  };

  return (
    <BottomSheet title="Nouvelle catégorie" onClose={onClose}>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
          <EmojiInput value={emoji} onChange={setEmoji} />
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Nom *</label>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="Surgelés, Épices, Apéro..."
              style={inp}
            />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>
            🔑 Mots-clés <span style={{ fontWeight:400 }}>(séparés par virgule)</span>
          </label>
          <textarea value={kwStr} onChange={e=>setKwStr(e.target.value)} rows={4}
            placeholder="tofu, tempeh, seitan, edamame..."
            style={{ ...inp, resize:'vertical', lineHeight:1.7 }}
          />
          <div style={{ fontSize:11, color:C.muted, marginTop:5, lineHeight:1.5 }}>
            Facultatif — les articles contenant ces mots seront classés ici automatiquement.
          </div>
        </div>
        <Btn onClick={create} variant="primary" disabled={!name.trim()} style={{ width:'100%', justifyContent:'center' }}>
          Créer la catégorie
        </Btn>
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
      position:'fixed', bottom:84, left:'50%', transform:'translateX(-50%)',
      background:'#253040', color:C.text, padding:'12px 16px',
      borderRadius:14, display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 28px rgba(0,0,0,0.5)', zIndex:600,
      animation:'slideUp 0.2s ease', maxWidth:360, width:'calc(100% - 32px)',
      border:`1px solid ${C.border}`,
    }}>
      <span style={{ flex:1, fontSize:13 }}>{snack.msg}</span>
      {snack.undo && (
        <button onClick={() => { snack.undo(); setSnack(null); }} style={{
          background:C.accent, color:'#fff', border:'none',
          padding:'5px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700,
        }}>Annuler</button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  APP SHELL
// ══════════════════════════════════════════════════════
function AppShell() {
  const [tab, setTab] = useState('shopping');
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [tab]);

  return (
    <div style={{ height:'100vh', background:C.bg, display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', overflow:'hidden' }}>
      <AppHeader tab={tab} />
      <main ref={mainRef} style={{ flex:1, overflowY:'auto', paddingBottom:70 }}>
        {tab === 'planning' && <PlanningTab />}
        {tab === 'recipes'  && <RecipesTab />}
        {tab === 'shopping' && <ShoppingTab />}
        {tab === 'stats'    && <StatsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
      <Snackbar />
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  EXPORT PRINCIPAL
// ══════════════════════════════════════════════════════
export default function MealPlanApp() {
  return (
    <AppProvider>
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: #111419; font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; }
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #2A3040; border-radius: 4px; }
          @keyframes fadeIn  { from { opacity: 0; }              to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <AppShell />
      </>
    </AppProvider>
  );
}
