const canvas = document.getElementById("researchTreeCanvas");
const context = canvas.getContext("2d");
const resetViewButton = document.getElementById("resetView");
const frame = canvas.parentElement;
const detailTitle = document.getElementById("detailTitle");
const detailBranch = document.getElementById("detailBranch");
const detailRequirement = document.getElementById("detailRequirement");
const detailType = document.getElementById("detailType");
const detailLevel = document.getElementById("detailLevel");
const detailStatus = document.getElementById("detailStatus");
const detailCost = document.getElementById("detailCost");
const detailEffect = document.getElementById("detailEffect");
const detailCounter = document.getElementById("detailCounter");
const budgetValue = document.getElementById("budgetValue");
const conditionList = document.getElementById("conditionList");
const statusEffectList = document.getElementById("statusEffectList");

const FALLBACK_TECHTREE = `| Branch             | Level | Node Type      | Technology / Doctrine       | Unlock Requirement            | Research Cost | Main Effect                         | Counter Unlocked         | Side Effect                         |
| ------------------ | ----- | -------------- | --------------------------- | ----------------------------- | ------------- | ----------------------------------- | ------------------------ | ----------------------------------- |
| Mobilization       | 1     | Doctrine       | Peacetime Army              | Start of game                 | -             | Low replacement rate                | -                        | -                                   |
| Mobilization       | 2     | Doctrine       | Limited Conscription        | Sufficient manpower losses    | 3             | Moderate replacement rate           | -                        | -                                   |
| Mobilization       | 3     | Doctrine       | Expanded Mobilization       | Continued casualties          | 6             | High replacement rate               | -                        | -                                   |
| Mobilization       | 4     | Doctrine       | Total Mobilization          | Heavy sustained losses        | 10            | Maximum replacement rate            | -                        | Recruitment fatigue events increase |
| Mobilization       | 5     | Infrastructure | War Industry Mobilization   | Research                      | 4             | Increase overall production         | Strategic strikes        | -                                   |
| Mobilization       | 6     | Doctrine       | Industrial Warfare Doctrine | Sustained production          | 16            | Maintain long attrition wars        | Strategic strikes        | -                                   |
| Drone Warfare      | 1     | Technology     | Commercial Quadcopters      | Research                      | 1             | Basic recon drones                  | -                        | -                                   |
| Drone Warfare      | 2     | Technology     | Recon Drone Operations      | After quadcopters used        | 3             | Detect enemy units                  | Camouflage / concealment | -                                   |
| Drone Warfare      | 3     | Technology     | FPV Strike Drones           | Research                      | 5             | Cheap attack drones                 | -                        | -                                   |
| Drone Warfare      | 3     | Technology     | Drone Artillery             | Recon drones used             | 4             | Faster and more accurate artillery  | -                        | -                                   |
| Drone Warfare      | 4     | Doctrine       | Drone Assault Doctrine      | FPV drones used sufficiently  | 9             | Increase drone attack efficiency    | -                        | -                                   |
| Drone Warfare      | 4     | Doctrine       | Integrated Kill Chain       | Artillery + drone usage       | 5             | Recon-strike coordination           | -                        | -                                   |
| Drone Warfare      | 5     | Technology     | Drone Swarm Coordination    | Research                      | 18            | Multiple drones per attack          | Interceptor drones       | -                                   |
| Drone Warfare      | 5     | Technology     | Counter-battery Radar       | Drone Artillery used          | 4             | Detect and suppress enemy artillery | -                        | -                                   |
| Drone Warfare      | 6     | Doctrine       | Swarm Warfare Doctrine      | Swarm usage threshold         | 36            | Saturation attacks                  | -                        | -                                   |
| Drone Warfare      | 6     | Infrastructure | Fire Network                | Integrated Kill Chain reached | 13            | Faster strike cycles                | -                        | -                                   |
| Drone Warfare      | 7     | Technology     | Autonomous Drone Targeting  | Research                      | 72            | Reduced operator dependence         | Signal deception         | -                                   |
| Drone Warfare      | 8     | Infrastructure | Drone Manufacturing Systems | Doctrine reached              | 144           | Large drone supply each turn        | Strategic factory strikes | -                                  |
| Drone Warfare      | 9     | Technology     | Electronics Supply Chains   | Manufacturing used            | 3             | Improve drone component supply      | Infrastructure strikes   | -                                   |
| Electronic Warfare | 1     | Technology     | Anti-drone EW               | After 8 losses involving drones | 2           | Local drone disruption              | Fiber-optic drones       | -                                   |
| Electronic Warfare | 2     | Technology     | Mobile EW Units             | Anti-drone EW used            | 2             | Deployable EW units                 | -                        | -                                   |
| Electronic Warfare | 3     | Technology     | EW Network Integration      | Research                      | 7             | Wider jamming coverage              | -                        | -                                   |
| Electronic Warfare | 4     | Doctrine       | Spectrum Control Doctrine   | EW used sufficiently          | 12            | Strong drone suppression            | -                        | -                                   |
| Electronic Warfare | 5     | Infrastructure | Electronic Warfare Network  | Doctrine reached              | 24            | Persistent anti-drone zones         | -                        | -                                   |
| Air Defense        | 1     | Technology     | Anti-air                    | Start of game                 | -             | Basic air defense against aircraft  | -                       | -                                   |
| Air Defense        | 2     | Technology     | Short-Range Air Defense     | Anti-air used                 | 4             | Improve local air defense           | -                       | -                                   |
| Air Defense        | 3     | Technology     | Integrated Air Defense      | Research                      | 6             | Regional air denial zones           | -                       | -                                   |
| Air Defense        | 4     | Doctrine       | Air Defense Network         | Air defense used sufficiently | 11            | Strong aircraft interception        | -                         | -                                 |
| Air Defense        | 5     | Infrastructure | Air Defense Grid            | Doctrine reached              | 20            | Protect deep infrastructure         | Long-range strike missiles | -                                 |
| Air Strike         | 1     | Technology     | Missiles                    | Research                      | 8             | Enable long-range missile attacks   | -                          | -                                 |
| Air Strike         | 1     | Technology     | Glide Bombs                 | After 2 air losses            | 3             | Aircraft attack from safer distance | -                          | -                                 |
| Air Strike         | 2     | Technology     | Long-Range Drones           | Research                      | 4             | Deep strike capability              | -                          | -                                 |
| Air Strike         | 2     | Technology     | Cruise Missiles             | Missiles used                 | 12            | Increase range and strike mass      | -                          | -                                 |
| Air Strike         | 3     | Technology     | Precision Targeting         | Research                      | 7             | Higher strike accuracy              | -                          | -                                 |
| Air Strike         | 4     | Technology     | Hypersonics                 | Cruise Missiles used          | 20            | Unlock hypersonic missile strikes   | -                          | -                                 |
| Air Strike         | 5     | Infrastructure | Mass Drone Raids            | Long-Range Drones used        | 30            | Large deep-strike waves             | -                          | -                                 |`;

