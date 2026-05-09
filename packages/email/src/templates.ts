import type { EmailMessage } from "./types";

export interface RenderedEmail {
  html: string;
  text: string;
}

type TemplateRenderer = (data: Record<string, unknown>) => RenderedEmail;

const escape = (raw: unknown): string =>
  String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const wrap = (title: string, bodyHtml: string, bodyText: string): RenderedEmail => ({
  html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:24px auto;color:#1a1a1a;">
<h1 style="font-size:20px;font-weight:600;margin-bottom:16px;">${escape(title)}</h1>
${bodyHtml}
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />
<p style="font-size:12px;color:#888;">Sent by Vyora · studio@example.com</p>
</body></html>`,
  text: `${title}\n\n${bodyText}\n\n--\nSent by Vyora`,
});

const REGISTRY: Record<string, TemplateRenderer> = {
  "workspace.invite": (d) =>
    wrap(
      "You're invited to a workspace",
      `<p>${escape(d.inviterEmail)} invited you to join <strong>${escape(d.workspaceName)}</strong> on Vyora.</p>
<p><a href="${escape(d.acceptUrl)}" style="display:inline-block;background:#1D3B2A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Accept invitation</a></p>
<p style="font-size:13px;color:#666;">Or paste this link into your browser: ${escape(d.acceptUrl)}</p>`,
      `${d.inviterEmail} invited you to join ${d.workspaceName} on Vyora.\n\nAccept: ${d.acceptUrl}`,
    ),

  "billing.dunning": (d) =>
    wrap(
      "We couldn't process your latest payment",
      `<p>Hi ${escape(d.workspaceName)},</p>
<p>Your most recent invoice didn't go through. Your workspace has been put in <strong>read-only</strong> mode while we wait for a successful payment.</p>
<p><a href="${escape(d.portalUrl)}" style="display:inline-block;background:#1D3B2A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Update payment method</a></p>`,
      `Your most recent invoice for ${d.workspaceName} didn't go through. The workspace is now in read-only mode.\n\nUpdate payment: ${d.portalUrl}`,
    ),

  "billing.receipt": (d) =>
    wrap(
      "Thanks for your purchase",
      `<p>Your purchase of <strong>${escape(d.packName)}</strong> for <strong>${escape(d.amount)}</strong> is complete. ${escape(d.credits)} credits have been added to <strong>${escape(d.workspaceName)}</strong>.</p>
<p><a href="${escape(d.invoiceUrl)}" style="font-size:13px;">View invoice</a></p>`,
      `Purchase complete: ${d.packName} (${d.amount}). ${d.credits} credits added to ${d.workspaceName}.\nInvoice: ${d.invoiceUrl}`,
    ),

  "user.welcome": (d) =>
    wrap(
      "Welcome to Vyora",
      `<p>Hi${d.firstName ? ` ${escape(d.firstName)}` : ""},</p>
<p>Your workspace <strong>${escape(d.workspaceName)}</strong> is ready and you've been credited 30 starter credits to play with.</p>
<p><a href="${escape(d.appUrl)}" style="display:inline-block;background:#1D3B2A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Open Vyora</a></p>`,
      `Welcome to Vyora! Your workspace ${d.workspaceName} is ready with 30 starter credits.\n\n${d.appUrl}`,
    ),
};

export class UnknownTemplateError extends Error {
  readonly code = "unknown_template";
  constructor(public readonly templateName: string) {
    super(`Unknown email template: "${templateName}"`);
  }
}

export function renderTemplate(message: EmailMessage): RenderedEmail {
  const renderer = REGISTRY[message.template];
  if (!renderer) throw new UnknownTemplateError(message.template);
  return renderer(message.data);
}

export function isKnownTemplate(name: string): boolean {
  return name in REGISTRY;
}

export function listKnownTemplates(): string[] {
  return Object.keys(REGISTRY);
}
