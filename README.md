**Just Divide — Kid Mode (Custom HTML/JS Implementation)**

A full recreation of the **“Just Divide — Kid Mode”** puzzle game using **Vanilla JavaScript, HTML, CSS**.

This project implements the complete UI, merge logic, leveling system, hint engine, game-over detection, trash/keep mechanics, animations, and responsive scaling — without any external libraries.


 **Approach**

**1. Rebuilt the UI from scratch**

* Created a scalable 1440×1024 base layout
* Implemented all visual components: header, cat badge area, level/score panels, 4×4 grid, right action panel (KEEP, Stack, TRASH)

**2. Pure JavaScript Game Engine**

* Designed internal game state structures:

  * `grid[4][4]`, `queue[]`, `keepVal`, `score`, `bestScore`, `trashUses`, `undoStack`, etc.
* All game mechanics implemented manually:

  * Drag & drop
  * Tile placement rules
  * Equal merge
  * Divisible merge
  * Quotient = 1 removal
  * Leveling system
  * Trash + Keep slots
  * Undo & hints
  * Difficulty selection
  * Timer

**3. Rendering System**

* DOM-based rendering for tiles, grid, hints, queue, keep-slot
* Custom tile components with PNG backgrounds

**4. Responsive Design**

* Auto-scaling using a `--game-scale` CSS variable
* Fits any screen without distortion
  

 **Decisions Made**

**1. Vanilla JavaScript Instead of Phaser**

This version uses pure HTML/CSS/JS.
Reason:

* Better control over DOM-based UI
* Easier to match the provided screenshots pixel-perfect
* Faster for responsive layouts

**2. Queue-Based Tile Generation**

Difficulty modes affect the tile pool:

* **Easy:** small & divisible numbers
* **Medium:** balanced list
* **Hard:** large numbers & primes

**3. Merge Logic Loop**

When one merge happens, code re-checks the tile until no more merges are possible.

**4. LocalStorage for Best Score**

Best score persists across browser sessions.

**5. Undo System Stores Full Game Snapshots**

Max 10 states kept for performance.


**Challenges Encountered**

**1. Matching the UI Exactly as in the PDF**

* Cat alignment, badge placement, panel shadows, and background scaling needed careful tuning
* Extra spacing above the grid required custom padding and negative margins

**2. Drag & Drop Reliability**

* Native HTML drag/drop is tricky
* Required custom handlers for:

  * Grid cells
  * Keep slot
  * Trash slot

**3. Merge Chain Handling**

* After every merge, tile position changes
* Needed a recursive/loop merge-check to avoid missed merges

**4. Responsiveness**

* The entire 1440×1024 layout had to scale proportionally
* CSS transforms + viewport ratio calculations solved this

**5. Game Over Detection**

Required checking:

* Grid is full
* No equal neighbor pairs
* No divisible pairs
  This needed a full scan of the board.


**What I Would Improve Next**

**1. Convert to Phaser or React**

Would make animation and scaling smoother and more structured.

**2. Smooth Tile Animations**

Current version is DOM-based snaps.
Next step:

* Slide-in animations
* Merge pop animations
* Tile fade-outs

**3. Audio Effects**

Add:

* Merge sound
* Drag sound
* Level-up sound
* Game-over jingle

**4. Hint System Enhancement**

Instead of outlining cells, highlight potential quotient results.

**5. Mobile Optimization**

While it scales, touch-drag support could be improved.

**6. Modularization**

Split `main.js` into:

* `state.js`
* `logic.js`
* `ui.js`
* `controls.js`
