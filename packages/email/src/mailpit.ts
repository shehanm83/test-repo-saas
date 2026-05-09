import nodemailer, { type Transporter } from "nodemailer";

import { renderTemplate } from "./templates";
import type { EmailMessage, EmailProvider } from "./types";

export interface MailpitOpts {
  host: string;
  port: number;
  from: string;
  /** Override transporter — only used by tests. */
  transporter?: Transporter;
}

export class MailpitEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(private readonly opts: MailpitOpts) {
    this.transporter =
      opts.transporter ??
      nodemailer.createTransport({
        host: opts.host,
        port: opts.port,
        secure: false,
        ignoreTLS: true,
      });
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const rendered = renderTemplate(msg);
    const info = await this.transporter.sendMail({
      from: this.opts.from,
      to: msg.to,
      subject: msg.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return { id: info.messageId };
  }
}
