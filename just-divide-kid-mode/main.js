// ====== DESIGN CONSTANTS ======
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 1024;

const GRID_SIZE = 4;
const TILE_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 32, 35];
const MAX_UNDO = 10;

// ====== GAME STATE ======
let grid = [];
let queue = [];
let keepVal = null;
let score = 0;
let bestScore = 0;
let level = 1;
let trashUses = 10;
let hintsOn = false;
let isGameOver = false;
let difficulty = 'medium'; // 'easy', 'medium', 'hard'

let undoStack = [];
let draggedValue = null;
let elapsedSeconds = 0;
let timerId = null;

// ====== DOM REFERENCES ======
let gridEl,
  messageEl,
  uiScore,
  uiBestScore,
  uiLevel,
  uiTrashCount,
  keepInnerEl,
  topSlotEl,
  previewEls,
  timerLabel;

// ====== INITIALIZATION ======
window.addEventListener("DOMContentLoaded", () => {
  gridEl = document.getElementById("grid");
  messageEl = document.getElementById("message-area");
  uiScore = document.getElementById("ui-score");
  uiBestScore = document.getElementById("ui-best-score");
  uiLevel = document.getElementById("ui-level");
  uiTrashCount = document.getElementById("trash-count");
  keepInnerEl = document.getElementById("keep-inner");
  topSlotEl = document.getElementById("upcoming-top-slot");
  timerLabel = document.getElementById("timer-label");

  previewEls = [
    document.getElementById("preview-1"),
    document.getElementById("preview-2")
  ];

  createGridDOM();
  attachGlobalListeners();
  updateScale();
  window.addEventListener("resize", updateScale);

  const storedBest = localStorage.getItem("jd_best_score");
  bestScore = storedBest ? parseInt(storedBest, 10) : 0;
  uiBestScore.textContent = bestScore;

  startNewGame();
});

function updateScale() {
  const scaleX = window.innerWidth / DESIGN_WIDTH;
  const scaleY = window.innerHeight / DESIGN_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  document.documentElement.style.setProperty("--game-scale", scale);
}

// ====== GRID CREATION ======
function createGridDOM() {
  gridEl.innerHTML = "";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();

      cell.addEventListener("dragover", onCellDragOver);
      cell.addEventListener("drop", onCellDrop);

      gridEl.appendChild(cell);
    }
  }

  const keepSlot = document.getElementById("keep-slot");
  const trashSlot = document.getElementById("trash-slot");

  keepSlot.addEventListener("dragover", onGenericDragOver);
  trashSlot.addEventListener("dragover", onGenericDragOver);

  keepSlot.addEventListener("drop", onKeepDrop);
  trashSlot.addEventListener("drop", onTrashDrop);
}

// ====== NEW GAME / RESET ======
function startNewGame() {
  grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
  queue = [];
  keepVal = null;
  score = 0;
  level = 1;
  trashUses = 10;
  hintsOn = false;
  isGameOver = false;
  undoStack = [];
  elapsedSeconds = 0;

  uiScore.textContent = score;
  uiLevel.textContent = level;
  uiTrashCount.textContent = trashUses.toString();
  keepInnerEl.innerHTML = "";
  setMessage("Drag the top tile into the grid to start!", "");

  // Generate queue based on current difficulty
  generateQueue(20);
  renderAll();

  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    elapsedSeconds++;
    updateTimerLabel();
  }, 1000);
  
  // Hide game over popup if visible
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}
function generateQueue(n) {
  for (let i = 0; i < n; i++) {
    const v = getTileValueByDifficulty();
    queue.push(v);
  }
}

function getTileValueByDifficulty() {
  let values;
  
  if (difficulty === 'easy') {
    // Easier numbers: smaller values, more divisible
    values = [2, 3, 4, 6, 8, 9, 12, 15, 16, 18, 20];
  } else if (difficulty === 'medium') {
    // Medium difficulty: original balanced values
    values = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30];
  } else { // hard
    // Harder numbers: larger values, some primes
    values = [5, 7, 10, 11, 13, 15, 18, 20, 24, 25, 30, 32, 35];
  }
  
  return values[Math.floor(Math.random() * values.length)];
}

