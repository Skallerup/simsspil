/* Hjemliv — spildata */
'use strict';
const H = window.H = {};

H.WORLD = 32;
H.LOT = { x0: 4, z0: 5, x1: 28, z1: 29 }; // fliser x i [x0,x1), z i [z0,z1)
H.WALL_H = 2.7;
H.SPEEDS = [0, 1, 3, 12];
H.START_MONEY = 20000;
H.DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

H.NEEDS = [
  { id: 'hunger', name: 'Sult', icon: '🍽️' },
  { id: 'energy', name: 'Energi', icon: '⚡' },
  { id: 'hygiene', name: 'Hygiejne', icon: '🫧' },
  { id: 'bladder', name: 'Blære', icon: '🚽' },
  { id: 'fun', name: 'Sjov', icon: '🎈' },
  { id: 'social', name: 'Socialt', icon: '💬' }
];
// fald pr. spiltime
H.NEED_DECAY = { hunger: 5.5, energy: 5.2, hygiene: 3.8, bladder: 8, fun: 5, social: 4.2 };
H.PET_NEEDS = ['hunger', 'energy', 'fun', 'social'];
H.BABY_NEEDS = ['hunger', 'energy', 'hygiene', 'fun', 'social'];

H.SKILLS = [
  { id: 'cooking', name: 'Madlavning', icon: '🍳' },
  { id: 'creativity', name: 'Kreativitet', icon: '🎨' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'logic', name: 'Logik', icon: '♟️' },
  { id: 'charisma', name: 'Karisma', icon: '🎤' },
  { id: 'handy', name: 'Håndværk', icon: '🔧' }
];
H.skillXpFor = (lvl) => 30 * lvl * (lvl + 1); // samlet xp for niveau

H.TRAITS = [
  { id: 'aktiv', name: 'Aktiv', icon: '🏃', desc: 'Lærer fitness hurtigere og elsker at træne.' },
  { id: 'doven', name: 'Doven', icon: '🛋️', desc: 'Får mere sjov af fjernsyn, men træner nødigt.' },
  { id: 'kreativ', name: 'Kreativ', icon: '🎨', desc: 'Lærer kreativitet hurtigere og nyder at male.' },
  { id: 'noerd', name: 'Nørd', icon: '🤓', desc: 'Lærer logik hurtigere og elsker computere og skak.' },
  { id: 'udadvendt', name: 'Udadvendt', icon: '🥳', desc: 'Har brug for selskab og er god til samtaler.' },
  { id: 'genert', name: 'Genert', icon: '🙈', desc: 'Klarer sig fint alene, men samtaler er svære.' },
  { id: 'madglad', name: 'Madglad', icon: '🍰', desc: 'Lærer madlavning hurtigere, men bliver hurtigt sulten.' },
  { id: 'renlig', name: 'Renlig', icon: '🧼', desc: 'Holder sig ren længere og hader at være beskidt.' },
  { id: 'sjusket', name: 'Sjusket', icon: '🧦', desc: 'Bliver hurtigt beskidt, men er ligeglad.' },
  { id: 'romantisk', name: 'Romantisk', icon: '💘', desc: 'Bedre til flirt og romantik.' },
  { id: 'legesyg', name: 'Legesyg', icon: '🤡', desc: 'Elsker vittigheder og har brug for sjov.' },
  { id: 'hidsig', name: 'Hidsig', icon: '😤', desc: 'Kommer let op at skændes.' },
  { id: 'dyreven', name: 'Dyreven', icon: '🐾', desc: 'Får ekstra glæde af kæledyr.' },
  { id: 'ambitioes', name: 'Ambitiøs', icon: '📈', desc: 'Klarer sig bedre på jobbet.' },
  { id: 'munter', name: 'Munter', icon: '😄', desc: 'Er i bedre humør end de fleste.' }
];
H.TRAIT_CONFLICT = [['aktiv', 'doven'], ['udadvendt', 'genert'], ['renlig', 'sjusket']];

