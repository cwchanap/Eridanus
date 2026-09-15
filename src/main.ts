import './styles.css';
import { MAPS } from './game/content';
import { dispatchInput } from './game/session';
import { createInitialGameState } from './game/state';
import type {
  ActionEffect,
  BlockedReason,
  InputCommand,
  SessionState,
} from './game/types';
import { createGame, type CreatedGame } from './phaser/createGame';
import { InteractionOverlay } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

let session: SessionState = { game: createInitialGameState(), pending: null };
let effect: ActionEffect | null = null;
let blocked: BlockedReason | null = null;

const overlay = new InteractionOverlay(
  uiRoot,
  () => handleInput({ kind: 'fight' }),
  () => handleInput({ kind: 'cancel' }),
);

function renderOverlay(): void {
  overlay.render({
    state: session.game,
    mapName: MAPS[session.game.mapId].name,
    pending: session.pending,
    effect,
    blocked,
  });
}

function handleInput(input: InputCommand): void {
  const transition = dispatchInput(session, input);
  if (transition.ok) {
    session = transition.session;
    effect = transition.effect;
    blocked = null;
  } else {
    blocked = transition.reason;
  }
  created.scene.refresh();
  renderOverlay();
}

const created: CreatedGame = createGame(gameRoot, {
  getSession: () => session,
  onInput: handleInput,
});
renderOverlay();