const BRANCH_COLORS = {
  "Mobilization": "#6e7f31",
  "Drone Warfare": "#236d78",
  "Electronic Warfare": "#5b4ea1",
  "Air Defense": "#8f5a2d",
  "Air Strike": "#7a4567"
};

const STATUS_STYLES = {
  locked: { fill: "#73685e", edge: "rgba(102, 87, 74, 0.22)", border: "rgba(255,255,255,0.15)" },
  available: { fill: "#d49a4a", edge: "rgba(212, 154, 74, 0.45)", border: "rgba(255,255,255,0.38)" },
  unlocked: { fill: "#3f885f", edge: "rgba(63, 136, 95, 0.48)", border: "rgba(255,255,255,0.42)" }
};

const TYPE_ABBREVIATIONS = {
  Technology: "TECH",
  Doctrine: "DOC",
  Infrastructure: "INF"
};

const COUNTER_NODE_OVERRIDES = {};

const EXPLICIT_SOURCE_NODE_NAMES = {
  "Cruise Missiles": "Missiles",
  "Hypersonics": "Cruise Missiles",
  "Mass Drone Raids": "Long-Range Drones",
};

const DEAD_END_NODE_NAMES = new Set([
  "Glide Bombs",
]);

const STARTING_RESEARCH_BUDGETS = {
  russia: 0,
  ukraine: 3
};

const PLAYER_STYLES = {
  russia: {
    label: "Russia",
    key: "RU",
    fill: "#f2f4f8",
    text: "#0f1520",
    stripe: "#3259a8"
  },
  ukraine: {
    label: "Ukraine",
    key: "UA",
    fill: "#f5c344",
    text: "#0f1520",
    stripe: "#2c62b7"
  }
};

const state = {
  panX: 0,
  panY: 0,
  zoom: 1,
  selectedNodeId: null,
  isPanning: false,
  lastPointerX: 0,
  lastPointerY: 0,
  techNodes: [],
  edges: [],
  branchOrder: [],
  branchMetrics: new Map(),
  activePlayerId: "russia",
  players: {
    russia: { researchBudget: STARTING_RESEARCH_BUDGETS.russia, researchBonus: 0, researchSpent: 0 },
    ukraine: { researchBudget: STARTING_RESEARCH_BUDGETS.ukraine, researchBonus: 0, researchSpent: 0 }
  },
  conditions: []
};

function effectiveResearchBudget(playerId) {
  const player = state.players[playerId];
  return (player?.researchBudget ?? 0) + (player?.researchBonus ?? 0);
}

