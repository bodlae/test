const board = document.querySelector("#board");
const deployCtx = board.getContext("2d");
const enemyPreview = document.querySelector("#enemyPreview");
const previewCtx = enemyPreview.getContext("2d");
const ownBoard = document.querySelector("#ownBoard");
const ownCtx = ownBoard.getContext("2d");
const targetBoard = document.querySelector("#targetBoard");
const targetCtx = targetBoard.getContext("2d");

const moneyEl = document.querySelector("#money");
const selectedEl = document.querySelector("#selected");
const phaseLabel = document.querySelector("#phaseLabel");
const battleStatusEl = document.querySelector("#battleStatus");
const battleLogEl = document.querySelector("#battleLog");
const shotsInfoDeployEl = document.querySelector("#shotsInfoDeploy");
const shotsInfoBattleEl = document.querySelector("#shotsInfoBattle");

const landShopEl = document.querySelector("#landShop");
const airShopEl = document.querySelector("#airShop");
const seaShopEl = document.querySelector("#seaShop");
const supportShopEl = document.querySelector("#supportShop");
const rotateBtn = document.querySelector("#rotate");
const useRadarBtn = document.querySelector("#useRadarField");
const useBombBtn = document.querySelector("#useBombField");
const startBattleBtn = document.querySelector("#startBattle");
const resetBtn = document.querySelector("#reset");
const clearBtn = document.querySelector("#clear");

const deployPanel = document.querySelector("#deployPanel");
const battlePanel = document.querySelector("#battlePanel");
const shopPanel = document.querySelector("#shopPanel");

const START_POINTS = 20;
const supportCatalog = {
  radar: { id: "radar", name: "Radar Pack", cost: 1, amount: 2, label: "2 scans" },
  bomb: { id: "bomb", name: "Atom Bomb", cost: 1, amount: 1, label: "1 bomb" }
};
const COLS = 10;
const ROWS = 22;
const CELL = 30;
const PAD = 12;

const canvasW = COLS * CELL + PAD * 2;
const canvasH = ROWS * CELL + PAD * 2;
[board, enemyPreview, ownBoard, targetBoard].forEach((cv) => {
  cv.width = canvasW;
  cv.height = canvasH;
});

const unitCatalog = {
  land: [
    {
      id: "bnk",
      name: "Bunker",
      cost: 3,
      type: "land",
      cells: [[0, 0], [0, 1], [1, 0], [1, 1]]
    },
    {
      id: "aad",
      name: "Air Defense",
      cost: 4,
      type: "land",
      cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]
    },
    {
      id: "amd",
      name: "Ammo Depot",
      cost: 5,
      type: "land",
      cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2]]
    }
  ],
  air: [
    { id: "ftr", name: "Fighter", cost: 4, type: "air", length: 3 },
    { id: "bmr", name: "Bomber", cost: 6, type: "air", length: 4 }
  ],
  sea: [
    { id: "ptb", name: "Patrol Boat", cost: 2, type: "sea", length: 2 },
    { id: "dst", name: "Destroyer", cost: 3, type: "sea", length: 3 },
    { id: "cru", name: "Cruiser", cost: 4, type: "sea", length: 4 },
    { id: "car", name: "Carrier", cost: 7, type: "sea", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2]] }
  ]
};

const state = {
  phase: "deploy",
  points: START_POINTS,
  selected: null,
  orientation: 0,
  hoverCell: null,
  battleHoverCell: null,
  ghost: null,
  lastBuyTs: 0,
  error: "",
  playerBoard: [],
  enemyBoard: [],
  reserves: {},
  playerUnits: [],
  enemyUnits: [],
  supportStock: {
    radarScans: 0,
    bombs: 0
  },
  battle: {
    playerTurn: true,
    shotsLeft: 0,
    playerUnspent: 0,
    enemyUnspent: 0,
    radarCharges: 0,
    bombCharges: 0,
    mode: "shot",
    aiFocusUnitId: null,
    over: false,
    message: ""
  }
};

function allUnits() {
  return [...unitCatalog.land, ...unitCatalog.air, ...unitCatalog.sea];
}

function unitById(id) {
  return allUnits().find((u) => u.id === id);
}

function unitCellCount(unit) {
  if (unit.cells) return unit.cells.length;
  return unit.length;
}

function discountedCost(unit) {
  return unit.cost;
}

function aliveHexes(fleet) {
  return fleet.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
}

function shotsPerTurn(fleet) {
  const alive = aliveHexes(fleet);
  return alive > 0 ? Math.ceil(alive / 5) : 0;
}

function terrainAt(row) {
  return row < ROWS / 2 ? "land" : "sea";
}

