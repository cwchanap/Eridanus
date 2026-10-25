import '@fontsource/cinzel/latin-700.css';
import './styles.css';
import { cuesFor } from './audio/cues';
import { Sfx, type SfxCue } from './audio/sfx';
import { combatBlows, type Blow } from './game/combat';
import { findEntityById } from './game/content';
import { buildJournalView } from './game/journal';
import { dispatchInput } from './game/session';
import { loadGame, resetGame, saveGame } from './game/save';
import { createInitialGameState } from './game/state';
import type {
  ActionEffect,
  BlockedReason,
  GameState,
  InputCommand,
  SessionState,
} from './game/types';
import { loadLocale, saveLocale, type Locale } from './i18n/locale';
import { MESSAGES } from './i18n/messages';
import { IMPACT, blowMs } from './phaser/animation';
import { createGame, type CreatedGame } from './phaser/createGame';
import type { Strike } from './phaser/WorldScene';
import { InteractionOverlay, showsMessage } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

let session: SessionState = { game: createInitialGameState(), pending: null };
let effect: ActionEffect | null = null;
let blocked: BlockedReason | null = null;
let created: CreatedGame | null = null;
// A won fight replays blow by blow before its victory shows. The fight is
// already resolved and saved; this only holds back what the player sees:
// the game from before it, with the hero's HP ticking down. Enter or Escape
// skips to the end.
type Battle = {
  before: GameState;
  enemyId: string;
  blows: readonly Blow[];
  // Blows started, and blows that have struck home (each lands IMPACT into
  // its blow, when the scene shows the hit).
  shown: number;
  landed: number;
  enemyHp: number;
  ms: number;
  timer: number;
  // The fight's own cues, held for its end.
  cues: readonly SfxCue[];
};
let battle: Battle | null = null;
let locale = loadLocale(window.localStorage);
document.documentElement.lang = locale;
const sfx = new Sfx(window.localStorage);

const overlay = new InteractionOverlay(
  uiRoot,
  () => handleInput({ kind: 'confirm' }),
  () => handleInput({ kind: 'cancel' }),
  sfx,
  changeLocale,
);

// Both sides' HP as the battle shows them: from the last blow to land.
function battleHp(fight: Battle): { heroHp: number; enemyHp: number } {
  return (
    fight.blows[fight.landed - 1] ?? {
      heroHp: fight.before.player.hp,
      enemyHp: fight.enemyHp,
    }
  );
}

// What the map and HUD show: the session, or the game mid-battle.
function shownSession(): SessionState {
  if (!battle) return session;
  const { before } = battle;
  const hp = battleHp(battle).heroHp;
  return {
    game: { ...before, player: { ...before.player, hp } },
    pending: null,
  };
}

function currentStrike(): Strike | null {
  if (!battle) return null;
  const blow = battle.blows[battle.shown - 1];
  if (!blow) return null;
  const { enemyId, shown, ms, blows } = battle;
  return { enemyId, blow, index: shown, ms, last: shown === blows.length };
}

function renderOverlay(): void {
  const { game, pending } = shownSession();
  const strike = currentStrike();
  overlay.render({
    state: game,
    locale,
    pending,
    effect: battle ? null : effect,
    blocked,
    journal: buildJournalView(game),
    battle: strike &&
      battle && {
        enemyId: strike.enemyId,
        blow: strike.blow,
        enemyHp: battleHp(battle).enemyHp,
      },
  });
}

function redraw(): void {
  created?.scene.refresh();
  renderOverlay();
}

function startBattle(
  before: GameState,
  enemyId: string,
  cues: readonly SfxCue[],
): boolean {
  const enemy = findEntityById(enemyId);
  if (enemy?.kind !== 'enemy') return false;
  const blows = combatBlows(before.player, enemy.stats);
  if (blows.length === 0) return false;
  battle = {
    before,
    enemyId,
    blows,
    shown: 0,
    landed: 0,
    enemyHp: enemy.stats.hp,
    ms: blowMs(blows.length),
    timer: 0,
    cues,
  };
  nextBlow();
  return true;
}

// A blow starts with the striker's lunge; its hit lands IMPACT into it.
function nextBlow(): void {
  if (!battle) return;
  battle.shown += 1;
  battle.timer = window.setTimeout(landBlow, battle.ms * IMPACT);
  redraw();
}

// The hit connects: HP drops and the hit sounds as the scene flashes the
// one struck. After the last one the enemy gets another blow's length to
// fade.
function landBlow(): void {
  if (!battle) return;
  battle.landed = battle.shown;
  sfx.play(['hit']);
  const last = battle.shown === battle.blows.length;
  battle.timer = window.setTimeout(
    last ? endBattle : nextBlow,
    battle.ms * ((last ? 2 : 1) - IMPACT),
  );
  redraw();
}

function endBattle(): void {
  if (!battle) return;
  window.clearTimeout(battle.timer);
  const { cues } = battle;
  battle = null;
  sfx.play(cues);
  redraw();
}

function changeLocale(next: Locale): void {
  locale = next;
  saveLocale(window.localStorage, locale);
  // The browser picks CJK glyph variants and fonts from the page language.
  document.documentElement.lang = locale;
  renderOverlay();
}

function handleInput(input: InputCommand): void {
  if (!created) return;
  // A playing battle takes no moves; Enter or Escape skips it.
  if (battle) {
    if (input.kind !== 'move') endBattle();
    return;
  }
  const previousGame = session.game;
  const previousPending = session.pending;
  const transition = dispatchInput(session, input);
  if (transition.ok) {
    session = transition.session;
    effect = transition.effect;
    blocked = null;
    if (session.game !== previousGame)
      saveGame(window.localStorage, session.game);
  } else {
    blocked = transition.reason;
  }
  const cues = cuesFor(input, transition);
  if (
    transition.ok &&
    previousPending?.kind === 'combat' &&
    transition.effect?.kind === 'enemyDefeated' &&
    startBattle(previousGame, previousPending.enemyId, cues)
  )
    return;
  sfx.play(cues);
  redraw();
}

function startRuntime(
  initialGame: ReturnType<typeof createInitialGameState>,
): void {
  session = { game: initialGame, pending: null };
  effect = null;
  blocked = null;
  if (!created) {
    // Scene create() performs the first refresh once Phaser boots.
    created = createGame(gameRoot!, {
      getSession: shownSession,
      // A playing battle counts, so a fresh Enter or Escape skips it.
      hasMessage: () =>
        battle !== null || showsMessage(effect, blocked, MESSAGES[locale]),
      onInput: handleInput,
      onMenu: () => overlay.openMenu(),
      getStrike: currentStrike,
    });
  } else {
    created.scene.refresh();
  }
  renderOverlay();
}

const load = loadGame(window.localStorage);
if (load.kind === 'invalid') {
  // No scene exists yet, so keyboard input stays dead until the explicit reset.
  overlay.renderInvalidSave(locale, () =>
    startRuntime(resetGame(window.localStorage)),
  );
} else {
  startRuntime(load.state);
}
