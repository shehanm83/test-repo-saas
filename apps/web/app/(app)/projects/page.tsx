import Link from "next/link";

import { createDb, listProjectsWithGenerations } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";

function relativeTime(date: Date): string {
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 86400 * 2) return "Yesterday";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} days ago`;
  return date.toLocaleDateString();
}

function createStorage(config: ReturnType<typeof loadConfig>) {
  return new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketApp,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });
}

export default async function ProjectsPage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");

  if (!session.workspaceId) {
    return <ProjectsEmpty />;
  }

  const data = await listProjectsWithGenerations(db, session.workspaceId);
  const storage = createStorage(config);

  const generationsByProject = new Map<string, typeof data.generations>();
  for (const generation of data.generations) {
    if (!generation.projectId) continue;
    const rows = generationsByProject.get(generation.projectId) ?? [];
    rows.push(generation);
    generationsByProject.set(generation.projectId, rows);
  }

  const variantsByGeneration = new Map<string, typeof data.variants>();
  for (const variant of data.variants) {
    const rows = variantsByGeneration.get(variant.generationId) ?? [];
    rows.push(variant);
    variantsByGeneration.set(variant.generationId, rows);
  }

  const projects = await Promise.all(
    data.projects.map(async (project) => {
      const generations = generationsByProject.get(project.id) ?? [];
      const variants = generations.flatMap((generation) => variantsByGeneration.get(generation.id) ?? []);
      const thumbs = await Promise.all(
        variants
          .filter((variant) => variant.outputS3Key)
          .slice(0, 4)
          .map(async (variant) => {
            try {
              return await storage.getSignedUrl(variant.outputS3Key!, 60 * 60);
            } catch {
              return null;
            }
          }),
      );
      return {
        ...project,
        generationCount: generations.length,
        imageCount: variants.filter((variant) => variant.outputS3Key).length,
        captionCount: data.captions.filter((caption) =>
          generations.some((generation) => generation.id === caption.generationId),
        ).length,
        latestGenerationAt: generations[0]?.createdAt ?? project.createdAt,
        thumbs,
      };
    }),
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            <I.Folder size={11} /> Saved work
          </p>
          <h1 className="page__title">Projects</h1>
          <p className="page__sub">
            {projects.length} saved Quick Create projects with generated content.
          </p>
        </div>
        <Link href="/generate" className="btn btn--accent">
          <I.Sparkle size={14} />
          New generation
        </Link>
      </div>

      {projects.length === 0 ? (
        <ProjectsEmpty />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card group flex flex-col overflow-hidden !p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="grid h-[140px] grid-cols-2 gap-0.5 border-b border-ink/8 bg-cream-deep">
                {[0, 1, 2, 3].map((index) => {
                  const thumb = project.thumbs[index] ?? null;
                  return (
                    <div
                      key={index}
                      className="grid place-items-center overflow-hidden bg-cream-deep text-ink-soft/40"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <I.Image size={16} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <div className="font-display text-lg leading-tight text-ink">{project.name}</div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="pill">{project.brandName ?? "Unbranded"}</span>
                    <span className="pill">{project.generationCount} generations</span>
                    <span className="pill">{project.imageCount} images</span>
                    {project.captionCount > 0 ? (
                      <span className="pill">{project.captionCount} captions</span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/8 pt-3">
                  <span className="text-xs text-ink-soft">
                    Updated {relativeTime(project.latestGenerationAt)}
                  </span>
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-all duration-200 group-hover:bg-brand-50 group-hover:text-brand"
                    aria-hidden="true"
                  >
                    <I.ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsEmpty() {
  return (
    <div className="empty card" style={{ marginTop: 24 }}>
      <div className="empty__art">
        <I.Folder size={32} />
      </div>
      <div className="empty__title">No projects yet</div>
      <div className="empty__sub">
        Open a completed Quick Create generation and create a project from it.
      </div>
      <Link href="/history" className="btn btn--accent" style={{ textDecoration: "none" }}>
        <I.History size={14} />
        View history
      </Link>
    </div>
  );
}