H.ASPIRATIONS = [
  { id: 'kunstner', name: 'Kunstnerisk mester', icon: '🎨', desc: 'Bliv en anerkendt kunstner.',
    steps: [{ label: 'Nå kreativitet niveau 3', t: a => a.skills.creativity >= 3 }, { label: 'Mal 5 malerier', t: a => (a.stats.paint || 0) >= 5 }, { label: 'Nå kreativitet niveau 8', t: a => a.skills.creativity >= 8 }] },
  { id: 'karriere', name: 'Karrierehaj', icon: '💼', desc: 'Nå toppen af en karriere.',
    steps: [{ label: 'Find et job', t: a => a.career && a.career.id !== 'school' }, { label: 'Nå karriereniveau 3', t: a => a.career && a.career.id !== 'school' && a.career.level >= 2 }, { label: 'Nå karriereniveau 6', t: a => a.career && a.career.id !== 'school' && a.career.level >= 5 }] },
  { id: 'social', name: 'Social sommerfugl', icon: '🦋', desc: 'Få venner overalt.',
    steps: [{ label: 'Få 2 venner', t: a => H.sim && H.sim.countFriends(a, 30) >= 2 }, { label: 'Få 4 venner', t: a => H.sim && H.sim.countFriends(a, 30) >= 4 }, { label: 'Få en bedste ven', t: a => H.sim && H.sim.countFriends(a, 80) >= 1 }] },
  { id: 'familie', name: 'Familiemenneske', icon: '🏡', desc: 'Byg en stor, lykkelig familie.',
    steps: [{ label: 'Få en kæreste', t: a => H.sim && H.sim.hasStatus(a, ['kæreste', 'forlovet', 'gift']) }, { label: 'Bliv gift', t: a => H.sim && H.sim.hasStatus(a, ['gift']) }, { label: 'Hav 4 i husstanden', t: a => H.G && H.G.household.length + H.G.pets.length >= 4 }] },
  { id: 'rig', name: 'Rigdom', icon: '💰', desc: 'Saml en formue.',
    steps: [{ label: 'Hav 30.000 kr', t: a => H.G && H.G.money >= 30000 }, { label: 'Hav 60.000 kr', t: a => H.G && H.G.money >= 60000 }, { label: 'Hav 120.000 kr', t: a => H.G && H.G.money >= 120000 }] },
  { id: 'kok', name: 'Mesterkok', icon: '👩‍🍳', desc: 'Bliv den bedste kok i byen.',
    steps: [{ label: 'Nå madlavning niveau 3', t: a => a.skills.cooking >= 3 }, { label: 'Lav 10 måltider', t: a => (a.stats.cook || 0) >= 10 }, { label: 'Nå madlavning niveau 8', t: a => a.skills.cooking >= 8 }] },
  { id: 'fit', name: 'Fitnessfreak', icon: '🏋️', desc: 'Kom i topform.',
    steps: [{ label: 'Nå fitness niveau 3', t: a => a.skills.fitness >= 3 }, { label: 'Træn 10 timer', t: a => (a.stats.workout || 0) >= 600 }, { label: 'Nå fitness niveau 8', t: a => a.skills.fitness >= 8 }] },
  { id: 'hjerne', name: 'Hjernekraft', icon: '🧠', desc: 'Bliv et geni.',
    steps: [{ label: 'Nå logik niveau 3', t: a => a.skills.logic >= 3 }, { label: 'Nå logik niveau 6', t: a => a.skills.logic >= 6 }, { label: 'Nå logik niveau 10', t: a => a.skills.logic >= 10 }] }
];
H.ASP_POINTS = [500, 1000, 2500];

H.REWARDS = [
  { id: 'natteravn', name: 'Natteravn', cost: 1500, desc: 'Energi falder 30 % langsommere.' },
  { id: 'jernmave', name: 'Jernmave', cost: 1500, desc: 'Sult falder 30 % langsommere.' },
  { id: 'staalblaere', name: 'Stålblære', cost: 1000, desc: 'Blære falder 40 % langsommere.' },
  { id: 'hurtiglaerer', name: 'Hurtig lærer', cost: 2000, desc: 'Lærer alle færdigheder 50 % hurtigere.' },
  { id: 'charmoer', name: 'Charmør', cost: 1500, desc: 'Samtaler lykkes oftere.' },
  { id: 'raket', name: 'Karriereraket', cost: 2000, desc: '50 % bedre præstation på jobbet.' },
  { id: 'godthumoer', name: 'Altid godt humør', cost: 2500, desc: 'Permanent +15 i humør.' },
  { id: 'evigung', name: 'Evig ungdom', cost: 3000, desc: 'Personen ældes ikke længere.' }
];

H.CAREERS = [
  { id: 'tech', name: 'Teknologi', icon: '💻', skill: 'logic', levels: [
    ['Supporttekniker', 420, 9, 17], ['Juniorudvikler', 600, 9, 17], ['Udvikler', 780, 9, 17],
    ['Seniorudvikler', 1020, 10, 18], ['Tech lead', 1380, 10, 18], ['Teknologidirektør', 1950, 10, 16]], req: [0, 1, 2, 4, 6, 8] },
  { id: 'culinary', name: 'Kulinarisk', icon: '🍽️', skill: 'cooking', levels: [
    ['Opvasker', 360, 15, 22], ['Køkkenhjælp', 520, 15, 22], ['Kok', 720, 15, 22],
    ['Souschef', 960, 14, 21], ['Køkkenchef', 1300, 14, 21], ['Stjernekok', 1850, 13, 19]], req: [0, 1, 3, 4, 6, 8] },
  { id: 'art', name: 'Kunst', icon: '🎨', skill: 'creativity', levels: [
    ['Gadekunstner', 380, 10, 16], ['Kunstnerassistent', 540, 10, 17], ['Illustrator', 740, 10, 17],
    ['Kunstner', 990, 11, 17], ['Udstillende kunstner', 1350, 11, 17], ['Mesterkunstner', 1900, 12, 16]], req: [0, 1, 3, 4, 6, 8] },
  { id: 'sport', name: 'Sport', icon: '⚽', skill: 'fitness', levels: [
    ['Vandbærer', 400, 8, 15], ['Reservespiller', 560, 8, 15], ['Spiller', 780, 8, 15],
    ['Stjernespiller', 1050, 9, 15], ['Anfører', 1420, 9, 15], ['Legende', 2000, 10, 15]], req: [0, 1, 3, 4, 6, 8] },
  { id: 'business', name: 'Erhverv', icon: '📊', skill: 'charisma', levels: [
    ['Praktikant', 400, 9, 17], ['Assistent', 580, 9, 17], ['Konsulent', 800, 9, 17],
    ['Afdelingsleder', 1080, 8, 17], ['Direktør', 1450, 9, 17], ['Koncernchef', 2100, 10, 16]], req: [0, 1, 2, 4, 6, 8] }
];
H.SCHOOL = { id: 'school', name: 'Skole', icon: '🏫', levels: [['Elev', 0, 8, 14]] };

