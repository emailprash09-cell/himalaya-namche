// M2 body-at-altitude tuning: every number of the model in docs/BODY_MODEL.md, nothing else.
// Rates are per REAL second unless the name says GameHour or GameDay (orchestrator decision: body rates
// in real seconds as the brief states them; hydration, food and acclimatisation on game time).
// "§4" etc. point at docs/MISSION.md. The equations that use these are in docs/BODY_MODEL.md §3.
// This is a game model. None of it is medical advice (brief §4 "don't present any of it as medical advice").

/** Levels 0..4 of acclimatisation index these tuples. */
export type PerLevel = readonly [number, number, number, number, number];

export const BODY = {
  /** Shared constants of the step. */
  step: {
    /** The main loop's fixed step (client/src/main.ts FIXED_DT). The sim accepts any dt up to maxDtS. */
    fixedDtS: 1 / 60,
    maxDtS: 0.25,
    /** Below this ground speed (game m/s) the player counts as standing still. */
    idleBelowMps: 0.3,
    /** Smoothing of the feet's vertical speed: stair autostep makes it spiky (§10 "Stairs ... cost more"). */
    climbTauS: 3,
    /** Smoothing of the real ascent rate for "going up the ridge too fast on your first day" (§4). */
    ascentTauS: 60,
    /** HUD trend arrows: smoothing of each bar's rate of change (§13 "small arrows show ... rising or falling"). */
    trendTauS: 0.75,
    /** Real-time scale used to turn real seconds into game seconds; must equal CLOCK.gameSecondsPerRealSecond. */
    gameSecondsPerRealSecond: 24,
  },

  /** OXYGEN, shown as SpO2 %. §4 "OXYGEN bar (blood oxygen, shown as SpO2 %)". */
  spo2: {
    min: 60,
    max: 100,
    /** §4 "about 90% at rest at Namche (unacclimatized)"; §1/orchestrator: town reads about 3,440 m. */
    restAtRef: 90,
    refAltM: 3440,
    /** Resting value rises 1 % per 150 m lower and falls 1 % per 150 m higher (game choice, gentle). */
    restPerM: 1 / 150,
    restMin: 85,
    restMax: 97,
    /** §4 "Each level raises resting SpO2 (90 → up to 94%)". Added to the rest value per level. */
    acclimRestBonus: [0, 1, 2, 3, 4] as PerLevel,
    /** §4 "Walking −1 to −2%, jogging −4%": target drop below rest for each gait. */
    drop: { idle: 0, sitting: 0, lying: 0, forced: 0, walk: 1.5, jog: 4.0 },
    /** §4 "climbing stairs make it drop faster": extra drop per game m/s of upward speed, capped. */
    climbDropPerMps: 4.0,
    climbDropMax: 3.0,
    /** §4 "sprinting drops it steadily (about −1% per 2 s)": a steady fall towards a low target. */
    sprintTarget: 60,
    sprintFallPerS: 0.5,
    /** Sprinting uphill falls faster: × (1 + k × climb m/s), capped. */
    sprintFallClimbK: 0.5,
    sprintFallMaxPerS: 1.0,
    /** Every other fall relaxes towards the target, at most this fast. */
    fallK: 1 / 12,
    fallMaxPerS: 0.5,
    /** §4 "recovers toward the resting value when you slow down, stop or sit (faster when sitting or
     *  resting in a lodge)". Relaxation constants per second; lodge rest is instant (STUBS.lodge). */
    riseK: { walk: 1 / 30, jog: 1 / 30, idle: 1 / 20, forced: 1 / 20, sitting: 1 / 12, lying: 1 / 10 },
    riseMaxPerS: 1.2,
    /** §4 "speeds up recovery": rise constants × (1 + this × level). */
    acclimRisePerLevel: 0.1,
    /** §4 thresholds. 85: edges darken, loud breathing. 80: tunnel vision, muffled, slower turning.
     *  75 for more than 5 s: collapse. */
    darkenBelow: 85,
    tunnelBelow: 80,
    collapseBelow: 75,
    collapseAfterS: 5,
  },

  /** STAMINA, short-term energy, 0..100. §4 "sprinting, jumping and carrying use it". */
  stamina: {
    max: 100,
    /** Cost per second of each gait. Sprint empties a full bar in 25 s. */
    cost: { walk: 0, jog: 0.8, sprint: 4.0 },
    /** One jump. */
    jumpCost: 8,
    /** §10 "Stairs and steep paths cost more stamina": per game m/s of upward speed, while moving. */
    climbPerMps: 6,
    /** §4/§10: carrying. Per kg per second, moving and standing. */
    carryPerKgMoving: 0.08,
    carryPerKgStanding: 0.02,
    /** Sea-level recovery per second. §4 "walking slowly or resting recovers it". */
    recoverySeaLevel: { walk: 3, idle: 6, forced: 6, sitting: 9, lying: 10 },
    /** §4 "Recovery is ~15% slower than at sea level": × (1 − 0.15 × altitude / 3,440 m), clamped. */
    altitudeSlowdownAtRef: 0.15,
    altitudeRefM: 3440,
    altitudeMultMin: 0.8,
    /** §4 "speeds up recovery": × (1 + this × level). */
    acclimRecoveryPerLevel: 0.05,
    /** §4 "When it's empty you can't sprint or jump and the character stops, hands on knees". */
    emptyStopUntil: 20,
    emptyStopMinS: 2.5,
    /** Sprint and jump stay locked after empty until stamina is back to this. */
    unlockAt: 40,
  },

  /** Recent exertion E, in sprint-seconds. Remembers "repeated sprints without rest" (§4). */
  exertion: {
    gain: { sprint: 1.0, jog: 0.5, heavyWalk: 0.25 },
    /** Decay time constants: only rest really clears it. */
    decayTauS: { walk: 180, idle: 90, forced: 90, sitting: 45, lying: 30 },
    max: 300,
  },

  /** NAUSEA, AMS-style build-up, 0..100. Shown as Ne + P (exertional + passive). §4 "NAUSEA bar". */
  nausea: {
    /** §4 stages: 0–30 fine, 30–60 mild, 60–85 strong, 85–100 vomiting; 100 faints. */
    stageAt: [30, 60, 85] as const,
    stageDownHysteresis: 2,
    faintAt: 100,
    /** §4 "sustained sprinting/heavy carrying with Oxygen under 85% adds nausea". */
    lowO2: {
      below: 85,
      basePerS: 0.7,
      perPctPerS: 0.1,
      /** Repeated sprints make it worse: × (exertionFloor + E / exertionScale), E = recent exertion. */
      exertionFloor: 0.1,
      exertionScale: 10,
      /** Heavy carrying counts at this fraction of sprinting. */
      heavyCarryMult: 0.5,
      heavyKg: 20,
    },
    /** §4 "running for a long time (more than ~45–60 s continuous, or repeated sprints without rest)
     *  builds it fast": while jogging or sprinting, ramps in from E = from to E = from + span. */
    longRun: { fromE: 45, spanE: 30, maxPerS: 1.5 },
    /** Game curve: exertional build-up slows as nausea nears 100, × 1 at `from` down to multAt100, so
     *  the stage-2 warnings (§4 "stops to breathe", NPC comments) get time to work before a faint. */
    highResist: { from: 60, multAt100: 0.25 },
    /** §4 "Low hydration speeds up nausea build-up". */
    lowHydrationBelow: 30,
    lowHydrationBuildMult: 1.5,
    lowHydrationRecoveryMult: 0.5,
    /** §4 "acclimatisation slows nausea build-up": × per level. */
    acclimBuildMult: [1, 0.85, 0.72, 0.61, 0.52] as PerLevel,
    /** Passive part P, capped: §4 "rises a little from skipping water or food for long periods and from
     *  going up the ridge too fast on your first day". "A little" = never above passiveCap. */
    passive: {
      cap: 25,
      hydrationBelow: 30,
      hydrationPerS: 0.01,
      foodBelow: 25,
      foodPerS: 0.008,
      firstDayAboveM: 3440,
      firstDayAscentMps: 0.25,
      firstDayPerSPerMps: 0.1,
      decayPerS: 0.05,
    },
    /** §4 "It falls slowly while resting, ... walking slowly, ...". Ne recovery per second. */
    recovery: { walk: 0.06, idle: 0.1, forced: 0.1, sitting: 0.15, lying: 0.2, jog: 0, sprint: 0 },
    acclimRecoveryPerLevel: 0.15,
    /** §4 "Going back down below the town toward the bridge lowers it faster": recovery
     *  × (1 + min(maxBonus, perM × (refAltM − altitude))). Ref is the Kani gate passage (layout gate,
     *  3,393.8 m real); the M1 bridge is 3,386.4 m, which gives × 2.5. */
    descent: { refAltM: 3394, perM: 0.2, maxBonus: 2.0 },
    /** §4 "drinking water or tea, eating (dal bhat, garlic soup at a lodge)": total relief spread over
     *  overS seconds, on top of the activity's recovery. One active effect per kind; using it again
     *  restarts it. */
    soothe: {
      water: { total: 6, overS: 30 },
      tea: { total: 10, overS: 40 },
      snack: { total: 4, overS: 30 },
      garlicSoup: { total: 15, overS: 60 },
      dalBhat: { total: 12, overS: 60 },
    },
    /** §4 "85–100: vomiting (character kneels, can't move for a few seconds) and a big health hit". */
    vomit: { kneelS: 5, relief: 10, cooldownS: 30, hydrationLoss: 10 },
    /** §4 stage 2 "stumbling at random when running": Poisson rate per second. */
    stumble: { basePerS: 0.05, extraPerS: 0.15, stopS: 0.9, cooldownS: 3, speedKeep: 0.3 },
    /** §4 stage 2 "stops to breathe": after running this long, a short forced stop. */
    catchBreath: { afterRunS: 6, stopS: 3, cooldownS: 20 },
    /** §4 stage 2 "NPCs comment (\"Bistarai! Slowly, slowly…\")": at most one line per cooldown. */
    commentCooldownS: 45,
    /** §3 "holds their head or belly": cosmetic pose every so often while in stage 2+. */
    holdPose: { everyMinS: 8, everyMaxS: 16, forS: 3 },
  },

  /** HEALTH, 0..100. §4 "HEALTH bar". */
  health: {
    max: 100,
    /** §4 "drops from fainting". */
    faintHit: 15,
    /** §4 "vomiting ... a big health hit". */
    vomitHit: 20,
    /** §4 "hard falls or big jumps": damage = perM × (fall − safeM). Human scale, so game metres. */
    fall: { safeM: 1.2, perM: 12, hardLandingStaminaCost: 10 },
    /** §4 "staying at high nausea for a long time". */
    highNausea: { atOrAbove: 60, afterS: 30, stage2PerS: 0.1, stage3PerS: 0.2 },
    /** §4 "cold exposure at night without warm clothes (a mild chill in town)". Outdoors only.
     *  rate = perS × coldness × (1 − insulation / insulationNeeded), coldness 0 at belowC, 1 at fullAtC. */
    chill: { belowC: 2, fullAtC: -4, insulationNeeded: 2, perS: 0.03 },
    /** §4 "Recovers by resting, eating, sleeping in a lodge, or buying first aid". */
    regen: { walk: 0.01, idle: 0.03, forced: 0, sitting: 0.08, lying: 0.1, jog: 0, sprint: 0 },
    regenNeeds: { nauseaBelow: 30, hydrationAtLeast: 20, foodAtLeast: 20 },
    acclimRegenPerLevel: 0.1,
  },

  /** Hydration, 0..100, on GAME time. §4 "simple meters behind the Nausea/Health bars". */
  hydration: {
    max: 100,
    start: 85,
    perGameHour: 5,
    activityMult: { idle: 1, forced: 1, sitting: 0.8, lying: 0.5, walk: 1.2, jog: 2, sprint: 3 },
    /** + load / perKgDivisor to the multiplier. */
    loadKgDivisor: 40,
    low: 30,
    veryLow: 10,
    veryLowStaminaRecoveryMult: 0.8,
  },

  /** Food, 0..100, on GAME time. §4 "skipping ... food for long periods". */
  food: {
    max: 100,
    start: 80,
    perGameHour: 4,
    activityMult: { idle: 1, forced: 1, sitting: 0.9, lying: 0.6, walk: 1.1, jog: 1.5, sprint: 2 },
    low: 25,
    veryLow: 10,
    veryLowStaminaRecoveryMult: 0.85,
  },

  /** Acclimatisation: hidden points A, integer levels. §4 "Acclimatization: a hidden value ...". */
  acclim: {
    /** Level n is reached at thresholds[n−1] points. Level 2 needs 1.5 (finale, §11 mission 16). */
    thresholds: [0.5, 1.5, 2.6, 3.8] as const,
    max: 4.5,
    /** §4 "slowly goes up with time spent in Namche": points per 24 GAME hours awake above minAltM. */
    awakePerGameDay: 0.4,
    minAltM: 3000,
    /** §4 "and with each night slept in a lodge": once per night, for at least minSleepGameHours. */
    night: 0.75,
    minSleepGameHours: 6,
    /** §4 "Hike to the ridge viewpoint and come back down to sleep ("climb high, sleep low") for a
     *  bonus". Everest View Point is 3,543 to 3,546 m (docs/audit/landmarks.json); town lodges 3,405 to
     *  3,480 m. Once per night, on top of the night bonus. */
    climbHigh: { altM: 3530, sleepBelowMaxM: 60, bonus: 0.75 },
  },

  /** Carried load. §4 "carrying heavy loads ... make it drop faster"; §10 carry penalties. */
  load: {
    /** Oxygen-drop and climb-cost multiplier: 1 + perKg × kg (20 kg → 1.5). */
    multPerKg: 0.025,
    /** §10 "Above 30 kg: no sprint, no jump". Strictly above. */
    noSprintJumpAboveKg: 30,
    /** §10 "Carried mass slows sprint, lowers jump height": speed × (1 − perKg × kg). */
    walkSpeedPerKg: 0.004,
    jogSpeedPerKg: 0.008,
    sprintSpeedPerKg: 0.01,
    jumpHeightPerKg: 0.015,
  },

  /** §4 "trekking poles (−15% stamina cost on stairs)". Applies to the climb term only. */
  poles: { climbCostMult: 0.85 },

  /** Movement limits handed to the controller. */
  move: {
    /** §4 stage 1 "sprint speed −10%". */
    stage1SprintMult: 0.9,
    /** §4 stage 2 "slower controls". */
    stage2AccelMult: 0.6,
    stage2TurnMult: 0.85,
    /** Stage 3: walking is heavy too. */
    stage3WalkMult: 0.85,
    /** §4 "below 80% ... slower turning": from 1 at 80 % down to this at 75 % and below. */
    lowO2TurnMultAt75: 0.6,
    lowO2AccelMultAt75: 0.8,
  },

  /** Faint and wake. §4 "Consequences". */
  faint: {
    /** Collapse pose and fade before the care flow takes over. */
    collapseS: 2.0,
    fadeOutS: 2.0,
    getUpS: 2.0,
    /** §16 check 4 "Can't faint-loop: after waking up, the bars start in a safe range". */
    wake: { staminaTo: 100, nauseaExertMax: 15, nauseaPassiveMax: 5, healthMin: 50, hydrationMin: 60, foodMin: 60 },
    /** Grace after waking: build-up slowed, floors hold, collapse timer off. */
    grace: { s: 120, buildMult: 0.25, spo2Floor: 78, nauseaCeil: 29, healthFloor: 30 },
  },

  /** Lodge sleep effects (STUBS.lodge prices and windows). §4 "sleeping in a lodge". */
  sleep: { nauseaRelief: 60, healthGain: 40, hydrationMin: 70, foodMin: 80 },

  /** Screen effects, raw 0..1 before the player's settings. §4 thresholds and stages; §13. */
  fx: {
    /** Vignette: 0 at 85 → 0.4 at 80 → 0.6 at 75 ("edges darken slightly"). */
    vignetteAt80: 0.4,
    vignetteAt75: 0.6,
    /** Tunnel: 0 at 80 → 1 at 75. Desaturation 0 at 82 → 0.5 at 75, + 0.2 in stage 2+. */
    desatFrom: 82,
    desatAt75: 0.5,
    desatStage2: 0.2,
    /** Headache throb at stage 1/2/3, pulsing on every second heartbeat. */
    headache: [0, 0.3, 0.6, 0.8] as const,
    /** Sway amplitude by nausea: 0.2 at 30 → 0.5 at 60 → 0.8 at 85 → 1 at 100. */
    sway: { at30: 0.2, at60: 0.5, at85: 0.8, at100: 1 },
    /** Occasional camera wobble, stage 1+: one every minS..maxS seconds, lasting forS. */
    wobble: { minS: 8, maxS: 16, forS: 0.6, stage1: 0.4, stage2: 0.7 },
    /** Blur pulses, stage 2+. */
    blur: { minS: 6, maxS: 10, forS: 1.2, stage2: 0.6, stage3: 0.9 },
  },

  /** Body sounds. §4 "louder breathing, a heartbeat at low oxygen"; "below 80% ... muffled sound". */
  audio: {
    breath: {
      restBpm: 14,
      add: { idle: 0, sitting: -2, lying: -4, forced: 18, walk: 6, jog: 16, sprint: 26 },
      perPctBelowRest: 1.2,
      lowStaminaAdd: 6,
      lowStaminaBelow: 30,
      minBpm: 10,
      maxBpm: 48,
      tauS: 3,
      /** Loudness: base + rate term, + loudAt85 as SpO2 falls 88 → 85, + extra 85 → 78. */
      base: 0.15,
      rateGain: 0.15,
      loudFrom: 88,
      loudAt85: 0.45,
      extraTo78: 0.25,
    },
    heart: {
      restBpm: 72,
      add: { idle: 0, sitting: -4, lying: -8, forced: 30, walk: 25, jog: 55, sprint: 90 },
      perPctBelowRest: 2.5,
      minBpm: 50,
      maxBpm: 190,
      riseTauS: 4,
      fallTauS: 10,
      /** Audible from 84 % (0) to 78 % (1); and up to 0.5 from 150 to 180 bpm. */
      audibleFrom: 84,
      fullAt: 78,
      hrFrom: 150,
      hrTo: 180,
      hrMax: 0.5,
    },
    /** Muffle 0 at 80 % → 1 at 75 % (the audio module maps it to a low-pass). */
  },

  /** Breath fog (§4 "breath fog"): visible below fogBelowC, full at fogFullC. */
  breathFog: { belowC: 8, fullC: -2 },

  /** Danger levels for the HUD bars (§13 "Bars pulse and flash when in danger"). */
  hud: {
    healthWarn: 50,
    healthDanger: 30,
    spo2Warn: 85,
    spo2Danger: 80,
    nauseaWarn: 30,
    nauseaDanger: 60,
    staminaWarn: 30,
    staminaDanger: 15,
    /** Trend dead bands, units per second. */
    trendEps: { spo2: 0.05, stamina: 0.3, nausea: 0.02, health: 0.004 },
  },

  /** One-off tips (§4 "The first time the player sprints too long, a short tip pops up"). */
  tips: {
    /** "Sprints too long": the first time E reaches this, or SpO2 drops below 85 while sprinting. */
    sprintTooLongE: 15,
    thirstyBelow: 40,
    hungryBelow: 35,
  },
} as const;