function createBoard() {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      row: r,
      col: c,
      terrain: terrainAt(r),
      unitId: null,
      shot: false,
      hit: false,
      scanned: false,
      damaged: false,
      blasted: false,
      coast: r === ROWS / 2 - 1 || r === ROWS / 2
    }))
  );
}

function initReserves() {
  state.reserves = {};
  allUnits().forEach((u) => {
    state.reserves[u.id] = 0;
  });
}

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function footprintCells(unit, row, col, orientation) {
  const base = unit.cells || Array.from({ length: unit.length }, (_, i) => [0, i]);
  const rotated = base.map(([r, c]) => {
    const rot = ((orientation % 4) + 4) % 4;
    if (rot === 0) return [r, c];
    if (rot === 1) return [c, -r];
    if (rot === 2) return [-r, -c];
    return [-c, r];
  });
  const minR = Math.min(...rotated.map((p) => p[0]));
  const minC = Math.min(...rotated.map((p) => p[1]));
  const offsets = rotated.map(([r, c]) => [r - minR, c - minC]);

  const cells = [];
  for (const [dr, dc] of offsets) {
    const rr = row + dr;
    const cc = col + dc;
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return null;
    cells.push({ row: rr, col: cc });
  }
  return cells;
}

function canPlace(boardState, cells, type) {
  if (!cells) return false;
  const ownCells = new Set(cells.map((p) => `${p.row},${p.col}`));
  return cells.every(({ row, col }) => {
    const cell = boardState[row][col];
    const terrainOk = type === "air" ? true : cell.terrain === type;
    if (!terrainOk || cell.unitId) return false;

    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const rr = row + dr;
        const cc = col + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        if (ownCells.has(`${rr},${cc}`)) continue;
        if (boardState[rr][cc].unitId) return false;
      }
    }
    return true;
  });
}

function placeUnitOnBoard(boardState, unit, cells, fleet) {
  const instanceId = `${unit.id}-${fleet.length + 1}-${Math.random().toString(36).slice(2, 7)}`;
  for (const { row, col } of cells) boardState[row][col].unitId = instanceId;
  fleet.push({ instanceId, id: unit.id, type: unit.type, hp: cells.length, cells, paidCost: discountedCost(unit) });
}

function findUnitAtCell(fleet, row, col) {
  return fleet.find((u) => u.cells.some((p) => p.row === row && p.col === col)) || null;
}

function removeUnitFromBoard(boardState, fleet, instanceId) {
  const idx = fleet.findIndex((u) => u.instanceId === instanceId);
  if (idx === -1) return null;
  const unit = fleet[idx];
  for (const p of unit.cells) {
    boardState[p.row][p.col].unitId = null;
  }
  fleet.splice(idx, 1);
  return unit;
}

function countPlacedById(unitId) {
  return state.playerUnits.filter((u) => u.id === unitId).length;
}

function sellPlacedUnit(unitId) {
  if (state.phase !== "deploy") return;
  const candidate = [...state.playerUnits].reverse().find((u) => u.id === unitId);
  if (!candidate) return;
  const removed = removeUnitFromBoard(state.playerBoard, state.playerUnits, candidate.instanceId);
  if (!removed) return;
  state.points += removed.paidCost ?? discountedCost(unitById(unitId));
  if (state.ghost?.mode === "move" && state.ghost.id === unitId) {
    state.ghost = null;
  }
  state.error = "";
  renderShop();
  renderHud();
  drawDeployBoard();
}

function clearHeldCursor() {
  if (!state.ghost) return;
  if (state.ghost.mode === "move") {
    state.points += state.ghost.paidCost ?? 0;
  }
  state.ghost = null;
}

