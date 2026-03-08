const STORAGE_KEYS = {
  playerName: "dw26_player_name",
  saveGame: "dw26_save_game",
  saveHistory: "dw26_save_history",
};
const MAX_AUTOSAVES = 2;

const PLAYERS = {
  russia: "Russia",
  ukraine: "Ukraine",
};

const SEASONS = [
  {
    name: "Spring",
    battleTurns: 1,
    movementLabel: "max speed 1",
    weatherText: "Mud season limits maneuverability.",
  },
  {
    name: "Summer",
    battleTurns: 3,
    movementLabel: "full movement",
    weatherText: "Dry ground supports major offensive operations.",
  },
  {
    name: "Fall",
    battleTurns: 2,
    movementLabel: "full movement",
    weatherText: "Reduced tempo as weather deteriorates.",
  },
  {
    name: "Winter",
    battleTurns: 2,
    movementLabel: "max speed 1",
    weatherText: "Cold weather slows maneuver, fighting continues.",
  },
];

const playerLine = document.getElementById("playerLine");
const statusMessage = document.getElementById("statusMessage");
const menuScreen = document.getElementById("menuScreen");
const newGameBtn = document.getElementById("newGameBtn");
const continueBtn = document.getElementById("continueBtn");
const settingsBtn = document.getElementById("settingsBtn");
const quitBtn = document.getElementById("quitBtn");
const loadSaveInput = document.getElementById("loadSaveInput");

const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const playerNameInput = document.getElementById("playerNameInput");

const turnFlavor = document.getElementById("turnFlavor");
const turnMeta = document.getElementById("turnMeta");
const weatherLine = document.getElementById("weatherLine");
const turnHud = document.getElementById("turnHud");
const turnFooter = document.getElementById("turnFooter");
const endTurnBtn = document.getElementById("endTurnBtn");
const mainMenuBtn = document.getElementById("mainMenuBtn");
const eventPanel = document.getElementById("eventPanel");
const eventIcon = document.getElementById("eventIcon");
const eventTitle = document.getElementById("eventTitle");
const eventBlurb = document.getElementById("eventBlurb");
const eventEffect = document.getElementById("eventEffect");
const strategicCardsPanel = document.getElementById("strategicCardsPanel");
const strategicCardsTitle = document.getElementById("strategicCardsTitle");
const strategicCardsMeta = document.getElementById("strategicCardsMeta");
const strategicPoolDebug = document.getElementById("strategicPoolDebug");
const strategicCardsHand = document.getElementById("strategicCardsHand");

let campaignState = null;

function eventDefinitions() {
  if (Array.isArray(window.DW_EVENT_DEFINITIONS)) {
    return window.DW_EVENT_DEFINITIONS;
  }
  return [];
}

function strategicCardConfig() {
  const fallback = {
    maxHandSize: 5,
    maxPlays: 3,
    definitions: {},
    startingDecks: {
      [PLAYERS.russia]: [],
      [PLAYERS.ukraine]: [],
    },
    geopoliticalPools: {
      [PLAYERS.russia]: [],
      [PLAYERS.ukraine]: [],
    },
    geopoliticalPoolSchedule: [],
  };
  if (!window.DW_STRATEGIC_CARDS || typeof window.DW_STRATEGIC_CARDS !== "object") {
    return fallback;
  }
  const cfg = window.DW_STRATEGIC_CARDS;
  return {
    maxHandSize: Number.isInteger(cfg.maxHandSize) && cfg.maxHandSize > 0 ? cfg.maxHandSize : fallback.maxHandSize,
    maxPlays: Number.isInteger(cfg.maxPlays) && cfg.maxPlays > 0 ? cfg.maxPlays : fallback.maxPlays,
    definitions: cfg.definitions && typeof cfg.definitions === "object" ? cfg.definitions : fallback.definitions,
    startingDecks: cfg.startingDecks && typeof cfg.startingDecks === "object" ? cfg.startingDecks : fallback.startingDecks,
    geopoliticalPools: cfg.geopoliticalPools && typeof cfg.geopoliticalPools === "object" ? cfg.geopoliticalPools : fallback.geopoliticalPools,
    geopoliticalPoolSchedule: Array.isArray(cfg.geopoliticalPoolSchedule) ? cfg.geopoliticalPoolSchedule : fallback.geopoliticalPoolSchedule,
  };
}