const NODE_WIDTH = 190;
const NODE_HEIGHT = 88;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.8;
const LEVEL_SPACING = 170;
const SIBLING_SPACING = 196;
const BRANCH_GAP = 52;
const BRANCH_PADDING = 38;

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanCell(value) {
  const trimmed = value.trim();
  return trimmed === "–" ? "-" : trimmed;
}

function isStartOfGameRequirement(requirement) {
  return requirement.trim().toLowerCase() === "start of game";
}

function isResearchRequirement(requirement) {
  return requirement.trim().toLowerCase() === "research";
}

function isConditionalRequirement(requirement) {
  return !isStartOfGameRequirement(requirement) && !isResearchRequirement(requirement);
}

function getCostLabel(node) {
  if (node.researchCost !== null) {
    return `${node.researchCost} research points`;
  }

  if (node.fixedStatus) {
    return "No cost: start-of-game technology";
  }

  return "No point cost";
}

function getConditionKey(requirement) {
  return slugify(requirement);
}

function getTierGroupId(branch, level) {
  return `${slugify(branch)}-tier-${level}`;
}

function buildBranchMetrics(groupedNodesByBranch, branchOrder) {
  const metrics = new Map();

  branchOrder.forEach((branch) => {
    const groupedNodes = groupedNodesByBranch.get(branch);
    const widestTierCount = Math.max(...Array.from(groupedNodes.values(), (levelNodes) => levelNodes.length), 1);
    const contentWidth = widestTierCount === 1
      ? NODE_WIDTH
      : NODE_WIDTH + (widestTierCount - 1) * SIBLING_SPACING;

    metrics.set(branch, {
      widestTierCount,
      laneWidth: contentWidth + BRANCH_PADDING * 2,
      centerX: 0
    });
  });

  branchOrder.forEach((branch, index) => {
    const metric = metrics.get(branch);
    if (index === 0) {
      metric.centerX = metric.laneWidth / 2;
      return;
    }

    const previousMetric = metrics.get(branchOrder[index - 1]);
    metric.centerX = previousMetric.centerX + previousMetric.laneWidth / 2 + BRANCH_GAP + metric.laneWidth / 2;
  });

  return metrics;
}

