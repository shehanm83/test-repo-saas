import Link from "next/link";
import { notFound } from "next/navigation";

import { createDb, getProjectWithGenerations } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { I } from "@/components/icons";
import { ProjectCaptionActions, ProjectImageActions } from "@/components/projects/project-actions";
import { ProjectManage } from "@/components/projects/project-manage";
import { getSessionWorkspace } from "@/lib/auth/server";

type OutputSettings = {
  aspectRatio?: string;
  width?: number;
  height?: number;
  platform?: string | null;
  format?: string | null;
};

type CommercialSettings = {
  mode?: string;
  creation_type?: string;
  campaign?: Record<string, unknown>;
  template?: Record<string, unknown>;
  composition?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  prompt?: { rendered_prompt?: string | null };
};

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function outputSettings(settings: unknown): OutputSettings {
  const record = asRecord(settings);
  return asRecord(record.output_target) as OutputSettings;
}

function commercialSettings(settings: unknown): CommercialSettings {
  const record = asRecord(settings);
  return asRecord(record.commercial) as CommercialSettings;
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DetailBlock(props: { label: string; value: Record<string, unknown> | undefined }) {
  const entries = Object.entries(props.value ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 12);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: "var(--cal-white)",
        boxShadow: "var(--shadow-ring)",
      }}
    >
      <div className="t-eyebrow" style={{ marginBottom: 10 }}>
        {props.label}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "132px 1fr", gap: 12 }}>
            <span className="t-small">{key}</span>
            <span style={{ fontSize: 13, color: "var(--fg-1)", overflowWrap: "anywhere" }}>
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) notFound();

  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");
  const data = await getProjectWithGenerations(db, session.workspaceId, id);
  if (!data) notFound();

  const storage = createStorage(config);
  const variantsByGeneration = new Map<string, typeof data.variants>();
  for (const variant of data.variants) {
    const rows = variantsByGeneration.get(variant.generationId) ?? [];
    rows.push(variant);
    variantsByGeneration.set(variant.generationId, rows);
  }

  const captionsByGeneration = new Map<string, typeof data.captions>();
  for (const caption of data.captions) {
    if (!caption.generationId) continue;
    const rows = captionsByGeneration.get(caption.generationId) ?? [];
    rows.push(caption);
    captionsByGeneration.set(caption.generationId, rows);
  }

  const generations = await Promise.all(
    data.generations.map(async (generation) => {
      const variants = await Promise.all(
        (variantsByGeneration.get(generation.id) ?? []).map(async (variant) => ({
          ...variant,
          url: variant.outputS3Key
            ? await storage.getSignedUrl(variant.outputS3Key, 60 * 60).catch(() => null)
            : null,
        })),
      );
      return {
        ...generation,
        variants,
        captions: captionsByGeneration.get(generation.id) ?? [],
      };
    }),
  );
  const imageCount = generations.reduce(
    (sum, generation) => sum + generation.variants.filter((variant) => variant.url).length,
    0,
  );
  const captionCount = generations.reduce(
    (sum, generation) => sum + generation.captions.filter((caption) => caption.outputText).length,
    0,
  );
  const headerThumbs = generations
    .flatMap((generation) => generation.variants.map((variant) => variant.url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  return (
    <div className="page page--wide">
      <div className="breadcrumb">
        <Link href="/projects" style={{ cursor: "pointer", textDecoration: "none" }}>
          Projects
        </Link>
        <I.ChevronRight size={12} />
        <span>{data.project.name}</span>
      </div>

      <div
        className="card"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "120px 1fr auto",
          gap: 24,
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 12,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            background: "var(--cal-gray-100)",
            boxShadow: "var(--shadow-ring)",
          }}
        >
          {[0, 1, 2, 3].map((index) => {
            const thumb = headerThumbs[index] ?? null;
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
                  <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <I.Image size={16} />
                )}
              </div>
            );
          })}
        </div>
        <div>
          <div>
            <div className="t-eyebrow" style={{ color: "var(--layertone-violet)", marginBottom: 6 }}>
              <I.Folder size={11} style={{ verticalAlign: "-1px" }} /> Project
            </div>
            <h1 className="t-h2" style={{ margin: 0 }}>
              {data.project.name}
            </h1>
            <div className="t-small" style={{ marginTop: 4 }}>
              {data.project.brandName ?? "Unbranded"} · created{" "}
              {data.project.createdAt.toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{generations.length}</div>
              <div className="t-small" style={{ fontSize: 11 }}>Generations</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{imageCount}</div>
              <div className="t-small" style={{ fontSize: 11 }}>Images</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{captionCount}</div>
              <div className="t-small" style={{ fontSize: 11 }}>Captions</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <div className="row">
            <Link href="/generate" className="btn btn--secondary" style={{ textDecoration: "none" }}>
              <I.Sparkle size={14} />
              New generation
            </Link>
            {generations[0] ? (
              <Link
                href={`/generations/${generations[0].id}`}
                className="btn btn--accent"
                style={{ textDecoration: "none" }}
              >
                <I.ExternalLink size={14} />
                Open latest result
              </Link>
            ) : null}
          </div>
          <ProjectManage projectId={data.project.id} currentName={data.project.name} />
        </div>
      </div>

      <div className="page__head" style={{ alignItems: "center" }}>
        <div>
          <h2 className="t-h4" style={{ margin: 0 }}>Project content</h2>
          <p className="page__sub">Images, captions, and settings saved from Quick Create.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {generations.map((generation) => {
          const output = outputSettings(generation.settings);
          const commercial = commercialSettings(generation.settings);
          return (
            <section key={generation.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid var(--cal-gray-200)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 650, color: "var(--fg-1)", marginBottom: 6 }}>
                    {generation.brief}
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <span className="pill">{generation.status}</span>
                    {output.platform ? <span className="pill">{output.platform}</span> : null}
                    {output.format ? <span className="pill">{output.format}</span> : null}
                    {output.width && output.height ? (
                      <span className="pill">{output.width} x {output.height}</span>
                    ) : null}
                    {output.aspectRatio ? <span className="pill">{output.aspectRatio}</span> : null}
                  </div>
                </div>
                <Link
                  href={`/generations/${generation.id}`}
                  className="btn btn--ghost btn--sm"
                  style={{ textDecoration: "none", flex: "0 0 auto" }}
                >
                  <I.ExternalLink size={13} />
                  Result
                </Link>
              </div>

              <div style={{ padding: 16, display: "grid", gap: 16 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                    gap: 12,
                  }}
                >
                  {generation.variants.map((variant, index) => (
                    <div
                      key={variant.id}
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "var(--cal-white)",
                        boxShadow: "var(--shadow-ring)",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: output.width && output.height ? `${output.width} / ${output.height}` : "1 / 1",
                          minHeight: 180,
                          background: "var(--cal-gray-100)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {variant.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={variant.url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <span className="t-small">{variant.status}</span>
                        )}
                      </div>
                      <div style={{ padding: 12, borderTop: "1px solid var(--cal-gray-200)" }}>
                        <div className="t-small" style={{ marginBottom: 10 }}>
                          Sample {index + 1} · {variant.modelUsed ?? "model pending"}
                        </div>
                        {variant.url ? (
                          <ProjectImageActions
                            url={variant.url}
                            filename={`project-${data.project.id.slice(0, 8)}-${variant.id.slice(0, 8)}.png`}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {generation.captions.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                      gap: 12,
                    }}
                  >
                    {generation.captions
                      .filter((caption) => caption.outputText)
                      .map((caption) => (
                        <div
                          key={caption.id}
                          style={{
                            padding: 16,
                            borderRadius: 8,
                            background: "var(--cal-white)",
                            boxShadow: "var(--shadow-ring)",
                          }}
                        >
                          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                            <strong style={{ fontSize: 13 }}>Caption</strong>
                            <ProjectCaptionActions text={caption.outputText ?? ""} />
                          </div>
                          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>
                            {caption.outputText}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                    gap: 12,
                  }}
                >
                  <DetailBlock
                    label="Output"
                    value={{
                      platform: output.platform,
                      format: output.format,
                      width: output.width,
                      height: output.height,
                      aspectRatio: output.aspectRatio,
                    }}
                  />
                  <DetailBlock
                    label="Creation"
                    value={{
                      mode: commercial.mode,
                      creation_type: commercial.creation_type,
                    }}
                  />
                  <DetailBlock label="Campaign" value={commercial.campaign} />
                  <DetailBlock label="Template" value={commercial.template} />
                  <DetailBlock label="Composition" value={commercial.composition} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
