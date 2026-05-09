import { renderTemplate } from "./templates";
import type { EmailMessage, EmailProvider } from "./types";

export interface ResendOpts {
  apiKey: string;
  from: string;
  /** Override the global fetch — for tests. */
  fetchImpl?: typeof fetch;
  /** Override the API base — for tests. */
  endpoint?: string;
}

export class ResendError extends Error {
  readonly code = "resend_error";
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

interface ResendSendBody {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

interface ResendSuccess {
  id: string;
}

interface ResendErrorBody {
  name?: string;
  message?: string;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly fetch: typeof fetch;
  private readonly endpoint: string;

  constructor(private readonly opts: ResendOpts) {
    this.fetch = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.endpoint = opts.endpoint ?? "https://api.resend.com/emails";
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const rendered = renderTemplate(msg);
    const body: ResendSendBody = {
      from: this.opts.from,
      to: msg.to,
      subject: msg.subject,
      html: rendered.html,
      text: rendered.text,
    };

    const response = await this.fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let parsed: ResendErrorBody | string;
      try {
        parsed = (await response.json()) as ResendErrorBody;
      } catch {
        parsed = await response.text().catch(() => "");
      }
      const reason =
        typeof parsed === "string"
          ? parsed
          : (parsed.message ?? parsed.name ?? "unknown error");
      throw new ResendError(`Resend send failed (${response.status}): ${reason}`, response.status, parsed);
    }

    const json = (await response.json()) as ResendSuccess;
    return { id: json.id };
  }
}
