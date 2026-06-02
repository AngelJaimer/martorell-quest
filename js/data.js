/* =====================================================================
 *  MARTORELL QUEST  ·  La Leyenda del Puente del Diablo
 *  data.js  —  the world map, the landmarks of Martorell, and the lore.
 *
 *  All player-facing text is TRILINGUAL: { es, ca, en }.
 *  Default language is Spanish (es). The menu lets you switch to
 *  Català (ca) or English (en).  game.js reads the active language.
 *
 *  Map is tile-based. Tile size = 32px. World is 60 x 44 tiles.
 *  Tile legend:
 *    G grass · R road · S plaza · W water · B wall(solid) · D door
 *    T tree(solid) · # sand · ~ bridge · F factory · P park · M hill(solid)
 * ===================================================================== */

const TILE = 32;
const MAP_W = 60;
const MAP_H = 44;

const TILES = {
  G: { solid: false }, R: { solid: false }, S: { solid: false },
  W: { solid: true  }, B: { solid: true  }, D: { solid: false },
  T: { solid: true  }, '#': { solid: false }, '~': { solid: false },
  F: { solid: false }, P: { solid: false }, M: { solid: true },
};

/* ---------------------------------------------------------------------
 *  UI / system strings (menu, HUD, prompts) in the three languages.
 * ------------------------------------------------------------------- */
const I18N = {
  es: {
    subtitle: 'La Leyenda del Puente del Diablo',
    play: 'PULSA ENTER PARA JUGAR',
    playTouch: 'TOCA PARA JUGAR',
    language: 'Idioma',
    controls: 'Mover: WASD/flechas · Espada: J/Z/Espacio · Hablar: E · Idioma: L · Reiniciar: R',
    stones: 'Piedras',
    objective: 'Recupera las 5 Piedras del Diablo y reconstruye el puente.',
    objectiveWon: '¡Has ganado! Pulsa R para volver a jugar.',
    objectiveGo: '¡Ya tienes las 5 piedras! Corre al PUENTE DEL DIABLO.',
    promptTalk: 'hablar',
    contDialog: '[E / Espacio] continuar  ▸',
    won1: '★ MARTORELL SALVADA ★',
    won2: 'Has reconstruido el Puente del Diablo. Pulsa R para rejugar.',
    stonesCount: (n) => `Piedras: ${n} / ${STONES_NEEDED}.`,
    haveAll: '¡Ya tienes las 5 piedras! Corre al PUENTE DEL DIABLO.',
    fullHeart: 'Ya tienes el corazón lleno. ¡Guárdate la coca para luego!',
    deathT: ['Has caído... pero despiertas en la Plaza de la Vila.',
             'Los diablillos no se rinden. ¡Vuelve a por ellos!'],
    tagline: 'Un homenaje hecho a mano a Martorell y a The Legend of Zelda. No oficial.',
  },
  ca: {
    subtitle: 'La Llegenda del Pont del Diable',
    play: 'PREM ENTER PER JUGAR',
    playTouch: 'TOCA PER JUGAR',
    language: 'Idioma',
    controls: 'Moure: WASD/fletxes · Espasa: J/Z/Espai · Parlar: E · Idioma: L · Reiniciar: R',
    stones: 'Pedres',
    objective: 'Recupera les 5 Pedres del Diable i reconstrueix el pont.',
    objectiveWon: 'Has guanyat! Prem R per tornar a jugar.',
    objectiveGo: 'Ja tens les 5 pedres! Corre cap al PONT DEL DIABLE.',
    promptTalk: 'parlar',
    contDialog: '[E / Espai] continuar  ▸',
    won1: '★ MARTORELL SALVADA ★',
    won2: 'Has reconstruït el Pont del Diable. Prem R per rejugar.',
    stonesCount: (n) => `Pedres: ${n} / ${STONES_NEEDED}.`,
    haveAll: 'Ja tens les 5 pedres! Corre cap al PONT DEL DIABLE.',
    fullHeart: 'Ja tens el cor ple. Guarda la coca per a després!',
    deathT: ['Has caigut... però et despertes a la Plaça de la Vila.',
             'Els diablets no es rendeixen. Torna-hi!'],
    tagline: 'Un homenatge fet a mà a Martorell i a The Legend of Zelda. No oficial.',
  },
  en: {
    subtitle: "The Legend of the Devil's Bridge",
    play: 'PRESS ENTER TO PLAY',
    playTouch: 'TAP TO PLAY',
    language: 'Language',
    controls: 'Move: WASD/arrows · Sword: J/Z/Space · Talk: E · Language: L · Restart: R',
    stones: 'Stones',
    objective: "Recover the 5 Devil's Stones and rebuild the bridge.",
    objectiveWon: 'You won! Press R to play again.',
    objectiveGo: "You have all 5 stones! Run to the DEVIL'S BRIDGE.",
    promptTalk: 'talk',
    contDialog: '[E / Space] continue  ▸',
    won1: '★ MARTORELL SAVED ★',
    won2: "You rebuilt the Devil's Bridge. Press R to replay.",
    stonesCount: (n) => `Stones: ${n} / ${STONES_NEEDED}.`,
    haveAll: "You have all 5 stones! Run to the DEVIL'S BRIDGE.",
    fullHeart: 'Your heart is already full. Save the cake for later!',
    deathT: ['You fell... but you wake up in the Plaça de la Vila.',
             "The little devils never give up. Go get them!"],
    tagline: 'A hand-made homage to Martorell and The Legend of Zelda. Unofficial.',
  },
};

