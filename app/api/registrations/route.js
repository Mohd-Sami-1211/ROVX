import { getRegistrationStore } from "@rovx/registration-store";
import { createRegistrationHandler } from "../../../lib/registration.js";

export const dynamic = "force-dynamic";

export const POST = createRegistrationHandler(getRegistrationStore);

// Participant information is intentionally unavailable through public read APIs.
export function GET() {
  return Response.json({ error: "This endpoint accepts participant applications only." }, {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
