import type { ObservationFactId } from '../game/content/facts';
import type { LeadId } from '../game/journal';
import type {
  BlockedReason,
  DialogueLineId,
  MapId,
  NpcId,
  Stat,
} from '../game/types';

// English is the reference language: every other table must have exactly
// these keys (Messages is derived from it), and messages.test.ts checks them
// against the authored content. Prose lives here, never in game/content.
export const en = {
  ui: {
    // Status panel
    playerStatus: 'Player status',
    hero: 'Hero',
    items: 'Items',
    noItems: 'Nothing found yet.',
    // Location banner and message box
    location: 'Location',
    messages: 'Messages',
    explore: 'Explore. Walk into anything to interact with it.',
    closeMessage: 'Close message',
    enemy: 'Enemy',
    // Combat encounter card
    combat: 'Combat',
    hpLoss: (loss: number) => `HP loss: ${loss}`,
    leavesYouAt: (hp: number, maxHp: number) => `leaves you at ${hp}/${maxHp}`,
    fight: 'Fight',
    cancel: 'Cancel',
    // Shop card
    shop: 'Shop',
    price: (price: number) => `Price: ${price} gold`,
    youHave: (gold: number) => `you have ${gold}`,
    leavesYou: (gold: number) => `leaves you ${gold}`,
    buy: 'Buy',
    leave: 'Leave',
    // Invalid-save recovery
    invalidSave: 'Invalid save',
    invalidSaveTitle: 'Save data is invalid.',
    invalidSaveBody:
      "The saved run in this browser can't be loaded. Reset it to start a fresh run.",
    resetSave: 'Reset save',
    // Journal head
    journal: 'Journal',
    sideLeads: 'Side leads',
    notes: 'Notes',
    placesFound: 'Places found',
    show: 'Show',
    hide: 'Hide',
    mute: 'Mute sound',
    unmute: 'Unmute sound',
    language: 'Language',
  },
  howToPlay: {
    title: 'How to play',
    move: 'move one tile.',
    interact: 'Walk into people, chests, gates, and stairs to use them.',
    fight: (enter: string, esc: string) =>
      `Fights show their exact HP cost first: ${enter} to fight, ${esc} to back off.`,
    autosave: 'Progress saves automatically.',
    tip: 'Start by talking to the Warden in the teal cloak.',
  },
  // HUD chips and the shop card's stat chip. Max HP only ever appears there.
  statLabels: {
    hp: 'HP',
    attack: 'ATK',
    defense: 'DEF',
    gold: 'Gold',
    maxHp: 'Max HP',
  },
  statNames: {
    attack: 'Attack',
    defense: 'Defense',
    maxHp: 'Max HP',
  } satisfies Record<Stat, string>,
  // The tag on a message's nameplate; speech uses the speaker's name instead.
  tags: {
    clue: 'Clue',
    powerUp: 'Power up',
    restored: 'Restored',
    shortcut: 'Shortcut',
    sealed: 'Sealed',
    victory: 'Victory',
    purchased: 'Purchased',
    item: 'Item',
  },
  effects: {
    statUp: (stat: string, amount: number) => `${stat} increased by ${amount}.`,
    healed: (hp: number) => `Recovered to ${hp} HP.`,
    latchOpened: 'The latch opens. The shortcut is now usable from both sides.',
    latchGuarded: (remaining: number) =>
      `Guards hold this latch shut. Defeat ${remaining} more to open it.`,
    victory: (hpLost: number, gold: number) =>
      `Enemy defeated. HP lost: ${hpLost}.${gold > 0 ? ` Gold found: ${gold}.` : ''}`,
    purchased: (item: string, stat: string, amount: number) =>
      `${item}: ${stat} increased by ${amount}.`,
    soldOut: 'Sold out. You already own everything I make.',
    obtained: (item: string) => `Obtained ${item}.`,
  },
  reasons: {
    wall: 'A wall blocks the way.',
    'out-of-bounds': 'You cannot go that way.',
    'interaction-pending': 'Finish the current interaction first.',
    'latch-closed-front': 'The latch only opens from the other side.',
    'combat-unwinnable': 'Your attack cannot damage this enemy.',
    'combat-lethal': 'This fight would defeat you.',
    'reward-already-taken': 'The reward has already been claimed.',
    'not-enough-gold': 'You do not have enough gold for that yet.',
  } satisfies Record<BlockedReason, string>,
  // Enemies are named by their art: content gives them stats, not names.
  enemies: {
    'enemy-ruin-guard': 'Ruin Guard',
    'enemy-ruin-sentinel': 'Ruin Sentinel',
    'enemy-core-guardian': 'Core Guardian',
  },
  leadTitles: {
    main: 'Main quest',
    heirloom: 'Heirloom',
    route: 'Lost Route',
    ledger: 'Keeper Ledger',
  },
  leads: {
    'seek-warden': 'Speak with the village warden.',
    'find-sigil': 'Search Floor 1 for the reusable tower sigil.',
    descend: 'The sigil opens the lower stair. Descend to Floor 2.',
    'search-floor2':
      'The lower stair stands open. Search Floor 2 for the missing subject.',
    'investigate-deeper':
      'The subject returned with tales of what waits below Floor 2. Investigate deeper.',
    'heirloom-find-workshop': 'Look for the sealed workshop treasury.',
    'heirloom-inspect-treasury':
      'Find a way to inspect the visible treasury approach.',
    'heirloom-find-other-entrance':
      'The visible approach is sealed. Look for another entrance from below.',
    'heirloom-claim-treasury':
      'A hidden stair reaches the treasury from below. Claim the workshop heirloom.',
    'heirloom-resolved': 'The workshop heirloom is recovered.',
    'route-find-marks': 'Look for the old route scratches.',
    'route-verify-return': 'Verify where the marked return connection leads.',
    'route-resolved':
      'The return connection is verified. The old route is real.',
    'ledger-find-fragment': 'Search for a surviving keeper ledger fragment.',
    'ledger-find-later-pages':
      'Look deeper in the tower for later ledger pages.',
    'ledger-follow-deeper-record':
      'The paired guarded releases explain the fragment. Seek the final record deeper in the tower.',
    'reach-heart-chamber':
      'The lower tower is open. Defeat the Floor 3 hatch guard and fight down to the tower heart on Floor 5.',
    'claim-restoration-core':
      'The core guardian is defeated. Recover the Restoration Core.',
    'return-restoration-core':
      'Bring the Restoration Core back to the village warden.',
    'story-complete':
      'The Restoration Core is back in the village. The tower can be restored.',
    'ledger-resolved':
      'The final keeper record explains the guardian isolation failure.',
  } satisfies Record<LeadId, string>,
  maps: {
    village: 'Starting Village',
    floor1: 'Tower Floor 1',
    floor2: 'Tower Floor 2',
    floor3: 'Tower Floor 3',
    floor4: 'Tower Floor 4',
    floor5: 'Tower Floor 5',
  } satisfies Record<MapId, string>,
  sections: {
    'village-square': 'Village Square',
    'village-market': 'Market Row',
    'village-tower-road': 'Tower Road',
    'village-mine-trail': 'Mine Trail',
    'village-crypt-lane': 'Crypt Lane',
    'village-barrow-path': 'Barrow Path',
    'floor1-entry-court': 'Entry Court',
    'floor1-lower-loop': 'Lower Loop',
    'floor1-upper-gallery': 'Upper Gallery',
    'floor1-rear-wing': 'Rear Wing',
    'floor1-workshop-treasury': 'Workshop Treasury',
    'floor2-front-landing': 'Front Landing',
    'floor2-central-hall': 'Central Hall',
    'floor2-west-archive': 'West Archive',
    'floor2-east-service': 'East Service Wing',
    'floor2-rear-gallery': 'Rear Gallery',
    'floor3-entry-vestibule': 'Entry Vestibule',
    'floor3-twin-galleries': 'Twin Galleries',
    'floor3-keeper-archive': 'Keeper Archive',
    'floor3-hidden-vault': 'Hidden Vault',
    'floor3-heart-approach': 'Heart Approach',
    'floor3-heart-stair': 'Heart Stair',
    'floor4-stair-landing': 'Stair Landing',
    'floor4-lower-hall': 'Lower Hall',
    'floor4-west-works': 'West Works',
    'floor4-east-works': 'East Works',
    'floor4-west-store': 'West Store',
    'floor4-east-store': 'East Store',
    'floor4-upper-gallery': 'Upper Gallery',
    'floor4-forge': 'Forge',
    'floor4-forge-cellar': 'Forge Cellar',
    'floor5-landing': 'Lower Landing',
    'floor5-outer-ring': 'Outer Ring',
    'floor5-middle-ring': 'Middle Ring',
    'floor5-inner-ring': 'Inner Ring',
    'floor5-west-vault': 'West Vault',
    'floor5-east-vault': 'East Vault',
    'floor5-heart-chamber': 'Heart Chamber',
  },
  npcs: {
    'village-warden': 'Warden',
    'village-artisan': 'Artisan',
    'village-scout': 'Scout',
    'village-scribe': 'Scribe',
    'village-returned-subject': 'Returned Subject',
    'village-elder': 'Elder',
    'village-guard': 'Guard',
    'village-child': 'Child',
    'floor2-missing-subject': 'Missing Subject',
  } satisfies Record<NpcId, string>,
  shops: {
    'village-weapon-shop': 'Smith',
    'village-armor-shop': 'Armorer',
    'village-item-shop': 'Merchant',
  },
  items: {
    'iron-sword': 'Iron Sword',
    'steel-sword': 'Steel Sword',
    'runed-blade': 'Runed Blade',
    'leather-vest': 'Leather Vest',
    'chain-mail': 'Chain Mail',
    'plate-armor': 'Plate Armor',
    'vitality-charm': 'Vitality Charm',
    'heart-amulet': 'Heart Amulet',
    'life-crystal': 'Life Crystal',
    'ledger-fragment-1': 'Ledger Fragment',
    'tower-depth-sigil': 'Tower Sigil',
    'tower-restoration-core': 'Restoration Core',
  },
  clues: {
    'floor1-route-mark':
      'Route scratches point toward a connection that returns from below.',
    'floor1-treasury-overlook':
      'The arch facing the visible treasury is bricked from this side.',
    'floor2-paired-release-ledger':
      'A keeper\'s ledger lies open: "The hall releases are paired. Both answer to the sentry posted in the service wing — while it stands, neither gate yields."',
    'floor3-heart-lockdown-record':
      'The keeper etched one final warning: the guardian lattice is still defending an isolation state two floors down, at the true heart. Break the stalled guardian, recover the Restoration Core, and return it to the village before the tower flow fails completely.',
    'floor3-keeper-final-record':
      'Final keeper record: the paired releases isolated a guardian control fault. The isolation held, but nobody returned to clear it; the same tower flow continued feeding the village until the core began to fail.',
    'floor3-vault-route-mark':
      'The old route scratches repeat here, but one mark turns back toward the northwest wall instead of the tower heart.',
    'floor4-landing-scratches':
      'Scratched beside the stair: "The heart lies one floor down. Every way through the foundry answers to a blade."',
    'floor5-lattice-record':
      'The guardian lattice still hums with the old isolation order. Behind it, the Restoration Core waits above a dead lift shaft.',
  },
  // Shown when a sealed entrance or a locked portal is bumped.
  access: {
    'village-lift-to-floor5':
      'A lift cage hangs dead in its shaft. Its socket is shaped for a power core.',
    'village-mine-entrance':
      'Fallen timbers choke the old mine shaft. The way in is sealed for now.',
    'village-crypt-entrance':
      'An iron grate bars the crypt stair, its lock rusted shut. The way in is sealed for now.',
    'village-barrow-entrance':
      'A great stone rolled across the barrow mouth will not budge. The way in is sealed for now.',
    'floor1-front-to-floor2': 'A crest-shaped socket seals the lower stair.',
    'floor2-depth-to-floor3':
      'The lower keeper seal will not release until the missing subject returns with the warning from below.',
    'floor5-lift-to-village':
      'The lift cage hangs dead. Its socket is shaped for a power core.',
  },
  notes: {
    'village-tower-stairs-used': 'Stairs connect the village and Floor 1.',
    'floor1-treasury-seen':
      'A sealed treasury is visible from the Entry Court.',
    'floor1-treasury-sealed': 'The treasury arch is bricked from this side.',
    'floor1-route-mark-seen':
      'Route scratches point toward a connection that returns from below.',
    'floor1-depth-seal-seen': 'A crest-shaped socket seals the lower stair.',
    'floor1-depth-stairs-used': 'The lower stair reaches Floor 2.',
    'floor1-rear-stairs-used': 'A second stair returns to the Rear Wing.',
    'floor1-treasury-return-used':
      'A hidden stair behind the treasury reaches Floor 2 — the sealed treasury can be entered from behind.',
    'floor2-paired-release-ledger-read':
      'The keeper paired two hall releases: both stay shut until the service wing sentry falls.',
    'floor2-depth-seal-seen':
      'The lower seal would not release until the missing subject returned with the keeper warning.',
    'floor2-depth-stairs-used': 'The sealed lower stair reaches Floor 3.',
    'floor3-keeper-final-record-read':
      'The final keeper record says the paired releases isolated a failed guardian control state while the tower continued feeding the village system.',
    'floor3-depth-stairs-used':
      'The stair behind the heart sentinel reaches Floor 4.',
    'floor4-depth-stairs-used':
      'The foundry stair reaches Floor 5, the tower heart.',
    'tower-lift-seen':
      'A dead lift cage links the village to the tower heart. Its socket is shaped for a power core.',
  } satisfies Record<ObservationFactId, string>,
  dialogue: {
    'warden-main-lead':
      'Search the first floor for the crest that opens the lower stair.',
    'warden-sigil-found':
      'That sigil matches the lower seal. The stair to the next floor should open now.',
    'artisan-find-workshop':
      'My family workshop was sealed inside the tower. Look for its treasury.',
    'artisan-workshop-seen':
      'You saw the workshop treasury from the entrance side. Find a way closer.',
    'artisan-find-other-entrance':
      'The arch is bricked from this side. There must be another entrance from below.',
    'scout-find-marks':
      'An old plan shows a return passage where no corridor should exist. Watch for route scratches.',
    'scout-marks-seen':
      'Those scratches match the old plan. The route probably rejoins from below.',
    'scribe-find-ledger':
      'The tower keeper recorded every mechanism. Bring back any ledger fragment you find.',
    'scribe-fragment-found':
      'This fragment mentions paired mechanisms. More pages must survive deeper in the tower.',
    'warden-subject-returned':
      'You brought them home safely. But that sealed door below the Rear Gallery — what lies beyond it can wait no longer.',
    'subject-returning':
      'I can return to the village on my own. Tell the warden I am safe — and that something still waits below.',
    'subject-village':
      'I am home safe, but what I saw below the Rear Gallery still haunts me. Someone must investigate deeper.',
    'artisan-treasury-route-found':
      "A hidden stair reaches the treasury from below? Go — my family's heirloom can finally be claimed.",
    'artisan-heirloom-recovered':
      'The workshop heirloom is recovered at last. My family thanks you, explorer.',
    'scout-route-verified':
      'So the return connection is real. The old plan was accurate after all — the lost route is verified.',
    'scribe-floor2-ledger-read':
      "Paired guarded releases — so that is what the fragment meant. The keeper's final record must lie deeper in the tower.",
    'warden-restoration-ending':
      'The Restoration Core can restart the tower flow that keeps our village supplied. The guardian lock is broken; we can restore the system at last.',
    'warden-restoration-ending-ledger':
      'The Restoration Core can restart the village supply. The keeper record explains the failure too: the paired releases isolated a guardian control fault, but the isolation was never cleared. We can restore the system with the truth intact.',
    'scribe-final-ledger-read':
      'That final record closes the ledger. The guardians were trapped in an emergency isolation state, and the village kept depending on the same system they were defending.',
    'elder-sealed-crypt':
      'The crypt under the east hill was sealed before I was born. One day someone will have to open it, but not today.',
    'guard-sealed-mine':
      'The old mine collapsed years ago. Nobody goes down there until the shafts are shored up.',
    'child-gold-tip':
      'The tower guards drop coins when you beat them! The shops on Market Row will trade you gear for them.',
  } satisfies Record<DialogueLineId, string>,
};

export type Messages = typeof en;
