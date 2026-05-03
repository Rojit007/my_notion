'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { toast } from './Toast';

interface PublishModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

type Stage = 'idle' | 'building' | 'done' | 'error';

export function PublishModal({ projectId, projectName, onClose }: PublishModalProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [buildMessage, setBuildMessage] = useState('Preparing build…');
  const startBuild = trpc.publish.startBuild.useMutation();

  const handlePublish = useCallback(async () => {
    setStage('building');
    setProgress(0);
    setErrorMsg(null);
    setBuildMessage('Starting build…');

    let result: { jobId: string };
    try {
      result = await startBuild.mutateAsync({ projectId });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to start build');
      setStage('error');
      return;
    }

    setJobId(result.jobId);

    // Connect to SSE stream for real-time progress
    const es = new EventSource(`/api/publish/${result.jobId}/stream`);
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data as string) as {
          type: string; progress?: number; message?: string; outputUrl?: string;
        };
        if (data.type === 'progress') {
          setProgress(data.progress ?? 0);
          setBuildMessage(data.message ?? '');
        } else if (data.type === 'done') {
          setProgress(100);
          setPublishedUrl(data.outputUrl ?? null);
          setStage('done');
          toast.success('Published!', `${projectName} is now live.`);
          es.close();
        } else if (data.type === 'error') {
          setErrorMsg(data.message ?? 'Build failed');
          setStage('error');
          toast.error('Publish failed', data.message);
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      setErrorMsg('Connection lost during build');
      setStage('error');
      es.close();
    };
  }, [projectId, projectName, startBuild]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 'var(--z-modal)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl flex flex-col"
        style={{
          width: 420,
          background: 'var(--color-bg-s1)',
          border: '1px solid var(--color-border-default)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
              <Rocket size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-p)' }}>Publish Game</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-t)' }}>{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-s2 transition-colors"
            style={{ color: 'var(--color-text-t)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {stage === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  className="rounded-xl p-4 mb-4 flex items-start gap-3"
                  style={{ background: 'var(--color-bg-s2)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <Rocket size={18} style={{ color: 'var(--color-accent)', marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-p)' }}>Ready to publish</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-s)' }}>
                      Your game will be bundled and published to the portal. All scenes, assets, and scripts will be included.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePublish}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-98"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                  }}
                >
                  <Rocket size={15} /> Publish to Portal
                </button>
              </motion.div>
            )}

            {stage === 'building' && (
              <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={40} style={{ color: 'var(--color-accent)' }} />
                  </motion.div>
                </div>
                <div className="w-full">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-s)' }}>Building…</span>
                    <span className="text-xs" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{progress}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-bg-s3)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-t)' }}>{buildMessage}</p>
              </motion.div>
            )}

            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-p)' }}>Published!</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-s)' }}>Your game is live on the portal.</p>
                </div>
                {publishedUrl && (
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}
                  >
                    Open Game <ExternalLink size={13} />
                  </a>
                )}
                <button onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-t)' }}>Close</button>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-4">
                <AlertCircle size={40} style={{ color: 'var(--color-danger)' }} />
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-p)' }}>Publish Failed</p>
                  <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errorMsg}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStage('idle')}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-bg-s2"
                    style={{ color: 'var(--color-text-s)', border: '1px solid var(--color-border-default)' }}
                  >
                    Try Again
                  </button>
                  <button onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-t)' }}>Close</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