function currentPlayerName() {
  return localStorage.getItem(STORAGE_KEYS.playerName) || "Operator";
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function refreshPlayerLine() {
  playerLine.textContent = `Commander: ${currentPlayerName()}`;
}

function opponentOf(player) {
  return player === PLAYERS.russia ? PLAYERS.ukraine : PLAYERS.russia;
}

function seasonFor(state) {
  return SEASONS[state.seasonIndex];
}

function ordinal(number) {
  const suffixMap = ["th", "st", "nd", "rd"];
  const v = number % 100;
  const suffix = suffixMap[(v - 20) % 10] || suffixMap[v] || suffixMap[0];
  return `${number}${suffix}`;
}

function strategicKeyFor(state) {
  return `turn:${state.campaignTurn}|phase:${state.phase}|step:${state.actorStep}|year:${state.year}|season:${state.seasonIndex}`;
}

function shuffleArray(source) {
  const arr = [...source];
  for (let index = arr.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
  }
  return arr;
}

function createStrategicStateForPlayer() {
  return {
    turnKey: "",
    drawPile: [],
    discardPile: [],
    hand: [],
    played: [],
    discarded: [],
    exhausted: [],
    lastAddedCardId: null,
    playsUsed: 0,
  };
}

function hasEventBeenApplied(state, eventId) {
  return Array.isArray(state.events?.appliedEventIds) && state.events.appliedEventIds.includes(eventId);
}

function markEventApplied(state, eventId) {
  if (!Array.isArray(state.events.appliedEventIds)) {
    state.events.appliedEventIds = [];
  }
  if (!state.events.appliedEventIds.includes(eventId)) {
    state.events.appliedEventIds.push(eventId);
  }
}

function ensureStrategicState(state) {
  if (!state.strategicCards) {
    state.strategicCards = {};
  }
  const cfg = strategicCardConfig();
  for (const player of [PLAYERS.russia, PLAYERS.ukraine]) {
    if (!state.strategicCards[player]) {
      state.strategicCards[player] = createStrategicStateForPlayer();
    }
    if (!Array.isArray(state.strategicCards[player].drawPile)) {
      state.strategicCards[player].drawPile = shuffleArray(cfg.startingDecks[player] || []);
    }
    if (!Array.isArray(state.strategicCards[player].discardPile)) {
      state.strategicCards[player].discardPile = [];
    }
    if (
      state.strategicCards[player].drawPile.length === 0 &&
      state.strategicCards[player].discardPile.length === 0 &&
      state.strategicCards[player].hand.length === 0 &&
      state.strategicCards[player].played.length === 0
    ) {
      state.strategicCards[player].drawPile = shuffleArray(cfg.startingDecks[player] || []);
    }
    if (!Array.isArray(state.strategicCards[player].exhausted)) {
      state.strategicCards[player].exhausted = [];
    }
    if (typeof state.strategicCards[player].lastAddedCardId !== "string") {
      state.strategicCards[player].lastAddedCardId = null;
    }
  }
}

function ensureGeopoliticalPool(state) {
  const cfg = strategicCardConfig();
  if (!state.strategicGlobalPoolRemaining || typeof state.strategicGlobalPoolRemaining !== "object") {
    state.strategicGlobalPoolRemaining = {
      [PLAYERS.russia]: [...(cfg.geopoliticalPools[PLAYERS.russia] || [])],
      [PLAYERS.ukraine]: [...(cfg.geopoliticalPools[PLAYERS.ukraine] || [])],
    };
    return;
  }
  if (Array.isArray(state.strategicGlobalPoolRemaining)) {
    const legacy = [...state.strategicGlobalPoolRemaining];
    state.strategicGlobalPoolRemaining = {
      [PLAYERS.russia]: legacy.filter((id) => (cfg.geopoliticalPools[PLAYERS.russia] || []).includes(id)),
      [PLAYERS.ukraine]: legacy.filter((id) => (cfg.geopoliticalPools[PLAYERS.ukraine] || []).includes(id)),
    };
  }
  if (!Array.isArray(state.strategicGlobalPoolRemaining[PLAYERS.russia])) {
    state.strategicGlobalPoolRemaining[PLAYERS.russia] = [...(cfg.geopoliticalPools[PLAYERS.russia] || [])];
  }
  if (!Array.isArray(state.strategicGlobalPoolRemaining[PLAYERS.ukraine])) {
    state.strategicGlobalPoolRemaining[PLAYERS.ukraine] = [...(cfg.geopoliticalPools[PLAYERS.ukraine] || [])];
  }
}

function ensureStrategicPoolScheduleState(state) {
  if (!Array.isArray(state.strategicPoolScheduleAppliedIds)) {
    state.strategicPoolScheduleAppliedIds = [];
  }
}

function applyScheduledGeopoliticalCardsForTurn(state, player) {
  if (state.phase !== "strategic") {
    return;
  }
  ensureGeopoliticalPool(state);
  ensureStrategicPoolScheduleState(state);
  const season = seasonFor(state);
  const schedule = strategicCardConfig().geopoliticalPoolSchedule;
  for (const entry of schedule) {
    if (!entry || entry.player !== player || entry.year !== state.year || entry.season !== season.name) {
      continue;
    }
    if (!entry.id || state.strategicPoolScheduleAppliedIds.includes(entry.id)) {
      continue;
    }
    if (typeof entry.cardId === "string" && entry.cardId) {
      state.strategicGlobalPoolRemaining[player].push(entry.cardId);
    }
    state.strategicPoolScheduleAppliedIds.push(entry.id);
  }
}

function drawRandomGeopoliticalCardFromPool(state, player) {
  ensureGeopoliticalPool(state);
  const playerPool = state.strategicGlobalPoolRemaining[player];
  if (!Array.isArray(playerPool) || playerPool.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * playerPool.length);
  const [cardId] = playerPool.splice(index, 1);
  return cardId;
}

function removeCardFromPlayerDeck(state, player, cardId, count) {
  ensureStrategicState(state);
  let removed = 0;
  const zones = [
    state.strategicCards[player].drawPile,
    state.strategicCards[player].discardPile,
    state.strategicCards[player].hand,
    state.strategicCards[player].played,
  ];
  for (const zone of zones) {
    for (let i = zone.length - 1; i >= 0 && removed < count; i -= 1) {
      if (zone[i] === cardId) {
        zone.splice(i, 1);
        removed += 1;
      }
    }
  }
  return removed;
}

function drawCardsForPlayer(state, player, count) {
  ensureStrategicState(state);
  const playerCards = state.strategicCards[player];
  while (playerCards.hand.length < count) {
    if (playerCards.drawPile.length === 0) {
      if (playerCards.discardPile.length === 0) {
        break;
      }
      playerCards.drawPile = shuffleArray(playerCards.discardPile);
      playerCards.discardPile = [];
    }
    const nextCard = playerCards.drawPile.pop();
    if (!nextCard) {
      break;
    }
    if (isCardExhausted(state, player, nextCard)) {
      continue;
    }
    playerCards.hand.push(nextCard);
  }
}

function ensureGlobalSupportTrack(state) {
  if (!state.effects) {
    state.effects = {};
  }
  if (!state.effects.globalSupport || typeof state.effects.globalSupport !== "object") {
    const legacy =
      Number.isInteger(state.effects.globalSupport)
        ? state.effects.globalSupport
        : (Number.isInteger(state.effects.natoOpinion) ? state.effects.natoOpinion : 0);
    state.effects.globalSupport = {
      [PLAYERS.russia]: -legacy,
      [PLAYERS.ukraine]: legacy,
    };
  }
  if (!Number.isInteger(state.effects.globalSupport[PLAYERS.russia])) {
    state.effects.globalSupport[PLAYERS.russia] = 0;
  }
  if (!Number.isInteger(state.effects.globalSupport[PLAYERS.ukraine])) {
    state.effects.globalSupport[PLAYERS.ukraine] = 0;
  }
  if (Object.prototype.hasOwnProperty.call(state.effects, "natoOpinion")) {
    delete state.effects.natoOpinion;
  }
}

function shiftGlobalSupport(state, favoredPlayer, amount) {
  ensureGlobalSupportTrack(state);
  const otherPlayer = favoredPlayer === PLAYERS.russia ? PLAYERS.ukraine : PLAYERS.russia;
  state.effects.globalSupport[favoredPlayer] += amount;
  state.effects.globalSupport[otherPlayer] -= amount;
}

function strategicCardDefinition(cardId) {
  const defs = strategicCardConfig().definitions;
  return defs[cardId] || { id: cardId, name: cardId, effectText: "No effect." };
}

function isCardExhausted(state, player, cardId) {
  const exhausted = state.strategicCards[player]?.exhausted;
  return Array.isArray(exhausted) && exhausted.includes(cardId);
}

function markCardExhausted(state, player, cardId) {
  if (!state.strategicCards[player]) {
    state.strategicCards[player] = createStrategicStateForPlayer();
  }
  if (!Array.isArray(state.strategicCards[player].exhausted)) {
    state.strategicCards[player].exhausted = [];
  }
  if (!state.strategicCards[player].exhausted.includes(cardId)) {
    state.strategicCards[player].exhausted.push(cardId);
  }
}

function prepareStrategicHandIfNeeded(state) {
  if (state.phase !== "strategic") {
    return;
  }
  ensureStrategicState(state);
  ensureGeopoliticalPool(state);
  const activePlayer = getActivePlayer(state);
  const playerCards = state.strategicCards[activePlayer];
  const turnKey = strategicKeyFor(state);
  const cfg = strategicCardConfig();
  if (playerCards.turnKey === turnKey) {
    return;
  }
  if (Array.isArray(playerCards.hand) && playerCards.hand.length > 0) {
    playerCards.discardPile.push(...playerCards.hand.filter((cardId) => !isCardExhausted(state, activePlayer, cardId)));
    playerCards.hand = [];
  }
  if (Array.isArray(playerCards.played) && playerCards.played.length > 0) {
    const replayable = playerCards.played.filter((cardId) => !strategicCardDefinition(cardId).playOnce);
    playerCards.discardPile.push(...replayable);
    playerCards.played = [];
  }
  applyScheduledGeopoliticalCardsForTurn(state, activePlayer);
  const addedCardId = drawRandomGeopoliticalCardFromPool(state, activePlayer);
  if (addedCardId) {
    playerCards.drawPile.push(addedCardId);
    playerCards.drawPile = shuffleArray(playerCards.drawPile);
    playerCards.lastAddedCardId = addedCardId;
  } else {
    playerCards.lastAddedCardId = null;
  }
  playerCards.turnKey = turnKey;
  playerCards.playsUsed = 0;
  playerCards.played = [];
  playerCards.discarded = [];
  drawCardsForPlayer(state, activePlayer, cfg.maxHandSize);
}

function finalizeStrategicTurnForActivePlayer(state) {
  if (state.phase !== "strategic") {
    return;
  }
  ensureStrategicState(state);
  const activePlayer = getActivePlayer(state);
  const playerCards = state.strategicCards[activePlayer];
  if (!Array.isArray(playerCards.hand) || playerCards.hand.length === 0) {
    if (Array.isArray(playerCards.played) && playerCards.played.length > 0) {
      const replayable = playerCards.played.filter((cardId) => !strategicCardDefinition(cardId).playOnce);
      playerCards.discardPile.push(...replayable);
      playerCards.played = [];
    }
    return;
  }
  playerCards.discarded.push(...playerCards.hand);
  playerCards.discardPile.push(...playerCards.hand.filter((cardId) => !isCardExhausted(state, activePlayer, cardId)));
  if (Array.isArray(playerCards.played) && playerCards.played.length > 0) {
    const replayable = playerCards.played.filter((cardId) => !strategicCardDefinition(cardId).playOnce);
    playerCards.discardPile.push(...replayable);
    playerCards.played = [];
  }
  playerCards.hand = [];
}

function applyStrategicCardEffect(state, player, cardId) {
  if (!state.effects) {
    state.effects = {};
  }
  if (!state.effects.researchPoints) {
    state.effects.researchPoints = {
      [PLAYERS.russia]: 0,
      [PLAYERS.ukraine]: 0,
    };
  }
  if (!state.effects.pendingRocketStrikes) {
    state.effects.pendingRocketStrikes = {
      [PLAYERS.russia]: 0,
      [PLAYERS.ukraine]: 0,
    };
  }
  if (!state.effects.pendingModernTankSpawns) {
    state.effects.pendingModernTankSpawns = {
      [PLAYERS.russia]: 0,
      [PLAYERS.ukraine]: 0,
    };
  }
  if (!Array.isArray(state.effects.pendingAirCombatModifiers)) {
    state.effects.pendingAirCombatModifiers = [];
  }
  if (!Array.isArray(state.effects.pendingTankDestructions)) {
    state.effects.pendingTankDestructions = [];
  }
  if (!Array.isArray(state.effects.pendingFortressSpawns)) {
    state.effects.pendingFortressSpawns = [];
  }
  ensureGlobalSupportTrack(state);

  if (cardId === "research") {
    state.effects.researchPoints[player] += 1;
    return "Research +1.";
  }
  if (cardId === "rocket") {
    state.effects.pendingRocketStrikes[player] += 1;
    return "Queued 1 Generation 1 rocket strike.";
  }
  if (cardId === "production") {
    state.effects.pendingModernTankSpawns[player] += 1;
    return "Queued 1 Tank Unit spawn.";
  }
  if (cardId === "propaganda") {
    shiftGlobalSupport(state, player, 1);
    return `Global Support shifts: ${player} +1.`;
  }
  if (cardId === "captureHostomel") {
    const success = Math.random() < 0.5;
    state.effects.kyivBattleModifier = {
      owner: success ? PLAYERS.russia : PLAYERS.ukraine,
      value: 1,
      source: "Capture Hostomel",
      appliesNextBattleTurn: true,
    };
    return success
      ? "Hostomel operation succeeded. Russia gains +1 near Kyiv next battle turn."
      : "Hostomel operation failed. Ukraine gains +1 near Kyiv next battle turn.";
  }
  if (cardId === "azovstalFortress") {
    state.effects.azovstalFortressActive = true;
    state.effects.azovstalFortressAppliesNextBattleTurn = true;
    return "Azovstal fortress defense activated for next battle turn.";
  }
  if (cardId === "pripetMarshes") {
    state.effects.pripetMarshesPenaltyActive = true;
    state.effects.pripetMarshesAppliesNextBattleTurn = true;
    return "Pripet Marshes penalties will apply to Russian forces next battle turn.";
  }
  if (cardId === "massiveSanctions") {
    const removed = removeCardFromPlayerDeck(state, PLAYERS.russia, "production", 1);
    return removed > 0
      ? "Removed 1 Production Card from Russia's deck."
      : "No Production Card remained in Russia's deck.";
  }
  if (cardId === "stingers") {
    const enemy = opponentOf(player);
    state.effects.pendingAirCombatModifiers.push({
      player: enemy,
      modifier: -1,
      duration: "thisTurn",
      source: "Stingers!",
    });
    return "Enemy air units suffer -1 combat strength this turn.";
  }
  if (cardId === "javelins") {
    state.effects.pendingTankDestructions.push({
      targetPlayer: opponentOf(player),
      maxUnits: 1,
      requiresUkraineInfantryPresence: true,
      source: "Javelins!",
    });
    return "Queued destruction of 1 enemy tank where Ukrainian infantry is present.";
  }
  if (cardId === "militaryInfrastructureDestroyed") {
    state.effects.pendingAirCombatModifiers.push({
      player: PLAYERS.russia,
      modifier: 1,
      duration: "thisTurn",
      source: "Military Infrastructure Destroyed",
    });
    return "Russian air units gain +1 combat strength this turn.";
  }
  if (cardId === "precisionStrikeArsenal") {
    state.effects.pendingRocketStrikes[PLAYERS.russia] += 2;
    return "Queued 2 Generation 1 rocket attacks for Russia.";
  }
  if (cardId === "blackSeaBlockade") {
    const removed = removeCardFromPlayerDeck(state, PLAYERS.ukraine, "production", 1);
    return removed > 0
      ? "Removed 1 Production Card from Ukraine's deck."
      : "No Production Card remained in Ukraine's deck.";
  }
  if (cardId === "himars") {
    state.effects.pendingRocketStrikes[player] += 2;
    return "Queued 2 rocket attacks.";
  }
  if (cardId === "westernTraining") {
    ensureGeopoliticalPool(state);
    state.strategicGlobalPoolRemaining[player].push("research");
    return "Added 1 Research Card to the pool.";
  }
  if (cardId === "blackSeaGrainDeal") {
    ensureStrategicState(state);
    const ukraineCards = state.strategicCards[PLAYERS.ukraine];
    ukraineCards.drawPile.push("production");
    ukraineCards.drawPile = shuffleArray(ukraineCards.drawPile);
    return "Ukraine gains 1 Production Card.";
  }
  if (cardId === "patriotBatteries") {
    const removed = removeCardFromPlayerDeck(state, PLAYERS.russia, "rocket", 1);
    return removed > 0
      ? "Removed 1 Rocket Card from Russia's deck."
      : "No Rocket Card remained in Russia's deck.";
  }
  if (cardId === "leopardTanks") {
    state.effects.pendingModernTankSpawns[PLAYERS.ukraine] += 1;
    return "Queued 1 Tank Unit spawn in the capital.";
  }
  if (cardId === "economicBlitzkriegRepelled") {
    ensureGeopoliticalPool(state);
    state.strategicGlobalPoolRemaining[PLAYERS.russia].push("production");
    return "Added 1 Production Card to Russia's strategy card pool.";
  }
  if (cardId === "geran2StrikeDrones") {
    ensureGeopoliticalPool(state);
    state.strategicGlobalPoolRemaining[PLAYERS.russia].push("rocket");
    return "Added 1 Rocket Card to Russia's strategy card pool.";
  }
  if (cardId === "surovikinLine") {
    state.effects.pendingFortressSpawns.push({
      player: PLAYERS.russia,
      count: 2,
      target: "Russian-controlled frontline regions",
      source: "Surovikin Line",
    });
    return "Queued 2 fortress unit spawns in Russian-controlled frontline regions.";
  }
  if (cardId === "warEconomy") {
    ensureGeopoliticalPool(state);
    state.strategicGlobalPoolRemaining[PLAYERS.russia].push("production");
    return "Added 1 Production Card to Russia's strategy card pool.";
  }
  return "Card resolved.";
}

function playStrategicCard(cardIndex) {
  if (!campaignState || campaignState.phase !== "strategic") {
    return;
  }
  ensureStrategicState(campaignState);
  const activePlayer = getActivePlayer(campaignState);
  const playerCards = campaignState.strategicCards[activePlayer];
  const cfg = strategicCardConfig();
  if (playerCards.playsUsed >= cfg.maxPlays) {
    setStatus("Strategic card limit reached (3). End turn.");
    renderTurnHud();
    return;
  }
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= playerCards.hand.length) {
    return;
  }
  const [cardId] = playerCards.hand.splice(cardIndex, 1);
  const cardDef = strategicCardDefinition(cardId);
  playerCards.played.push(cardId);
  playerCards.playsUsed += 1;
  if (cardDef.playOnce) {
    markCardExhausted(campaignState, activePlayer, cardId);
  }
  const resolution = applyStrategicCardEffect(campaignState, activePlayer, cardId);
  let lostCount = 0;
  if (playerCards.playsUsed >= cfg.maxPlays && playerCards.hand.length > 0) {
    lostCount = playerCards.hand.length;
    playerCards.discarded.push(...playerCards.hand);
    playerCards.hand = [];
  }
  persistCampaignState();
  renderTurnHud();
  if (lostCount > 0) {
    const onceNote = cardDef.playOnce ? " Destroyed after use." : "";
    setStatus(`${activePlayer} played ${cardDef.name}. ${resolution}${onceNote} ${lostCount} unplayed card(s) were lost.`);
    return;
  }
  const onceNote = cardDef.playOnce ? " Destroyed after use." : "";
  setStatus(`${activePlayer} played ${cardDef.name}. ${resolution}${onceNote}`);
}