function parseTechTree(markdownTable) {
  const rows = markdownTable
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  const dataRows = rows.slice(2);
  const parsed = dataRows.map((row) => row.split("|").slice(1, -1).map(cleanCell));

  const branchOrder = [];
  const branchLookup = new Set();
  const branchLevelMap = new Map();
  const conditionMap = new Map();
  const groupedNodesByBranch = new Map();

  parsed.forEach((cells) => {
    const [branch, level, nodeType, name, requirement, researchCost, effect, counter, sideEffect] = cells;

    if (!branchLookup.has(branch)) {
      branchLookup.add(branch);
      branchOrder.push(branch);
    }

    if (!branchLevelMap.has(branch)) {
      branchLevelMap.set(branch, []);
    }

    branchLevelMap.get(branch).push({
      id: `${slugify(branch)}-${Number(level)}`,
      branch,
      level: Number(level),
      tierGroupId: getTierGroupId(branch, Number(level)),
      nodeType,
      name,
      requirement,
      effect,
      counter,
      sideEffect,
      sourceNodeId: null,
      isCounterNode: false,
      fixedStatus: isStartOfGameRequirement(requirement),
      conditionalRequirement: isConditionalRequirement(requirement),
      conditionKey: isConditionalRequirement(requirement) ? getConditionKey(requirement) : null,
      conditionMet: false,
      researchCost: researchCost === "-" ? null : Number(researchCost),
      achievedBy: isStartOfGameRequirement(requirement)
        ? { russia: true, ukraine: true }
        : { russia: false, ukraine: false },
      x: 0,
      y: 0
    });

    if (isConditionalRequirement(requirement) && !conditionMap.has(getConditionKey(requirement))) {
      conditionMap.set(getConditionKey(requirement), {
        key: getConditionKey(requirement),
        label: requirement,
        enabled: false
      });
    }
  });

  const techNodes = [];
  const edges = [];
  const allBranchNodes = [];

  branchOrder.forEach((branch) => {
    const nodes = branchLevelMap.get(branch).sort((left, right) => left.level - right.level);
    allBranchNodes.push(...nodes);
    const groupedNodes = new Map();

    nodes.forEach((node) => {
      if (!groupedNodes.has(node.level)) {
        groupedNodes.set(node.level, []);
      }

      groupedNodes.get(node.level).push(node);

      if (node.counter !== "-") {
        const counterOverride = COUNTER_NODE_OVERRIDES[node.counter] || null;
        const counterRequirement = counterOverride?.requirement || `${node.name} researched`;
        groupedNodes.get(node.level).push({
          id: `${slugify(branch)}-${node.level}-counter-${slugify(node.counter)}`,
          branch,
          level: node.level,
          tierGroupId: node.tierGroupId,
          nodeType: "Technology",
          name: node.counter,
          requirement: counterRequirement,
          effect: counterOverride?.effect || `Countermeasure unlocked by ${node.name}.`,
          counter: "-",
          sourceNodeId: node.id,
          isCounterNode: true,
          fixedStatus: false,
          conditionalRequirement: isConditionalRequirement(counterRequirement),
          conditionKey: isConditionalRequirement(counterRequirement) ? getConditionKey(counterRequirement) : null,
          conditionMet: false,
          researchCost: typeof counterOverride?.researchCost === "number" ? counterOverride.researchCost : node.researchCost,
          achievedBy: { russia: false, ukraine: false },
          x: 0,
          y: 0
        });

        if (isConditionalRequirement(counterRequirement) && !conditionMap.has(getConditionKey(counterRequirement))) {
          conditionMap.set(getConditionKey(counterRequirement), {
            key: getConditionKey(counterRequirement),
            label: counterRequirement,
            enabled: false
          });
        }
      }
    });

    groupedNodesByBranch.set(branch, groupedNodes);
  });

  const branchMetrics = buildBranchMetrics(groupedNodesByBranch, branchOrder);
  const nodeIdByName = new Map(allBranchNodes.map((node) => [node.name, node.id]));

  branchOrder.forEach((branch) => {
    const groupedNodes = groupedNodesByBranch.get(branch);
    const branchMetric = branchMetrics.get(branch);

    Array.from(groupedNodes.entries())
      .sort((left, right) => left[0] - right[0])
      .forEach(([level, levelNodes]) => {
        const siblingOffset = (levelNodes.length - 1) / 2;
        const previousLevelNodes = (groupedNodes.get(level - 1) ?? []).filter(
          (candidate) => !DEAD_END_NODE_NAMES.has(candidate.name)
        );

        levelNodes.forEach((node, siblingIndex) => {
          node.x = branchMetric.centerX + (siblingIndex - siblingOffset) * SIBLING_SPACING;
          node.y = (level - 1) * LEVEL_SPACING;
          node.previousTierGroupId = level > 1 ? getTierGroupId(branch, level - 1) : null;
          if (!node.sourceNodeId && EXPLICIT_SOURCE_NODE_NAMES[node.name]) {
            node.sourceNodeId = nodeIdByName.get(EXPLICIT_SOURCE_NODE_NAMES[node.name]) || null;
          }
          if (node.sourceNodeId) {
            node.previousTierGroupId = null;
          }
          techNodes.push(node);

          if (node.sourceNodeId) {
            edges.push([node.sourceNodeId, node.id]);
          } else {
            previousLevelNodes.forEach((previousNode) => {
              edges.push([previousNode.id, node.id]);
            });
          }
        });
      });
  });

  const ukraineOpeningDroneTech = techNodes.find((node) => node.name === "Commercial Quadcopters" && !node.isCounterNode);
  if (ukraineOpeningDroneTech) {
    ukraineOpeningDroneTech.achievedBy.ukraine = true;
  }

  const russiaOpeningMissileTech = techNodes.find((node) => node.name === "Missiles" && !node.isCounterNode);
  if (russiaOpeningMissileTech) {
    russiaOpeningMissileTech.achievedBy.russia = true;
  }

  return {
    techNodes,
    edges,
    branchOrder,
    branchMetrics,
    conditions: Array.from(conditionMap.values()).sort((left, right) => left.label.localeCompare(right.label))
  };
}

function getNodeMap() {
  return new Map(state.techNodes.map((node) => [node.id, node]));
}

function getActivePlayer() {
  return state.players[state.activePlayerId];
}

function hasPlayerAchievedNode(node, playerId) {
  return Boolean(node.achievedBy?.[playerId]);
}

function getPlayerNodeStatus(node, playerId, nodeMap = getNodeMap()) {
  if (hasPlayerAchievedNode(node, playerId)) {
    return "unlocked";
  }

  return canResearchNode(node, playerId, nodeMap) ? "available" : "locked";
}

function getNodeDisplayStatus(node, nodeMap = getNodeMap()) {
  return getPlayerNodeStatus(node, state.activePlayerId, nodeMap);
}

function formatPlayerAchievementLabel(node) {
  const achievedPlayers = Object.keys(PLAYER_STYLES).filter((playerId) => hasPlayerAchievedNode(node, playerId));

  if (!achievedPlayers.length) {
    return "None";
  }

  return achievedPlayers.map((playerId) => PLAYER_STYLES[playerId].label).join(", ");
}

function displayNodeName(node) {
  return `* ${node.name}`;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = frame.clientWidth;
  const height = frame.clientHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (state.panX === 0 && state.panY === 0) {
    resetView();
  } else {
    draw();
  }
}

function resetView() {
  state.zoom = 1;
  state.panX = Math.max(120, frame.clientWidth * 0.12);
  state.panY = 110;
  draw();
}

