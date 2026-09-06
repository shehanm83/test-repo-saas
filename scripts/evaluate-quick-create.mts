import { readFile } from "node:fs/promises";

import {
  normalizeCommercialGenerationInput,
  resolveOutputTarget,
} from "../packages/shared/src/index.ts";
import { buildQuickCreatePrompt } from "../packages/shared/src/prompt-templates/index.ts";

type EvaluationCase = {
  id: string;
  category: string;
  input: unknown;
  context?: {
    brand?: Parameters<typeof buildQuickCreatePrompt>[0]["brand"];
    mood?: Parameters<typeof buildQuickCreatePrompt>[0]["mood"];
  };
  expected: { promptTemplate: string; aspectRatio: string };
};

type EvaluationSet = {
  version: string;
  qualityDimensions: string[];
  cases: EvaluationCase[];
};

const args = new Set(process.argv.slice(2));
const baseUrlArg = process.argv.find((value) => value.startsWith("--base-url="));
const baseUrl = baseUrlArg?.slice("--base-url=".length).replace(/\/$/, "");
const shouldGenerate = args.has("--generate");

if (shouldGenerate && !baseUrl) {
  throw new Error("--generate requires --base-url=https://...");
}
if (shouldGenerate && process.env.QUICK_CREATE_EVAL_ALLOW_GENERATION !== "true") {
  throw new Error(
    "Real generation is credit-bearing. Set QUICK_CREATE_EVAL_ALLOW_GENERATION=true to confirm.",
  );
}
if (shouldGenerate && !process.env.QUICK_CREATE_EVAL_BINDINGS_FILE) {
  throw new Error(
    "Real generation requires QUICK_CREATE_EVAL_BINDINGS_FILE with evaluation-workspace asset IDs.",
  );
}

const fixtureUrl = new URL("../evaluations/quick-create/v1/cases.json", import.meta.url);
const evaluationSet = JSON.parse(await readFile(fixtureUrl, "utf8")) as EvaluationSet;
assertEvaluationSet(evaluationSet);
const remoteBindings = process.env.QUICK_CREATE_EVAL_BINDINGS_FILE
  ? (JSON.parse(await readFile(process.env.QUICK_CREATE_EVAL_BINDINGS_FILE, "utf8")) as Record<
      string,
      string
    >)
  : {};

const reports = [];
for (const fixture of evaluationSet.cases) {
  const normalized = normalizeCommercialGenerationInput(fixture.input);
  if (normalized.mode !== "quick") {
    throw new Error(`${fixture.id}: expected Quick Create input`);
  }
  const target = resolveOutputTarget(normalized.outputTarget);
  const built = buildQuickCreatePrompt({
    normalized,
    outputTarget: target,
    brand: fixture.context?.brand ?? null,
    mood: fixture.context?.mood ?? null,
    outputFormat: normalized.outputs.formats[0] ?? target.format ?? target.aspectRatio,
  });

  const violations: string[] = [];
  if (built.templateId !== fixture.expected.promptTemplate) {
    violations.push(
      `prompt template ${built.templateId} did not match ${fixture.expected.promptTemplate}`,
    );
  }
  if (target.aspectRatio !== fixture.expected.aspectRatio) {
    violations.push(
      `aspect ratio ${target.aspectRatio} did not match ${fixture.expected.aspectRatio}`,
    );
  }

  let remotePreview: unknown;
  let generation: unknown;
  if (baseUrl) {
    const remoteInput = replaceFixtureIds(fixture.input, remoteBindings);
    remotePreview = await postJson(`${baseUrl}/api/generations/prompt-preview`, remoteInput);
    if (shouldGenerate) {
      const created = (await postJson(`${baseUrl}/api/generations`, remoteInput)) as {
        generationId?: string;
      };
      if (!created.generationId) throw new Error(`${fixture.id}: generation did not return an id`);
      generation = await waitForGeneration(baseUrl, created.generationId);
    }
  }

  reports.push({
    id: fixture.id,
    category: fixture.category,
    structuralStatus: violations.length === 0 ? "pass" : "fail",
    violations,
    promptTemplate: built.templateId,
    promptVersion: built.templateVersion,
    aspectRatio: target.aspectRatio,
    dimensions: `${target.width}x${target.height}`,
    productReferences: normalized.productRefs.length,
    hasBrand: Boolean(normalized.brandId),
    hasMood: Boolean(normalized.moodId),
    overlaySlots: Object.keys(built.overlaySlots),
    prompt: built.prompt,
    negativePrompt: built.negativePrompt ?? null,
    ...(remotePreview ? { remotePreview } : {}),
    ...(generation ? { generation } : {}),
  });
}

const failures = reports.filter((report) => report.structuralStatus === "fail");
process.stdout.write(
  `${JSON.stringify(
    {
      evaluationSet: evaluationSet.version,
      generatedAt: new Date().toISOString(),
      mode: shouldGenerate ? "generation" : baseUrl ? "remote-preview" : "offline",
      caseCount: reports.length,
      structuralFailures: failures.length,
      qualityDimensions: evaluationSet.qualityDimensions,
      reports,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) process.exitCode = 1;

function assertEvaluationSet(value: EvaluationSet) {
  if (!value.version || value.cases.length < 10) {
    throw new Error("Evaluation set must be versioned and contain at least 10 cases");
  }
  const ids = new Set<string>();
  const categories = new Set<string>();
  for (const fixture of value.cases) {
    if (!fixture.id || ids.has(fixture.id))
      throw new Error(`Duplicate/empty case id: ${fixture.id}`);
    ids.add(fixture.id);
    categories.add(fixture.category);
  }
  for (const required of [
    "idea_only",
    "saved_product",
    "uploaded_product",
    "multi_reference",
    "exact_overlay",
    "evergreen_mood",
    "seasonal_mood",
    "brand_mood_conflict",
  ]) {
    if (!categories.has(required))
      throw new Error(`Evaluation set is missing category: ${required}`);
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${url}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function waitForGeneration(base: string, generationId: string) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const response = await fetch(`${base}/api/generations/${generationId}`, {
      headers: requestHeaders(false),
    });
    const payload = (await response.json().catch(() => null)) as {
      status?: string;
      variants?: unknown[];
    } | null;
    if (!response.ok) {
      throw new Error(`generation ${generationId}: ${response.status} ${JSON.stringify(payload)}`);
    }
    if (payload?.status === "completed" || payload?.status === "failed") return payload;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`generation ${generationId}: timed out`);
}

function requestHeaders(includeContentType = true) {
  return {
    ...(includeContentType ? { "content-type": "application/json" } : {}),
    ...(process.env.QUICK_CREATE_EVAL_COOKIE
      ? { cookie: process.env.QUICK_CREATE_EVAL_COOKIE }
      : {}),
  };
}

function replaceFixtureIds(value: unknown, bindings: Record<string, string>): unknown {
  if (typeof value === "string") return bindings[value] ?? value;
  if (Array.isArray(value)) return value.map((item) => replaceFixtureIds(item, bindings));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceFixtureIds(item, bindings)]),
    );
  }
  return value;
}
