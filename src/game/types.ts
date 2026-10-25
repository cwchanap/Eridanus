import type { FactId } from './content/facts';

export type MapId =
  'village' | 'floor1' | 'floor2' | 'floor3' | 'floor4' | 'floor5';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Stat = 'attack' | 'defense' | 'hp';
export type EquipSlot = 'weapon' | 'armor' | 'accessory';
export type Tile = Readonly<{ x: number; y: number }>;

// HP is one uncapped pool: fights spend it and only one-time rewards and
// wares add to it, so nothing ever refills it.
export type PlayerStats = Readonly<{
  hp: number;
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
    factId?: string;
  }>;
export type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    id: NpcId;
    // Ambient villagers carry no lead, so talking to them records nothing.
    introFactId?: string;
    presence?: NpcPresence;
  }>;
export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward' }> &
  (
    | Readonly<{ grant: 'stat'; stat: Stat; amount: number }>
    | Readonly<{ grant: 'item'; itemId: string }>
  );
export type EnemyEntity = BaseEntity &
  Readonly<{
    kind: 'enemy';
    stats: Readonly<{ hp: number; attack: number; defense: number }>;
    gold: number;
  }>;
// A latch opens from its rearSide, which only another floor reaches, or,
// when guarded, from either side once every guard is defeated. A wired
// latch opens from either side while all its levers are thrown at once.
export type LatchEntity = BaseEntity &
  Readonly<{ kind: 'latch' }> &
  (
    | Readonly<{ rearSide: Direction }>
    | Readonly<{ guardIds: readonly string[] }>
    | Readonly<{ leverIds: readonly string[] }>
  );
// Each pull flips a lever between thrown and not, along with every lever
// wired to it through links. A thrown lever's id sits in openedShortcutIds.
export type LeverEntity = BaseEntity &
  Readonly<{ kind: 'lever'; links?: readonly string[] }>;
// A maze entrance whose maze is not built yet: bumping it shows its notice
// and records nothing.
export type SealedEntity = BaseEntity & Readonly<{ kind: 'sealed' }>;
// A one-time purchase: owning it is having its itemId. Buying it equips it
// in its slot, in place of the ware worn there, so amount is the bonus it
// gives to stat while worn, not on top of the ware it replaces.
export type ShopWare = Readonly<{
  itemId: string;
  price: number;
  slot: EquipSlot;
  stat: Stat;
  amount: number;
}>;
// A shopkeeper sells their wares in order, one per visit to the counter.
export type ShopEntity = BaseEntity &
  Readonly<{ kind: 'shop'; wares: readonly ShopWare[] }>;
// One status point a trader sells: amount added to stat.
export type TraderOffer = Readonly<{ stat: Stat; amount: number }>;
// Sells status points for gold, like a level up. Every trade the hero has
// ever made (GameState.trades) lifts the price by priceStep, whichever
// stat it bought, so the points never run out but each costs more.
export type TraderEntity = BaseEntity &
  Readonly<{
    kind: 'trader';
    offers: readonly TraderOffer[];
    basePrice: number;
    priceStep: number;
  }>;
export type PortalLock =
  | Readonly<{
      kind: 'item';
      requiresItemId: string;
      lockedFactId: string;
    }>
  | Readonly<{
      kind: 'fact';
      requiresFactId: string;
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
  | LeverEntity
  | NpcEntity
  | PortalEntity
  | SealedEntity
  | ShopEntity
  | TraderEntity;
export type MapSection = Readonly<{
  id: string;
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
  // Status points the hero has bought from traders so far.
  trades: number;
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
  | { kind: 'clue'; clueId: string }
  | { kind: 'reward'; stat: Stat; amount: number }
  | { kind: 'latchOpened'; id: string }
  | { kind: 'latchGuarded'; id: string; remaining: number }
  | { kind: 'latchWired'; id: string; thrown: number; total: number }
  | { kind: 'leverPulled'; id: string; thrown: boolean; linked: number }
  | { kind: 'combatPrompt'; enemyId: string; preview: WinnableCombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number; gold: number }
  | { kind: 'purchasePrompt'; shopId: string; ware: ShopWare }
  | { kind: 'purchased'; ware: ShopWare }
  | { kind: 'soldOut'; shopId: string }
  | { kind: 'tradePrompt'; traderId: string }
  | { kind: 'traded'; offer: TraderOffer; price: number }
  | { kind: 'dialogue'; speakerId: NpcId; lineId: DialogueLineId }
  | { kind: 'itemReward'; itemId: string }
  | { kind: 'accessLocked'; entityId: string };

export type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };

export type PendingInteraction =
  | Readonly<{
      kind: 'combat';
      enemyId: string;
      preview: WinnableCombatPreview;
    }>
  | Readonly<{ kind: 'purchase'; shopId: string; ware: ShopWare }>
  | Readonly<{ kind: 'trade'; traderId: string }>;

export type SessionState = Readonly<{
  game: GameState;
  pending: PendingInteraction | null;
}>;

export type InputCommand =
  | Readonly<{ kind: 'move'; direction: Direction }>
  | Readonly<{ kind: 'confirm' }>
  // Picks the index-th offer of an open trade prompt.
  | Readonly<{ kind: 'choose'; index: number }>
  | Readonly<{ kind: 'cancel' }>;

export type SessionTransition =
  | Readonly<{ ok: true; session: SessionState; effect: ActionEffect | null }>
  | Readonly<{ ok: false; session: SessionState; reason: BlockedReason }>;
