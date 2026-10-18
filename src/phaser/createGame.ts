import Phaser from 'phaser';
import { WorldScene, type WorldSceneDeps } from './WorldScene';

export type CreatedGame = { game: Phaser.Game; scene: WorldScene };

export function createGame(
  parent: HTMLElement,
  deps: WorldSceneDeps,
): CreatedGame {
  const scene = new WorldScene(deps);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    // The canvas fills the window; WorldScene zooms the map to fit it.
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [scene],
    pixelArt: true,
    // The page paints the backdrop around maps smaller than the window.
    transparent: true,
  });
  return { game, scene };
}