function renderShopGroup(container, type) {
  container.innerHTML = "";
  unitCatalog[type].forEach((unit) => {
    const span = `${unitCellCount(unit)} cells`;
    const cost = discountedCost(unit);
    const placed = countPlacedById(unit.id);

    const row = document.createElement("div");
    row.className = "shop-row";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${unit.name}</strong><div class="shop-meta">Cost ${cost} pts | ${span} | Placed ${placed}</div>`;

    const controls = document.createElement("div");
    const buy = document.createElement("button");
    buy.textContent = "Buy";
    buy.disabled = state.phase !== "deploy";
    buy.addEventListener("click", () => buyUnit(type, unit.id));
    const sell = document.createElement("button");
    sell.textContent = "Sell";
    sell.disabled = state.phase !== "deploy" || placed <= 0;
    sell.addEventListener("click", () => sellPlacedUnit(unit.id));
    controls.appendChild(buy);
    controls.appendChild(sell);
    row.appendChild(left);
    row.appendChild(controls);
    container.appendChild(row);
  });
}

function renderSupportShop() {
  if (!supportShopEl) return;
  supportShopEl.innerHTML = "";
  const rows = [
    { key: "radarScans", cfg: supportCatalog.radar },
    { key: "bombs", cfg: supportCatalog.bomb }
  ];
  rows.forEach(({ key, cfg }) => {
    const count = state.supportStock[key];
    const row = document.createElement("div");
    row.className = "shop-row";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${cfg.name}</strong><div class="shop-meta">Cost ${cfg.cost} pts | ${cfg.label} | Stock ${count}</div>`;
    const controls = document.createElement("div");
    const buy = document.createElement("button");
    buy.textContent = "Buy";
    buy.disabled = state.phase !== "deploy" || state.points < cfg.cost;
    buy.addEventListener("click", () => {
      if (state.phase !== "deploy" || state.points < cfg.cost) return;
      state.points -= cfg.cost;
      state.supportStock[key] += cfg.amount;
      state.error = "";
      renderShop();
      renderHud();
    });
    const sell = document.createElement("button");
    sell.textContent = "Sell";
    sell.disabled = state.phase !== "deploy" || count < cfg.amount;
    sell.addEventListener("click", () => {
      if (state.phase !== "deploy" || state.supportStock[key] < cfg.amount) return;
      state.supportStock[key] -= cfg.amount;
      state.points += cfg.cost;
      state.error = "";
      renderShop();
      renderHud();
    });
    controls.appendChild(buy);
    controls.appendChild(sell);
    row.appendChild(left);
    row.appendChild(controls);
    supportShopEl.appendChild(row);
  });
}

function renderShop() {
  renderShopGroup(landShopEl, "land");
  renderShopGroup(airShopEl, "air");
  renderShopGroup(seaShopEl, "sea");
  renderSupportShop();
}

function renderBattleLog() {
  if (!battleLogEl) return;
  const lines = (state.battle.log || []).slice(-80);
  battleLogEl.innerHTML = lines
    .map((line) => `<div class="battle-log-line${/\bHit\b/i.test(line) ? " hit" : ""}">${colorizePlayers(line)}</div>`)
    .join("");
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

function addBattleLog(line) {
  if (!state.battle.log) state.battle.log = [];
  state.battle.log.push(line);
  if (state.battle.log.length > 300) state.battle.log.shift();
  renderBattleLog();
}

function colorizePlayers(text) {
  return text
    .replace(/\bYou\b/g, '<span class="p-you">You</span>')
    .replace(/\bEnemy\b/g, '<span class="p-enemy">Enemy</span>');
}

function renderHud() {
  moneyEl.textContent = `Points: ${state.points}`;
  if (state.phase === "deploy") {
    phaseLabel.textContent = `Phase: deploy | Orientation: ${state.orientation * 90}deg`;
  } else {
    phaseLabel.textContent = `Phase: battle | Turn: ${state.battle.playerTurn ? "You" : "Enemy"} | Shots left: ${state.battle.shotsLeft}`;
  }
  if (!state.ghost) {
    selectedEl.textContent = "Cursor: none";
  } else {
    const u = unitById(state.ghost.id);
    selectedEl.textContent = `Cursor: ${u.name} (${u.type})`;
  }
  selectedEl.className = `selected ${state.error ? "note-error" : ""}`;
  if (state.error) selectedEl.textContent += ` | ${state.error}`;

  const playerShotsNow = shotsPerTurn(state.playerUnits);
  const enemyShotsNow = shotsPerTurn(state.enemyUnits);
  const shotsLabel = `Shots: You ${playerShotsNow} | Enemy ${enemyShotsNow} (ceil alive/5) | Radar ${state.battle.radarCharges || 0} | Atom ${state.battle.bombCharges || 0} | Mode ${state.battle.mode || "shot"}`;
  if (shotsInfoDeployEl) shotsInfoDeployEl.textContent = shotsLabel;
  if (shotsInfoBattleEl) shotsInfoBattleEl.textContent = shotsLabel;

  const battleActive = state.phase === "battle";
  if (useRadarBtn) {
    useRadarBtn.textContent = `Use Radar (${state.battle.radarCharges || 0})`;
    useRadarBtn.disabled = !battleActive || !state.battle.playerTurn || state.battle.shotsLeft <= 0 || (state.battle.radarCharges || 0) <= 0;
  }
  if (useBombBtn) {
    useBombBtn.textContent = `Use Atom (${state.battle.bombCharges || 0})`;
    useBombBtn.disabled = !battleActive || !state.battle.playerTurn || state.battle.shotsLeft <= 0 || (state.battle.bombCharges || 0) <= 0;
  }

  if (state.phase === "battle") {
    battleStatusEl.innerHTML = colorizePlayers(state.battle.message);
    renderBattleLog();
  }
}

function buyUnit(type, unitId) {
  if (state.phase !== "deploy") return;
  const unit = unitById(unitId);
  const cost = discountedCost(unit);
  // Selection only; points are deducted on successful placement.
  state.ghost = { id: unit.id, type, mode: "buy", paidCost: cost };
  state.lastBuyTs = Date.now();
  state.error = "";
  renderShop();
  renderHud();
  drawDeployBoard();
}

function selectUnit(type, unitId) {
  // Deprecated: placement now uses buy-and-place directly.
  void type;
  void unitId;
}

function rotateSelection() {
  state.orientation = (state.orientation + 1) % 4;
  renderHud();
}

function cellFromCanvas(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width) - PAD;
  const y = (clientY - rect.top) * (canvas.height / rect.height) - PAD;
  if (x < 0 || y < 0) return null;
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { row, col };
}