const LANG_NAMES = { es: 'Español', ca: 'Català', en: 'English' };
const LANG_ORDER = ['es', 'ca', 'en'];

/* ---------------------------------------------------------------------
 *  THE LANDMARKS OF MARTORELL  (trilingual content)
 * ------------------------------------------------------------------- */
const LANDMARKS = [
  {
    id: 'pont', x: 48, y: 11, color: '#9b8b6e', icon: 'bridge', isGoal: true,
    name: { es: 'Puente del Diablo', ca: 'Pont del Diable', en: "Devil's Bridge" },
    lines: {
      es: ["El PUENTE DEL DIABLO se alza sobre el Llobregat desde el año 10 a.C.",
           "Cuenta la leyenda que el Diablo lo construyó en una noche a cambio de la primera alma que lo cruzara...",
           "...pero una vieja astuta hizo pasar antes a un gato. El Diablo, burlado, aún busca venganza."],
      ca: ["El PONT DEL DIABLE s'alça sobre el Llobregat des de l'any 10 aC.",
           "Diu la llegenda que el Diable el va bastir en una nit a canvi de la primera ànima que el creués...",
           "...però una vella espavilada va fer passar primer un gat. El Diable, burlat, encara busca venjança."],
      en: ["The DEVIL'S BRIDGE has spanned the Llobregat since 10 BC.",
           "Legend says the Devil built it in a single night for the first soul to cross it...",
           "...but a clever old woman sent a cat across first. Tricked, the Devil still wants revenge."],
    },
    goalLocked: {
      es: ["El arco gótico está roto. Necesitas las 5 PIEDRAS DEL DIABLO para reconstruirlo antes del alba.",
           "Recorre Martorell y recupéralas de su gente."],
      ca: ["L'arc gòtic està trencat. Necessites les 5 PEDRES DEL DIABLE per reconstruir-lo abans de l'alba.",
           "Recorre Martorell i recupera-les de la seva gent."],
      en: ["The Gothic arch is shattered. You need the 5 DEVIL'S STONES to rebuild it before dawn.",
           "Roam Martorell and recover them from its people."],
    },
    goalDone: {
      es: ["Colocas las 5 piedras. ¡El arco apuntado se alza de nuevo, perfecto como en 1283!",
           "Un trueno retumba: el Diablo, vencido otra vez, se esfuma río abajo.",
           "¡MARTORELL ESTÁ SALVADA! Has completado La Leyenda del Puente del Diablo."],
      ca: ["Col·loques les 5 pedres. L'arc apuntat s'alça de nou, perfecte com el 1283!",
           "Un tro retruny: el Diable, vençut altre cop, s'esfuma riu avall.",
           "MARTORELL ESTÀ SALVADA! Has completat La Llegenda del Pont del Diable."],
      en: ["You set the 5 stones. The pointed arch rises again, perfect as in 1283!",
           "Thunder rolls: the Devil, beaten once more, vanishes downriver.",
           "MARTORELL IS SAVED! You completed The Legend of the Devil's Bridge."],
    },
  },
  {
    id: 'genis', x: 53, y: 9, color: '#c9b39b', icon: 'chapel', building: { x: 52, y: 6, w: 3, h: 3 },
    name: { es: 'Capilla de Sant Genís', ca: 'Capella de Sant Genís', en: 'Sant Genís Chapel' },
    lines: {
      es: ["La capilla de SANT GENÍS guarda el otro extremo del puente, ya en término de Castellbisbal.",
           "El ermitaño te bendice: «Si quieres vencer al Diablo, nunca te fíes de un trato fácil.»"],
      ca: ["La capella de SANT GENÍS guarda l'altre extrem del pont, ja en terme de Castellbisbal.",
           "L'ermità et beneeix: «Si vols vèncer el Diable, no et refiïs mai d'un tracte fàcil.»"],
      en: ["SANT GENÍS chapel guards the far end of the bridge, already in Castellbisbal.",
           "The hermit blesses you: 'To beat the Devil, never trust an easy bargain.'"],
    },
  },
  {
    id: 'torre', x: 23, y: 13, color: '#b5651d', icon: 'tower', stone: true, building: { x: 21, y: 9, w: 3, h: 3 },
    name: { es: 'Torre de les Hores', ca: 'Torre de les Hores', en: 'Tower of the Hours' },
    lines: {
      es: ["La TORRE DE LES HORES vigila la Plaza de la Vila con su reloj desde el siglo XVI.",
           "El campanero te dice: «El tiempo corre, chaval. Toma esta PIEDRA, la guardaba para el puente.»"],
      ca: ["La TORRE DE LES HORES vigila la Plaça de la Vila amb el seu rellotge des del segle XVI.",
           "El campaner et diu: «El temps corre, noi. Pren aquesta PEDRA, la guardava per al pont.»"],
      en: ["The TOWER OF THE HOURS has watched the Plaça de la Vila with its clock since the 16th century.",
           "The bell-ringer says: 'Time flies, lad. Take this STONE, I kept it for the bridge.'"],
    },
    stoneLine: { es: '¡Has obtenido la PIEDRA DE LAS HORAS! 🪨',
                 ca: 'Has obtingut la PEDRA DE LES HORES! 🪨',
                 en: 'You got the STONE OF THE HOURS! 🪨' },
  },
  {
    id: 'ajuntament', x: 28, y: 15, color: '#d4c4a0', icon: 'townhall', building: { x: 27, y: 12, w: 3, h: 3 },
    name: { es: 'Ayuntamiento · Plaza de la Vila', ca: 'Ajuntament · Plaça de la Vila', en: 'Town Hall · Plaça de la Vila' },
    lines: {
      es: ["La PLAZA DE LA VILA es el corazón de Martorell, llena de gente en el mercado de los lunes.",
           "El alcalde te anima: «Todo Martorell confía en ti para recuperar las piedras. ¡Adelante!»"],
      ca: ["La PLAÇA DE LA VILA és el cor de Martorell, plena de gent al mercat dels dilluns.",
           "L'alcalde t'anima: «Tot Martorell confia en tu per recuperar les pedres. Endavant!»"],
      en: ["The PLAÇA DE LA VILA is the heart of Martorell, packed on Monday market day.",
           "The mayor cheers you on: 'All Martorell trusts you to recover the stones. Go!'"],
    },
  },
  {
    id: 'basilica', x: 19, y: 18, color: '#cdbfa3', icon: 'church', stone: true, building: { x: 17, y: 14, w: 3, h: 4 },
    name: { es: 'Basílica de Santa María / Sant Crist', ca: 'Basílica de Santa Maria / Sant Crist', en: 'Basilica of Santa Maria / Sant Crist' },
    lines: {
      es: ["La BASÍLICA DE SANTA MARÍA guarda la imagen del Sant Crist de Martorell.",
           "El párroco te confía una PIEDRA bendita: «Que proteja el puente para siempre.»"],
      ca: ["La BASÍLICA DE SANTA MARIA guarda la imatge del Sant Crist de Martorell.",
           "El mossèn et confia una PEDRA beneïda: «Que protegeixi el pont per sempre.»"],
      en: ["The BASILICA OF SANTA MARIA keeps the image of the Sant Crist of Martorell.",
           "The priest entrusts a blessed STONE: 'May it protect the bridge forever.'"],
    },
    stoneLine: { es: '¡Has obtenido la PIEDRA BENDITA! 🪨',
                 ca: 'Has obtingut la PEDRA BENEÏDA! 🪨',
                 en: 'You got the BLESSED STONE! 🪨' },
  },
  {
    id: 'mercat', x: 30, y: 20, color: '#e07a3e', icon: 'market', stone: true, building: { x: 29, y: 18, w: 4, h: 2 },
    name: { es: 'Mercado Municipal', ca: 'Mercat Municipal', en: 'Municipal Market' },
    lines: {
      es: ["El MERCADO MUNICIPAL bulle a olor de pan, fruta y bacalao.",
           "La tendera te guiña: «Una clienta pagó con una piedra rara. Te la cambio por ayudar al pueblo.»"],
      ca: ["El MERCAT MUNICIPAL bull d'olor de pa, fruita i bacallà.",
           "La paradista et fa l'ullet: «Una clienta va pagar amb una pedra rara. Te la canvio per ajudar la vila.»"],
      en: ["The MUNICIPAL MARKET bustles with the smell of bread, fruit and salt cod.",
           "The stallholder winks: 'A customer paid with a strange stone. It's yours if you help the town.'"],
    },
    stoneLine: { es: '¡Has obtenido la PIEDRA DEL MERCADO! 🪨',
                 ca: 'Has obtingut la PEDRA DEL MERCAT! 🪨',
                 en: 'You got the MARKET STONE! 🪨' },
  },
  {
    id: 'museu', x: 16, y: 12, color: '#8e7cc3', icon: 'museum', stone: true, building: { x: 14, y: 9, w: 3, h: 3 },
    name: { es: "Museo L'Enrajolada (Casa Santacana)", ca: "Museu L'Enrajolada (Casa Santacana)", en: "L'Enrajolada Museum (Casa Santacana)" },
    lines: {
      es: ["EL MUSEO L'ENRAJOLADA, la casa-museo Santacana, es un tesoro de azulejos y antigüedades.",
           "El conservador saca de una vitrina una PIEDRA milenaria: «Pertenece al puente. Devuélvela a su sitio.»"],
      ca: ["EL MUSEU L'ENRAJOLADA, la casa-museu Santacana, és un tresor de rajoles i antiguitats.",
           "El conservador treu d'una vitrina una PEDRA mil·lenària: «Pertany al pont. Torna-la al seu lloc.»"],
      en: ["L'ENRAJOLADA MUSEUM, the Santacana house-museum, is a trove of tiles and antiques.",
           "The curator lifts a thousand-year-old STONE from a case: 'It belongs to the bridge. Return it.'"],
    },
    stoneLine: { es: '¡Has obtenido la PIEDRA DEL MUSEO! 🪨',
                 ca: 'Has obtingut la PEDRA DEL MUSEU! 🪨',
                 en: 'You got the MUSEUM STONE! 🪨' },
  },
  {
    id: 'seat', x: 30, y: 33, color: '#5b7fa6', icon: 'factory', factory: true, stone: true, building: { x: 26, y: 31, w: 9, h: 3 },
    name: { es: 'Fábrica SEAT Martorell', ca: 'Fàbrica SEAT Martorell', en: 'SEAT Martorell Factory' },
    lines: {
      es: ["La FÁBRICA DE SEAT, abierta en 1993, hace rodar a medio Martorell. Aquí nacen los Ibiza y Leon.",
           "Un ingeniero forja para ti una PIEDRA reforzada con acero: «¡Tecnología martorellense para un puente milenario!»"],
      ca: ["La FÀBRICA DE LA SEAT, oberta el 1993, fa rodar mig Martorell. Aquí neixen els Ibiza i Leon.",
           "Un enginyer forja per a tu una PEDRA reforçada amb acer: «Tecnologia martorellenca per a un pont mil·lenari!»"],
      en: ["The SEAT FACTORY, opened in 1993, keeps half of Martorell moving. The Ibiza and Leon are born here.",
           "An engineer forges you a steel-reinforced STONE: 'Martorell tech for a thousand-year-old bridge!'"],
    },
    stoneLine: { es: '¡Has obtenido la PIEDRA DE ACERO DE SEAT! 🪨',
                 ca: "Has obtingut la PEDRA D'ACER DE LA SEAT! 🪨",
                 en: 'You got the SEAT STEEL STONE! 🪨' },
  },
  {
    id: 'estacio', x: 8, y: 22, color: '#7a8b99', icon: 'station', building: { x: 6, y: 20, w: 4, h: 2 },
    name: { es: 'Estación de Martorell', ca: 'Estació de Martorell', en: 'Martorell Station' },
    lines: {
      es: ["LA ESTACIÓN conecta Martorell con Barcelona por Renfe y los FGC.",
           "Un viajero te avisa: «He visto diablillos rojos rondando el puente. ¡Ve con la espada a punto!»"],
      ca: ["L'ESTACIÓ connecta Martorell amb Barcelona per Renfe i els FGC.",
           "Un viatger et xiva: «He vist diablets vermells rondant vora el pont. Vés amb l'espasa a punt!»"],
      en: ["THE STATION links Martorell to Barcelona via Renfe and the FGC.",
           "A traveller warns you: 'I saw red imps prowling the bridge. Keep your sword ready!'"],
    },
  },
  {
    id: 'fleca', x: 34, y: 16, color: '#e8b04b', icon: 'bakery', heal: true, building: { x: 33, y: 14, w: 3, h: 2 },
    name: { es: 'La Panadería del Camí Ral', ca: 'La Fleca del Camí Ral', en: 'The Camí Ral Bakery' },
    lines: {
      es: ["LA PANADERÍA huele a coca recién hecha. Un clásico del Camí Ral.",
           "El panadero: «Toma una COCA DE MARTORELL, te recupera todo el corazón. ¡Anda, a salvar el puente!»"],
      ca: ["LA FLECA fa olor de coca acabada de coure. Un clàssic del Camí Ral.",
           "El forner: «Pren una COCA DE MARTORELL, et recupera tot el cor. Au, a salvar el pont!»"],
      en: ["THE BAKERY smells of fresh coca. A Camí Ral classic.",
           "The baker: 'Have a COCA DE MARTORELL, it heals all your heart. Now go save the bridge!'"],
    },
    healLine: { es: 'Comes una coca caliente. ¡Corazón recuperado! ❤️',
                ca: 'Menges una coca calenta. Cor recuperat! ❤️',
                en: 'You eat a warm coca. Heart restored! ❤️' },
  },
  {
    id: 'bar', x: 26, y: 18, color: '#c0504d', icon: 'bar', building: { x: 25, y: 18, w: 2, h: 1 },
    name: { es: 'Bar de la Plaza', ca: 'Bar de la Plaça', en: 'Plaza Bar' },
    lines: {
      es: ["EL BAR DE LA PLAZA: cafés, vermut y tertulia matinal.",
           "Un parroquiano, vermut en mano: «Pista: las piedras están en el Museo, la Torre, la Basílica, el Mercado y... ¡en SEAT, métete!»"],
      ca: ["EL BAR DE LA PLAÇA: cafès, vermut i tertúlia matinal.",
           "Un parroquià, vermut en mà: «Pista: les pedres són al Museu, la Torre, la Basílica, el Mercat i... a la SEAT, fes-t'hi!»"],
      en: ["THE PLAZA BAR: coffees, vermouth and morning chatter.",
           "A regular, vermouth in hand: 'Hint: the stones are at the Museum, the Tower, the Basilica, the Market and... SEAT, get in there!'"],
    },
  },
  {
    id: 'buenosaires', x: 18, y: 5, color: '#d8c39a', icon: 'house', building: { x: 17, y: 2, w: 3, h: 3 },
    name: { es: 'Barrio de Buenos Aires', ca: 'Barri de Buenos Aires', en: 'Buenos Aires District' },
    lines: {
      es: ["El barrio de BUENOS AIRES creció con la gente que vino a trabajar a Martorell en los años 60 y 70.",
           "Una vecina te saluda: «Aquí somos de mil sitios y un solo pueblo. El campanero de la TORRE DE LES HORES guarda una piedra... ¡ve a verle!»"],
      ca: ["El barri de BUENOS AIRES va créixer amb la gent que va venir a treballar a Martorell als anys 60 i 70.",
           "Una veïna et saluda: «Aquí som de mil llocs i un sol poble. El campaner de la TORRE DE LES HORES guarda una pedra... vés a veure'l!»"],
      en: ["The BUENOS AIRES district grew with the people who came to work in Martorell in the 1960s and 70s.",
           "A neighbour greets you: 'We're from a thousand places and one town. The bell-ringer at the TOWER OF THE HOURS keeps a stone... go see him!'"],
    },
  },
  {
    id: 'camifondo', x: 5, y: 7, color: '#cdbf9e', icon: 'house', building: { x: 4, y: 4, w: 3, h: 3 },
    name: { es: 'Camí Fondo · Can Carreras', ca: 'Camí Fondo · Can Carreras', en: 'Camí Fondo · Can Carreras' },
    lines: {
      es: ["El CAMÍ FONDO es una antigua vía hundida entre campos que lleva al barrio de CAN CARRERAS.",
           "Un payés con la azada al hombro: «Por estos caminos se va a todas partes. En el MUSEO DE L'ENRAJOLADA guardan una piedra muy antigua del puente.»"],
      ca: ["El CAMÍ FONDO és una antiga via enfonsada entre camps que mena al barri de CAN CARRERAS.",
           "Un pagès amb l'aixada a l'espatlla: «Per aquests camins s'arriba a tot arreu. Al MUSEU DE L'ENRAJOLADA guarden una pedra ben antiga del pont.»"],
      en: ["The CAMÍ FONDO is an old sunken lane between the fields, leading to the CAN CARRERAS district.",
           "A farmer with a hoe on his shoulder: 'These lanes take you everywhere. The L'ENRAJOLADA MUSEUM keeps a very old stone from the bridge.'"],
    },
  },
  {
    id: 'canbros', x: 37, y: 26, color: '#aeb4ba', icon: 'warehouse', building: { x: 36, y: 23, w: 4, h: 3 },
    name: { es: 'El Pla · Polígono de Can Bros', ca: 'El Pla · Polígon de Can Bros', en: 'El Pla · Can Bros Estate' },
    lines: {
      es: ["EL PLA y el polígono de CAN BROS son el motor industrial de Martorell, junto a la SEAT.",
           "Un operario, casco en mano: «Aquí se trabaja el metal. En la FÁBRICA DE LA SEAT te pueden forjar una piedra de acero. ¡No faltes!»"],
      ca: ["EL PLA i el polígon de CAN BROS són el motor industrial de Martorell, al costat de la SEAT.",
           "Un operari, casc a la mà: «Aquí es treballa el metall. A la FÀBRICA DE LA SEAT et poden forjar una pedra d'acer. No hi faltis!»"],
      en: ["EL PLA and the CAN BROS estate are Martorell's industrial engine, right next to SEAT.",
           "A worker, helmet in hand: 'We work metal here. At the SEAT FACTORY they can forge you a steel stone. Don't miss it!'"],
    },
  },
  {
    id: 'bobiles', x: 19, y: 34, color: '#b5764a', icon: 'kiln', building: { x: 18, y: 31, w: 3, h: 3 },
    name: { es: 'La Sínia · Les Bòbiles', ca: 'La Sínia · Les Bòbiles', en: 'La Sínia · Les Bòbiles' },
    lines: {
      es: ["LA SÍNIA y LES BÒBILES bordean el río, donde antaño humeaban los hornos de ladrillo.",
           "Un abuelo junto al horno: «El barro del río hizo medio Martorell. La BASÍLICA DE SANTA MARÍA guarda una piedra bendita para el puente.»"],
      ca: ["LA SÍNIA i LES BÒBILES voregen el riu, on antany fumejaven els forns de rajola.",
           "Un avi vora el forn: «El fang del riu va fer mig Martorell. La BASÍLICA DE SANTA MARIA guarda una pedra beneïda per al pont.»"],
      en: ["LA SÍNIA and LES BÒBILES line the river, where the old brick kilns once smoked.",
           "An old man by the kiln: 'The river clay built half of Martorell. The BASILICA OF SANTA MARIA keeps a blessed stone for the bridge.'"],
    },
  },
  {
    id: 'parc', x: 12, y: 30, color: '#5fa55a', icon: 'park', building: null,
    name: { es: 'Parc de la Vila · Río Anoia', ca: 'Parc de la Vila · Riu Anoia', en: 'Parc de la Vila · Anoia River' },
    lines: {
      es: ["EL PARC DE LA VILA verdea junto al río ANOIA, justo antes de que abrace al Llobregat.",
           "Una abuela en el banco: «Aquí se sentaba la vieja de la leyenda. Aún sonríe pensando en el gato...»"],
      ca: ["EL PARC DE LA VILA verdeja vora el riu ANOIA, just abans que abraci el Llobregat.",
           "Una àvia asseguda al banc: «Aquí seia la vella de la llegenda. Encara somriu pensant en el gat...»"],
      en: ["THE PARC DE LA VILA greens beside the ANOIA river, just before it meets the Llobregat.",
           "A grandmother on the bench: 'The old woman of the legend sat here. She still smiles about the cat...'"],
    },
  },
];