H.AGES = [
  { id: 'baby', name: 'Baby', days: 2, scale: 0.42, head: 1.75 },
  { id: 'child', name: 'Barn', days: 5, scale: 0.62, head: 1.3 },
  { id: 'teen', name: 'Teenager', days: 5, scale: 0.9, head: 1.06 },
  { id: 'young', name: 'Ung voksen', days: 7, scale: 1, head: 1 },
  { id: 'adult', name: 'Voksen', days: 9, scale: 1, head: 1 },
  { id: 'elder', name: 'Ældre', days: Infinity, scale: 0.96, head: 1 }
];
H.ageIdx = id => H.AGES.findIndex(a => a.id === id);
H.isAdult = a => ['young', 'adult', 'elder'].includes(a.age);
H.TRAIT_SLOTS = { baby: 0, child: 1, teen: 2, young: 3, adult: 3, elder: 3 };

H.SKIN = ['#f6dcc8', '#f0c8a8', '#e3b08a', '#c98f66', '#a86f4b', '#7f5136', '#5e3a26', '#3f2719'];
H.HAIRCOL = ['#1e1612', '#3b2618', '#6b4226', '#9a6a3a', '#c99a5b', '#e6c88a', '#b5482e', '#e8e3dc', '#8f8a86', '#5b3f7a', '#2c6e8f', '#d46a9a'];
H.EYECOL = ['#4a2f1c', '#7a5230', '#3c6e8f', '#5a9bc0', '#4f7a3a', '#6b6b6b'];
H.CLOTHCOL = ['#f4f1ec', '#22252b', '#5d6470', '#c33c3c', '#e07a3f', '#e8c34a', '#6aa84f', '#2f7a5b', '#3d7fc4', '#25407a', '#7b5ab8', '#d77ba8', '#8b5a3c', '#c8b28e', '#7fc8c4', '#a83254'];
H.HAIR_STYLES = [
  { id: 'kort', name: 'Kort' }, { id: 'sidebena', name: 'Sideskilning' }, { id: 'pjusket', name: 'Pjusket' },
  { id: 'bob', name: 'Bob' }, { id: 'lang', name: 'Langt' }, { id: 'hestehale', name: 'Hestehale' },
  { id: 'knold', name: 'Knold' }, { id: 'kroeller', name: 'Krøller' }, { id: 'skaldet', name: 'Skaldet' }
];
H.TOPS = [
  { id: 'tshirt', name: 'T-shirt' }, { id: 'longsleeve', name: 'Langærmet' }, { id: 'hoodie', name: 'Hættetrøje' },
  { id: 'tank', name: 'Top' }, { id: 'suit', name: 'Jakkesæt' }, { id: 'dress', name: 'Kjole' }
];
H.BOTTOMS = [{ id: 'pants', name: 'Bukser' }, { id: 'shorts', name: 'Shorts' }, { id: 'skirt', name: 'Nederdel' }];
H.BUILDS = [{ id: 'slim', name: 'Slank', s: 0.86 }, { id: 'medium', name: 'Mellem', s: 1 }, { id: 'heavy', name: 'Kraftig', s: 1.22 }];
H.FACIAL = [{ id: 'none', name: 'Intet' }, { id: 'beard', name: 'Fuldskæg' }, { id: 'stache', name: 'Overskæg' }, { id: 'glasses', name: 'Briller' }];

H.FIRST_M = ['Mads', 'Emil', 'Oliver', 'Noah', 'William', 'Lucas', 'Frederik', 'Magnus', 'Viktor', 'Anton', 'Karl', 'Aksel', 'Jens', 'Søren', 'Henrik', 'Lars', 'Bent', 'Ole'];
H.FIRST_F = ['Emma', 'Ida', 'Clara', 'Freja', 'Sofie', 'Alma', 'Ella', 'Anna', 'Karla', 'Laura', 'Agnes', 'Maja', 'Mette', 'Hanne', 'Lone', 'Birthe', 'Kirsten', 'Signe'];
H.LAST = ['Holm', 'Lund', 'Bech', 'Skov', 'Krogh', 'Dahl', 'Winther', 'Bruun', 'Vestergaard', 'Mortensen', 'Kjær', 'Lindberg'];
H.PET_NAMES = ['Bølle', 'Luna', 'Max', 'Molly', 'Smilla', 'Rufus', 'Bella', 'Charlie', 'Mis', 'Felix', 'Basse', 'Kaffe'];
H.PET_COLORS = ['#2a221d', '#6b4a2f', '#b07a45', '#d9b380', '#f2ead8', '#8a8a8a', '#e08b3c'];

