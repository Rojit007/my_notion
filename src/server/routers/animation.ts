import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { Prisma } from '@prisma/client';

const AnimationDataSchema = z.object({
  frameStart: z.number().int().min(0),
  frameEnd: z.number().int().min(0),
  frameRate: z.number().min(1).max(120),
  loop: z.boolean(),
  yoyo: z.boolean().optional(),
});

export const animationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.animation.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'asc' },
      })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.animation.findUniqueOrThrow({ where: { id: input.id } })
    ),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      assetId: z.string(),
      name: z.string().min(1).max(80),
      data: AnimationDataSchema,
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.animation.create({
        data: {
          projectId: input.projectId,
          assetId: input.assetId,
          name: input.name,
          data: input.data as unknown as Prisma.InputJsonValue,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(80).optional(),
      data: AnimationDataSchema.optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.db.animation.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(rest.data !== undefined ? { data: rest.data as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.animation.delete({ where: { id: input.id } })
    ),
});
