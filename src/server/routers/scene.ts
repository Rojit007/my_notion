import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const sceneRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.scene.findMany({
        where: { projectId: input.projectId },
        orderBy: { index: 'asc' },
        select: { id: true, name: true, index: true, updatedAt: true },
      })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.scene.findUniqueOrThrow({
        where: { id: input.id },
        include: { gameObjects: true },
      })
    ),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(100),
      index: z.number().int().min(0),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.scene.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          index: input.index,
          data: { layers: [], objects: [], gravity: { x: 0, y: 300 } } as Prisma.InputJsonValue,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      data: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, data, ...rest } = input;
      return ctx.db.scene.update({
        where: { id },
        data: {
          ...rest,
          ...(data !== undefined ? { data: data as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.scene.delete({ where: { id: input.id } })),

  reorder: protectedProcedure
    .input(z.object({ projectId: z.string(), sceneIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.sceneIds.map((id, index) =>
          ctx.db.scene.update({ where: { id }, data: { index } })
        )
      );
    }),

  save: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.record(z.string(), z.unknown()),
      gameObjects: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        data: z.record(z.string(), z.unknown()),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.scene.update({
        where: { id: input.id },
        data: { data: input.data as unknown as Prisma.InputJsonValue },
      });
      await Promise.all(
        input.gameObjects.map(obj =>
          ctx.db.gameObject.upsert({
            where: { id: obj.id },
            create: { id: obj.id, sceneId: input.id, name: obj.name, type: obj.type, data: obj.data as unknown as Prisma.InputJsonValue },
            update: { name: obj.name, type: obj.type, data: obj.data as unknown as Prisma.InputJsonValue },
          })
        )
      );
      return { ok: true };
    }),
});