function updateTimerLabel() {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  timerLabel.textContent = `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// ====== RENDERING ======
function renderGrid() {
  const cells = gridEl.querySelectorAll(".grid-cell");
  cells.forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const val = grid[r][c];

    cell.innerHTML = "";

    if (val !== null) {
      const tile = createTileElement(val);
      cell.appendChild(tile);
    }
  });
}

function renderKeep() {
  keepInnerEl.innerHTML = "";
  if (keepVal !== null) {
    const tile = createTileElement(keepVal, false);
    tile.style.width = "100px";
    tile.style.height = "100px";
    tile.style.fontSize = "36px";
    keepInnerEl.appendChild(tile);
  }
}

function renderQueue() {
  topSlotEl.innerHTML = "";
  previewEls.forEach((el) => (el.innerHTML = ""));

  if (queue.length === 0) {
    generateQueue(10);
  }

  const activeVal = queue[0];
  const activeTile = createTileElement(activeVal, true);
  activeTile.style.width = "100px";
  activeTile.style.height = "100px";
  activeTile.style.fontSize = "36px";
  
  activeTile.addEventListener("dragstart", (e) => {
    draggedValue = activeVal;
    e.dataTransfer.setData("text/plain", activeVal.toString());
  });
  activeTile.addEventListener("dragend", () => {
    draggedValue = null;
  });

  topSlotEl.appendChild(activeTile);

  for (let i = 1; i <= 2; i++) {
    if (queue[i] != null) {
      const smallTile = createTileElement(queue[i], false);
      smallTile.style.width = "60px";
      smallTile.style.height = "35px";
      smallTile.style.fontSize = "20px";
      previewEls[i - 1].appendChild(smallTile);
    }
  }
}

function renderAll() {
  renderGrid();
  renderKeep();
  renderQueue();
  updateLevelFromScore();
  uiLevel.textContent = level.toString();
  uiScore.textContent = score.toString();
  uiTrashCount.textContent = trashUses.toString();
  updateBestScoreUI();
  renderHints();
}

// ====== TILE ELEMENT CREATION ======
function getTileBackgroundAsset(value) {
  if (value <= 4) return "assets/blue.png";
  if (value <= 8) return "assets/orange.png";
  if (value <= 12) return "assets/pink.png";
  if (value <= 20) return "assets/purpule.png";
  return "assets/red.png";
}

function createTileElement(value, draggable = false) {
  const div = document.createElement("div");
  div.className = "tile";
  div.textContent = value.toString();
  div.style.backgroundImage = `url("${getTileBackgroundAsset(value)}")`;
  div.draggable = draggable;
  return div;
}

// ====== DRAG & DROP HANDLERS ======
function onCellDragOver(e) {
  if (!draggedValue || isGameOver) return;
  e.preventDefault();
}

function onCellDrop(e) {
  if (!draggedValue || isGameOver) return;
  e.preventDefault();

  const cell = e.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);

  if (grid[row][col] !== null) {
    setMessage("Choose an empty slot.", "error");
    return;
  }

  if (!isBoardEmpty() && !hasAnyNeighbor(row, col)) {
    setMessage("Place tile next to at least one existing tile.", "error");
    return;
  }

  pushUndoState();

  const val = queue[0];
  queue.shift();

  grid[row][col] = val;
  applyMergesFromPlacement(row, col);
  afterActionCommon();
}

function onGenericDragOver(e) {
  if (!draggedValue || isGameOver) return;
  e.preventDefault();
}

function onKeepDrop(e) {
  if (!draggedValue || isGameOver) return;
  e.preventDefault();

  pushUndoState();

  const active = queue[0];
  if (keepVal === null) {
    keepVal = active;
    queue.shift();
  } else {
    const temp = keepVal;
    keepVal = active;
    queue[0] = temp;
  }

  setMessage("Tile stored in KEEP slot.", "success");
  afterActionCommon(false);
}

function onTrashDrop(e) {
  if (!draggedValue || isGameOver) return;
  e.preventDefault();

  if (trashUses <= 0) {
    setMessage("No TRASH uses left!", "error");
    return;
  }

  pushUndoState();

  queue.shift();
  trashUses--;
  setMessage("Tile discarded.", "success");
  afterActionCommon(false);
}

// ====== COMMON POST-ACTION LOGIC ======
function afterActionCommon(checkGameOverFlag = true) {
  updateLevelFromScore();
  renderAll();
  if (checkGameOverFlag && isGameOverState()) {
    endGame("Game Over! No more valid merges.");
  } else if (!isGameOver) {
    setMessage("Good move. Keep going!", "success");
  }
}

// ====== MERGE LOGIC ======
function applyMergesFromPlacement(row, col) {
  let merged = true;

  while (merged) {
    merged = false;
    const neighbors = getNeighbors(row, col);

    for (const [nr, nc] of neighbors) {
      const vPlaced = grid[row][col];
      const vNeighbor = grid[nr][nc];
      if (vPlaced === null || vNeighbor === null) continue;

      if (vPlaced === vNeighbor) {
        const points = vPlaced + vNeighbor;
        score += points;
        grid[row][col] = null;
        grid[nr][nc] = null;
        setMessage(`Equal tiles! ${vPlaced} & ${vNeighbor} vanish (+${points})`, "success");
        updateBestScore();
        merged = true;
        break;
      }

      const largerPos = vPlaced >= vNeighbor ? [row, col] : [nr, nc];
      const smallerPos = vPlaced < vNeighbor ? [row, col] : [nr, nc];
      const largerVal = vPlaced >= vNeighbor ? vPlaced : vNeighbor;
      const smallerVal = vPlaced < vNeighbor ? vPlaced : vNeighbor;

      if (largerVal % smallerVal === 0) {
        const quotient = largerVal / smallerVal;
        score += quotient * 2;
        const [lr, lc] = largerPos;
        const [sr, sc] = smallerPos;

        grid[sr][sc] = null;
        grid[lr][lc] = quotient;

        if (quotient === 1) {
          grid[lr][lc] = null;
          setMessage(
            `Division result is 1, tile removed (+${quotient * 2})`,
            "success"
          );
        } else {
          setMessage(
            `${largerVal} ÷ ${smallerVal} = ${quotient} (+${quotient * 2})`,
            "success"
          );
        }
        updateBestScore();
        row = lr;
        col = lc;
        merged = true;
        break;
      }
    }
  }
}

// ====== NEIGHBORS & GAME-OVER ======
function getNeighbors(row, col) {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const neighbors = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

function hasAnyNeighbor(row, col) {
  const neighbors = getNeighbors(row, col);
  for (const [nr, nc] of neighbors) {
    if (grid[nr][nc] !== null) return true;
  }
  return false;
}

function isBoardEmpty() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null) return false;
    }
  }
  return true;
}

function isGridFull() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return true;
}

function isGameOverState() {
  if (!isGridFull()) return false;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = grid[r][c];
      if (v === null) continue;

      const neighbors = getNeighbors(r, c);
      for (const [nr, nc] of neighbors) {
        const v2 = grid[nr][nc];
        if (v2 === null) continue;
        if (v === v2) return false;
        const larger = Math.max(v, v2);
        const smaller = Math.min(v, v2);
        if (larger % smaller === 0) return false;
      }
    }
  }
  return true;
}

function endGame(msg) {
  isGameOver = true;
  setMessage(msg, "error");
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  
  showGameOverPopup();
}

function showGameOverPopup() {
  const overlay = document.getElementById('game-over-overlay');
  const popupScore = document.getElementById('popup-score');
  const popupBest = document.getElementById('popup-best');
  
  if (overlay && popupScore && popupBest) {
    popupScore.textContent = score;
    popupBest.textContent = bestScore;
    overlay.classList.add('show');
  }
}

function hideGameOverPopup() {
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

// ====== SCORE / LEVEL / BEST ======
function updateLevelFromScore() {
  const newLevel = Math.floor(score / 10) + 1;  // Every 10 points = next level
  if (newLevel > level) {
    level = newLevel;
    trashUses += 2;  // +2 trash uses per level (adjust as needed)
    
    // Optional: Increase difficulty slightly every few levels
    if (level % 5 === 0) { // Every 5 levels
      setMessage(`Level ${level}! Game getting harder!`, "success");
      // You could add logic here to make tiles slightly harder
    }
  }
  uiLevel.textContent = level.toString();
}
function updateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("jd_best_score", bestScore.toString());
  }
}

function updateBestScoreUI() {
  uiBestScore.textContent = bestScore.toString();
}

// ====== DIFFICULTY ======
function setDifficulty(level) {
  difficulty = level;
  const display = document.getElementById('difficulty-display');
  if (display) {
    display.textContent = level.toUpperCase();
  }
  setMessage(`Difficulty set to ${level.toUpperCase()}`, "success");
  
  // Regenerate the entire queue for the new difficulty
  const currentQueueLength = queue.length;
  queue = [];
  generateQueue(currentQueueLength > 5 ? currentQueueLength : 10);
  
  renderQueue();
  startNewGame();
}
// ====== HINTS ======
function renderHints() {
  const cells = gridEl.querySelectorAll(".grid-cell");
  cells.forEach((cell) => cell.classList.remove("hint"));

  if (!hintsOn || isGameOver || queue.length === 0) return;

  const v = queue[0];

  if (isBoardEmpty()) {
    cells.forEach((cell) => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      if (grid[r][c] === null) {
        cell.classList.add("hint");
      }
    });
    return;
  }

  cells.forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    if (grid[r][c] !== null) return;
    
    if (!hasAnyNeighbor(r, c)) return;
    
    const neighbors = getNeighbors(r, c);
    for (const [nr, nc] of neighbors) {
      const v2 = grid[nr][nc];
      if (v2 === null) continue;
      if (v === v2) {
        cell.classList.add("hint");
        break;
      }
      const larger = Math.max(v, v2);
      const smaller = Math.min(v, v2);
      if (larger % smaller === 0) {
        cell.classList.add("hint");
        break;
      }
    }
  });
}

function toggleHints() {
  hintsOn = !hintsOn;
  renderHints();
  setMessage(hintsOn ? "Hints ON (G)" : "Hints OFF (G)", "success");
}

// ====== UNDO ======
function pushUndoState() {
  const state = {
    grid: JSON.parse(JSON.stringify(grid)),
    queue: queue.slice(),
    keepVal,
    score,
    bestScore,
    level,
    trashUses,
    hintsOn,
    elapsedSeconds,
  };
  undoStack.push(state);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undo() {
  if (undoStack.length === 0) {
    setMessage("Nothing to undo.", "error");
    return;
  }
  const last = undoStack.pop();
  grid = last.grid;
  queue = last.queue;
  keepVal = last.keepVal;
  score = last.score;
  bestScore = last.bestScore;
  level = last.level;
  trashUses = last.trashUses;
  hintsOn = last.hintsOn;
  elapsedSeconds = last.elapsedSeconds;

  isGameOver = false;
  if (!timerId) {
    timerId = setInterval(() => {
      elapsedSeconds++;
      updateTimerLabel();
    }, 1000);
  }

  updateTimerLabel();
  renderAll();
  setMessage("Undo successful.", "success");
}

// ====== MESSAGES ======
function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.classList.remove("success", "error");
  if (type === "success") messageEl.classList.add("success");
  if (type === "error") messageEl.classList.add("error");
}

// ====== CONTROLS ======
function attachGlobalListeners() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "z" || e.key === "Z") {
      undo();
    } else if (e.key === "g" || e.key === "G") {
      toggleHints();
    } else if (e.key === "r" || e.key === "R") {
      startNewGame();
    } else if (e.key === "1") {
      setDifficulty('easy');
    } else if (e.key === "2") {
      setDifficulty('medium');
    } else if (e.key === "3") {
      setDifficulty('hard');
    }
  });

  const fsBtn = document.getElementById("btn-fullscreen");
  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }
  
  const menuBtn = document.getElementById("btn-menu");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      alert("Menu feature - Add your custom menu here!");
    });
  }
  
  const helpBtn = document.getElementById("btn-help");
  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      alert("HELP:\n\n" +
            "• Drag tiles from top slot to grid\n" +
            "• Equal tiles vanish when touching\n" +
            "• Divisible tiles merge (larger ÷ smaller)\n" +
            "• Use KEEP to store a tile\n" +
            "• Use TRASH to discard tiles\n\n" +
            "KEYBOARD SHORTCUTS:\n" +
            "• Z = Undo\n" +
            "• G = Toggle Hints\n" +
            "• R = Restart\n" +
            "• 1 = Easy Mode\n" +
            "• 2 = Medium Mode\n" +
            "• 3 = Hard Mode");
    });
  }

  const btnPopupRestart = document.getElementById('btn-popup-restart');
  const btnPopupClose = document.getElementById('btn-popup-close');
  
  if (btnPopupRestart) {
    btnPopupRestart.addEventListener('click', () => {
      hideGameOverPopup();
      startNewGame();
    });
  }
  
  if (btnPopupClose) {
    btnPopupClose.addEventListener('click', () => {
      hideGameOverPopup();
    });
  }
}