function deploySelected(row, col) {
  if (!state.ghost) {
    state.error = "Buy a unit first.";
    renderHud();
    return;
  }
  const unit = unitById(state.ghost.id);

  const cells = footprintCells(unit, row, col, state.orientation);
  if (!canPlace(state.playerBoard, cells, unit.type)) {
    state.error = `${unit.name} footprint does not fit valid free ${unit.type} cells.`;
    renderHud();
    return;
  }

  if (state.ghost.mode === "buy") {
    const placeCost = discountedCost(unit);
    if (state.points < placeCost) {
      state.error = `Not enough points to place ${unit.name}.`;
      renderHud();
      return;
    }
    state.points -= placeCost;
    state.ghost.paidCost = placeCost;
  }

  placeUnitOnBoard(state.playerBoard, unit, cells, state.playerUnits);
  const placed = state.playerUnits[state.playerUnits.length - 1];
  placed.paidCost = state.ghost.paidCost ?? discountedCost(unit);
  state.error = "";
  renderShop();
  renderHud();
  drawDeployBoard();
}

function clearDeployment() {
  if (state.phase !== "deploy") return;
  for (const unit of state.playerUnits) state.points += unit.paidCost ?? discountedCost(unitById(unit.id));
  state.playerUnits = [];
  state.ghost = null;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = state.playerBoard[r][c];
      cell.unitId = null;
      cell.shot = false;
      cell.hit = false;
    }
  }
  state.error = "";
  renderShop();
  renderHud();
  drawDeployBoard();
}

function drawGridBase(ctx, boardState) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = boardState[r][c];
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      ctx.fillStyle = cell.terrain === "land" ? "#4f7041" : "#246596";
      ctx.fillRect(x, y, CELL, CELL);
      if (cell.coast) {
        ctx.strokeStyle = "#d9c06a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }
      ctx.strokeStyle = "#ffffff22";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, CELL, CELL);
    }
  }
}

