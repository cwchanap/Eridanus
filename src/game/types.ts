export type MapId = 'village' | 'floor1' | 'floor2' | 'floor3';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Stat = 'attack' | 'defense' | 'maxHp';
export type Tile = Readonly<{ x: number; y: number }>;

export type PlayerStats = Readonly<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}>;

export type DialogueLineId =
  | 'warden-main-lead'
  | 'warden-sigil-found'
  | 'artisan-find-workshop'
  | 'artisan-workshop-seen'
  | 'artisan-find-other-entrance'
  | 'scout-find-marks'
  | 'scout-marks-seen'
  | 'scribe-find-ledger'
  | 'scribe-fragment-found'
  | 'warden-subject-returned'
  | 'subject-returning'
  | 'subject-village'
  | 'artisan-treasury-route-found'
  | 'artisan-heirloom-recovered'
  | 'scout-route-verified'
  | 'scribe-floor2-ledger-read'
  | 'warden-restoration-ending'
  | 'warden-restoration-ending-ledger'
  | 'scribe-final-ledger-read';

export type NpcInteractionResolution = Readonly<{
  lineId: DialogueLineId;
  factId?: string;
}>;

export type BaseEntity = Readonly<{ id: string; tile: Tile; assetId?: string }>;
export type NpcId =
  | 'village-warden'
  | 'village-artisan'
  | 'village-scout'
  | 'village-scribe'
  | 'floor2-missing-subject'
  | 'village-returned-subject';
export type NpcPresence = Readonly<{
  factId: string;
  when: 'known' | 'unknown';
}>;
export type ClueEntity = BaseEntity &
  Readonly<{
    kind: 'clue';
    text: string;
    factId?: string;
  }>;
export type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    id: NpcId;
    name: string;
    introFactId: string;
    presence?: NpcPresence;
  }>;
export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward' }> &
  (
    | Readonly<{ grant: 'stat'; stat: Stat; amount: number }>
    | Readonly<{ grant: 'item'; itemId: string; label: string }>
  );
export type EnemyEntity = BaseEntity &
  Readonly<{
    kind: 'enemy';
    stats: Readonly<{ hp: number; attack: number; defense: number }>;
  }>;
export type LatchEntity = BaseEntity &
  Readonly<{ kind: 'latch'; rearSide: Direction }>;
export type RecoveryEntity = BaseEntity & Readonly<{ kind: 'recovery' }>;
export type PortalLock =
  | Readonly<{
      kind: 'item';
      requiresItemId: string;
      lockedText: string;
      lockedFactId: string;
    }>
  | Readonly<{
      kind: 'fact';
      requiresFactId: string;
      lockedText: string;
      lockedFactId: string;
    }>;

export type PortalEntity = BaseEntity &
  Readonly<{
    kind: 'portal';
    target: Readonly<{ mapId: MapId; tile: Tile }>;
    factId?: string;
    lock?: PortalLock;
  }>;
export type Entity =
  | ClueEntity
  | RewardEntity
  | EnemyEntity
  | LatchEntity
  | RecoveryEntity
  | NpcEntity
  | PortalEntity;
export type MapSection = Readonly<{
  id: string;
  name: string;
  bounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  factIds?: readonly string[];
}>;
export type MapDefinition = Readonly<{
  id: MapId;
  name: string;
  layout: readonly string[];
  entities: readonly Entity[];
  sections: readonly MapSection[];
}>;

export type GameState = Readonly<{
  mapId: MapId;
  tile: Tile;
  player: PlayerStats;
  openedRewardIds: readonly string[];
  defeatedEnemyIds: readonly string[];
  openedShortcutIds: readonly string[];
  itemIds: readonly string[];
  factIds: readonly string[];
  discoveredSectionIds: readonly string[];
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
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number }
  | { kind: 'dialogue'; speaker: string; lineId: DialogueLineId }
  | { kind: 'itemReward'; itemId: string; label: string }
  | { kind: 'accessLocked'; text: string };

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
