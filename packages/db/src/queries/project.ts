import { and, desc, eq, inArray } from "drizzle-orm";

import type { Db } from "../client";
import { brands, captionJobs, generations, generationVariants, projects } from "../schema";
import { withWorkspace } from "../with-workspace";

function projectNameFromBrief(brief: string) {
  const normalized = brief.replace(/\s+/g, " ").trim();
  if (!normalized) return "Quick Create project";
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
}

export async function createProjectFromGeneration(
  db: Db,
  workspaceId: string,
  generationId: string,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [generation] = await tx
      .select()
      .from(generations)
      .where(and(eq(generations.id, generationId), eq(generations.workspaceId, workspaceId)))
      .limit(1);

    if (!generation) return null;

    if (generation.projectId) {
      const [existingProject] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, generation.projectId), eq(projects.workspaceId, workspaceId)))
        .limit(1);
      if (existingProject) return { project: existingProject, created: false };
    }

    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId,
        brandId: generation.brandId ?? null,
        name: projectNameFromBrief(generation.brief),
        description: `Quick Create project created from generation ${generation.id}.`,
      })
      .returning();

    await tx
      .update(generations)
      .set({ projectId: project!.id })
      .where(and(eq(generations.id, generation.id), eq(generations.workspaceId, workspaceId)));

    return { project: project!, created: true };
  });
}

export async function listProjectsWithGenerations(db: Db, workspaceId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const projectRows = await tx
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        brandId: projects.brandId,
        brandName: brands.name,
        name: projects.name,
        description: projects.description,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(brands, eq(brands.id, projects.brandId))
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt));

    if (projectRows.length === 0) {
      return { projects: projectRows, generations: [], variants: [], captions: [] };
    }

    const projectIds = projectRows.map((project) => project.id);
    const generationRows = await tx
      .select()
      .from(generations)
      .where(inArray(generations.projectId, projectIds))
      .orderBy(desc(generations.createdAt));

    if (generationRows.length === 0) {
      return { projects: projectRows, generations: generationRows, variants: [], captions: [] };
    }

    const generationIds = generationRows.map((generation) => generation.id);
    const variantRows = await tx
      .select()
      .from(generationVariants)
      .where(inArray(generationVariants.generationId, generationIds));
    const captionRows = await tx
      .select()
      .from(captionJobs)
      .where(inArray(captionJobs.generationId, generationIds))
      .orderBy(desc(captionJobs.createdAt));

    return {
      projects: projectRows,
      generations: generationRows,
      variants: variantRows,
      captions: captionRows,
    };
  });
}

export async function getProjectWithGenerations(
  db: Db,
  workspaceId: string,
  projectId: string,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [project] = await tx
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        brandId: projects.brandId,
        brandName: brands.name,
        name: projects.name,
        description: projects.description,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(brands, eq(brands.id, projects.brandId))
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (!project) return null;

    const generationRows = await tx
      .select()
      .from(generations)
      .where(and(eq(generations.projectId, projectId), eq(generations.workspaceId, workspaceId)))
      .orderBy(desc(generations.createdAt));

    if (generationRows.length === 0) {
      return { project, generations: generationRows, variants: [], captions: [] };
    }

    const generationIds = generationRows.map((generation) => generation.id);
    const variantRows = await tx
      .select()
      .from(generationVariants)
      .where(inArray(generationVariants.generationId, generationIds));
    const captionRows = await tx
      .select()
      .from(captionJobs)
      .where(inArray(captionJobs.generationId, generationIds))
      .orderBy(desc(captionJobs.createdAt));

    return { project, generations: generationRows, variants: variantRows, captions: captionRows };
  });
}