function createInitialCampaignState(originPlayerName) {
  return {
    campaignTurn: 1,
    createdByPlayerName: originPlayerName,
    year: 2022,
    seasonIndex: 3,
    phase: "strategic",
    battleTurn: 0,
    actorStep: 0,
    initiative: PLAYERS.russia,
    effects: {
      winterFirstBattleNoSlow: false,
      winterFirstBattleNoSlowConsumed: false,
      ukraineMobilizationTier: 0,
      ukraineTerritorialDefenseSpawnPending: false,
      ukraineReplacementBoostStrategicTurnsRemaining: 0,
      globalSupport: {
        [PLAYERS.russia]: 0,
        [PLAYERS.ukraine]: 0,
      },
      researchPoints: {
        [PLAYERS.russia]: 0,
        [PLAYERS.ukraine]: 0,
      },
      pendingRocketStrikes: {
        [PLAYERS.russia]: 0,
        [PLAYERS.ukraine]: 0,
      },
      pendingModernTankSpawns: {
        [PLAYERS.russia]: 0,
        [PLAYERS.ukraine]: 0,
      },
      pendingRegionalInfantrySpawns: [],
      pendingControlledCityInfantrySpawns: [],
      pendingForcedRussianRedeployments: [],
      pendingEndOfBattleTurnDestructions: [],
      bakhmutQuarterCasualtyRule: null,
      pendingAirCombatModifiers: [],
      pendingTankDestructions: [],
      pendingFortressSpawns: [],
    },
    events: {
      weAreHereApplied: false,
      specialOperationApplied: false,
      appliedEventIds: [],
    },
    strategicCards: {
      [PLAYERS.russia]: createStrategicStateForPlayer(),
      [PLAYERS.ukraine]: createStrategicStateForPlayer(),
    },
    strategicGlobalPoolRemaining: {
      [PLAYERS.russia]: [...(strategicCardConfig().geopoliticalPools[PLAYERS.russia] || [])],
      [PLAYERS.ukraine]: [...(strategicCardConfig().geopoliticalPools[PLAYERS.ukraine] || [])],
    },
    strategicPoolScheduleAppliedIds: [],
  };
}