function drawFleetBlocks(ctx, boardState, fleet, reveal = true) {
  for (const unit of fleet) {
    for (const cellPos of unit.cells) {
      const { row, col } = cellPos;
      const cell = boardState[row][col];
      const x = PAD + col * CELL;
      const y = PAD + row * CELL;
      if (!reveal) {
        const visibleByShot = cell.shot;
        const visibleByRadar = cell.scanned && cell.unitId && !cell.damaged;
        if (!visibleByShot && !visibleByRadar) continue;
      }
      if (unit.type === "land") {
        ctx.fillStyle = unit.id === "bnk" ? "#f7ef8a" : unit.id === "aad" ? "#ffdba5" : "#f3c2a9";
        ctx.fillRect(x + 5, y + 5, CELL - 10, CELL - 10);
      } else if (unit.type === "air") {
        ctx.fillStyle = "#ffb3e6";
        ctx.beginPath();
        ctx.moveTo(x + CELL * 0.5, y + CELL * 0.2);
        ctx.lineTo(x + CELL * 0.78, y + CELL * 0.5);
        ctx.lineTo(x + CELL * 0.5, y + CELL * 0.8);
        ctx.lineTo(x + CELL * 0.22, y + CELL * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#d2edff";
        ctx.beginPath();
        ctx.moveTo(x + CELL * 0.2, y + CELL * 0.72);
        ctx.lineTo(x + CELL * 0.5, y + CELL * 0.25);
        ctx.lineTo(x + CELL * 0.8, y + CELL * 0.72);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawScannedArea(ctx, boardState) {
  ctx.save();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = boardState[r][c];
      if (!cell.scanned) continue;
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      ctx.fillStyle = "#8ad9ff33";
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }
  }
  ctx.restore();
}

function drawShots(ctx, boardState) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = boardState[r][c];
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      if (cell.blasted) {
        ctx.fillStyle = "#4e4e4e";
        ctx.fillRect(x + 8, y + 8, CELL - 16, CELL - 16);
      }
      if (!cell.shot) continue;
      if (cell.hit) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + CELL - 6, y + CELL - 6);
        ctx.moveTo(x + CELL - 6, y + 6);
        ctx.lineTo(x + 6, y + CELL - 6);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#e6f1ff";
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawDeployBoard() {
  deployCtx.clearRect(0, 0, board.width, board.height);
  drawGridBase(deployCtx, state.playerBoard);
  drawFleetBlocks(deployCtx, state.playerBoard, state.playerUnits, true);
  if (state.ghost && state.hoverCell) {
    const unit = unitById(state.ghost.id);
    const ghostCells = footprintCells(unit, state.hoverCell.row, state.hoverCell.col, state.orientation);
    const ok = canPlace(state.playerBoard, ghostCells, unit.type);
    if (ghostCells) {
      deployCtx.globalAlpha = 0.45;
      for (const p of ghostCells) {
        const x = PAD + p.col * CELL;
        const y = PAD + p.row * CELL;
        deployCtx.fillStyle = ok ? "#8df7bc" : "#ff7f7f";
        deployCtx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
      }
      deployCtx.globalAlpha = 1;
    }
  }
  deployCtx.fillStyle = "#e9f2ff";
  deployCtx.font = "12px Verdana";
  deployCtx.fillText("Your field", PAD, board.height - 8);

  previewCtx.clearRect(0, 0, enemyPreview.width, enemyPreview.height);
  drawGridBase(previewCtx, state.enemyBoard);
  previewCtx.textAlign = "left";
  previewCtx.textBaseline = "alphabetic";
  previewCtx.font = "12px Verdana";
  previewCtx.fillText("Enemy field", PAD, enemyPreview.height - 8);
}

function drawBattleBoards() {
  ownCtx.clearRect(0, 0, ownBoard.width, ownBoard.height);
  drawGridBase(ownCtx, state.playerBoard);
  drawFleetBlocks(ownCtx, state.playerBoard, state.playerUnits, true);
  drawShots(ownCtx, state.playerBoard);

  targetCtx.clearRect(0, 0, targetBoard.width, targetBoard.height);
  drawGridBase(targetCtx, state.enemyBoard);
  drawScannedArea(targetCtx, state.enemyBoard);
  drawFleetBlocks(targetCtx, state.enemyBoard, state.enemyUnits, false);
  drawShots(targetCtx, state.enemyBoard);
  drawBattleActionCursor(targetCtx);
}

function drawBattleActionCursor(ctx) {
  if (state.phase !== "battle") return;
  if (!state.battle.playerTurn) return;
  if (!state.battleHoverCell) return;
  if (state.battle.mode !== "radar" && state.battle.mode !== "bomb") return;
  const center = state.battleHoverCell;
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const rr = center.row + dr;
      const cc = center.col + dc;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      const x = PAD + cc * CELL;
      const y = PAD + rr * CELL;
      ctx.fillStyle = state.battle.mode === "radar" ? "#7fd9ff" : "#ff8f7f";
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }
  }
  ctx.restore();
}

function randomPlaceEnemyFleet() {
  state.enemyBoard = createBoard();
  state.enemyUnits = [];
  let enemyPoints = START_POINTS;
  const template = [];
  let guard = 0;
  while (guard < 100) {
    guard += 1;
    const affordable = allUnits().filter((unit) => discountedCost(unit) <= enemyPoints);
    if (affordable.length === 0) break;
    const pick = affordable[randInt(affordable.length)];
    enemyPoints -= discountedCost(pick);
    template.push(pick);
    if (template.length >= 14) break;
  }

  for (const unit of template) {
    let placed = false;
    for (let tries = 0; tries < 800 && !placed; tries += 1) {
      const orientation = Math.random() < 0.5 ? "H" : "V";
      const row = randInt(ROWS);
      const col = randInt(COLS);
      const cells = footprintCells(unit, row, col, orientation);
      if (!canPlace(state.enemyBoard, cells, unit.type)) continue;
      placeUnitOnBoard(state.enemyBoard, unit, cells, state.enemyUnits);
      placed = true;
    }
    if (!placed) {
      enemyPoints += discountedCost(unit);
    }
  }
  return { unspent: enemyPoints };
}

function applyShot(boardState, fleet, row, col) {
  const cell = boardState[row][col];
  if (cell.shot) return null;
  cell.shot = true;
  if (cell.unitId) {
    cell.hit = true;
    let destroyed = false;
    if (!cell.damaged) {
      cell.damaged = true;
      const unit = fleet.find((u) => u.instanceId === cell.unitId);
      if (unit) {
        unit.hp -= 1;
        destroyed = unit.hp <= 0;
      }
    }
    return { hit: true, unitId: cell.unitId, destroyed };
  }
  return { hit: false, unitId: null, destroyed: false };
}

