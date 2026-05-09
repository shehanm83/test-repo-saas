export { ConsoleEmailProvider } from "./console";
export { MailpitEmailProvider, type MailpitOpts } from "./mailpit";
export {
  ResendEmailProvider,
  ResendError,
  type ResendOpts,
} from "./resend";
export {
  isKnownTemplate,
  listKnownTemplates,
  renderTemplate,
  UnknownTemplateError,
  type RenderedEmail,
} from "./templates";
export type { EmailMessage, EmailProvider } from "./types";
