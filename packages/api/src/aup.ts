import { auditLog, type Db } from "@vyora/db";
import { AppError, CODES } from "@vyora/shared";


const PROHIBITED_PATTERNS: { tag: string; pattern: RegExp }[] = [
  { tag: "csam", pattern: /\b(?:child|minor|underage|teen|preteen|kid|toddler)[^.]*\b(?:nude|naked|sexual|sex|porn|erotic)\b/i },
  { tag: "csam", pattern: /\b(?:nude|naked|sexual|sex|porn|erotic)[^.]*\b(?:child|minor|underage|teen|preteen|kid|toddler)\b/i },
  { tag: "weapons", pattern: /\b(?:bomb|explosive|ied|c4|tnt|grenade)\s+(?:making|recipe|instructions|how\s+to|tutorial|guide)\b/i },
  { tag: "weapons", pattern: /\b(?:make|build|construct|3d-?print)\s+(?:a|an)?\s*(?:gun|firearm|rifle|pistol|silencer|suppressor)\b/i },
  { tag: "self_harm", pattern: /\b(?:how\s+to|methods?\s+(?:of|to))\s+(?:suicide|kill\s+(?:my)?self|self\s*harm)\b/i },
  { tag: "controlled_substances", pattern: /\b(?:synthesize|cook|manufacture|produce)\s+(?:meth|methamphetamine|fentanyl|heroin|cocaine|crack|mdma)\b/i },
  { tag: "hate", pattern: /\b(?:gas|exterminate|eradicate|kill\s+all)\s+(?:jews|muslims|blacks|whites|asians|hispanics|gays|lesbians|trans)\b/i },
  { tag: "extremism", pattern: /\b(?:isis|al[\s-]?qaeda|nazi)\s+(?:propaganda|recruitment|glorif)/i },
];

export interface AupScanResult {
  flagged: boolean;
  tags: string[];
}

export function scanBriefForAup(brief: string): AupScanResult {
  const tags = new Set<string>();
  for (const { tag, pattern } of PROHIBITED_PATTERNS) {
    if (pattern.test(brief)) tags.add(tag);
  }
  return { flagged: tags.size > 0, tags: [...tags] };
}

export async function assertBriefAllowed(
  db: Db,
  args: { brief: string; workspaceId: string; userId: string; generationId?: string | null },
): Promise<void> {
  const result = scanBriefForAup(args.brief);
  if (!result.flagged) return;

  await db.insert(auditLog).values({
    workspaceId: args.workspaceId,
    actorUserId: args.userId,
    action: "generation.aup_flagged",
    target: args.generationId ?? "preflight",
    payload: JSON.stringify({ tags: result.tags, briefLength: args.brief.length }),
  });

  throw new AppError(
    CODES.AUP_BRIEF_BLOCKED,
    "This brief was blocked by content policy. If you believe this is in error, contact support.",
    422,
    { tags: result.tags },
  );
}
