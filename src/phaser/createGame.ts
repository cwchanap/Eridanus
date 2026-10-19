import Phaser from 'phaser';
import { WorldScene, type WorldSceneDeps } from './WorldScene';

export type CreatedGame = { game: Phaser.Game; scene: WorldScene };

// The parent's size in device pixels, and the scale zoom that shrinks a
// canvas of that size back to the parent's CSS size.
function deviceSize(parent: HTMLElement) {
  const ratio = window.devicePixelRatio;
  return {
    width: Math.round(parent.clientWidth * ratio),
    height: Math.round(parent.clientHeight * ratio),
    zoom: 1 / ratio,
  };
}

export function createGame(
  parent: HTMLElement,
  deps: WorldSceneDeps,
): CreatedGame {
  const scene = new WorldScene(deps);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    // The canvas fills the window at device-pixel resolution, so HiDPI
    // screens show the art crisp rather than a stretched 1x canvas.
    // WorldScene zooms the map to fit it.
    scale: { mode: Phaser.Scale.NONE, ...deviceSize(parent) },
    scene: [scene],
    pixelArt: true,
    // The page paints the backdrop around maps smaller than the window.
    transparent: true,
  });
  // Browser zoom and moving between screens change the pixel ratio, and
  // both fire resize. Resize first: setZoom restyles the canvas from it.
  window.addEventListener('resize', () => {
    const { width, height, zoom } = deviceSize(parent);
    game.scale.resize(width, height);
    game.scale.setZoom(zoom);
  });
  return { game, scene };
}