function applyRadarScan(boardState, row, col) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const rr = row + dr;
      const cc = col + dc;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      boardState[rr][cc].scanned = true;
    }
  }
}

function applyAtomBomb(boardState, fleet, row, col) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const rr = row + dr;
      const cc = col + dc;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      const cell = boardState[rr][cc];
      cell.blasted = true;
      if (cell.unitId && !cell.damaged) {
        cell.damaged = true;
        const unit = fleet.find((u) => u.instanceId === cell.unitId);
        if (unit) unit.hp -= 1;
      }
    }
  }
}

function consumePlayerTurnShot() {
  state.battle.shotsLeft -= 1;
  if (state.battle.shotsLeft <= 0) {
    state.battle.playerTurn = false;
    state.battle.shotsLeft = shotsPerTurn(state.enemyUnits);
    return false;
  }
  return true;
}

function playerAction(row, col) {
  if (state.phase !== "battle" || state.battle.over || !state.battle.playerTurn || state.battle.shotsLeft <= 0) return;

  if (state.battle.mode === "radar") {
    if (state.battle.radarCharges <= 0) {
      state.error = "No radar charges.";
      renderHud();
      return;
    }
    applyRadarScan(state.enemyBoard, row, col);
    state.battle.radarCharges -= 1;
    state.battle.mode = "shot";
    const playerContinues = consumePlayerTurnShot();
    state.battle.message = playerContinues
      ? `Scan at (${col + 1}, ${row + 1}). ${state.battle.shotsLeft} shots left.`
      : `Scan at (${col + 1}, ${row + 1}). Enemy turn: ${state.battle.shotsLeft} shots.`;
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    if (!playerContinues) setTimeout(runEnemyVolley, 300);
    return;
  }

  if (state.battle.mode === "bomb") {
    if (state.battle.bombCharges <= 0) {
      state.error = "No atom bombs.";
      renderHud();
      return;
    }
    applyAtomBomb(state.enemyBoard, state.enemyUnits, row, col);
    state.battle.bombCharges -= 1;
    state.battle.mode = "shot";
    if (allSunk(state.enemyUnits)) {
      state.battle.over = true;
      state.battle.message = "Victory: enemy fleet eliminated.";
      addBattleLog("Atom bomb deployed. Battle ended.");
      drawBattleBoards();
      renderHud();
      return;
    }
    const playerContinues = consumePlayerTurnShot();
    state.battle.message = playerContinues
      ? `Bomb at (${col + 1}, ${row + 1}). ${state.battle.shotsLeft} shots left.`
      : `Bomb at (${col + 1}, ${row + 1}). Enemy turn: ${state.battle.shotsLeft} shots.`;
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    if (!playerContinues) setTimeout(runEnemyVolley, 300);
    return;
  }

  const result = applyShot(state.enemyBoard, state.enemyUnits, row, col);
  if (!result) return;
  if (allSunk(state.enemyUnits)) {
    state.battle.over = true;
    state.battle.message = "Victory: enemy fleet eliminated.";
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    return;
  }
  const playerContinues = consumePlayerTurnShot();
  state.battle.message = playerContinues
    ? result.hit
      ? `Hit at (${col + 1}, ${row + 1}). ${state.battle.shotsLeft} shots left this turn.`
      : `Miss at (${col + 1}, ${row + 1}). ${state.battle.shotsLeft} shots left this turn.`
    : result.hit
      ? `Hit at (${col + 1}, ${row + 1}). Enemy turn: ${state.battle.shotsLeft} shots.`
      : `Miss at (${col + 1}, ${row + 1}). Enemy turn: ${state.battle.shotsLeft} shots.`;
  addBattleLog(state.battle.message);
  drawBattleBoards();
  renderHud();
  if (!playerContinues) setTimeout(runEnemyVolley, 300);
}

function allSunk(fleet) {
  return fleet.every((u) => u.hp <= 0);
}

