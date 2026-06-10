# 🗡️ Martorell Quest — *La Leyenda del Puente del Diablo*

A small, **Zelda-style top-down action-adventure** set on the real map of
**Martorell** (Baix Llobregat, Catalonia). Walk the town, talk to its people,
fight off the Devil's imps, and gather the **5 Devil's Stones** to rebuild the
legendary **Pont del Diable** before dawn.

It's a hand-made homage to the town and to *The Legend of Zelda* — **pure
HTML5 Canvas + JavaScript, no build step, no assets**. Every sprite, tile and
sound is drawn/synthesised in code.

🎨 **SNES-era look** (*A Link to the Past*-style): a pre-rendered, textured
world (cobbled plazas, dirt paths, foam-edged animated water, layered trees),
depth-sorted sprites so you pass *behind* canopies and rooftops, an animated
hero with a sword-swing arc, flapping imps, particle effects & screen-shake,
and an atmospheric **night-lighting** pass with warm lamp-glow and a player
lantern — all still drawn from code primitives.

🌍 **Trilingual:** starts in **Spanish** by default; switch to **Català** or
**English** from the start menu (or press **L** any time).

> This is a brand-new, separate game and a **different genre** — not related to
> the Monkey-Island-style point-and-click *martohell-game* project. New game,
> new repo.

## ▶️ Play

Just open `index.html` in a browser. That's it.

```bash
# or serve it locally if you prefer
python3 -m http.server 8000   # then visit http://localhost:8000
```

No `npm install`, no bundler — it runs straight from the file system.

## 🎮 Controls

| Action          | Keys                         | Touch        |
|-----------------|------------------------------|--------------|
| Move            | `WASD` / arrow keys          | D-pad        |
| Sword           | `J` / `Z` / `Space`          | ⚔ button     |
| Talk / use      | `E` / `Enter`                | E button     |
| Change language | `L`, or `1`/`2`/`3` in menu  | menu buttons |
| Restart         | `R`                          | —            |

On phones/tablets the on-screen D-pad and buttons appear automatically. On the
start menu, tap a language (Español / Català / English) and tap to play.

## 🗺️ The map of Martorell

The world is a tile map of the town, with the **Llobregat** winding down the
east, the **Anoia** joining from the south-west, and the **Pont del Diable**
crossing the river up north. Real landmarks are interactive points (`!` = has a
stone for you, `★` = the goal):

| Place | Role |
|-------|------|
| **Pont del Diable** | The goal — bring the 5 stones here to win |
| **Torre de les Hores** | 🪨 Stone |
| **Basílica de Santa Maria / Sant Crist** | 🪨 Stone |
| **Mercat Municipal** | 🪨 Stone |
| **Museu L'Enrajolada (Casa Santacana)** | 🪨 Stone |
| **Fàbrica SEAT Martorell** | 🪨 Stone |
| **Ajuntament · Plaça de la Vila** | Lore / encouragement |
| **Capella de Sant Genís** | Lore / hint |
| **La Fleca del Camí Ral** | Heals you (the *coca de Martorell*) |
| **Bar de la Plaça** | Gives you the stones hint |
| **Estació de Martorell** | Warns about the imps |
| **Parc de la Vila · Riu Anoia** | The legend's old woman |

## 📜 The legend

According to the real folk tale, the Devil built the Pont del Diable in a
single night in exchange for the first soul to cross it — but a clever old
woman sent a **cat** across first. In this game the Devil wants revenge: he's
shattered the Gothic arch and scattered five stones across town. Recover them
and rebuild the bridge.

## 🛠️ Structure

```
index.html        # canvas + on-screen controls
css/style.css     # layout, mobile controls
js/data.js        # the map builder + all landmarks & lore (edit this!)
js/game.js        # the engine: movement, combat, dialogue, render
```

Want to add a place or change the lore? It's almost all in `js/data.js` —
add an entry to `LANDMARKS` (set `stone: true` to make it a quest item) and
the engine picks it up automatically.

## 🔫 MARTODOOM — Episodi 1: Buenos Aires & Camí Fondo

A second game lives in [`doom/`](doom/): a **Doom-style first-person shooter**
set in the real southern barris of Martorell. Open `doom/index.html` and play.

It runs on a hand-written **variable-height raycaster** (pure canvas, no
build step, no assets — same philosophy as the Zelda-like): 1 grid cell =
1 metre, buildings carry their own height, material and colour, so the
five-storey 1962 brick rows of **Buenos Aires** loom over the two-storey
pastel rowhouses of **Camí Fondo** exactly as they should.

**Realism first.** The street plan, squares and landmarks are the real ones,
laid out from documented sources (the shapes are careful approximations, not
survey data):

| Real place | In the game |
|------------|-------------|
| Av. del Camí Fondo + C. de Joan Maragall / Jacint Verdaguer / Vallirana / Torrelles / St. Llorenç d'Hortons / Castellví de Rosanes / Pou del Merli | the tree-lined grid of Camí Fondo |
| Mercat Municipal · Rbla. de les Bòbiles | where you start |
| Av. Fèlix Duran i Cañameras | the avenue between the barris, with the **IES Pompeu Fabra** and the sports pavilion (the key is in there) |
| **Centre Cultural** (1995) + Pl. de les Cultures, at the end of **Pg. de Catalunya** | its five coloured roof panels rise over the clearing between the barris — gardens behind, square and park in front |
| Pl. d'Isidre Clopas (recently re-urbanised, with its new trees) | the shotgun is here |
| Pl. de Pompeu Fabra + church of **Crist Salvador** | the Devil's portal — endgame |
| C. del Tenor Palet / Mestre Morera / Lluís de Requesens / Doctor Trueta / Ptge. de Buenos Aires | the polígon rows of Buenos Aires |

Montserrat is on the horizon, the street you're on is named on screen, and
**M** opens a labelled map of both barris. Trilingual (ES/CA/EN) with **L**.

Controls: **WASD** move · **mouse / arrows** turn · **click / space** fire ·
**1-3** weapons · **M** map · **R** restart.

The lore continues the bridge legend: the Devil opens a portal in front of
Crist Salvador and his imps overrun the southern barris. Find the pavilion
key, then close the portal.

> Want street-level accuracy? `doom/js/map.js` is fully declarative
> (streets as polylines, buildings as rectangles with floors/colour/material).
> Exporting building footprints for the two barris from OpenStreetMap and
> translating them into those tables is the natural next step.

## ⚖️ Credits & licence

Original code, art and audio, made with care. A **fan-made homage** to the town
of Martorell, to Nintendo's *The Legend of Zelda* and to id Software's *DOOM* —
**not official**, not affiliated with or endorsed by Nintendo, id Software,
the Ajuntament de Martorell, SEAT, or any business depicted. Place depictions
are stylised and for fun.

MIT licence — see [`LICENSE`](LICENSE).
