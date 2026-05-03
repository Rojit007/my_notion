import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const assetRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(({ ctx, input }) =>
      ctx.db.asset.findMany({
        where: {
          projectId: input.projectId,
          type: input.type,
          name: input.search ? { contains: input.search, mode: 'insensitive' } : undefined,
        },
        orderBy: { createdAt: 'asc' },
      })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.asset.findUniqueOrThrow({ where: { id: input.id } })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      tags: z.array(z.string()).optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, meta, ...rest } = input;
      return ctx.db.asset.update({
        where: { id },
        data: {
          ...rest,
          ...(meta !== undefined ? { meta: meta as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  parseSpritesheet: protectedProcedure
    .input(z.object({
      id: z.string(),
      frameWidth: z.number().int().positive(),
      frameHeight: z.number().int().positive(),
      margin: z.number().int().min(0).default(0),
      spacing: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findUniqueOrThrow({ where: { id: input.id } });
      const meta = asset.meta as Record<string, unknown>;
      const totalWidth = (meta.width as number) ?? 0;
      const totalHeight = (meta.height as number) ?? 0;
      const cols = Math.floor((totalWidth - input.margin) / (input.frameWidth + input.spacing));
      const rows = Math.floor((totalHeight - input.margin) / (input.frameHeight + input.spacing));
      const frameCount = cols * rows;

      return ctx.db.asset.update({
        where: { id: input.id },
        data: {
          type: 'spritesheet',
          meta: {
            ...meta,
            frameWidth: input.frameWidth,
            frameHeight: input.frameHeight,
            frameCount,
            margin: input.margin,
            spacing: input.spacing,
            cols, rows,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.asset.delete({ where: { id: input.id } })),
});
