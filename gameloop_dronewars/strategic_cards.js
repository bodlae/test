"use strict";

(function registerDroneWarsStrategicCards() {
  const PLAYERS = {
    russia: "Russia",
    ukraine: "Ukraine",
  };

  window.DW_STRATEGIC_CARDS = {
    maxHandSize: 5,
    maxPlays: 3,
    definitions: {
      research: {
        id: "research",
        name: "Research Card",
        effectText: "Gain 1 Research Point.",
        icon: "assets/cards/research.png",
      },
      rocket: {
        id: "rocket",
        name: "Rocket Card",
        effectText: "Launch 1 Generation 1 rocket strike.",
        icon: "assets/cards/rocket.png",
      },
      production: {
        id: "production",
        name: "Production Card",
        effectText: "Produce 1 Tank Unit.",
        icon: "assets/cards/production.png",
      },
      propaganda: {
        id: "propaganda",
        name: "Propaganda Card",
        effectText: "Increase Global Support by +1.",
        icon: "assets/cards/propaganda.png",
      },
      captureHostomel: {
        id: "captureHostomel",
        name: "Capture Hostomel Card",
        effectText: "Attempt airborne seizure of Hostomel Airport near Kyiv.",
        icon: "assets/cards/capture_hostomel.png",
        playOnce: true,
      },
      azovstalFortress: {
        id: "azovstalFortress",
        name: "Azovstal Fortress Card",
        effectText: "Activate fortress defense in Mariupol for the next battle turn.",
        icon: "assets/cards/azovstal_fortress.png",
        playOnce: true,
      },
      pripetMarshes: {
        id: "pripetMarshes",
        name: "Pripet Marshes Card",
        effectText: "Apply Pripet Marshes penalties to Russian forces for the next battle turn.",
        icon: "assets/cards/pripet_marshes.png",
        playOnce: true,
      },
      massiveSanctions: {
        id: "massiveSanctions",
        name: "Massive Sanctions",
        effectText: "Remove 1 Production Card from Russia's strategic deck pool.",
        playOnce: true,
      },
      stingers: {
        id: "stingers",
        name: "Stingers!",
        effectText: "Enemy air units suffer -1 combat strength this turn.",
        playOnce: true,
      },
      javelins: {
        id: "javelins",
        name: "Javelins!",
        effectText: "Destroy 1 enemy tank unit in a region where Ukrainian infantry is present.",
        playOnce: true,
      },
      militaryInfrastructureDestroyed: {
        id: "militaryInfrastructureDestroyed",
        name: "Military Infrastructure Destroyed",
        effectText: "Russian air units gain +1 combat strength this turn.",
        playOnce: true,
      },
      precisionStrikeArsenal: {
        id: "precisionStrikeArsenal",
        name: "Precision Strike Arsenal",
        effectText: "Launch 2 Generation 1 rocket attacks.",
        playOnce: true,
      },
      blackSeaBlockade: {
        id: "blackSeaBlockade",
        name: "Black Sea Blockade",
        effectText: "Remove 1 Production Card from Ukraine's strategic deck pool.",
        playOnce: true,
      },
      himars: {
        id: "himars",
        name: "HIMARS",
        effectText: "Launch 2 rocket attacks.",
        playOnce: true,
      },
      westernTraining: {
        id: "westernTraining",
        name: "Western Training",
        effectText: "Add 1 Research Card to the pool.",
        playOnce: true,
      },
      blackSeaGrainDeal: {
        id: "blackSeaGrainDeal",
        name: "Black Sea Grain Deal",
        effectText: "This card remains in Ukraine's strategy card pool after being played. Ukraine gains 1 Production Card.",
      },
      patriotBatteries: {
        id: "patriotBatteries",
        name: "Patriot Batteries",
        effectText: "Remove 1 Rocket Card from Russia's strategy card pool.",
        playOnce: true,
      },
      leopardTanks: {
        id: "leopardTanks",
        name: "Leopard Tanks",
        effectText: "Spawn 1 Tank Unit in the capital.",
        playOnce: true,
      },
      economicBlitzkriegRepelled: {
        id: "economicBlitzkriegRepelled",
        name: "Economic Blitzkrieg Repelled",
        effectText: "Add 1 Production Card to Russia's strategy card pool.",
        playOnce: true,
      },
      geran2StrikeDrones: {
        id: "geran2StrikeDrones",
        name: "Geran-2 Strike Drones",
        effectText: "Add 1 Rocket Card to Russia's strategy card pool.",
        playOnce: true,
      },
      surovikinLine: {
        id: "surovikinLine",
        name: "Surovikin Line",
        effectText: "Spawn 2 fortress units in Russian-controlled frontline regions.",
        playOnce: true,
      },
      warEconomy: {
        id: "warEconomy",
        name: "War Economy",
        effectText: "Add 1 Production Card to Russia's strategy card pool.",
        playOnce: true,
      },
    },
    startingDecks: {
      [PLAYERS.russia]: [
        "research",
        "research",
        "rocket",
        "rocket",
        "rocket",
        "production",
        "production",
        "propaganda",
        "propaganda",
        "captureHostomel",
      ],
      [PLAYERS.ukraine]: [
        "research",
        "research",
        "production",
        "production",
        "propaganda",
        "propaganda",
        "propaganda",
        "propaganda",
        "azovstalFortress",
        "pripetMarshes",
      ],
    },
    geopoliticalPools: {
      [PLAYERS.russia]: [
        "militaryInfrastructureDestroyed",
        "precisionStrikeArsenal",
        "blackSeaBlockade",
      ],
      [PLAYERS.ukraine]: [
        "massiveSanctions",
        "stingers",
        "javelins",
      ],
    },
    geopoliticalPoolSchedule: [
      { id: "geo-rus-2022-spring-economic-blitzkrieg-repelled", player: PLAYERS.russia, year: 2022, season: "Spring", cardId: "economicBlitzkriegRepelled" },
      { id: "geo-rus-2022-summer-geran2", player: PLAYERS.russia, year: 2022, season: "Summer", cardId: "geran2StrikeDrones" },
      { id: "geo-rus-2022-fall-surovikin-line", player: PLAYERS.russia, year: 2022, season: "Fall", cardId: "surovikinLine" },
      { id: "geo-rus-2023-winter-war-economy", player: PLAYERS.russia, year: 2023, season: "Winter", cardId: "warEconomy" },
      { id: "geo-ukr-2022-spring-himars", player: PLAYERS.ukraine, year: 2022, season: "Spring", cardId: "himars" },
      { id: "geo-ukr-2022-summer-western-training", player: PLAYERS.ukraine, year: 2022, season: "Summer", cardId: "westernTraining" },
      { id: "geo-ukr-2022-fall-grain-deal", player: PLAYERS.ukraine, year: 2022, season: "Fall", cardId: "blackSeaGrainDeal" },
      { id: "geo-ukr-2023-winter-patriot", player: PLAYERS.ukraine, year: 2023, season: "Winter", cardId: "patriotBatteries" },
      { id: "geo-ukr-2023-spring-leopard", player: PLAYERS.ukraine, year: 2023, season: "Spring", cardId: "leopardTanks" },
    ],
  };
})();
