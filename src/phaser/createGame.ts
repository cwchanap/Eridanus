import Phaser from 'phaser';
import { WorldScene } from './WorldScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640,
    height: 480,
    scene: [WorldScene],
    pixelArt: true,
  });
}
