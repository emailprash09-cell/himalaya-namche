// Tuning for M1. Human scale is fixed by the project rules; never fit people to the town.

export const PLAYER = {
  height: 1.75,          // capsule total height, m
  radius: 0.3,           // capsule radius, m
  eyeHeight: 1.62,       // eye above the soles, m
  walkSpeed: 1.3,        // m/s
  sprintSpeed: 3.5,      // m/s
  accel: 10,             // m/s^2 towards the target speed on the ground
  airAccel: 2,           // m/s^2 in the air
  jumpHeight: 0.45,      // m of clearance under the soles
  gravity: 9.81,         // m/s^2
  coyoteTime: 0.1,       // s
  maxStep: 0.22,         // m, autostep (risers are 0.17 to 0.20)
  maxSlopeDeg: 42,       // walkable slope
  snapToGround: 0.35,    // m
} as const;

export const CAMERA = {
  fovHorizontalDeg: 78,  // horizontal field of view; vertical follows the aspect
  near: 0.05,
  far: 60000,
  mouseSensitivity: 0.0022, // rad per pixel
  tpp: {
    distance: 3.0,       // m behind the head
    shoulder: 0.45,      // m to the right
    height: 0.25,        // m above the eye
    minDistance: 0.35,
    probeRadius: 0.2,    // sphere swept against colliders
    followLag: 12,       // 1/s, larger is stiffer
    fadeBelow: 0.9,      // m from the head: avatar fades out
  },
} as const;

export const RENDER = {
  shadowMapSize: 2048,
  shadowExtent: 70,      // m half-width of the sun's shadow box round the player
  pixelRatioCap: 1.5,
  exposure: 0.8,
} as const;

export const ENV = {
  // Mid-morning in Namche: the sun in the south-east, about 40 degrees up.
  sunAzimuthDeg: 135,    // clockwise from north
  sunElevationDeg: 40,
  fogColor: 0xb9cfe6,
  fogNear: 260,
  fogFar: 26000,
} as const;
