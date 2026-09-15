import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
  }
}
