import { readFile } from "node:fs/promises";

type Scorecard = {
  evaluationSet: string;
  caseId: string;
  flow: "v1" | "v2";
  provider: string;
  aspectRatio: string;
  accepted: boolean;
  downloaded?: boolean;
  rejectionReasons?: string[];
  refinementCount?: number;
  latencyMs?: number;
  credits?: number;
  scores: Record<string, number | null>;
};

const paths = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
if (!paths.length) {
  throw new Error("Pass one or more completed scorecard JSON files.");
}

const scorecards = (
  await Promise.all(
    paths.map(async (path) => {
      const parsed = JSON.parse(await readFile(path, "utf8")) as Scorecard | Scorecard[];
      return Array.isArray(parsed) ? parsed : [parsed];
    }),
  )
).flat();

for (const card of scorecards) {
  if (!card.caseId || !["v1", "v2"].includes(card.flow) || !card.provider || !card.aspectRatio) {
    throw new Error(`Invalid scorecard: ${card.caseId || "unknown case"}`);
  }
}

const groups = new Map<string, Scorecard[]>();
for (const card of scorecards) {
  for (const key of [
    `flow:${card.flow}`,
    `flow-provider:${card.flow}:${card.provider}`,
    `flow-aspect:${card.flow}:${card.aspectRatio}`,
  ]) {
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
}

const report = Object.fromEntries(
  [...groups.entries()].map(([key, cards]) => {
    const accepted = cards.filter((card) => card.accepted);
    const downloaded = cards.filter((card) => card.downloaded);
    const reasons = cards.flatMap((card) => card.rejectionReasons ?? []);
    const scoreNames = new Set(cards.flatMap((card) => Object.keys(card.scores)));
    return [
      key,
      {
        samples: cards.length,
        acceptedRate: ratio(accepted.length, cards.length),
        downloadedRate: ratio(downloaded.length, cards.length),
        refinementsPerAccepted: average(
          accepted.map((card) => card.refinementCount).filter(isNumber),
        ),
        latencyMs: average(cards.map((card) => card.latencyMs).filter(isNumber)),
        creditsPerAccepted: average(accepted.map((card) => card.credits).filter(isNumber)),
        rejectionReasons: frequency(reasons),
        scores: Object.fromEntries(
          [...scoreNames].map((name) => [
            name,
            average(cards.map((card) => card.scores[name]).filter(isNumber)),
          ]),
        ),
      },
    ];
  }),
);

process.stdout.write(
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scorecardCount: scorecards.length,
      evaluationSets: [...new Set(scorecards.map((card) => card.evaluationSet))],
      groups: report,
    },
    null,
    2,
  )}\n`,
);

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    : null;
}

function ratio(count: number, total: number) {
  return total ? Number((count / total).toFixed(4)) : null;
}

function frequency(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [
      value,
      values.filter((candidate) => candidate === value).length,
    ]),
  );
}