function worldToScreen(x, y) {
  return {
    x: x * state.zoom + state.panX,
    y: y * state.zoom + state.panY
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - state.panX) / state.zoom,
    y: (y - state.panY) / state.zoom
  };
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function findNodeAtPosition(position) {
  const world = screenToWorld(position.x, position.y);

  for (let index = state.techNodes.length - 1; index >= 0; index -= 1) {
    const node = state.techNodes[index];
    const left = node.x - NODE_WIDTH / 2;
    const top = node.y - NODE_HEIGHT / 2;

    if (
      world.x >= left &&
      world.x <= left + NODE_WIDTH &&
      world.y >= top &&
      world.y <= top + NODE_HEIGHT
    ) {
      return node;
    }
  }

  return null;
}

function drawBackgroundAccent() {
  const gradient = context.createLinearGradient(0, 0, 0, frame.clientHeight);
  gradient.addColorStop(0, "rgba(53, 111, 180, 0.16)");
  gradient.addColorStop(1, "rgba(8, 16, 28, 0.04)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, frame.clientWidth, frame.clientHeight);
}

function drawBranchLanes() {
  state.branchOrder.forEach((branch) => {
    const metric = state.branchMetrics.get(branch);
    const top = worldToScreen(metric.centerX - metric.laneWidth / 2, -120);
    const bottom = worldToScreen(metric.centerX - metric.laneWidth / 2, 7 * LEVEL_SPACING + 100);
    const laneWidth = metric.laneWidth * state.zoom;

    context.save();
    context.fillStyle = "rgba(212, 222, 234, 0.08)";
    context.strokeStyle = "rgba(212, 222, 234, 0.08)";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(top.x, top.y, laneWidth, bottom.y - top.y, 22 * state.zoom);
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(212, 222, 234, 0.76)";
    context.font = `${Math.max(13, 16 * state.zoom)}px Rajdhani`;
    context.textAlign = "center";
    context.fillText(branch, top.x + laneWidth / 2, top.y + 30 * state.zoom);
    context.restore();
  });
}

function drawEdges() {
  const nodeMap = getNodeMap();

  context.save();
  context.lineWidth = 3;
  context.lineCap = "round";

  state.edges.forEach(([fromId, toId]) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    const start = worldToScreen(from.x, from.y + NODE_HEIGHT / 2 - 6);
    const end = worldToScreen(to.x, to.y - NODE_HEIGHT / 2 + 6);
    const middleY = (start.y + end.y) / 2;
    const edgeColor = STATUS_STYLES[getPlayerNodeStatus(to, state.activePlayerId, nodeMap)].edge;

    context.beginPath();
    context.strokeStyle = edgeColor;
    context.moveTo(start.x, start.y);
    context.bezierCurveTo(start.x, middleY, end.x, middleY, end.x, end.y);
    context.stroke();
  });

  context.restore();
}

function drawPlayerFlag(left, top, width, height, playerId) {
  const playerStyle = PLAYER_STYLES[playerId];
  if (!playerStyle) {
    return;
  }

  context.save();
  context.fillStyle = playerStyle.fill;
  context.fillRect(left, top, width, height);
  context.strokeStyle = "rgba(255,255,255,0.45)";
  context.lineWidth = 1;
  context.strokeRect(left, top, width, height);

  context.fillStyle = playerStyle.stripe;
  context.fillRect(left, top, width, height / 2);

  context.fillStyle = playerStyle.text;
  context.font = `${Math.max(7, 8 * state.zoom)}px Rajdhani`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(playerStyle.key, left + width / 2, top + height / 2 + 0.5 * state.zoom);
  context.restore();
}

