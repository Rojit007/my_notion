import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const scriptRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.script.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'asc' },
      })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.script.findUniqueOrThrow({ where: { id: input.id } })
    ),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(100),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.script.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          data: { blocks: {}, wires: [], variables: [] } as Prisma.InputJsonValue,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, data, ...rest } = input;
      return ctx.db.script.update({
        where: { id },
        data: {
          ...rest,
          ...(data !== undefined ? { data: data as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.script.delete({ where: { id: input.id } })),
});
