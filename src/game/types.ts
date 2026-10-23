import type { FactId } from './content/facts';

export type MapId = 'village' | 'floor1' | 'floor2' | 'floor3';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Stat = 'attack' | 'defense' | 'maxHp';
export type Tile = Readonly<{ x: number; y: number }>;

export type PlayerStats = Readonly<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
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
  | 'scribe-final-ledger-read'
  | 'elder-sealed-crypt'
  | 'guard-sealed-mine'
  | 'child-gold-tip';

export type NpcInteractionResolution = Readonly<{
  lineId: DialogueLineId;
  factId?: FactId;
}>;

export type BaseEntity = Readonly<{ id: string; tile: Tile; assetId?: string }>;
export type NpcId =
  | 'village-warden'
  | 'village-artisan'
  | 'village-scout'
  | 'village-scribe'
  | 'floor2-missing-subject'
  | 'village-returned-subject'
  | 'village-elder'
  | 'village-guard'
  | 'village-child';
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
    // Ambient villagers carry no lead, so talking to them records nothing.
    introFactId?: string;
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
    gold: number;
  }>;
// A latch opens from its rearSide, which only another floor reaches, or,
// when guarded, from either side once every guard is defeated. A guarded
// latch may also keep a rearSide, opening from there regardless of guards.
export type LatchEntity = BaseEntity &
  Readonly<{ kind: 'latch' }> &
  (
    | Readonly<{ rearSide: Direction }>
    | Readonly<{ guardIds: readonly string[]; rearSide?: Direction }>
  );
export type RecoveryEntity = BaseEntity & Readonly<{ kind: 'recovery' }>;
// A maze entrance whose maze is not built yet: bumping it shows its text
// and records nothing.
export type SealedEntity = BaseEntity &
  Readonly<{ kind: 'sealed'; text: string }>;
// A one-time purchase: owning it is having its itemId, and buying it adds
// amount to stat once, like a stat reward.
export type ShopWare = Readonly<{
  itemId: string;
  label: string;
  price: number;
  stat: Stat;
  amount: number;
}>;
// A shopkeeper sells their wares in order, one per visit to the counter.
export type ShopEntity = BaseEntity &
  Readonly<{ kind: 'shop'; name: string; wares: readonly ShopWare[] }>;
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
  | PortalEntity
  | SealedEntity
  | ShopEntity;
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
  | 'reward-already-taken'
  | 'not-enough-gold';

export type ActionEffect =
  | { kind: 'moved' }
  | { kind: 'traveled'; mapId: MapId }
  | { kind: 'clue'; text: string }
  | { kind: 'reward'; stat: Stat; amount: number }
  | { kind: 'healed'; hp: number }
  | { kind: 'latchOpened'; id: string }
  | { kind: 'latchGuarded'; id: string; remaining: number }
  | { kind: 'combatPrompt'; enemyId: string; preview: WinnableCombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number; gold: number }
  | { kind: 'purchasePrompt'; shopId: string; ware: ShopWare }
  | { kind: 'purchased'; ware: ShopWare }
  | { kind: 'soldOut'; speaker: string }
  | { kind: 'dialogue'; speaker: string; lineId: DialogueLineId }
  | { kind: 'itemReward'; itemId: string; label: string }
  | { kind: 'accessLocked'; text: string };

export type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };

export type PendingInteraction =
  | Readonly<{
      kind: 'combat';
      enemyId: string;
      preview: WinnableCombatPreview;
    }>
  | Readonly<{ kind: 'purchase'; shopId: string; ware: ShopWare }>;

export type SessionState = Readonly<{
  game: GameState;
  pending: PendingInteraction | null;
}>;

export type InputCommand =
  | Readonly<{ kind: 'move'; direction: Direction }>
  | Readonly<{ kind: 'confirm' }>
  | Readonly<{ kind: 'cancel' }>;

export type SessionTransition =
  | Readonly<{ ok: true; session: SessionState; effect: ActionEffect | null }>
  | Readonly<{ ok: false; session: SessionState; reason: BlockedReason }>;
