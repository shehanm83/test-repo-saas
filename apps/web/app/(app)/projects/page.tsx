import Link from "next/link";

import { createDb, listProjectsWithGenerations } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";
import { S3StorageAdapter } from "@vyora/storage";

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
          <div className="t-eyebrow" style={{ color: "var(--studio-violet)", marginBottom: 6 }}>
            <I.Folder size={11} style={{ verticalAlign: "-1px" }} /> Saved work
          </div>
          <h1 className="page__title">Projects</h1>
          <p className="page__sub">
            {projects.length} saved Quick Create projects with generated content.
          </p>
        </div>
        <Link href="/generate" className="btn btn--accent" style={{ textDecoration: "none" }}>
          <I.Sparkle size={14} />
          New generation
        </Link>
      </div>

      {projects.length === 0 ? (
        <ProjectsEmpty />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    height: 120,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                    background: "var(--cal-gray-100)",
                    borderBottom: "1px solid var(--cal-gray-200)",
                  }}
                >
                  {[0, 1, 2, 3].map((index) => {
                    const thumb = project.thumbs[index] ?? null;
                    return (
                      <div
                        key={index}
                        style={{
                          background: "var(--cal-gray-200)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--fg-4)",
                        }}
                      >
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <I.Image size={16} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: 16, display: "grid", gap: 12, flex: 1 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        lineHeight: 1.2,
                        color: "var(--fg-1)",
                      }}
                    >
                      {project.name}
                    </div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                      <span className="pill">{project.brandName ?? "Unbranded"}</span>
                      <span className="pill">{project.generationCount} generations</span>
                      <span className="pill">{project.imageCount} images</span>
                      {project.captionCount > 0 ? (
                        <span className="pill">{project.captionCount} captions</span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop: "1px solid var(--cal-gray-200)",
                      paddingTop: 12,
                      marginTop: "auto",
                    }}
                  >
                    <div className="t-small">Updated {relativeTime(project.latestGenerationAt)}</div>
                    <span className="btn btn--icon btn--ghost" aria-hidden="true">
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
