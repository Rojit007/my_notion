import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const publishRouter = createTRPCRouter({
  startBuild: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirstOrThrow({
        where: { id: input.projectId, userId: ctx.userId },
      });
      if (!project) throw new Error('Project not found');

      const job = await ctx.db.buildJob.create({
        data: { projectId: input.projectId, status: 'queued', progress: 0 },
      });
      return { jobId: job.id };
    }),

  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.buildJob.findUniqueOrThrow({ where: { id: input.jobId } })
    ),

  listJobs: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.buildJob.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    ),
});