H.FLOORS = [
  { id: 'oak', name: 'Egeparket', price: 15, kind: 'wood', c1: '#c9955e', c2: '#b8834d' },
  { id: 'walnut', name: 'Valnødplanker', price: 22, kind: 'wood', c1: '#6f4a31', c2: '#5c3b26' },
  { id: 'ash', name: 'Lys ask', price: 18, kind: 'wood', c1: '#e3cfae', c2: '#d4bd98' },
  { id: 'tile', name: 'Hvide fliser', price: 14, kind: 'tile', c1: '#eef0ee', c2: '#cfd5d3' },
  { id: 'checker', name: 'Skakternet', price: 20, kind: 'checker', c1: '#f2efe7', c2: '#2d3036' },
  { id: 'terracotta', name: 'Terrakotta', price: 16, kind: 'tile', c1: '#c4704a', c2: '#a85a39' },
  { id: 'carpet', name: 'Blødt tæppe', price: 12, kind: 'carpet', c1: '#a9b4c6', c2: '#97a3b7' },
  { id: 'carpetrose', name: 'Rosa tæppe', price: 12, kind: 'carpet', c1: '#d8aeb0', c2: '#c99c9f' },
  { id: 'marble', name: 'Marmor', price: 40, kind: 'marble', c1: '#f1efea', c2: '#c9c4bb' },
  { id: 'stone', name: 'Havefliser', price: 10, kind: 'stone', c1: '#a9a69e', c2: '#8f8c84' },
  { id: 'concrete', name: 'Beton', price: 8, kind: 'concrete', c1: '#b8b6b1', c2: '#a6a49f' }
];
H.WALLPAINTS = [
  { id: 'kalk', name: 'Kalkhvid', c: '#f3efe7' }, { id: 'graa', name: 'Lys grå', c: '#d6d6d2' }, { id: 'sand', name: 'Sand', c: '#e3d3b6' },
  { id: 'salvie', name: 'Salvie', c: '#b9c8ad' }, { id: 'himmel', name: 'Himmelblå', c: '#b7cde0' }, { id: 'rosa', name: 'Støvet rosa', c: '#e2bdb6' },
  { id: 'okker', name: 'Okker', c: '#d9a95a' }, { id: 'petrol', name: 'Petrol', c: '#3f6e73' }, { id: 'rod', name: 'Falurød', c: '#9b3b30' },
  { id: 'skov', name: 'Skovgrøn', c: '#456b4a' }, { id: 'nat', name: 'Natblå', c: '#2f3c5c' }, { id: 'grafit', name: 'Grafit', c: '#4a4b4f' },
  { id: 'gul', name: 'Smørgul', c: '#efd98a' }, { id: 'lavendel', name: 'Lavendel', c: '#c3b6d9' }, { id: 'mursten', name: 'Murstensrød', c: '#a9573e', brick: true },
  { id: 'trae', name: 'Træbeklædning', c: '#b98a5a', panel: true }
];

H.TIER_NAMES = ['Basis', 'Komfort', 'Luksus'];
H.TIER_MULT = [1, 1.5, 2.2];
H.WALL_COST = 50; H.DOOR_COST = 180; H.WINDOW_COST = 120; H.ARCH_COST = 60;

H.CATS = [
  { id: 'sleep', name: 'Soveværelse' }, { id: 'kitchen', name: 'Køkken' }, { id: 'bath', name: 'Bad' },
  { id: 'living', name: 'Stue' }, { id: 'fun', name: 'Hobby' }, { id: 'kids', name: 'Børn og dyr' },
  { id: 'deco', name: 'Pynt og lys' }, { id: 'garden', name: 'Have' }
];

/* Interaktioner:
   eff: behovsændring pr. spilminut. full: stop når behov er fuldt. dur: minutter.
   anim: animation. skill/xp: færdighed. ages: tilladte aldre. spot: hvilke pladser */
const ADULTS = ['teen', 'young', 'adult', 'elder'];
const WALKERS = ['child', 'teen', 'young', 'adult', 'elder'];
H.ADULTS = ADULTS; H.WALKERS = WALKERS;

