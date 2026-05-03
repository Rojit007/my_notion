import { createTRPCRouter } from '../trpc';
import { projectRouter } from './project';
import { sceneRouter } from './scene';
import { assetRouter } from './asset';
import { scriptRouter } from './script';
import { publishRouter } from './publish';

export const appRouter = createTRPCRouter({
  project: projectRouter,
  scene: sceneRouter,
  asset: assetRouter,
  script: scriptRouter,
  publish: publishRouter,
});

export type AppRouter = typeof appRouter;
