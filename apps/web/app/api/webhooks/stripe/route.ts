import { StripeWebhookHandler } from "@layertone/billing";
import { loadConfig } from "@layertone/shared/config";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const result = await new StripeWebhookHandler(loadConfig()).handle(rawBody, signature);

  return Response.json(result.body, { status: result.status });
}