H.CATALOG = [
  { id: 'bed_single', name: 'Enkeltseng', cat: 'sleep', price: 450, w: 1, d: 2, breaks: false,
    spots: [{ t: [-1, 1], kind: 'lie', p: [0, 0.15], h: 0.55 }, { t: [1, 1], kind: 'lie', p: [0, 0.15], h: 0.55 }], shareSpots: false,
    ix: [{ id: 'sleep', label: 'Sov', icon: '😴', anim: 'sleep', eff: { energy: 0.21 }, full: 'energy', ages: WALKERS, special: 'sleep' },
         { id: 'nap', label: 'Tag en lur', icon: '💤', anim: 'sleep', eff: { energy: 0.2 }, dur: 60, ages: WALKERS }] },
  { id: 'bed_double', name: 'Dobbeltseng', cat: 'sleep', price: 950, w: 2, d: 2, breaks: false,
    spots: [{ t: [-1, 1], kind: 'lie', p: [-0.48, 0.15], h: 0.55 }, { t: [2, 1], kind: 'lie', p: [0.48, 0.15], h: 0.55 }],
    ix: [{ id: 'sleep', label: 'Sov', icon: '😴', anim: 'sleep', eff: { energy: 0.21 }, full: 'energy', ages: WALKERS, special: 'sleep' },
         { id: 'nap', label: 'Tag en lur', icon: '💤', anim: 'sleep', eff: { energy: 0.2 }, dur: 60, ages: WALKERS }] },
  { id: 'crib', name: 'Tremmeseng', cat: 'kids', price: 320, w: 1, d: 1, spots: [], ix: [], baby: true },
  { id: 'dresser', name: 'Garderobe', cat: 'sleep', price: 380, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.82] }],
    ix: [{ id: 'outfit', label: 'Skift tøj', icon: '👕', anim: 'use', dur: 4, ages: WALKERS, special: 'outfit', noAuto: true }] },
  { id: 'nightstand', name: 'Natbord med lampe', cat: 'sleep', price: 160, w: 1, d: 1, light: true, decor: 1, spots: [], ix: [] },

  { id: 'fridge', name: 'Køleskab', cat: 'kitchen', price: 650, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.85] }],
    ix: [{ id: 'cook', label: 'Lav et måltid', icon: '🍲', special: 'cook', ages: ['teen', 'young', 'adult', 'elder'] },
         { id: 'snack', label: 'Tag en snack', icon: '🍎', anim: 'eatstand', eff: { hunger: 3.4 }, dur: 8, ages: WALKERS },
         { id: 'pizza', label: 'Bestil pizza (140 kr)', icon: '🍕', special: 'pizza', ages: ['teen', 'young', 'adult', 'elder'], noAuto: true }] },
  { id: 'stove', name: 'Komfur', cat: 'kitchen', price: 520, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.82] }],
    ix: [{ id: 'cook', label: 'Lav et måltid', icon: '🍲', special: 'cook', ages: ['teen', 'young', 'adult', 'elder'] },
         { id: 'practice', label: 'Øv madlavning', icon: '🍳', anim: 'cook', dur: 45, skill: 'cooking', xp: 1.6, eff: { fun: 0.05 }, ages: ['teen', 'young', 'adult', 'elder'], noAuto: true }] },
  { id: 'counter', name: 'Køkkenbord', cat: 'kitchen', price: 160, w: 1, d: 1, spots: [], ix: [] },
  { id: 'kitchen_sink', name: 'Køkkenvask', cat: 'kitchen', price: 260, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.82] }],
    ix: [{ id: 'wash', label: 'Vask hænder', icon: '🧽', anim: 'use', eff: { hygiene: 2 }, dur: 4, ages: WALKERS }] },
  { id: 'dining_table', name: 'Spisebord', cat: 'kitchen', price: 340, w: 2, d: 1, spots: [], ix: [], table: true },
  { id: 'chair', name: 'Spisestol', cat: 'kitchen', price: 120, w: 1, d: 1, seat: true,
    spots: [{ t: [0, -1], alt: [[0, 1], [-1, 0], [1, 0]], kind: 'sit', p: [0, 0], h: 0.46 }],
    ix: [{ id: 'sit', label: 'Sid ned', icon: '🪑', anim: 'sit', dur: 20, eff: {}, ages: WALKERS, noAuto: true }] },

  { id: 'toilet', name: 'Toilet', cat: 'bath', price: 320, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'sit', p: [0, 0.08], h: 0.44 }],
    ix: [{ id: 'pee', label: 'Brug toilet', icon: '🚽', anim: 'sit', eff: { bladder: 6 }, full: 'bladder', ages: WALKERS }] },
  { id: 'shower', name: 'Brusebad', cat: 'bath', price: 680, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'inside', p: [0, -0.05] }],
    ix: [{ id: 'shower', label: 'Tag et brusebad', icon: '🚿', anim: 'shower', eff: { hygiene: 4.2 }, full: 'hygiene', ages: WALKERS }] },
  { id: 'bathtub', name: 'Badekar', cat: 'bath', price: 980, w: 1, d: 2, breaks: true,
    spots: [{ t: [1, 1], alt: [[-1, 1]], kind: 'bath', p: [0, 0], h: 0.15 }],
    ix: [{ id: 'bath', label: 'Tag et karbad', icon: '🛁', anim: 'bath', eff: { hygiene: 2.6, fun: 0.4, energy: 0.05 }, full: 'hygiene', ages: WALKERS }] },
  { id: 'bath_sink', name: 'Håndvask', cat: 'bath', price: 220, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.8] }],
    ix: [{ id: 'wash', label: 'Vask hænder', icon: '🧼', anim: 'use', eff: { hygiene: 2 }, dur: 4, ages: WALKERS },
         { id: 'brush', label: 'Børst tænder', icon: '🪥', anim: 'use', eff: { hygiene: 1.6 }, dur: 6, ages: WALKERS }] },
  { id: 'mirror', name: 'Standspejl', cat: 'bath', price: 280, w: 1, d: 1, decor: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.85] }],
    ix: [{ id: 'speech', label: 'Øv en tale', icon: '🎤', anim: 'talk', dur: 40, skill: 'charisma', xp: 1.5, eff: { fun: 0.05 }, ages: ADULTS },
         { id: 'look', label: 'Skift udseende', icon: '💇', anim: 'use', dur: 5, special: 'look', ages: WALKERS, noAuto: true }] },

  { id: 'sofa', name: 'Sofa', cat: 'living', price: 720, w: 2, d: 1, seat: true,
    spots: [{ t: [0, 1], kind: 'sit', p: [-0.5, 0.05], h: 0.44 }, { t: [1, 1], kind: 'sit', p: [0.5, 0.05], h: 0.44 }],
    ix: [{ id: 'sit', label: 'Sid ned', icon: '🛋️', anim: 'sit', dur: 30, eff: { energy: 0.03 }, ages: WALKERS, noAuto: true },
         { id: 'nap', label: 'Tag en lur', icon: '💤', anim: 'sitsleep', eff: { energy: 0.13 }, dur: 60, ages: WALKERS }] },
  { id: 'armchair', name: 'Lænestol', cat: 'living', price: 420, w: 1, d: 1, seat: true,
    spots: [{ t: [0, 1], kind: 'sit', p: [0, 0.05], h: 0.44 }],
    ix: [{ id: 'sit', label: 'Sid ned', icon: '🪑', anim: 'sit', dur: 30, eff: { energy: 0.03 }, ages: WALKERS, noAuto: true }] },
  { id: 'coffee_table', name: 'Sofabord', cat: 'living', price: 140, w: 1, d: 1, decor: 1, spots: [], ix: [] },
  { id: 'tv', name: 'Fjernsyn', cat: 'living', price: 820, w: 1, d: 1, breaks: true, view: true,
    spots: [], ix: [{ id: 'watch', label: 'Se fjernsyn', icon: '📺', special: 'watch', eff: { fun: 0.75 }, dur: 60, ages: WALKERS, funKind: 'tv' }] },
  { id: 'stereo', name: 'Stereoanlæg', cat: 'living', price: 420, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 1.0] }],
    ix: [{ id: 'dance', label: 'Dans', icon: '💃', anim: 'dance', eff: { fun: 0.9, energy: -0.05 }, dur: 45, ages: WALKERS, skill: 'fitness', xp: 0.4 }] },
  { id: 'bookshelf', name: 'Bogreol', cat: 'living', price: 320, w: 1, d: 1, decor: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.85] }],
    ix: [{ id: 'read', label: 'Læs en bog', icon: '📖', anim: 'read', eff: { fun: 0.45 }, dur: 50, skill: 'logic', xp: 0.6, ages: WALKERS }] },

  { id: 'computer', name: 'Computerbord', cat: 'fun', price: 1200, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'sit', p: [0, 0.62], h: 0.46, face: 'in' }],
    ix: [{ id: 'game', label: 'Spil computerspil', icon: '🎮', anim: 'type', eff: { fun: 0.85 }, dur: 60, ages: WALKERS, funKind: 'computer' },
         { id: 'program', label: 'Programmer (tjen penge)', icon: '⌨️', anim: 'type', dur: 90, skill: 'logic', xp: 1.5, eff: { fun: -0.05 }, ages: ADULTS, special: 'program' },
         { id: 'findjob', label: 'Find et job', icon: '💼', anim: 'type', dur: 10, special: 'findjob', ages: ADULTS, noAuto: true },
         { id: 'adopt', label: 'Adoptér (1.500 kr)', icon: '👶', anim: 'type', dur: 15, special: 'adopt', ages: ['young', 'adult', 'elder'], noAuto: true },
         { id: 'invite', label: 'Inviter på besøg', icon: '📨', anim: 'type', dur: 5, special: 'invite', ages: WALKERS, noAuto: true },
         { id: 'homework', label: 'Lav lektier', icon: '📚', anim: 'type', dur: 45, skill: 'logic', xp: 0.8, ages: ['child', 'teen'], special: 'homework' }] },
  { id: 'easel', name: 'Staffeli', cat: 'fun', price: 380, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.8] }],
    ix: [{ id: 'paint', label: 'Mal et maleri', icon: '🖌️', anim: 'paint', eff: { fun: 0.4 }, dur: 90, skill: 'creativity', xp: 1.6, ages: WALKERS, special: 'paint', funKind: 'art' }] },
  { id: 'treadmill', name: 'Løbebånd', cat: 'fun', price: 900, w: 1, d: 2, breaks: true,
    spots: [{ t: [0, 2], kind: 'onobj', p: [0, 0.15], h: 0.15 }],
    ix: [{ id: 'run', label: 'Løb', icon: '🏃', anim: 'run', eff: { fun: 0.3, energy: -0.12, hygiene: -0.12 }, dur: 60, skill: 'fitness', xp: 1.6, ages: ['teen', 'young', 'adult', 'elder'], funKind: 'fitness', special: 'workout' }] },
  { id: 'chess', name: 'Skakbord', cat: 'fun', price: 480, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.78] }, { t: [0, -1], kind: 'stand', p: [0, -0.78], flip: true }],
    ix: [{ id: 'chess', label: 'Spil skak', icon: '♟️', anim: 'use', eff: { fun: 0.5 }, dur: 60, skill: 'logic', xp: 1.4, ages: WALKERS, funKind: 'computer' }] },
  { id: 'guitar', name: 'Guitar på stativ', cat: 'fun', price: 520, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.85] }],
    ix: [{ id: 'guitar', label: 'Spil guitar', icon: '🎸', anim: 'guitar', eff: { fun: 0.6 }, dur: 60, skill: 'creativity', xp: 1.2, ages: ['child', 'teen', 'young', 'adult', 'elder'], funKind: 'art' }] },

  { id: 'toybox', name: 'Legetøjskasse', cat: 'kids', price: 220, w: 1, d: 1,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.8] }],
    ix: [{ id: 'play', label: 'Leg med legetøj', icon: '🧸', anim: 'crouch', eff: { fun: 1.2, social: 0.1 }, dur: 45, ages: ['child'], skill: 'creativity', xp: 0.6 }] },
  { id: 'pet_bowl', name: 'Madskål', cat: 'kids', price: 60, w: 1, d: 1, low: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.75] }],
    ix: [{ id: 'fillbowl', label: 'Fyld madskålen', icon: '🦴', anim: 'crouch', dur: 3, ages: WALKERS, special: 'fillbowl' }] },
  { id: 'pet_bed', name: 'Hundekurv', cat: 'kids', price: 160, w: 1, d: 1, low: true, spots: [], ix: [] },

  { id: 'plant', name: 'Potteplante', cat: 'deco', price: 90, w: 1, d: 1, decor: 2, spots: [], ix: [] },
  { id: 'palm', name: 'Stueplante', cat: 'deco', price: 140, w: 1, d: 1, decor: 3, spots: [], ix: [] },
  { id: 'floor_lamp', name: 'Standerlampe', cat: 'deco', price: 160, w: 1, d: 1, light: true, decor: 1, spots: [], ix: [] },
  { id: 'sculpture', name: 'Skulptur', cat: 'deco', price: 650, w: 1, d: 1, decor: 6, spots: [], ix: [] },
  { id: 'rug', name: 'Gulvtæppe', cat: 'deco', price: 220, w: 2, d: 2, decor: 2, rug: true, spots: [], ix: [] },
  { id: 'aquarium', name: 'Akvarium', cat: 'deco', price: 900, w: 1, d: 1, decor: 6, light: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.8] }],
    ix: [{ id: 'fish', label: 'Kig på fiskene', icon: '🐠', anim: 'idle', eff: { fun: 0.4 }, dur: 20, ages: WALKERS }] },

  { id: 'tree', name: 'Løvtræ', cat: 'garden', price: 180, w: 1, d: 1, decor: 2, outdoor: true, spots: [], ix: [] },
  { id: 'hedge', name: 'Hæk', cat: 'garden', price: 45, w: 1, d: 1, decor: 1, outdoor: true, spots: [], ix: [] },
  { id: 'flowerbed', name: 'Blomsterbed', cat: 'garden', price: 70, w: 1, d: 1, decor: 2, outdoor: true, low: true, spots: [], ix: [] },
  { id: 'bench', name: 'Havebænk', cat: 'garden', price: 260, w: 2, d: 1, seat: true,
    spots: [{ t: [0, 1], kind: 'sit', p: [-0.5, 0.05], h: 0.45 }, { t: [1, 1], kind: 'sit', p: [0.5, 0.05], h: 0.45 }],
    ix: [{ id: 'sit', label: 'Sid ned', icon: '🪑', anim: 'sit', dur: 30, eff: { fun: 0.1 }, ages: WALKERS, noAuto: true }] },
  { id: 'grill', name: 'Grill', cat: 'garden', price: 450, w: 1, d: 1, breaks: true,
    spots: [{ t: [0, 1], kind: 'stand', p: [0, 0.82] }],
    ix: [{ id: 'cook', label: 'Grill et måltid', icon: '🍖', special: 'cook', ages: ['teen', 'young', 'adult', 'elder'] }] },
  { id: 'lamp_post', name: 'Havelampe', cat: 'garden', price: 200, w: 1, d: 1, light: true, decor: 1, outdoor: true, spots: [], ix: [] }
];
H.CAT_BY_ID = {};
H.CATALOG.forEach(c => { H.CAT_BY_ID[c.id] = c; c.decor = c.decor || 0; });

