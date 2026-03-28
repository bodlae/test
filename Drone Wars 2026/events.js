"use strict";

(function registerDroneWarsEvents() {
  const PLAYERS = {
    russia: "Russia",
    ukraine: "Ukraine",
  };

  const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
  const START_YEAR = 2022;
  const END_YEAR = 2025;

  function buildTriggerKey(trigger) {
    return [
      trigger.year,
      trigger.season,
      trigger.phase,
      trigger.actorStep,
      trigger.activePlayer,
      trigger.campaignTurn,
    ].join("|");
  }

  function makeTemplateEvent(year, season, activePlayer, actorStep) {
    return {
      id: `template-${year}-${season.toLowerCase()}-${activePlayer.toLowerCase()}`,
      template: true,
      title: `${season} ${year} Situation Update`,
      blurb: `${activePlayer} operational planning update for ${season} ${year}. Replace this template with a narrative event.`,
      effect: "Template event: no gameplay effect.",
      trigger: {
        year,
        season,
        phase: "strategic",
        actorStep,
        activePlayer,
      },
    };
  }

  const realEvents = [
    {
      id: "turn1-russia-special-operation",
      template: false,
      title: "Special Operation",
      icon: "assets/events/russia/russia_icon_01.png",
      blurb:
        "By order of the Supreme Commander-in-Chief, your exercise transitions into a special military operation. Your objectives are the demilitarization and denazification of Ukraine. Your forces will strike Ukrainian military infrastructure and secure key cities. Ukrainian resistance is expected to collapse quickly under decisive action.",
      effect: "Movement speed on the first battle turn of winter is not reduced by winter conditions.",
      trigger: {
        campaignTurn: 1,
        year: 2022,
        season: "Winter",
        phase: "strategic",
        actorStep: 0,
        activePlayer: PLAYERS.russia,
      },
    },
    {
      id: "turn1-ukraine-we-are-here",
      template: false,
      title: "We Are Here",
      icon: "assets/events/ukraine/we_are_here.png",
      blurb:
        "Russia has launched a full-scale invasion of Ukraine. We are here. We are not putting down our arms. We will defend our country and our independence. The enemy expects our collapse-but Ukraine will resist.",
      effect:
        "Nationwide mobilization begins. Ukraine immediately unlocks Mobilization Tier 1. Territorial Defense units form across the country: spawn 1 Territorial Defense unit in each Ukrainian-controlled city. Ukrainian replacement rate is increased for the first strategic turn.",
      trigger: {
        campaignTurn: 1,
        year: 2022,
        season: "Winter",
        phase: "strategic",
        actorStep: 1,
        activePlayer: PLAYERS.ukraine,
      },
    },
    {
      id: "russia-2022-spring-water-to-crimea",
      template: false,
      title: "Water to Crimea",
      icon: "assets/events/russia/russia_icon_02.png",
      blurb:
        "Russian forces reopen the North Crimean Canal, restoring water to Crimea for the first time since 2014.",
      effect: "Spawn 1 Russian infantry unit in Crimea and 1 Russian infantry unit in the Kherson region.",
      trigger: {
        year: 2022,
        season: "Spring",
        phase: "strategic",
        activePlayer: PLAYERS.russia,
      },
    },
    {
      id: "russia-2022-summer-annexation-referendums",
      template: false,
      title: "Annexation Referendums",
      icon: "assets/events/russia/russia_icon_03.png",
      blurb:
        "Referendums are held in occupied regions and treaties are signed for accession to the Russian Federation.",
      effect:
        "Russian-controlled cities in Donetsk, Luhansk, Kherson, and Zaporizhzhia spawn 1 Russian infantry unit.",
      trigger: {
        year: 2022,
        season: "Summer",
        phase: "strategic",
        activePlayer: PLAYERS.russia,
      },
    },
    {
      id: "russia-2022-fall-precision-strikes",
      template: false,
      title: "Precision Strikes",
      icon: "assets/events/russia/russia_icon_06.png",
      blurb:
        "Russian forces conduct precision strikes against Ukraine's energy and military infrastructure.",
      effect: "Launch 3 Generation 1 rocket attacks.",
      trigger: {
        year: 2022,
        season: "Fall",
        phase: "strategic",
        activePlayer: PLAYERS.russia,
      },
    },
    {
      id: "russia-2023-winter-wagner-assault-groups",
      template: false,
      title: "Wagner Assault Groups",
      icon: "assets/events/russia/russia_icon_05.png",
      blurb:
        "Wagner assault groups lead the offensive around Bakhmut, conducting relentless attacks against Ukrainian defenses.",
      effect: "Spawn 3 Russian infantry units in the Donetsk region.",
      trigger: {
        year: 2023,
        season: "Winter",
        phase: "strategic",
        activePlayer: PLAYERS.russia,
      },
    },
    {
      id: "ukraine-2022-spring-bucha",
      template: false,
      title: "Bucha",
      icon: "assets/events/ukraine/bucha.png",
      blurb:
        "After Russian forces withdraw from the Kyiv region, evidence of atrocities in Bucha shocks the world.",
      effect: "Increase Global Support by 3.",
      trigger: {
        year: 2022,
        season: "Spring",
        phase: "strategic",
        activePlayer: PLAYERS.ukraine,
      },
    },
    {
      id: "ukraine-2022-summer-kherson-feint",
      template: false,
      title: "Kherson Feint",
      icon: "assets/events/ukraine/kherson_feint.png",
      blurb:
        "Ukraine signals a major offensive in the south, drawing Russian forces away from other sectors of the front.",
      effect: "Move up to 2 Russian units to Russian-controlled regions in the Kherson theater.",
      trigger: {
        year: 2022,
        season: "Summer",
        phase: "strategic",
        activePlayer: PLAYERS.ukraine,
      },
    },
    {
      id: "ukraine-2022-fall-dnipro-bridges",
      template: false,
      title: "Dnipro Bridges",
      icon: "assets/events/ukraine/dnipro_bridges.png",
      blurb:
        "HIMARS strikes damage bridges across the Dnipro, isolating Russian forces west of the river.",
      effect: "At the end of the next battle turn, destroy up to 2 Russian units west of the Dnipro.",
      trigger: {
        year: 2022,
        season: "Fall",
        phase: "strategic",
        activePlayer: PLAYERS.ukraine,
      },
    },
    {
      id: "ukraine-2023-winter-fortress-bakhmut",
      template: false,
      title: "Fortress Bakhmut",
      icon: "assets/events/ukraine/fortress_bakhmut.png",
      blurb:
        "Ukrainian forces defend Bakhmut, forcing Russian assault units into costly urban fighting.",
      effect: "Any attack on the Bakhmut region this quarter suffers at least 1 casualty.",
      trigger: {
        year: 2023,
        season: "Winter",
        phase: "strategic",
        activePlayer: PLAYERS.ukraine,
      },
    },
  ];

  const realTriggerKeys = new Set(realEvents.map((eventDef) => buildTriggerKey(eventDef.trigger)));
  const templateEvents = [];
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    for (const season of SEASONS) {
      for (const def of [
        { activePlayer: PLAYERS.russia, actorStep: 0 },
        { activePlayer: PLAYERS.ukraine, actorStep: 1 },
      ]) {
        const candidate = makeTemplateEvent(year, season, def.activePlayer, def.actorStep);
        if (!realTriggerKeys.has(buildTriggerKey(candidate.trigger))) {
          templateEvents.push(candidate);
        }
      }
    }
  }

  window.DW_EVENT_DEFINITIONS = [...realEvents, ...templateEvents];
})();
