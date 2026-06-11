import { GameManager } from './game/GameManager';

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app container');

const game = new GameManager(container);
game.start();