/** Stubs that M2 needs before inventory, lodging and the economy exist (docs/BODY_MODEL.md §6). */
export const STUBS = {
  /** Starting cash in NPR: two lodge nights with meals, a few rests and refills, one care fee. */
  wallet: { startNpr: 5000 },
  /** §4 "water bottle (drink on the go)": 1 litre, four 250 ml drinks. Refill at a lodge door. */
  bottle: { capacity: 4, startSips: 4, hydrationPerSip: 25, drinkS: 1.5, refillNpr: 100 },
  /** §4 "snacks": energy bars. */
  snack: { start: 3, max: 6, food: 20, stamina: 5, health: 2, eatS: 2.0, priceNpr: 150 },
  /** Lodge door (E). §4 "garlic soup, ginger tea", §11 "Lodge meals, tea, water ... cost money". */
  lodge: {
    interactRadiusM: 1.8,
    rest: {
      /** Tea and garlic soup, an hour by the stove. */
      priceNpr: 750,
      gameHours: 1,
      nauseaRelief: 40,
      healthGain: 10,
      hydrationGain: 40,
      foodGain: 30,
    },
    /** Room, dal bhat for dinner, tea at breakfast. Window and wake time: CLOCK.sleep. */
    sleep: { priceNpr: 1750 },
  },
  /** §4 "You lose a little money (a care fee) and some game time". Never more than the wallet holds. */
  care: { feeNpr: 1000, gameHoursLost: 3 },
  /** §4 "buying first aid at the pharmacy": a later item; M2 exposes it on the debug API only. */
  firstAid: { healthGain: 35, priceNpr: 500 },
} as const;

export type BodyConfig = typeof BODY;
export type StubsConfig = typeof STUBS;
