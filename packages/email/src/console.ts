import { renderTemplate } from "./templates";
import type { EmailMessage, EmailProvider } from "./types";

export interface ConsoleSink {
  (entry: { id: string; from: string; to: string[]; subject: string; text: string }): void;
}

const defaultSink: ConsoleSink = (entry) => {
  console.info(
    `[email:console] id=${entry.id} from=${entry.from} to=${entry.to.join(",")} subject=${JSON.stringify(entry.subject)}`,
  );
};

export class ConsoleEmailProvider implements EmailProvider {
  private counter = 0;

  constructor(
    private readonly opts: { from: string; sink?: ConsoleSink } = { from: "studio@example.com" },
  ) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const rendered = renderTemplate(msg);
    const id = `console-${Date.now()}-${++this.counter}`;
    const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
    (this.opts.sink ?? defaultSink)({
      id,
      from: this.opts.from,
      to: recipients,
      subject: msg.subject,
      text: rendered.text,
    });
    return { id };
  }
}
