import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { defaultProjectSettings } from '@/store/types';

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, description: true, thumbnailUrl: true,
        slug: true, status: true, publishedAt: true, publishedUrl: true,
        createdAt: true, updatedAt: true,
        _count: { select: { scenes: true, assets: true } },
      },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirstOrThrow({
        where: { id: input.id, userId: ctx.userId },
        include: {
          scenes: { include: { gameObjects: true }, orderBy: { index: 'asc' } },
          assets: { orderBy: { createdAt: 'asc' } },
          scripts: { orderBy: { createdAt: 'asc' } },
          animations: { orderBy: { createdAt: 'asc' } },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      genre: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = defaultProjectSettings() as unknown as Prisma.InputJsonValue;
      const project = await ctx.db.project.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
          settings,
        },
      });
      await ctx.db.scene.create({
        data: {
          projectId: project.id,
          name: 'Scene 1',
          index: 0,
          data: { layers: [], objects: [], gravity: { x: 0, y: 300 } } as Prisma.InputJsonValue,
        },
      });
      return project;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, settings, ...rest } = input;
      return ctx.db.project.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(settings !== undefined ? { settings: settings as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.project.delete({
        where: { id: input.id, userId: ctx.userId },
      });
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.project.findFirstOrThrow({
        where: { id: input.id, userId: ctx.userId },
        include: { scenes: { include: { gameObjects: true } }, assets: true, scripts: true, animations: true },
      });

      return ctx.db.project.create({
        data: {
          userId: ctx.userId,
          name: `${source.name} (Copy)`,
          description: source.description,
          settings: source.settings as Prisma.InputJsonValue,
          scenes: {
            create: source.scenes.map(s => ({
              name: s.name, index: s.index, data: s.data as Prisma.InputJsonValue,
              gameObjects: { create: s.gameObjects.map(g => ({ name: g.name, type: g.type, data: g.data as Prisma.InputJsonValue })) },
            })),
          },
          scripts: { create: source.scripts.map(s => ({ name: s.name, data: s.data as Prisma.InputJsonValue })) },
          animations: { create: source.animations.map(a => ({ assetId: a.assetId, name: a.name, data: a.data as Prisma.InputJsonValue })) },
        },
      });
    }),
});
