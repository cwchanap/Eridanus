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
    width: 640,
    height: 480,
    scene: [scene],
    pixelArt: true,
    // The page frame paints the backdrop behind maps smaller than the view.
    transparent: true,
  });
  return { game, scene };
}
