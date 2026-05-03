import { EditorPageClient } from './EditorPageClient';

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <EditorPageClient projectId={projectId} />;
}