/* Sociale interaktioner */
H.SOCIALS = [
  { id: 'chat', cat: 'Venlig', label: 'Snak', icon: '💬', f: 4, dur: 6, base: 0.9 },
  { id: 'interests', cat: 'Venlig', label: 'Diskuter interesser', icon: '🗣️', f: 6, dur: 8, minF: 5, base: 0.8, xp: 'charisma' },
  { id: 'compliment', cat: 'Venlig', label: 'Giv et kompliment', icon: '🌟', f: 6, dur: 4, minF: 10, base: 0.8 },
  { id: 'hug', cat: 'Venlig', label: 'Kram', icon: '🤗', f: 8, dur: 4, minF: 35, base: 0.8, anim: 'hug' },
  { id: 'highfive', cat: 'Venlig', label: 'Giv en high five', icon: '✋', f: 5, dur: 3, minF: 20, base: 0.85 },
  { id: 'joke', cat: 'Sjov', label: 'Fortæl en vits', icon: '😂', f: 5, fun: 12, dur: 5, base: 0.75 },
  { id: 'tickle', cat: 'Sjov', label: 'Kild', icon: '🤭', f: 5, fun: 14, dur: 4, minF: 30, base: 0.75 },
  { id: 'prank', cat: 'Sjov', label: 'Lav et puds', icon: '🃏', f: 3, fun: 15, dur: 5, minF: 15, base: 0.55 },
  { id: 'danceTogether', cat: 'Sjov', label: 'Dans sammen', icon: '🕺', f: 6, fun: 18, dur: 10, minF: 25, base: 0.85, anim: 'dance' },
  { id: 'flirt', cat: 'Romantisk', label: 'Flirt', icon: '😉', r: 6, f: 1, dur: 5, minF: 10, base: 0.7, romance: true },
  { id: 'holdhands', cat: 'Romantisk', label: 'Hold i hånd', icon: '🤝', r: 7, dur: 5, minR: 20, base: 0.8, romance: true },
  { id: 'kiss', cat: 'Romantisk', label: 'Kys', icon: '💋', r: 10, dur: 4, minR: 30, base: 0.75, romance: true, anim: 'hug' },
  { id: 'steady', cat: 'Romantisk', label: 'Bliv kærester', icon: '💞', r: 10, dur: 6, minR: 45, base: 0.85, romance: true, status: 'kæreste', needStatus: [''] },
  { id: 'propose', cat: 'Romantisk', label: 'Fri', icon: '💍', r: 15, dur: 8, minR: 70, base: 0.8, romance: true, status: 'forlovet', needStatus: ['kæreste'] },
  { id: 'marry', cat: 'Romantisk', label: 'Bliv gift', icon: '💒', r: 20, dur: 12, minR: 75, base: 0.95, romance: true, status: 'gift', needStatus: ['forlovet'], needHousehold: true },
  { id: 'complain', cat: 'Uvenlig', label: 'Klag', icon: '😒', f: -5, dur: 5, base: 0.8, mean: true },
  { id: 'insult', cat: 'Uvenlig', label: 'Fornærm', icon: '😠', f: -12, dur: 5, base: 0.85, mean: true },
  { id: 'argue', cat: 'Uvenlig', label: 'Skændes', icon: '💢', f: -10, dur: 8, base: 0.9, mean: true, anim: 'angry' },
  { id: 'invitein', cat: 'Spørg', label: 'Byd indenfor', icon: '🚪', f: 2, dur: 3, base: 0.9, visitorOnly: 'outside' },
  { id: 'movein', cat: 'Spørg', label: 'Bed om at flytte ind', icon: '🏠', f: 3, dur: 8, minF: 50, base: 0.85, visitorOnly: 'any' },
  { id: 'goodbye', cat: 'Spørg', label: 'Sig farvel', icon: '👋', f: 0, dur: 3, base: 1, visitorOnly: 'inside' }
];
H.SOCIAL_BY_ID = {}; H.SOCIALS.forEach(s => H.SOCIAL_BY_ID[s.id] = s);