function isValidCampaignState(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }
  if (typeof candidate.createdByPlayerName !== "string" || !candidate.createdByPlayerName.trim()) {
    return false;
  }
  if (!Number.isInteger(candidate.campaignTurn) || candidate.campaignTurn < 1) {
    return false;
  }
  if (!Number.isInteger(candidate.year) || candidate.year < 1) {
    return false;
  }
  if (!Number.isInteger(candidate.seasonIndex) || candidate.seasonIndex < 0 || candidate.seasonIndex >= SEASONS.length) {
    return false;
  }
  if (candidate.phase !== "strategic" && candidate.phase !== "battle") {
    return false;
  }
  if (!Number.isInteger(candidate.actorStep) || (candidate.actorStep !== 0 && candidate.actorStep !== 1)) {
    return false;
  }
  if (candidate.initiative !== PLAYERS.russia && candidate.initiative !== PLAYERS.ukraine) {
    return false;
  }
  if (!Number.isInteger(candidate.battleTurn) || candidate.battleTurn < 0) {
    return false;
  }

  const season = SEASONS[candidate.seasonIndex];
  if (candidate.phase === "strategic" && candidate.battleTurn !== 0) {
    return false;
  }
  if (candidate.phase === "battle" && (candidate.battleTurn < 1 || candidate.battleTurn > season.battleTurns)) {
    return false;
  }

  return true;
}

