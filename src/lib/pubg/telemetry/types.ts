// Normalized PUBG telemetry shapes. The raw telemetry is a JSON array of events
// each tagged with `_T` (event type) and `_D` (ISO timestamp). We keep the parser
// permissive — unknown events are ignored, missing fields default to safe values.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerRef {
  accountId: string;
  name: string;
  teamId?: number;
  health?: number;
  location?: Vec3;
}

export interface PositionSample {
  time: number; // seconds since match start
  accountId: string;
  name: string;
  teamId?: number;
  health: number;
  location: Vec3;
}

export interface KillEvent {
  time: number;
  killer: PlayerRef | null;
  victim: PlayerRef;
  damageCauserName: string;
  damageReason: string;
  distance: number;
  isHeadshot: boolean;
}

export interface KnockEvent {
  time: number;
  attacker: PlayerRef | null;
  victim: PlayerRef;
  damageCauserName: string;
  distance: number;
}

export interface DamageEvent {
  time: number;
  attacker: PlayerRef | null;
  victim: PlayerRef;
  damage: number;
  damageType: string;
  damageReason: string;
  damageCauserName: string;
  distance: number;
  // Locations at the moment of damage (used for tracer animation in 2D replay).
  // Optional because legacy fixtures may omit them.
  attackerLocation?: Vec3 | null;
  victimLocation?: Vec3 | null;
}

export interface CarePackageEvent {
  time: number;
  itemPackageId: string;
  location: Vec3;
}

export interface ParachuteLandingEvent {
  time: number;
  accountId: string;
  name: string;
  teamId?: number;
  location: Vec3;
}

export interface ZoneSample {
  time: number;
  poisonGasWarningPosition?: Vec3;
  poisonGasWarningRadius?: number;
  safetyZonePosition?: Vec3;
  safetyZoneRadius?: number;
}

export interface TelemetryScene {
  matchStartTime: number; // unix epoch ms
  matchEndTime: number;
  durationSec: number;
  mapName: string;
  positions: PositionSample[];
  kills: KillEvent[];
  knocks: KnockEvent[];
  damages: DamageEvent[];
  carePackages: CarePackageEvent[];
  parachuteLandings?: ParachuteLandingEvent[];
  zones: ZoneSample[];
  players: Map<string, PlayerRef>;
}

// Raw event shapes are loosely typed because PUBG occasionally evolves them.
// Treat everything as optional and unknown — the parser narrows on demand.
export interface RawTelemetryEvent {
  _T: string;
  _D: string;
  [key: string]: unknown;
}
