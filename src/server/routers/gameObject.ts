import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { Prisma } from '@prisma/client';

const TransformSchema = z.object({
  x: z.number(), y: z.number(),
  rotation: z.number(), scaleX: z.number(), scaleY: z.number(),
  originX: z.number(), originY: z.number(), depth: z.number(),
});

const GameObjectDataSchema = z.object({
  transform: TransformSchema.optional(),
  physics: z.record(z.string(), z.unknown()).optional(),
  spriteData: z.record(z.string(), z.unknown()).optional(),
  shapeData: z.record(z.string(), z.unknown()).optional(),
  textData: z.record(z.string(), z.unknown()).optional(),
  audioData: z.record(z.string(), z.unknown()).optional(),
  scriptIds: z.array(z.string()).optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  layerId: z.string().optional(),
});

export const gameObjectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      sceneId: z.string(),
      name: z.string().min(1).max(120),
      type: z.string().default('sprite'),
      data: GameObjectDataSchema.optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.gameObject.create({
        data: {
          sceneId: input.sceneId,
          name: input.name,
          type: input.type,
          data: (input.data ?? {}) as unknown as Prisma.InputJsonValue,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(120).optional(),
      data: GameObjectDataSchema.optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, data, ...rest } = input;
      return ctx.db.gameObject.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(data !== undefined ? { data: data as unknown as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  batchUpdate: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.string(),
        name: z.string().optional(),
        data: GameObjectDataSchema.optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.updates.map(({ id, data, name }) =>
          ctx.db.gameObject.update({
            where: { id },
            data: {
              ...(name !== undefined ? { name } : {}),
              ...(data !== undefined ? { data: data as unknown as Prisma.InputJsonValue } : {}),
            },
          })
        )
      );
      return results;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.gameObject.delete({ where: { id: input.id } })
    ),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string(), offsetX: z.number().default(16), offsetY: z.number().default(16) }))
    .mutation(async ({ ctx, input }) => {
      const orig = await ctx.db.gameObject.findUniqueOrThrow({ where: { id: input.id } });
      const data = orig.data as Record<string, unknown>;
      const transform = (data.transform ?? {}) as Record<string, unknown>;
      return ctx.db.gameObject.create({
        data: {
          sceneId: orig.sceneId,
          name: `${orig.name} copy`,
          type: orig.type,
          data: {
            ...data,
            transform: { ...transform, x: (transform.x as number ?? 0) + input.offsetX, y: (transform.y as number ?? 0) + input.offsetY },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }),
});