function getPrimaryPlayer(state) {
  return state.initiative;
}

function getActivePlayer(state) {
  if (state.actorStep === 0) {
    return getPrimaryPlayer(state);
  }
  return opponentOf(getPrimaryPlayer(state));
}

function describeTurnKind(state) {
  const season = seasonFor(state);
  if (state.phase === "strategic") {
    return "strategic turn";
  }
  if (state.battleTurn === season.battleTurns) {
    return "final battle turn";
  }
  return `${ordinal(state.battleTurn)} battle turn`;
}

function getFlavorText(state) {
  const season = seasonFor(state);
  const seasonName = season.name.toLowerCase();
  const turnKind = describeTurnKind(state);
  const primaryPlayer = getPrimaryPlayer(state);
  const activePlayer = getActivePlayer(state);

  if (state.actorStep === 0) {
    return `${activePlayer}'s ${turnKind} of the ${seasonName}.`;
  }

  return `${activePlayer} is reacting to ${primaryPlayer}'s ${turnKind} of the ${seasonName}.`;
}

function getMetaText(state) {
  const season = seasonFor(state);
  const strategicTurnsPerYear = SEASONS.length;
  const battleTurnsPerYear = SEASONS.reduce((total, item) => total + item.battleTurns, 0);
  const activePlayer = getActivePlayer(state);

  return `Campaign Turn ${state.campaignTurn} | Year ${state.year} | ${season.name} | Phase: ${state.phase} | Initiative: ${state.initiative} | Acting: ${activePlayer} | Year Totals: ${strategicTurnsPerYear} strategic, ${battleTurnsPerYear} battle`;
}

function isWinterFirstBattleNoSlowActive(state) {
  if (!state.effects) {
    return false;
  }
  if (!state.effects.winterFirstBattleNoSlow || state.effects.winterFirstBattleNoSlowConsumed) {
    return false;
  }

  const season = seasonFor(state);
  return (
    season.name === "Winter" &&
    state.phase === "battle" &&
    state.battleTurn === 1 &&
    getActivePlayer(state) === PLAYERS.russia
  );
}

function getWeatherText(state) {
  const season = seasonFor(state);
  const movementLabel = isWinterFirstBattleNoSlowActive(state) ? "full movement (event override)" : season.movementLabel;
  // TODO: Movement caps are currently informational only; enforce in the movement system once units are wired in.
  return `${season.name} conditions: ${season.weatherText} Movement cap: ${movementLabel}. Battle turns this season: ${season.battleTurns}.`;
}

function getStrategicEventForState(state) {
  if (state.phase !== "strategic") {
    return null;
  }

  const season = seasonFor(state);
  const activePlayer = getActivePlayer(state);
  const allEvents = eventDefinitions();
  for (const eventDef of allEvents) {
    const trigger = eventDef.trigger || {};
    if (trigger.phase && trigger.phase !== state.phase) {
      continue;
    }
    if (typeof trigger.campaignTurn === "number" && trigger.campaignTurn !== state.campaignTurn) {
      continue;
    }
    if (typeof trigger.year === "number" && trigger.year !== state.year) {
      continue;
    }
    if (trigger.season && trigger.season !== season.name) {
      continue;
    }
    if (typeof trigger.actorStep === "number" && trigger.actorStep !== state.actorStep) {
      continue;
    }
    if (trigger.activePlayer && trigger.activePlayer !== activePlayer) {
      continue;
    }
    return eventDef;
  }

  return null;
}