H.BABY_CARE = [
  { id: 'feedbaby', label: 'Giv flaske', icon: '🍼', eff: { hunger: 70 }, dur: 10 },
  { id: 'changebaby', label: 'Skift ble', icon: '🧷', eff: { hygiene: 80 }, dur: 6 },
  { id: 'playbaby', label: 'Leg med', icon: '🧸', eff: { fun: 50, social: 40 }, dur: 12 },
  { id: 'cribbaby', label: 'Læg i seng', icon: '🛏️', eff: {}, dur: 4 }
];
H.PET_IX = [
  { id: 'petpet', label: 'Kæl', icon: '🐾', eff: { social: 35, fun: 10 }, dur: 6 },
  { id: 'playpet', label: 'Leg med', icon: '🎾', eff: { fun: 45, social: 20 }, dur: 12 },
  { id: 'feedpet', label: 'Giv mad', icon: '🦴', eff: { hunger: 70 }, dur: 5 },
  { id: 'trainpet', label: 'Lær tricks', icon: '🎓', eff: { fun: 20, social: 15 }, dur: 15 }
];

H.MOODS = [
  { min: 55, name: 'Strålende', color: '#2fb36b' }, { min: 25, name: 'Glad', color: '#6cc04a' },
  { min: 0, name: 'Fin', color: '#b6c53a' }, { min: -25, name: 'Utilpas', color: '#e7a63a' },
  { min: -55, name: 'Ked af det', color: '#e2703a' }, { min: -999, name: 'Elendig', color: '#d2433d' }
];
H.moodInfo = v => H.MOODS.find(m => v >= m.min);

H.rnd = (a, b) => a + Math.random() * (b - a);
H.pick = arr => arr[Math.floor(Math.random() * arr.length)];
H.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
H.fmt = n => Math.round(n).toLocaleString('da-DK');
H.money = n => H.fmt(n) + ' kr';
