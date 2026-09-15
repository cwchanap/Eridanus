export type MapId = 'village' | 'floor1' | 'floor2';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Stat = 'attack' | 'defense' | 'maxHp';
export type Tile = Readonly<{ x: number; y: number }>;

export type PlayerStats = Readonly<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}>;

export type BaseEntity = Readonly<{ id: string; tile: Tile; assetId?: string }>;
export type ClueEntity = BaseEntity & Readonly<{ kind: 'clue'; text: string }>;
export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward'; stat: Stat; amount: number }>;
export type EnemyEntity = BaseEntity &
  Readonly<{
    kind: 'enemy';
    stats: Readonly<{ hp: number; attack: number; defense: number }>;
  }>;
export type LatchEntity = BaseEntity &
  Readonly<{ kind: 'latch'; rearSide: Direction }>;
export type RecoveryEntity = BaseEntity & Readonly<{ kind: 'recovery' }>;
export type PortalEntity = BaseEntity &
  Readonly<{ kind: 'portal'; target: Readonly<{ mapId: MapId; tile: Tile }> }>;
export type Entity =
  | ClueEntity
  | RewardEntity
  | EnemyEntity
  | LatchEntity
  | RecoveryEntity
  | PortalEntity;
export type MapDefinition = Readonly<{
  id: MapId;
  name: string;
  layout: readonly string[];
  entities: readonly Entity[];
}>;

export type GameState = Readonly<{
  mapId: MapId;
  tile: Tile;
  player: PlayerStats;
  openedRewardIds: readonly string[];
  defeatedEnemyIds: readonly string[];
  openedShortcutIds: readonly string[];
}>;

export type WinnableCombatPreview = {
  winnable: true;
  hitsNeeded: number;
  hpLoss: number;
};

export type CombatPreview =
  | WinnableCombatPreview
  | {
      winnable: false;
      reason: 'combat-unwinnable' | 'combat-lethal';
    };

export type BlockedReason =
  | 'wall'
  | 'out-of-bounds'
  | 'interaction-pending'
  | 'latch-closed-front'
  | 'combat-unwinnable'
  | 'combat-lethal'
  | 'reward-already-taken';

export type ActionEffect =
  | { kind: 'moved' }
  | { kind: 'traveled'; mapId: MapId }
  | { kind: 'clue'; text: string }
  | { kind: 'reward'; stat: Stat; amount: number }
  | { kind: 'healed'; hp: number }
  | { kind: 'latchOpened'; id: string }
  | { kind: 'combatPrompt'; enemyId: string; preview: WinnableCombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number };

export type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };

export type PendingInteraction = Readonly<{
  kind: 'combat';
  enemyId: string;
  preview: WinnableCombatPreview;
}>;

export type SessionState = Readonly<{
  game: GameState;
  pending: PendingInteraction | null;
}>;

export type InputCommand =
  | Readonly<{ kind: 'move'; direction: Direction }>
  | Readonly<{ kind: 'fight' }>
  | Readonly<{ kind: 'cancel' }>;

export type SessionTransition =
  | Readonly<{ ok: true; session: SessionState; effect: ActionEffect | null }>
  | Readonly<{ ok: false; session: SessionState; reason: BlockedReason }>;
