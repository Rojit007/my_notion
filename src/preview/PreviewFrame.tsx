'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';

// Sandboxed preview mode — renders the game via GameRuntime in an isolated container
// Physics and scripts run; editor state is untouched (deep clone is passed in)
export function PreviewFrame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<import('@/runtime/GameRuntime').GameRuntime | null>(null);
  const project = useEditorStore(s => s.project);

  useEffect(() => {
    if (!containerRef.current || !project) return;

    const snapshot = structuredClone(project);
    let mounted = true;

    import('@/runtime/GameRuntime').then(({ GameRuntime }) => {
      if (!mounted || !containerRef.current) return;
      const rt = new GameRuntime();
      runtimeRef.current = rt;
      rt.start(snapshot, containerRef.current);
    });

    return () => {
      mounted = false;
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    };
  }, []); // Only mount once per preview session

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: project?.settings.backgroundColor ?? '#1a1a2e' }}
    />
  );
}
