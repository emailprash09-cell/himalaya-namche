// M2 clock tuning. One real hour is one game day (owner's direction of 2026-11-11, docs/MISSION.md
// "Owner's direction"). Pure numbers only; the clock itself is client/src/sim/clock.ts.
// Design and reasons: docs/BODY_MODEL.md section 6.

export const CLOCK = {
  /** Game seconds per real second: 86,400 / 3,600 ("1hr in real life is 1 day in game"). */
  gameSecondsPerRealSecond: 24,

  /**
   * New game: Friday 6 November 2026, 10:00 Nepal time, clear weather. Late autumn is the clear,
   * dry trekking season; a Friday start means the first night's sleep leads into the Saturday market
   * (brief §6 "Market vendors on Saturday market day"; orchestrator brief §9). At 10:00 that day the sun
   * stands at azimuth 147.5 deg, elevation 39.8 deg, close to M1's frozen 135 / 40 (brief §5 "mid-morning").
   */
  start: {
    dateIso: '2026-11-06',
    weekday: 'Friday',
    hour: 10,
    minute: 0,
    weather: 'clear',
  },

  /** Site for the sun: Namche Bazaar, the world origin (orchestrator brief §3). Nepal is UTC+05:45. */
  site: {
    latDeg: 27.805,
    lonDeg: 86.71,
    utcOffsetHours: 5.75,
  },

  /**
   * Sun: NOAA solar position (docs/BODY_MODEL.md §6.1), the date advancing one day per game day.
   * Checked values for 6 Nov 2026 (sea-level horizon, refraction -0.833 deg): civil dawn 05:48,
   * sunrise 06:12, solar noon 11:42 at 46.2 deg, sunset 17:11, civil dusk 17:35. The ridges hide the
   * real sun for longer; the renderer's shadows do that, the clock does not.
   */
  sun: {
    refractionDeg: -0.833,
    /** Night (lit windows, cold, stars) when the sun is below this elevation: civil twilight. */
    nightBelowDeg: -6,
  },

  /**
   * Outdoor air temperature, deg C. Approximate Namche November normals (cold clear nights, mild sunny
   * days); tune with the weather package later. Minimum at sunrise, maximum at 14:00, cosine between.
   * Brief §4: "cold exposure at night without warm clothes (a mild chill in town)".
   */
  temperature: {
    minC: -4,
    maxC: 8,
    maxAtHour: 14,
    /** Inside a lodge with the stove going. */
    indoorC: 12,
  },

  /** Lodge sleep: "Sleep until morning" is offered from 17:00 to 04:59 and always wakes at 06:30. */
  sleep: {
    fromHour: 17,
    untilHour: 5,
    wakeHour: 6,
    wakeMinute: 30,
  },
} as const;

export type ClockConfig = typeof CLOCK;