function applyTurnStartEffects(state) {
  if (!state.effects || !state.events) {
    return;
  }

  prepareStrategicHandIfNeeded(state);
  const season = seasonFor(state);
  const activePlayer = getActivePlayer(state);
  const activeEvent = getStrategicEventForState(state);
  if (!activeEvent) {
    return;
  }

  if (
    activeEvent.id === "turn1-russia-special-operation" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Winter" &&
    activePlayer === PLAYERS.russia
  ) {
    state.effects.winterFirstBattleNoSlow = true;
    state.effects.winterFirstBattleNoSlowConsumed = false;
    state.events.specialOperationApplied = true;
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "turn1-ukraine-we-are-here" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Winter" &&
    activePlayer === PLAYERS.ukraine
  ) {
    state.effects.ukraineMobilizationTier = 1;
    state.effects.ukraineTerritorialDefenseSpawnPending = true;
    state.effects.ukraineReplacementBoostStrategicTurnsRemaining = 1;
    // TODO: Implement city-by-city Territorial Defense spawning when map/city ownership and unit systems exist.
    state.events.weAreHereApplied = true;
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "russia-2022-spring-water-to-crimea" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Spring" &&
    activePlayer === PLAYERS.russia
  ) {
    state.effects.pendingRegionalInfantrySpawns.push(
      { player: PLAYERS.russia, region: "Crimea", count: 1, sourceEventId: activeEvent.id },
      { player: PLAYERS.russia, region: "Kherson", count: 1, sourceEventId: activeEvent.id }
    );
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "russia-2022-summer-annexation-referendums" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Summer" &&
    activePlayer === PLAYERS.russia
  ) {
    state.effects.pendingControlledCityInfantrySpawns.push({
      player: PLAYERS.russia,
      regions: ["Donetsk", "Luhansk", "Kherson", "Zaporizhzhia"],
      countPerControlledCity: 1,
      sourceEventId: activeEvent.id,
    });
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "russia-2022-fall-precision-strikes" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Fall" &&
    activePlayer === PLAYERS.russia
  ) {
    state.effects.pendingRocketStrikes[PLAYERS.russia] += 3;
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "russia-2023-winter-wagner-assault-groups" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Winter" &&
    activePlayer === PLAYERS.russia
  ) {
    state.effects.pendingRegionalInfantrySpawns.push({
      player: PLAYERS.russia,
      region: "Donetsk",
      count: 3,
      sourceEventId: activeEvent.id,
    });
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "ukraine-2022-spring-bucha" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Spring" &&
    activePlayer === PLAYERS.ukraine
  ) {
    shiftGlobalSupport(state, PLAYERS.ukraine, 3);
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "ukraine-2022-summer-kherson-feint" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Summer" &&
    activePlayer === PLAYERS.ukraine
  ) {
    state.effects.pendingForcedRussianRedeployments.push({
      targetTheater: "Kherson",
      maxUnits: 2,
      sourceEventId: activeEvent.id,
    });
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "ukraine-2022-fall-dnipro-bridges" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Fall" &&
    activePlayer === PLAYERS.ukraine
  ) {
    state.effects.pendingEndOfBattleTurnDestructions.push({
      targetPlayer: PLAYERS.russia,
      targetArea: "West of Dnipro",
      maxUnits: 2,
      timing: "endOfNextBattleTurn",
      sourceEventId: activeEvent.id,
    });
    markEventApplied(state, activeEvent.id);
  }

  if (
    activeEvent.id === "ukraine-2023-winter-fortress-bakhmut" &&
    !hasEventBeenApplied(state, activeEvent.id) &&
    state.phase === "strategic" &&
    season.name === "Winter" &&
    activePlayer === PLAYERS.ukraine
  ) {
    state.effects.bakhmutQuarterCasualtyRule = {
      year: state.year,
      seasonIndex: state.seasonIndex,
      minCasualtyPerAttack: 1,
      sourceEventId: activeEvent.id,
    };
    markEventApplied(state, activeEvent.id);
  }
}

function renderTurnHud() {
  if (!campaignState) {
    turnFlavor.textContent = "Turn sequence not started. Start a new game.";
    turnMeta.textContent = "Initiative: Russia";
    weatherLine.textContent = "Season rules will appear here.";
    eventPanel.classList.add("hidden");
    strategicCardsPanel.classList.add("hidden");
    strategicPoolDebug.textContent = "";
    endTurnBtn.disabled = true;
    return;
  }

  ensureStrategicState(campaignState);
  turnFlavor.textContent = getFlavorText(campaignState);
  turnMeta.textContent = getMetaText(campaignState);
  weatherLine.textContent = getWeatherText(campaignState);
  const activeEvent = getStrategicEventForState(campaignState);
  if (activeEvent) {
    if (activeEvent.icon) {
      eventIcon.src = activeEvent.icon;
      eventIcon.alt = `${activeEvent.title} icon`;
      eventIcon.classList.remove("hidden");
    } else {
      eventIcon.removeAttribute("src");
      eventIcon.alt = "";
      eventIcon.classList.add("hidden");
    }
    eventTitle.textContent = `Event: ${activeEvent.title}`;
    eventBlurb.textContent = activeEvent.blurb;
    eventEffect.textContent = `Effect: ${activeEvent.effect}`;
    eventPanel.classList.remove("hidden");
  } else {
    eventIcon.removeAttribute("src");
    eventIcon.alt = "";
    eventIcon.classList.add("hidden");
    eventPanel.classList.add("hidden");
  }

  if (campaignState.phase === "strategic") {
    const activePlayer = getActivePlayer(campaignState);
    const playerCards = campaignState.strategicCards[activePlayer];
    const cfg = strategicCardConfig();
    const research = campaignState.effects?.researchPoints?.[activePlayer] ?? 0;
    const rockets = campaignState.effects?.pendingRocketStrikes?.[activePlayer] ?? 0;
    const tanks = campaignState.effects?.pendingModernTankSpawns?.[activePlayer] ?? 0;
    const supportRussia = campaignState.effects?.globalSupport?.[PLAYERS.russia] ?? 0;
    const supportUkraine = campaignState.effects?.globalSupport?.[PLAYERS.ukraine] ?? 0;
    const remainingPool = campaignState.strategicGlobalPoolRemaining?.[activePlayer] || [];
    const remainingPoolNames = remainingPool.map((cardId) => strategicCardDefinition(cardId).name);
    const totalPoolSize = (cfg.geopoliticalPools?.[activePlayer] || []).length;
    const addedCardName = playerCards.lastAddedCardId ? strategicCardDefinition(playerCards.lastAddedCardId).name : "none";
    const drawCount = playerCards.drawPile?.length || 0;
    const discardCount = playerCards.discardPile?.length || 0;
    strategicCardsTitle.textContent = `${activePlayer} Strategic Hand`;
    strategicCardsMeta.textContent = `Draw: ${cfg.maxHandSize} | Plays used: ${playerCards.playsUsed}/${cfg.maxPlays} | Hand: ${playerCards.hand.length} | Research: ${research} | Rocket strikes: ${rockets} | Tank spawns: ${tanks} | Global Support: Russia ${supportRussia}, Ukraine ${supportUkraine}`;
    strategicPoolDebug.textContent = `Debug pool ${activePlayer}: total ${totalPoolSize}, remaining ${remainingPoolNames.length}, added this turn: ${addedCardName}. Deck draw/discard: ${drawCount}/${discardCount}. Remaining cards: ${remainingPoolNames.length ? remainingPoolNames.join(", ") : "empty"}`;
    strategicCardsHand.replaceChildren();
    playerCards.hand.forEach((cardId, index) => {
      const cardDef = strategicCardDefinition(cardId);
      const cardItem = document.createElement("article");
      cardItem.className = "card-item";

      if (cardDef.icon) {
        const cardIcon = document.createElement("img");
        cardIcon.className = "card-icon";
        cardIcon.src = cardDef.icon;
        cardIcon.alt = `${cardDef.name} icon`;
        cardItem.append(cardIcon);
      }

      const cardName = document.createElement("p");
      cardName.className = "card-name";
      cardName.textContent = cardDef.name;
      if (cardDef.playOnce) {
        const destroyBadge = document.createElement("span");
        destroyBadge.className = "card-destroy-badge";
        destroyBadge.textContent = "X";
        cardName.append(" ", destroyBadge);
      }

      const cardEffect = document.createElement("p");
      cardEffect.className = "card-effect";
      cardEffect.textContent = cardDef.effectText;

      const cardPlayBtn = document.createElement("button");
      cardPlayBtn.type = "button";
      cardPlayBtn.className = "card-play-btn";
      cardPlayBtn.textContent = "Play Card";
      cardPlayBtn.disabled = playerCards.playsUsed >= cfg.maxPlays;
      cardPlayBtn.addEventListener("click", () => playStrategicCard(index));

      cardItem.append(cardName, cardEffect, cardPlayBtn);
      strategicCardsHand.append(cardItem);
    });

    if (playerCards.hand.length === 0) {
      const emptyLine = document.createElement("p");
      emptyLine.className = "card-effect";
      emptyLine.textContent = "No cards in hand.";
      strategicCardsHand.append(emptyLine);
    }
    strategicCardsPanel.classList.remove("hidden");
  } else {
    strategicPoolDebug.textContent = "";
    strategicCardsPanel.classList.add("hidden");
  }
  endTurnBtn.disabled = false;
}

