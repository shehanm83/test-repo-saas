import { NextResponse } from "next/server";

import { AppError } from "@layertone/shared/errors/app-error";
import { CODES } from "@layertone/shared/errors/codes";

interface ZodLikeIssue {
  path: Array<string | number>;
  message: string;
}

/** Zod lives in @layertone/api, not here — recognise its errors structurally. */
function zodIssues(error: unknown): ZodLikeIssue[] | null {
  if (!(error instanceof Error) || error.name !== "ZodError") return null;
  const issues = (error as Error & { issues?: unknown }).issues;
  return Array.isArray(issues) ? (issues as ZodLikeIssue[]) : null;
}

/**
 * Renders the error shape every client already understands:
 * `{ error: { code, message, requestId } }`. Anything we do not recognise is
 * rethrown so it surfaces as a real 500 instead of a polite lie.
 */
export function apiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.userMessage,
          requestId: crypto.randomUUID(),
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.httpStatus },
    );
  }

  const issues = zodIssues(error);
  if (issues) {
    const issue = issues[0];
    const field = issue ? issue.path.join(".") : "";
    return NextResponse.json(
      {
        error: {
          code: CODES.VALIDATION_FAILED,
          message: issue
            ? field
              ? `${field}: ${issue.message}`
              : issue.message
            : "Please check your input and try again.",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 },
    );
  }

  throw error;
}