function drawNode(node) {
  const nodeMap = getNodeMap();
  const screen = worldToScreen(node.x, node.y);
  const width = NODE_WIDTH * state.zoom;
  const height = NODE_HEIGHT * state.zoom;
  const left = screen.x - width / 2;
  const top = screen.y - height / 2;
  const radius = 18 * state.zoom;
  const statusStyle = STATUS_STYLES[getPlayerNodeStatus(node, state.activePlayerId, nodeMap)];
  const branchColor = BRANCH_COLORS[node.branch] || "#356fb4";
  const isSelected = node.id === state.selectedNodeId;

  context.save();
  context.beginPath();
  context.moveTo(left + radius, top);
  context.arcTo(left + width, top, left + width, top + height, radius);
  context.arcTo(left + width, top + height, left, top + height, radius);
  context.arcTo(left, top + height, left, top, radius);
  context.arcTo(left, top, left + width, top, radius);
  context.closePath();

  context.fillStyle = statusStyle.fill;
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = 24;
  context.shadowOffsetY = 8;
  context.fill();

  context.shadowColor = "transparent";
  context.lineWidth = Math.max(1.5, state.zoom * (isSelected ? 3 : 1.5));
  context.strokeStyle = isSelected ? "rgba(255,255,255,0.78)" : statusStyle.border;
  context.stroke();

  context.fillStyle = branchColor;
  context.fillRect(left, top, width, Math.max(8, 10 * state.zoom));

  const nodeTextColor = node.level >= 2 ? "rgba(212, 222, 234, 0.52)" : "#f5f7fb";
  context.fillStyle = nodeTextColor;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `${Math.max(12, 15 * state.zoom)}px Rajdhani`;
  wrapText(displayNodeName(node), left + 16 * state.zoom, top + 34 * state.zoom, width - 32 * state.zoom, 17 * state.zoom, 2);

  const achievedPlayers = Object.keys(PLAYER_STYLES).filter((playerId) => hasPlayerAchievedNode(node, playerId));
  const flagWidth = 22 * state.zoom;
  const flagHeight = 14 * state.zoom;
  const flagGap = 6 * state.zoom;
  let flagLeft = left + 16 * state.zoom;
  const flagTop = top + height - flagHeight - 14 * state.zoom;

  achievedPlayers.forEach((playerId) => {
    drawPlayerFlag(flagLeft, flagTop, flagWidth, flagHeight, playerId);
    flagLeft += flagWidth + flagGap;
  });

  const chipText = node.fixedStatus ? "START" : `${node.researchCost} RP`;
  const chipWidth = context.measureText(chipText).width + 16 * state.zoom;
  const chipHeight = 18 * state.zoom;
  const chipLeft = left + width - chipWidth - 12 * state.zoom;
  const chipTop = top + height - chipHeight - 12 * state.zoom;

  context.fillStyle = "rgba(212, 222, 234, 0.12)";
  context.beginPath();
  context.roundRect(chipLeft, chipTop, chipWidth, chipHeight, 10 * state.zoom);
  context.fill();
  context.fillStyle = "#f5f7fb";
  context.font = `${Math.max(9, 10 * state.zoom)}px Rajdhani`;
  context.fillText(chipText, chipLeft + 8 * state.zoom, chipTop + 13 * state.zoom);
  context.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const isFinalVisibleLine = index === maxLines - 1 && lines.length > maxLines;
    const output = isFinalVisibleLine ? `${line.replace(/[.,;:]?$/, "")}...` : line;
    context.fillText(output, x, y + index * lineHeight);
  });
}

function drawLegend() {
  context.save();
  context.fillStyle = "rgba(212, 222, 234, 0.72)";
  context.font = "14px Rajdhani";
  context.textAlign = "left";
  context.restore();
}

function draw() {
  context.clearRect(0, 0, frame.clientWidth, frame.clientHeight);
  drawBackgroundAccent();
  drawBranchLanes();
  drawEdges();
  state.techNodes.forEach(drawNode);
  drawLegend();
}

function updateBudgetDisplay() {
  const activePlayer = getActivePlayer();
  const totalBudget = effectiveResearchBudget(state.activePlayerId);
  budgetValue.textContent = `${totalBudget - activePlayer.researchSpent} / ${totalBudget} RP`;
}

function syncConditionState() {
  const enabledConditions = new Map(state.conditions.map((condition) => [condition.key, condition.enabled]));

  state.techNodes.forEach((node) => {
    if (!node.conditionalRequirement) {
      return;
    }

    node.conditionMet = Boolean(enabledConditions.get(node.conditionKey));
  });
}

function canResearchNode(node, playerId, nodeMap) {
  if (node.fixedStatus || hasPlayerAchievedNode(node, playerId)) {
    return false;
  }

  if (node.previousTierGroupId) {
    const previousTierUnlocked = state.techNodes.some(
      (candidate) => candidate.tierGroupId === node.previousTierGroupId && hasPlayerAchievedNode(candidate, playerId)
    );
    if (!previousTierUnlocked) {
      return false;
    }
  }

  if (node.sourceNodeId) {
    const sourceNode = nodeMap.get(node.sourceNodeId);
    if (!sourceNode || !hasPlayerAchievedNode(sourceNode, playerId)) {
      return false;
    }
  }

  if (node.conditionalRequirement && !node.conditionMet) {
    return false;
  }

  return true;
}

function hasUnlockedDescendant(node, playerId) {
  const siblingAnchors = state.techNodes.filter(
    (candidate) => candidate.tierGroupId === node.tierGroupId && candidate.id !== node.id && hasPlayerAchievedNode(candidate, playerId)
  );
  const nextTierDependsOnTier = state.techNodes.some(
    (candidate) => candidate.previousTierGroupId === node.tierGroupId && hasPlayerAchievedNode(candidate, playerId)
  );
  const unlockedCounterDependsOnNode = state.techNodes.some(
    (candidate) => candidate.sourceNodeId === node.id && hasPlayerAchievedNode(candidate, playerId)
  );

  if (unlockedCounterDependsOnNode) {
    return true;
  }

  if (nextTierDependsOnTier && siblingAnchors.length === 0) {
    return true;
  }

  return false;
}

