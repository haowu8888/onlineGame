import { SceneShell } from './game-three-shell.js?v=38';
import { ThreeGameScene } from './game-three-runtime.js?v=38';

let activeScene = null;

GameScenes.subscribe(source => {
  const shell = new SceneShell(document);
  const scene = new ThreeGameScene({ shell, source, document, window });
  activeScene = scene;
  try {
    scene.start();
  } catch (error) {
    scene.fail(error);
    scene.dispose();
    throw error;
  }
});

export function getSceneSnapshot() {
  return activeScene ? activeScene.snapshot() : null;
}
