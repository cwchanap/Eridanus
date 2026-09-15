import './styles.css';
import { createInitialGameState } from './game/state';
import { createGame } from './phaser/createGame';
import { InteractionOverlay } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

const state = createInitialGameState();
new InteractionOverlay(uiRoot).renderHud(state, 'Starting Village');
createGame(gameRoot);
