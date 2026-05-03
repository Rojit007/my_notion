import { db } from '../db';
import { storageService } from './storageService';

type ProgressCallback = (progress: number, message: string) => Promise<void>;

// Server-side publish: fetch project from DB, bundle as ZIP, upload, update job
export async function runBuildJob(jobId: string, onProgress?: ProgressCallback): Promise<void> {
  const report = async (progress: number, message: string) => {
    await db.buildJob.update({ where: { id: jobId }, data: { progress, status: 'building' } });
    await onProgress?.(progress, message);
  };

  try {
    await report(5, 'Loading project data…');

    const job = await db.buildJob.findUniqueOrThrow({ where: { id: jobId } });
    const project = await db.project.findUniqueOrThrow({
      where: { id: job.projectId },
      include: {
        scenes: { include: { gameObjects: true }, orderBy: { index: 'asc' } },
        assets: true,
        scripts: true,
        animations: true,
      },
    });

    await report(20, 'Bundling project JSON…');

    // Build serializable project snapshot (same shape as ProjectState)
    const sceneIds: string[] = [];
    const scenes: Record<string, unknown> = {};

    for (const scene of project.scenes) {
      const objects: Record<string, unknown> = {};
      for (const obj of scene.gameObjects) {
        objects[obj.id] = { id: obj.id, name: obj.name, type: obj.type, ...(obj.data as object) };
      }
      scenes[scene.id] = { id: scene.id, name: scene.name, index: scene.index, objects, ...(scene.data as object) };
      sceneIds.push(scene.id);
    }

    const assets: Record<string, unknown> = {};
    for (const a of project.assets) {
      assets[a.id] = { id: a.id, name: a.name, type: a.type, mimeType: a.mimeType, url: a.url, thumbnailUrl: a.thumbnailUrl, ...(a.meta as object) };
    }

    const scripts: Record<string, unknown> = {};
    for (const s of project.scripts) {
      scripts[s.id] = { id: s.id, name: s.name, ...(s.data as object) };
    }

    const snapshot = {
      id: project.id,
      name: project.name,
      settings: project.settings,
      sceneIds,
      scenes,
      assets,
      scripts,
    };

    await report(40, 'Generating game bundle…');

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder('game')!;

    folder.file('project.json', JSON.stringify(snapshot, null, 2));
    folder.file('index.html', buildHTMLShell(project.name));
    folder.file('game.js', buildBootstrapJS());

    await report(65, 'Compressing archive…');

    const zipBuffer: Buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    await report(80, 'Uploading to storage…');

    const slug = project.slug ?? job.projectId;
    const filename = `builds/${slug}_v${project.buildVersion + 1}.zip`;
    const { url } = await storageService.uploadText(zipBuffer.toString('binary'), filename);

    // Also upload index.html directly so the game has a stable URL
    const htmlKey = `games/${slug}/index.html`;
    await storageService.uploadText(buildHTMLShell(project.name), htmlKey);
    await storageService.uploadText(buildBootstrapJS(), `games/${slug}/game.js`);
    await storageService.uploadText(JSON.stringify(snapshot, null, 2), `games/${slug}/project.json`);

    const publishedUrl = `/uploads/games/${slug}/index.html`;

    await report(95, 'Finalizing…');

    await db.$transaction([
      db.buildJob.update({
        where: { id: jobId },
        data: { status: 'done', progress: 100, outputUrl: url },
      }),
      db.project.update({
        where: { id: project.id },
        data: {
          status: 'published',
          publishedUrl,
          publishedAt: new Date(),
          buildVersion: { increment: 1 },
        },
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db.buildJob.update({
      where: { id: jobId },
      data: { status: 'error', error: message },
    }).catch(() => undefined);
    throw err;
  }
}

function buildHTMLShell(name: string): string {
  const safe = name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${safe}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}canvas{display:block;max-width:100%;max-height:100vh}</style>
</head>
<body>
  <div id="game-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
  <script src="game.js"></script>
</body>
</html>`;
}

function buildBootstrapJS(): string {
  return `(async function(){
  const resp=await fetch('project.json');
  const project=await resp.json();
  const settings=project.settings??{};
  class GameScene extends Phaser.Scene{
    constructor(){super({key:'GameScene'});}
    preload(){
      Object.values(project.assets??{}).forEach(a=>{
        if(a.type==='image'||a.type==='spritesheet')this.load.image(a.id,a.url);
        else if(a.type==='audio')this.load.audio(a.id,a.url);
      });
    }
    create(){
      const sid=settings.defaultStartScene??project.sceneIds?.[0];
      const scene=sid?project.scenes?.[sid]:{};
      Object.values(scene?.objects??{}).forEach(obj=>{
        const{x,y,rotation,scaleX,scaleY}=obj.transform??{};
        if(obj.type==='sprite'&&obj.spriteData?.assetId){
          const s=this.add.sprite(x??0,y??0,obj.spriteData.assetId);
          s.setRotation(Phaser.Math.DegToRad(rotation??0));
          s.setScale(scaleX??1,scaleY??1);
        }else if(obj.type==='rectangle'&&obj.shapeData){
          this.add.rectangle(x??0,y??0,obj.shapeData.width??64,obj.shapeData.height??64,obj.shapeData.fillColor??0xffffff);
        }
      });
    }
  }
  new Phaser.Game({
    type:Phaser.AUTO,parent:'game-container',
    width:settings.canvasWidth??960,height:settings.canvasHeight??540,
    backgroundColor:settings.backgroundColor??'#1a1a2e',
    scene:[GameScene],
  });
})();`;
}