function syncNodeAvailability() {
  draw();
}

function renderConditionList() {
  if (!conditionList) {
    return;
  }
  if (!state.conditions.length) {
    conditionList.innerHTML = "<p class=\"detail-copy\">No conditional requirements found.</p>";
    return;
  }

  conditionList.innerHTML = "";

  state.conditions.forEach((condition) => {
    const label = document.createElement("label");
    label.className = "condition-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = condition.enabled;
    input.dataset.conditionKey = condition.key;

    const content = document.createElement("span");

    const name = document.createElement("span");
    name.className = "condition-name";
    name.textContent = condition.label;

    const stateLabel = document.createElement("span");
    stateLabel.className = "condition-state";
    stateLabel.textContent = condition.enabled ? "Enabled" : "Disabled";

    content.append(name, stateLabel);
    label.append(input, content);
    conditionList.append(label);
  });
}

function renderStatusEffects() {
  const activePlayerId = state.activePlayerId;
  const activeEffects = state.techNodes.filter(
    (node) => !node.isCounterNode && hasPlayerAchievedNode(node, activePlayerId) && node.sideEffect && node.sideEffect !== "-"
  );

  if (!activeEffects.length) {
    statusEffectList.innerHTML = "<p class=\"detail-copy\">No active consequences.</p>";
    return;
  }

  statusEffectList.innerHTML = "";

  activeEffects.forEach((node) => {
    const item = document.createElement("div");
    item.className = "status-effect-item";

    const title = document.createElement("strong");
    title.textContent = displayNodeName(node);

    const copy = document.createElement("span");
    copy.textContent = node.sideEffect;

    item.append(title, copy);
    statusEffectList.append(item);
  });
}

function updateDetailPanel(node) {
  const nodeMap = getNodeMap();
  const activePlayerId = state.activePlayerId;
  const activePlayerLabel = PLAYER_STYLES[activePlayerId].label;

  if (!node) {
    detailTitle.textContent = "No technology selected";
    detailBranch.textContent = "Select a node from the tree.";
    detailRequirement.textContent = "-";
    detailType.textContent = "-";
    detailLevel.textContent = "-";
    detailStatus.textContent = "-";
    detailCost.textContent = "-";
    detailEffect.textContent = "-";
    detailCounter.textContent = "-";
    return;
  }

  detailTitle.textContent = displayNodeName(node);
  detailBranch.textContent = `${node.branch} branch`;
  detailType.textContent = node.nodeType;
  detailLevel.textContent = String(node.level);
  const playerStatus = getPlayerNodeStatus(node, activePlayerId, nodeMap);
  detailStatus.textContent = node.fixedStatus
    ? `${playerStatus[0].toUpperCase() + playerStatus.slice(1)} for ${activePlayerLabel} (fixed)`
    : `${playerStatus[0].toUpperCase() + playerStatus.slice(1)} for ${activePlayerLabel}`;
  detailCost.textContent = node.conditionalRequirement && !node.conditionMet
    ? `${getCostLabel(node)} after the condition is met`
    : getCostLabel(node);
  detailEffect.textContent = node.effect;
  detailCounter.textContent = node.counter === "-" ? "No direct counter listed." : node.counter;

  if (node.fixedStatus) {
    detailRequirement.textContent = `Requirement: Start of game. Already achieved by ${formatPlayerAchievementLabel(node)}.`;
    return;
  }

  if (node.previousTierGroupId) {
    const previousTierNodes = state.techNodes.filter((candidate) => candidate.tierGroupId === node.previousTierGroupId);
    const previousTierUnlocked = previousTierNodes.some((candidate) => hasPlayerAchievedNode(candidate, activePlayerId));

    if (!previousTierUnlocked) {
      detailRequirement.textContent = `Previous tier required: ${activePlayerLabel} must achieve at least one level ${node.level - 1} technology in ${node.branch} first.`;
      return;
    }
  }

  if (node.sourceNodeId) {
    const sourceNode = nodeMap.get(node.sourceNodeId);
    if (sourceNode && !hasPlayerAchievedNode(sourceNode, activePlayerId)) {
      detailRequirement.textContent = `Unlock source required: ${activePlayerLabel} must achieve ${displayNodeName(sourceNode)} before ${displayNodeName(node)} becomes available.`;
      return;
    }
  }

  if (node.conditionalRequirement && !node.conditionMet) {
    detailRequirement.textContent = `Condition not met yet: ${node.requirement}. This tech cannot be researched until that happens.`;
    return;
  }

  if (node.conditionalRequirement && node.conditionMet) {
    detailRequirement.textContent = `Condition met: ${node.requirement}. This tech can now be researched.`;
    return;
  }

  if (hasPlayerAchievedNode(node, activePlayerId) && hasUnlockedDescendant(node, activePlayerId)) {
    detailRequirement.textContent = `This tech is anchoring a higher researched tier for ${activePlayerLabel} and cannot be removed right now.`;
    return;
  }

  detailRequirement.textContent = `Requirement: ${node.requirement}. ${activePlayerLabel} can achieve this tech now.`;
}

