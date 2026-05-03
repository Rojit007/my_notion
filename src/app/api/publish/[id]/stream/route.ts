import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { runBuildJob } from '@/server/services/publishService';

export const dynamic = 'force-dynamic';

// SSE endpoint that runs the build job and streams progress events
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Verify job exists
        const job = await db.buildJob.findUnique({ where: { id: jobId } });
        if (!job) {
          send({ type: 'error', message: 'Job not found' });
          controller.close();
          return;
        }

        send({ type: 'start', jobId });

        await runBuildJob(jobId, async (progress, message) => {
          send({ type: 'progress', progress, message });
        });

        const finalJob = await db.buildJob.findUnique({ where: { id: jobId } });
        send({ type: 'done', progress: 100, outputUrl: finalJob?.outputUrl ?? null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Build failed';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