const STONES_NEEDED = 5;

/* Roof colours per landmark icon (used by the SNES-style building renderer). */
const ROOFS = {
  tower: '#8a4a2a', chapel: '#9a4636', church: '#9a4636', townhall: '#a8862f',
  market: '#c75b3a', museum: '#6b5ea8', factory: '#54616f', station: '#3f4a59',
  bakery: '#b5722e', bar: '#9c3f3c', bridge: '#7a5c39', park: '#3f8a3c',
  house: '#9a4636', warehouse: '#54616f', kiln: '#7a3b2e',
};

/* Decorative lamp posts (tile coords) that light the town at night. */
const LAMPS = [
  [21, 12], [30, 12], [21, 17], [30, 17],   // around the Plaça de la Vila
  [12, 15], [18, 15], [34, 15], [40, 15],   // along the main east–west road
  [23, 22], [23, 28], [26, 24], [26, 31],   // down the vertical road
  [18, 6], [5, 12], [34, 26], [21, 34],     // out in the barris
];

/* ---------------------------------------------------------------------
 *  Build the tile map of Martorell (procedural, editable).
 * ------------------------------------------------------------------- */
function buildMap() {
  const m = [];
  for (let y = 0; y < MAP_H; y++) { m[y] = []; for (let x = 0; x < MAP_W; x++) m[y][x] = 'G'; }
  const set = (x, y, t) => { if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) m[y][x] = t; };
  const rect = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, t); };

  // Llobregat: winding band down the east.
  for (let y = 0; y < MAP_H; y++) {
    const cx = 47 + Math.round(2 * Math.sin(y / 6));
    for (let x = cx - 2; x <= cx + 2; x++) set(x, y, 'W');
    set(cx - 3, y, '#'); set(cx + 3, y, '#');
  }
  rect(56, 0, 4, MAP_H, 'M');                               // Castellbisbal hills

  // Anoia joining from the south-west.
  for (let x = 0; x < 47; x++) {
    const cy = 38 + Math.round(1.5 * Math.sin(x / 5));
    set(x, cy, 'W'); set(x, cy + 1, 'W'); set(x, cy - 1, '#'); set(x, cy + 2, '#');
  }

  // Roads.
  for (let x = 6; x <= 45; x++) { set(x, 16, 'R'); set(x, 17, 'R'); }
  for (let y = 8;  y <= 36; y++) { set(24, y, 'R'); set(25, y, 'R'); }
  for (let y = 16; y <= 34; y++) { set(31, y, 'R'); }
  for (let x = 8;  x <= 24; x++) { set(x, 22, 'R'); }
  for (let x = 25; x <= 44; x++) { set(x, 10, 'R'); }

  // Roads out to the barris (neighborhoods).
  for (let y = 6;  y <= 8;  y++) { set(24, y, 'R'); set(25, y, 'R'); } // Buenos Aires spur (north)
  for (let x = 18; x <= 24; x++)  set(x, 6, 'R');
  for (let y = 7;  y <= 16; y++)  set(5, y, 'R');                       // Camí Fondo (sunken NW lane)
  set(6, 16, 'R');
  for (let x = 31; x <= 37; x++)  set(x, 26, 'R');                      // El Pla / Can Bros (SE)
  for (let x = 19; x <= 24; x++)  set(x, 34, 'R');                      // La Sínia / Les Bòbiles (S)

  rect(22, 12, 8, 6, 'S');                                  // Plaça de la Vila

  for (let x = 44; x <= 53; x++) set(x, 10, '~');           // Pont del Diable
  set(46, 9, '~'); set(46, 11, '~');

  [[14,26],[16,27],[12,28],[38,24],[40,22],[36,26],[9,12],[11,10],[42,14],[20,30],
   [15,3],[3,8],[40,27],[16,30],[33,6],[38,20]]
    .forEach(([x, y]) => set(x, y, 'T'));

  rect(6, 30, 10, 6, 'P');                                  // Parc de la Vila

  LANDMARKS.forEach(L => {
    if (L.building) rect(L.building.x, L.building.y, L.building.w, L.building.h, L.factory ? 'F' : 'B');
    set(L.x, L.y, 'D');
  });
  return m;
}