function runEnemyVolley() {
  if (state.battle.over || state.phase !== "battle" || state.battle.playerTurn) return;
  if (state.battle.shotsLeft <= 0) {
    state.battle.playerTurn = true;
    state.battle.shotsLeft = shotsPerTurn(state.playerUnits);
    state.battle.message = `Your turn. ${state.battle.shotsLeft} shots available.`;
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    return;
  }

  const candidates = [];
  const focusUnit = state.playerUnits.find((u) => u.instanceId === state.battle.aiFocusUnitId && u.hp > 0);
  if (focusUnit) {
    for (const p of focusUnit.cells) {
      if (!state.playerBoard[p.row][p.col].shot) candidates.push({ r: p.row, c: p.col });
    }
  } else {
    state.battle.aiFocusUnitId = null;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) if (!state.playerBoard[r][c].shot) candidates.push({ r, c });
    }
  }
  if (candidates.length === 0) {
    state.battle.playerTurn = true;
    state.battle.shotsLeft = shotsPerTurn(state.playerUnits);
    state.battle.message = `Your turn. ${state.battle.shotsLeft} shots available.`;
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    return;
  }
  const pick = candidates[randInt(candidates.length)];
  const result = applyShot(state.playerBoard, state.playerUnits, pick.r, pick.c);
  if (result?.hit && result.unitId && !result.destroyed) {
    state.battle.aiFocusUnitId = result.unitId;
  } else if (result?.destroyed && result.unitId === state.battle.aiFocusUnitId) {
    state.battle.aiFocusUnitId = null;
  }

  if (allSunk(state.playerUnits)) {
    state.battle.over = true;
    state.battle.message = "Defeat: enemy destroyed all your units.";
    addBattleLog(state.battle.message);
    drawBattleBoards();
    renderHud();
    return;
  }

  state.battle.shotsLeft -= 1;
  if (state.battle.shotsLeft <= 0) {
    state.battle.playerTurn = true;
    state.battle.shotsLeft = shotsPerTurn(state.playerUnits);
    state.battle.message = result.hit
      ? `Enemy hit at (${pick.c + 1}, ${pick.r + 1}). Your turn with ${state.battle.shotsLeft} shots.`
      : `Enemy missed at (${pick.c + 1}, ${pick.r + 1}). Your turn with ${state.battle.shotsLeft} shots.`;
    addBattleLog(state.battle.message);
  } else {
    state.battle.message = result.hit
      ? `Enemy hit at (${pick.c + 1}, ${pick.r + 1}). Enemy has ${state.battle.shotsLeft} shots left.`
      : `Enemy missed at (${pick.c + 1}, ${pick.r + 1}). Enemy has ${state.battle.shotsLeft} shots left.`;
    addBattleLog(state.battle.message);
    setTimeout(runEnemyVolley, 260);
  }

  drawBattleBoards();
  renderHud();
}

function aiPreBattleSupport(enemySpendPoints) {
  let radarCharges = 0;
  let bombCharges = 0;
  for (let i = 0; i < enemySpendPoints; i += 1) {
    if (Math.random() < 0.55) radarCharges += 2;
    else bombCharges += 1;
  }

  for (let i = 0; i < radarCharges; i += 1) {
    const row = randInt(ROWS);
    const col = randInt(COLS);
    applyRadarScan(state.playerBoard, row, col);
    addBattleLog(`Enemy Scan at (${col + 1}, ${row + 1}).`);
  }
  for (let i = 0; i < bombCharges; i += 1) {
    const row = randInt(ROWS);
    const col = randInt(COLS);
    applyAtomBomb(state.playerBoard, state.playerUnits, row, col);
    addBattleLog(`Enemy Bomb at (${col + 1}, ${row + 1}).`);
  }
  return { radarCharges, bombCharges };
}

function startBattle() {
  if (state.phase !== "deploy") return;
  if (state.playerUnits.length === 0) {
    state.error = "Deploy at least one unit before battle.";
    renderHud();
    return;
  }
  clearHeldCursor();

  const enemyResult = randomPlaceEnemyFleet();
  const playerUnspent = state.points;
  const enemyUnspent = enemyResult.unspent;
  let playerStarts = false;
  if (playerUnspent === enemyUnspent) {
    playerStarts = Math.random() < 0.5;
  } else {
    playerStarts = playerUnspent > enemyUnspent;
  }

  state.phase = "battle";
  state.error = "";
  state.battle = {
    playerTurn: playerStarts,
    shotsLeft: playerStarts ? shotsPerTurn(state.playerUnits) : shotsPerTurn(state.enemyUnits),
    playerUnspent,
    enemyUnspent,
    radarCharges: state.supportStock.radarScans,
    bombCharges: state.supportStock.bombs,
    mode: "shot",
    aiFocusUnitId: null,
    over: false,
    log: [],
    message: playerStarts
      ? `You start (unspent: you ${playerUnspent}, enemy ${enemyUnspent}). ${shotsPerTurn(state.playerUnits)} shots this turn.`
      : `Enemy starts (unspent: you ${playerUnspent}, enemy ${enemyUnspent}). Enemy has ${shotsPerTurn(state.enemyUnits)} shots.`
  };
  addBattleLog(state.battle.message);

  const enemySupportSpend = Math.min(enemyUnspent, randInt(4));
  if (enemySupportSpend > 0) {
    aiPreBattleSupport(enemySupportSpend);
  }
  if (allSunk(state.playerUnits)) {
    state.battle.over = true;
    state.battle.message = "Defeat: enemy pre-battle strikes destroyed all your units.";
    addBattleLog(state.battle.message);
  }

  shopPanel.classList.add("hidden");
  deployPanel.classList.add("hidden");
  battlePanel.classList.remove("hidden");

  drawBattleBoards();
  renderHud();
  if (!playerStarts) {
    setTimeout(runEnemyVolley, 320);
  }
}

