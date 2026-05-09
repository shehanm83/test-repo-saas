import { describe, expect, it, vi } from "vitest";

import type { Transporter } from "nodemailer";

import { MailpitEmailProvider } from "./mailpit.js";

function fakeTransporter(): { transporter: Transporter; sendMail: ReturnType<typeof vi.fn> } {
  const sendMail = vi.fn(async () => ({ messageId: "<smtp-1@local>" }));
  const transporter = { sendMail } as unknown as Transporter;
  return { transporter, sendMail };
}

describe("MailpitEmailProvider", () => {
  it("renders the template and calls transporter.sendMail with from/to/subject/html/text", async () => {
    const { transporter, sendMail } = fakeTransporter();
    const provider = new MailpitEmailProvider({
      host: "localhost",
      port: 1025,
      from: "studio@example.com",
      transporter,
    });

    const result = await provider.send({
      to: "user@example.com",
      subject: "Welcome",
      template: "user.welcome",
      data: { workspaceName: "WS", appUrl: "https://app.example.com" },
    });

    expect(result.id).toBe("<smtp-1@local>");
    expect(sendMail).toHaveBeenCalledOnce();
    const call = sendMail.mock.calls[0]![0] as {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(call.from).toBe("studio@example.com");
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toBe("Welcome");
    expect(call.html).toContain("WS");
    expect(call.text).toContain("WS");
  });
});
