export interface EmailMessage {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}
