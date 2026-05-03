import { createTRPCRouter } from '../trpc';
import { projectRouter } from './project';
import { sceneRouter } from './scene';
import { gameObjectRouter } from './gameObject';
import { assetRouter } from './asset';
import { scriptRouter } from './script';
import { animationRouter } from './animation';
import { publishRouter } from './publish';

export const appRouter = createTRPCRouter({
  project: projectRouter,
  scene: sceneRouter,
  gameObject: gameObjectRouter,
  asset: assetRouter,
  script: scriptRouter,
  animation: animationRouter,
  publish: publishRouter,
});

export type AppRouter = typeof appRouter;
