const STORAGE_KEYS = {
  playerName: "dw26_player_name",
  saveGame: "dw26_save_game",
};

const PLAYERS = {
  russia: "Russia",
  ukraine: "Ukraine",
};

const WINTER_2022_RUSSIA_EVENT = {
  title: "Special Operation",
  blurb: "By order of the Supreme Commander-in-Chief, your exercise transitions into a special military operation. Your objectives are the demilitarization and denazification of Ukraine. Your forces will strike Ukrainian military infrastructure and secure key cities. Ukrainian resistance is expected to collapse quickly under decisive action.",
  effect: "Movement speed on the first battle turn of winter is not reduced by winter conditions.",
};

const WINTER_2022_UKRAINE_EVENT = {
  title: "We Are Here",
  blurb: "Russia has launched a full-scale invasion of Ukraine. We are here. We are not putting down our arms. We will defend our country and our independence. The enemy expects our collapse-but Ukraine will resist.",
  effect: "Nationwide mobilization begins. Ukraine immediately unlocks Mobilization Tier 1. Territorial Defense units form across the country: spawn 1 Territorial Defense unit in each Ukrainian-controlled city. Ukrainian replacement rate is increased for the first strategic turn.",
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
const eventTitle = document.getElementById("eventTitle");
const eventBlurb = document.getElementById("eventBlurb");
const eventEffect = document.getElementById("eventEffect");

let campaignState = null;

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

function createInitialCampaignState() {
  return {
    year: 2022,
    seasonIndex: 3,
    phase: "strategic",
    battleTurn: 0,
    actorStep: 0,
    initiative: PLAYERS.russia,
    effects: {
      winterFirstBattleNoSlow: true,
      winterFirstBattleNoSlowConsumed: false,
      ukraineMobilizationTier: 0,
      ukraineTerritorialDefenseSpawnPending: false,
      ukraineReplacementBoostStrategicTurnsRemaining: 0,
    },
    events: {
      weAreHereApplied: false,
    },
  };
}

function isValidCampaignState(candidate) {
  if (!candidate || typeof candidate !== "object") {
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

  return `Year ${state.year} | ${season.name} | Phase: ${state.phase} | Initiative: ${state.initiative} | Acting: ${activePlayer} | Year Totals: ${strategicTurnsPerYear} strategic, ${battleTurnsPerYear} battle`;
}

function isWinterFirstBattleNoSlowActive(state) {
  if (!state.effects) {
    return false;
  }
  if (!state.effects.winterFirstBattleNoSlow || state.effects.winterFirstBattleNoSlowConsumed) {
    return false;
  }

  const season = seasonFor(state);
  return season.name === "Winter" && state.phase === "battle" && state.battleTurn === 1;
}

function getWeatherText(state) {
  const season = seasonFor(state);
  const movementLabel = isWinterFirstBattleNoSlowActive(state) ? "full movement (event override)" : season.movementLabel;
  return `${season.name} conditions: ${season.weatherText} Movement cap: ${movementLabel}. Battle turns this season: ${season.battleTurns}.`;
}

function getStrategicEventForState(state) {
  if (state.phase !== "strategic") {
    return null;
  }

  const season = seasonFor(state);
  const activePlayer = getActivePlayer(state);
  if (state.year === 2022 && season.name === "Winter" && activePlayer === PLAYERS.russia) {
    return WINTER_2022_RUSSIA_EVENT;
  }
  if (state.year === 2022 && season.name === "Winter" && activePlayer === PLAYERS.ukraine) {
    return WINTER_2022_UKRAINE_EVENT;
  }

  return null;
}

function applyTurnStartEffects(state) {
  if (!state.effects || !state.events) {
    return;
  }

  const season = seasonFor(state);
  const activePlayer = getActivePlayer(state);
  if (
    !state.events.weAreHereApplied &&
    state.year === 2022 &&
    season.name === "Winter" &&
    state.phase === "strategic" &&
    activePlayer === PLAYERS.ukraine
  ) {
    state.effects.ukraineMobilizationTier = 1;
    state.effects.ukraineTerritorialDefenseSpawnPending = true;
    state.effects.ukraineReplacementBoostStrategicTurnsRemaining = 1;
    state.events.weAreHereApplied = true;
  }
}

function renderTurnHud() {
  if (!campaignState) {
    turnFlavor.textContent = "Turn sequence not started. Start a new game.";
    turnMeta.textContent = "Initiative: Russia";
    weatherLine.textContent = "Season rules will appear here.";
    eventPanel.classList.add("hidden");
    endTurnBtn.disabled = true;
    return;
  }

  turnFlavor.textContent = getFlavorText(campaignState);
  turnMeta.textContent = getMetaText(campaignState);
  weatherLine.textContent = getWeatherText(campaignState);
  const activeEvent = getStrategicEventForState(campaignState);
  if (activeEvent) {
    eventTitle.textContent = `Event: ${activeEvent.title}`;
    eventBlurb.textContent = activeEvent.blurb;
    eventEffect.textContent = `Effect: ${activeEvent.effect}`;
    eventPanel.classList.remove("hidden");
  } else {
    eventPanel.classList.add("hidden");
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

  const save = {
    playerName: currentPlayerName(),
    startedAt: new Date().toISOString(),
    campaignTurn: 1,
    theater: "Frozen Front",
    campaign: campaignState,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.saveGame, JSON.stringify(save));
}

function advanceRoundUnit(state) {
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

  state.seasonIndex += 1;
  if (state.seasonIndex >= SEASONS.length) {
    state.seasonIndex = 0;
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
  campaignState = createInitialCampaignState();
  applyTurnStartEffects(campaignState);
  persistCampaignState();
  renderTurnHud();
  enterTurnMode();
  setStatus("New campaign initialized. Russia has initiative.");
}

function loadSaveFromFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      localStorage.setItem(STORAGE_KEYS.saveGame, JSON.stringify(parsed));
      if (parsed.playerName && typeof parsed.playerName === "string") {
        localStorage.setItem(STORAGE_KEYS.playerName, parsed.playerName);
        refreshPlayerLine();
      }

      if (isValidCampaignState(parsed.campaign)) {
        campaignState = parsed.campaign;
        if (!campaignState.effects) {
          campaignState.effects = {};
        }
        if (!campaignState.events) {
          campaignState.events = {};
        }
        if (!Number.isInteger(campaignState.effects.ukraineMobilizationTier)) {
          campaignState.effects.ukraineMobilizationTier = 0;
        }
        if (typeof campaignState.effects.ukraineTerritorialDefenseSpawnPending !== "boolean") {
          campaignState.effects.ukraineTerritorialDefenseSpawnPending = false;
        }
        if (!Number.isInteger(campaignState.effects.ukraineReplacementBoostStrategicTurnsRemaining)) {
          campaignState.effects.ukraineReplacementBoostStrategicTurnsRemaining = 0;
        }
        if (typeof campaignState.effects.winterFirstBattleNoSlow !== "boolean") {
          campaignState.effects.winterFirstBattleNoSlow = false;
        }
        if (typeof campaignState.effects.winterFirstBattleNoSlowConsumed !== "boolean") {
          campaignState.effects.winterFirstBattleNoSlowConsumed = false;
        }
        if (typeof campaignState.events.weAreHereApplied !== "boolean") {
          campaignState.events.weAreHereApplied = false;
        }
        applyTurnStartEffects(campaignState);
        renderTurnHud();
        enterTurnMode();
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
  loadSaveInput.click();
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