function resetGame() {
  state.phase = "deploy";
  state.points = START_POINTS;
  state.selected = null;
  state.orientation = 0;
  state.error = "";
  initReserves();
  state.playerBoard = createBoard();
  state.enemyBoard = createBoard();
  state.playerUnits = [];
  state.enemyUnits = [];
  state.supportStock = { radarScans: 0, bombs: 0 };
  state.hoverCell = null;
  state.battleHoverCell = null;
  state.ghost = null;
  state.battle = { playerTurn: true, shotsLeft: 0, playerUnspent: 0, enemyUnspent: 0, radarCharges: 0, bombCharges: 0, mode: "shot", aiFocusUnitId: null, over: false, log: [], message: "" };

  shopPanel.classList.remove("hidden");
  deployPanel.classList.remove("hidden");
  battlePanel.classList.add("hidden");

  renderShop();
  drawDeployBoard();
  renderHud();
}

board.addEventListener("click", (event) => {
  if (state.phase !== "deploy") return;
  const cell = cellFromCanvas(board, event.clientX, event.clientY);
  if (!cell) {
    clearHeldCursor();
    state.error = "";
    renderShop();
    renderHud();
    drawDeployBoard();
    return;
  }

  const existing = !state.ghost ? findUnitAtCell(state.playerUnits, cell.row, cell.col) : null;
  if (existing) {
    const lifted = removeUnitFromBoard(state.playerBoard, state.playerUnits, existing.instanceId);
    if (lifted) {
      state.ghost = { id: lifted.id, type: lifted.type, mode: "move", paidCost: lifted.paidCost ?? discountedCost(unitById(lifted.id)) };
      state.error = "";
      renderHud();
      drawDeployBoard();
    }
    return;
  }

  deploySelected(cell.row, cell.col);
});

board.addEventListener("mousemove", (event) => {
  if (state.phase !== "deploy") return;
  state.hoverCell = cellFromCanvas(board, event.clientX, event.clientY);
  drawDeployBoard();
});

board.addEventListener("mouseleave", () => {
  if (state.phase !== "deploy") return;
  state.hoverCell = null;
  drawDeployBoard();
});

board.addEventListener(
  "wheel",
  (event) => {
    if (state.phase !== "deploy") return;
    if (!state.ghost) return;
    event.preventDefault();
    rotateSelection();
    drawDeployBoard();
  },
  { passive: false }
);

document.addEventListener("click", (event) => {
  if (state.phase !== "deploy" || !state.ghost) return;
  if (Date.now() - state.lastBuyTs < 180) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#board")) return;
  clearHeldCursor();
  state.error = "";
  renderShop();
  renderHud();
  drawDeployBoard();
});

targetBoard.addEventListener("click", (event) => {
  if (state.phase !== "battle") return;
  const cell = cellFromCanvas(targetBoard, event.clientX, event.clientY);
  if (!cell) return;
  playerAction(cell.row, cell.col);
});

targetBoard.addEventListener("mousemove", (event) => {
  if (state.phase !== "battle") return;
  state.battleHoverCell = cellFromCanvas(targetBoard, event.clientX, event.clientY);
  drawBattleBoards();
});

targetBoard.addEventListener("mouseleave", () => {
  if (state.phase !== "battle") return;
  state.battleHoverCell = null;
  drawBattleBoards();
});

rotateBtn.addEventListener("click", rotateSelection);
useRadarBtn.addEventListener("click", () => {
  if (state.phase !== "battle") return;
  state.battle.mode = "radar";
  renderHud();
});
useBombBtn.addEventListener("click", () => {
  if (state.phase !== "battle") return;
  state.battle.mode = "bomb";
  renderHud();
});
battleStatusEl.addEventListener("click", () => {
  if (state.phase !== "battle") return;
  state.battle.mode = "shot";
  renderHud();
});
startBattleBtn.addEventListener("click", startBattle);
clearBtn.addEventListener("click", clearDeployment);
resetBtn.addEventListener("click", resetGame);

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") rotateSelection();
});

resetGame();