function cycleNodeStatus(node) {
  const nodeMap = getNodeMap();
  const activePlayerId = state.activePlayerId;
  const activePlayer = getActivePlayer();

  if (node.fixedStatus) {
    return;
  }

  if (!canResearchNode(node, activePlayerId, nodeMap) && !hasPlayerAchievedNode(node, activePlayerId)) {
    return;
  }

  if (node.researchCost !== null) {
    if (!hasPlayerAchievedNode(node, activePlayerId) && activePlayer.researchSpent + node.researchCost <= effectiveResearchBudget(activePlayerId)) {
      node.achievedBy[activePlayerId] = true;
      activePlayer.researchSpent += node.researchCost;
      syncNodeAvailability();
      updateBudgetDisplay();
      renderStatusEffects();
      return;
    }

    if (hasPlayerAchievedNode(node, activePlayerId)) {
      if (hasUnlockedDescendant(node, activePlayerId)) {
        return;
      }

      node.achievedBy[activePlayerId] = false;
      activePlayer.researchSpent -= node.researchCost;
      syncNodeAvailability();
      updateBudgetDisplay();
      renderStatusEffects();
      return;
    }

    return;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  const position = getPointerPosition(event);
  const selectedNode = findNodeAtPosition(position);
  state.lastPointerX = position.x;
  state.lastPointerY = position.y;

  if (selectedNode) {
    if (state.selectedNodeId === selectedNode.id) {
      cycleNodeStatus(selectedNode);
    } else {
      state.selectedNodeId = selectedNode.id;
    }
    updateDetailPanel(selectedNode);
    draw();
  } else {
    state.isPanning = true;
  }

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.isPanning) {
    return;
  }

  const position = getPointerPosition(event);
  state.panX += position.x - state.lastPointerX;
  state.panY += position.y - state.lastPointerY;
  state.lastPointerX = position.x;
  state.lastPointerY = position.y;
  draw();
});

function clearPointerState(event) {
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  state.isPanning = false;
}

canvas.addEventListener("pointerup", clearPointerState);
canvas.addEventListener("pointercancel", clearPointerState);

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();

  const pointer = getPointerPosition(event);
  const beforeZoom = screenToWorld(pointer.x, pointer.y);
  const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
  const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom * zoomFactor));

  state.zoom = nextZoom;
  state.panX = pointer.x - beforeZoom.x * state.zoom;
  state.panY = pointer.y - beforeZoom.y * state.zoom;
  draw();
}, { passive: false });

resetViewButton.addEventListener("click", resetView);

window.addEventListener("resize", resizeCanvas);
window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || message.type !== "dw-tech-tree-player" || !state.players[message.playerId]) {
    return;
  }

  state.activePlayerId = message.playerId;
  if (message.researchBonuses && typeof message.researchBonuses === "object") {
    for (const playerId of Object.keys(state.players)) {
      const nextBonus = Number(message.researchBonuses[playerId]);
      state.players[playerId].researchBonus = Number.isFinite(nextBonus) ? nextBonus : 0;
    }
  }
  updateBudgetDisplay();
  renderStatusEffects();
  updateDetailPanel(state.techNodes.find((node) => node.id === state.selectedNodeId) ?? null);
  draw();
});

if (conditionList) {
  conditionList.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }

    const condition = state.conditions.find((entry) => entry.key === target.dataset.conditionKey);
    if (!condition) {
      return;
    }

    condition.enabled = target.checked;
    syncConditionState();
    syncNodeAvailability();
    renderConditionList();

    const selectedNode = state.techNodes.find((node) => node.id === state.selectedNodeId) ?? null;
    updateDetailPanel(selectedNode);
    draw();
  });
}

async function loadTechTree() {
  try {
    const response = await fetch("techtree.md");
    if (!response.ok) {
      throw new Error(`Failed to load techtree.md: ${response.status}`);
    }

    return response.text();
  } catch (error) {
    return FALLBACK_TECHTREE;
  }
}

async function initialize() {
  const markdownTable = await loadTechTree();
  const parsed = parseTechTree(markdownTable);
  state.techNodes = parsed.techNodes;
  state.edges = parsed.edges;
  state.branchOrder = parsed.branchOrder;
  state.branchMetrics = parsed.branchMetrics;
  state.conditions = parsed.conditions;
  syncConditionState();
  syncNodeAvailability();
  renderConditionList();
  renderStatusEffects();
  state.selectedNodeId = state.techNodes[0]?.id ?? null;
  updateBudgetDisplay();
  updateDetailPanel(state.techNodes[0] ?? null);
  resizeCanvas();
}

initialize();