function enterTurnMode() {
  document.body.classList.add("in-turns");
  menuScreen.classList.add("hidden");
  turnHud.classList.remove("hidden");
  turnFooter.classList.remove("hidden");
}

function enterMenuMode() {
  document.body.classList.remove("in-turns");
  menuScreen.classList.remove("hidden");
  turnHud.classList.add("hidden");
  turnFooter.classList.add("hidden");
}

function persistCampaignState() {
  if (!campaignState) {
    return;
  }

  const nowIso = new Date().toISOString();
  const saveLabel = `${campaignState.createdByPlayerName} ${nowIso}`;
  const save = {
    saveName: saveLabel,
    playerName: currentPlayerName(),
    startedAt: nowIso,
    campaignTurn: campaignState.campaignTurn,
    theater: "Frozen Front",
    campaign: campaignState,
    updatedAt: nowIso,
  };
  let history = [];
  try {
    const rawHistory = localStorage.getItem(STORAGE_KEYS.saveHistory);
    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory)) {
        history = parsedHistory;
      }
    }
  } catch (err) {
    history = [];
  }

  history.push(save);
  if (history.length > MAX_AUTOSAVES) {
    history = history.slice(history.length - MAX_AUTOSAVES);
  }

  localStorage.setItem(STORAGE_KEYS.saveHistory, JSON.stringify(history));
  localStorage.setItem(STORAGE_KEYS.saveGame, JSON.stringify(save));
}

function advanceRoundUnit(state) {
  state.campaignTurn += 1;
  if (state.phase === "strategic") {
    state.phase = "battle";
    state.battleTurn = 1;
    return;
  }

  const season = seasonFor(state);
  if (season.name === "Winter" && state.battleTurn === 1 && state.effects && state.effects.winterFirstBattleNoSlow) {
    state.effects.winterFirstBattleNoSlowConsumed = true;
  }
  if (state.battleTurn < season.battleTurns) {
    state.battleTurn += 1;
    return;
  }

  const previousSeasonName = season.name;
  state.seasonIndex += 1;
  if (state.seasonIndex >= SEASONS.length) {
    state.seasonIndex = 0;
  }
  const nextSeasonName = SEASONS[state.seasonIndex].name;
  if (previousSeasonName === "Fall" && nextSeasonName === "Winter") {
    state.year += 1;
  }

  state.phase = "strategic";
  state.battleTurn = 0;
}

function endTurn() {
  if (!campaignState) {
    setStatus("Start a new game first.");
    return;
  }

  finalizeStrategicTurnForActivePlayer(campaignState);
  if (campaignState.actorStep === 0) {
    campaignState.actorStep = 1;
  } else {
    campaignState.actorStep = 0;
    advanceRoundUnit(campaignState);
  }

  if (campaignState.phase !== "strategic" && campaignState.effects && campaignState.effects.ukraineReplacementBoostStrategicTurnsRemaining > 0) {
    campaignState.effects.ukraineReplacementBoostStrategicTurnsRemaining = 0;
  }

  applyTurnStartEffects(campaignState);
  renderTurnHud();
  persistCampaignState();
  setStatus("Turn advanced.");
}

function createNewGame() {
  campaignState = createInitialCampaignState(currentPlayerName());
  applyTurnStartEffects(campaignState);
  persistCampaignState();
  renderTurnHud();
  enterTurnMode();
  setStatus("New campaign initialized. Russia has initiative.");
}

