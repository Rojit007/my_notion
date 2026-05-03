import type { ProjectState } from '@/store/types';
import { serializeScript } from '@/editor/scripting/ScriptSerializer';

export interface ExportResult {
  blob: Blob;
  filename: string;
}

// Generates a self-contained HTML+JS game bundle as a ZIP
export async function exportProject(project: ProjectState): Promise<ExportResult> {
  const { default: JSZip } = await import('jszip');

  const zip = new JSZip();
  const gameFolder = zip.folder('game')!;

  // Project data JSON (all scenes, objects, scripts, settings)
  const projectData = JSON.stringify({
    id: project.id,
    name: project.name,
    settings: project.settings,
    sceneIds: project.sceneIds,
    scenes: project.scenes,
    scripts: Object.fromEntries(
      Object.entries(project.scripts).map(([id, graph]) => [id, serializeScript(graph)])
    ),
    assets: Object.fromEntries(
      Object.entries(project.assets).map(([id, asset]) => [
        id,
        { ...asset, previewUrl: undefined }, // strip blob URLs
      ])
    ),
  }, null, 2);

  gameFolder.file('project.json', projectData);

  // Minimal runtime HTML shell
  const html = generateHTMLShell(project.name, project.settings.canvasWidth, project.settings.canvasHeight);
  gameFolder.file('index.html', html);

  // Inline game bootstrap JS
  const bootstrapJS = generateBootstrapJS();
  gameFolder.file('game.js', bootstrapJS);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.zip`;

  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function generateHTMLShell(name: string, width: number, height: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    canvas { display: block; max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
  <script src="game.js"></script>
</body>
</html>`;
}

function generateBootstrapJS(): string {
  return `// GameForge Studio — auto-generated game
(async function() {
  const resp = await fetch('project.json');
  const project = await resp.json();
  const settings = project.settings;

  class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    preload() {
      const assets = project.assets ?? {};
      Object.values(assets).forEach(asset => {
        if (!asset.url) return;
        if (asset.type === 'image' || asset.type === 'spritesheet') {
          this.load.image(asset.id, asset.url);
        } else if (asset.type === 'audio') {
          this.load.audio(asset.id, asset.url);
        }
      });
    }

    create() {
      const startId = settings.defaultStartScene ?? project.sceneIds[0];
      const scene = startId ? (project.scenes[startId] ?? {}) : {};
      const objects = scene.objects ?? {};

      Object.values(objects).forEach(obj => {
        const { x, y, rotation, scaleX, scaleY } = obj.transform ?? {};
        if (obj.type === 'sprite' && obj.spriteData?.assetId) {
          const s = this.add.sprite(x ?? 0, y ?? 0, obj.spriteData.assetId);
          s.setRotation(Phaser.Math.DegToRad(rotation ?? 0));
          s.setScale(scaleX ?? 1, scaleY ?? 1);
          s.name = obj.name;
        } else if (obj.type === 'rectangle' && obj.shapeData) {
          this.add.rectangle(x ?? 0, y ?? 0, obj.shapeData.width ?? 64, obj.shapeData.height ?? 64, obj.shapeData.fillColor ?? 0xffffff);
        }
      });
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: settings.canvasWidth ?? 960,
    height: settings.canvasHeight ?? 540,
    backgroundColor: settings.backgroundColor ?? '#1a1a2e',
    scene: [GameScene],
  });
})();`;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
