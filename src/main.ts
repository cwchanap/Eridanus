import '@fontsource/cinzel/latin-700.css';
import './styles.css';
import { cuesFor } from './audio/cues';
import { Sfx } from './audio/sfx';
import { buildJournalView } from './game/journal';
import { dispatchInput } from './game/session';
import { loadGame, resetGame, saveGame } from './game/save';
import { createInitialGameState } from './game/state';
import type {
  ActionEffect,
  BlockedReason,
  InputCommand,
  SessionState,
} from './game/types';
import { loadLocale, saveLocale, type Locale } from './i18n/locale';
import { MESSAGES } from './i18n/messages';
import { createGame, type CreatedGame } from './phaser/createGame';
import { InteractionOverlay, showsMessage } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

let session: SessionState = { game: createInitialGameState(), pending: null };
let effect: ActionEffect | null = null;
let blocked: BlockedReason | null = null;
let created: CreatedGame | null = null;
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

function renderOverlay(): void {
  overlay.render({
    state: session.game,
    locale,
    pending: session.pending,
    effect,
    blocked,
    journal: buildJournalView(session.game),
  });
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
  const previousGame = session.game;
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
  sfx.play(cuesFor(input, transition));
  created.scene.refresh();
  renderOverlay();
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
      getSession: () => session,
      hasMessage: () => showsMessage(effect, blocked, MESSAGES[locale]),
      onInput: handleInput,
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