function hydrateCampaignStateDefaults(rawState) {
  const state = rawState;
  if (typeof state.createdByPlayerName !== "string" || !state.createdByPlayerName.trim()) {
    state.createdByPlayerName = currentPlayerName();
  }
  if (!Number.isInteger(state.campaignTurn) || state.campaignTurn < 1) {
    state.campaignTurn = 1;
  }
  if (!state.effects) {
    state.effects = {};
  }
  if (!state.events) {
    state.events = {};
  }
  if (!Number.isInteger(state.effects.ukraineMobilizationTier)) {
    state.effects.ukraineMobilizationTier = 0;
  }
  if (typeof state.effects.ukraineTerritorialDefenseSpawnPending !== "boolean") {
    state.effects.ukraineTerritorialDefenseSpawnPending = false;
  }
  if (!Number.isInteger(state.effects.ukraineReplacementBoostStrategicTurnsRemaining)) {
    state.effects.ukraineReplacementBoostStrategicTurnsRemaining = 0;
  }
  ensureGlobalSupportTrack(state);
  if (!state.effects.researchPoints || typeof state.effects.researchPoints !== "object") {
    state.effects.researchPoints = {};
  }
  if (!Number.isInteger(state.effects.researchPoints[PLAYERS.russia])) {
    state.effects.researchPoints[PLAYERS.russia] = 0;
  }
  if (!Number.isInteger(state.effects.researchPoints[PLAYERS.ukraine])) {
    state.effects.researchPoints[PLAYERS.ukraine] = 0;
  }
  if (!state.effects.pendingRocketStrikes || typeof state.effects.pendingRocketStrikes !== "object") {
    state.effects.pendingRocketStrikes = {};
  }
  if (!Number.isInteger(state.effects.pendingRocketStrikes[PLAYERS.russia])) {
    state.effects.pendingRocketStrikes[PLAYERS.russia] = 0;
  }
  if (!Number.isInteger(state.effects.pendingRocketStrikes[PLAYERS.ukraine])) {
    state.effects.pendingRocketStrikes[PLAYERS.ukraine] = 0;
  }
  if (!state.effects.pendingModernTankSpawns || typeof state.effects.pendingModernTankSpawns !== "object") {
    state.effects.pendingModernTankSpawns = {};
  }
  if (!Number.isInteger(state.effects.pendingModernTankSpawns[PLAYERS.russia])) {
    state.effects.pendingModernTankSpawns[PLAYERS.russia] = 0;
  }
  if (!Number.isInteger(state.effects.pendingModernTankSpawns[PLAYERS.ukraine])) {
    state.effects.pendingModernTankSpawns[PLAYERS.ukraine] = 0;
  }
  if (!Array.isArray(state.effects.pendingRegionalInfantrySpawns)) {
    state.effects.pendingRegionalInfantrySpawns = [];
  }
  if (!Array.isArray(state.effects.pendingControlledCityInfantrySpawns)) {
    state.effects.pendingControlledCityInfantrySpawns = [];
  }
  if (!Array.isArray(state.effects.pendingForcedRussianRedeployments)) {
    state.effects.pendingForcedRussianRedeployments = [];
  }
  if (!Array.isArray(state.effects.pendingEndOfBattleTurnDestructions)) {
    state.effects.pendingEndOfBattleTurnDestructions = [];
  }
  if (!state.effects.bakhmutQuarterCasualtyRule || typeof state.effects.bakhmutQuarterCasualtyRule !== "object") {
    state.effects.bakhmutQuarterCasualtyRule = null;
  }
  if (!Array.isArray(state.effects.pendingAirCombatModifiers)) {
    state.effects.pendingAirCombatModifiers = [];
  }
  if (!Array.isArray(state.effects.pendingTankDestructions)) {
    state.effects.pendingTankDestructions = [];
  }
  if (!Array.isArray(state.effects.pendingFortressSpawns)) {
    state.effects.pendingFortressSpawns = [];
  }
  if (typeof state.effects.winterFirstBattleNoSlow !== "boolean") {
    state.effects.winterFirstBattleNoSlow = false;
  }
  if (typeof state.effects.winterFirstBattleNoSlowConsumed !== "boolean") {
    state.effects.winterFirstBattleNoSlowConsumed = false;
  }
  if (typeof state.events.weAreHereApplied !== "boolean") {
    state.events.weAreHereApplied = false;
  }
  if (typeof state.events.specialOperationApplied !== "boolean") {
    state.events.specialOperationApplied = false;
  }
  if (!Array.isArray(state.events.appliedEventIds)) {
    state.events.appliedEventIds = [];
  }
  ensureStrategicState(state);
  ensureGeopoliticalPool(state);
  ensureStrategicPoolScheduleState(state);
  for (const player of [PLAYERS.russia, PLAYERS.ukraine]) {
    if (!Array.isArray(state.strategicCards[player].drawPile)) {
      state.strategicCards[player].drawPile = [];
    }
    if (!Array.isArray(state.strategicCards[player].discardPile)) {
      state.strategicCards[player].discardPile = [];
    }
  }
  return state;
}

function loadCampaignFromParsedSave(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.campaign || typeof parsed.campaign !== "object") {
    return false;
  }
  const hydrated = hydrateCampaignStateDefaults({ ...parsed.campaign });
  if (!isValidCampaignState(hydrated)) {
    return false;
  }
  campaignState = hydrated;
  if (parsed.playerName && typeof parsed.playerName === "string") {
    localStorage.setItem(STORAGE_KEYS.playerName, parsed.playerName);
    refreshPlayerLine();
  }
  applyTurnStartEffects(campaignState);
  persistCampaignState();
  renderTurnHud();
  enterTurnMode();
  return true;
}

function loadSaveFromFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!loadCampaignFromParsedSave(parsed)) {
        setStatus("Save file could not be loaded. Use a valid JSON file.");
        return;
      }
      setStatus("Saved game loaded successfully.");
    } catch (err) {
      setStatus("Save file could not be loaded. Use a valid JSON file.");
    }
  };
  reader.readAsText(file);
}

function openSettings() {
  playerNameInput.value = currentPlayerName();
  settingsDialog.showModal();
}

newGameBtn.addEventListener("click", createNewGame);

continueBtn.addEventListener("click", () => {
  try {
    const rawHistory = localStorage.getItem(STORAGE_KEYS.saveHistory);
    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        const latestSave = parsedHistory[parsedHistory.length - 1];
        if (loadCampaignFromParsedSave(latestSave)) {
          const label = typeof latestSave.saveName === "string" ? latestSave.saveName : "latest autosave";
          setStatus(`Continued from autosave: ${label}.`);
          return;
        }
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.saveGame);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (loadCampaignFromParsedSave(parsed)) {
        const label = typeof parsed.saveName === "string" ? parsed.saveName : "latest autosave";
        setStatus(`Continued from autosave: ${label}.`);
        return;
      }
    }

    loadSaveInput.click();
  } catch (err) {
    loadSaveInput.click();
  }
});

loadSaveInput.addEventListener("change", (event) => {
  const input = event.target;
  loadSaveFromFile(input.files && input.files[0]);
  input.value = "";
});

settingsBtn.addEventListener("click", openSettings);

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const cleanName = playerNameInput.value.trim();
  if (!cleanName) {
    setStatus("Player name cannot be empty.");
    return;
  }
  localStorage.setItem(STORAGE_KEYS.playerName, cleanName);
  refreshPlayerLine();
  settingsDialog.close();
  setStatus("Settings saved.");
});

endTurnBtn.addEventListener("click", endTurn);
mainMenuBtn.addEventListener("click", () => {
  enterMenuMode();
  setStatus("Returned to main menu.");
});

quitBtn.addEventListener("click", () => {
  setStatus("Quit requested. Close this browser tab to exit.");
  window.close();
});

refreshPlayerLine();
renderTurnHud();
enterMenuMode();
setStatus("Menu ready.");
