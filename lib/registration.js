import { z } from "zod";

export const MAX_BODY_BYTES = 12 * 1024;
export const RATE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_APPLICATIONS_PER_WINDOW = 10;

const shortText = (label, minimum = 1, maximum = 100) => z.string({ required_error: `${label} is required.` })
  .trim().min(minimum, `${label} is too short.`).max(maximum, `${label} is too long.`)
  .refine((value) => !/[\u0000-\u001f\u007f]/u.test(value), `${label} contains unsupported characters.`);

export const registrationSchema = z.object({
  fullName: shortText("Full name", 2),
  email: z.string().trim().email("Enter a valid email address.").max(254).toLowerCase(),
  phone: z.string().trim().min(8).max(30)
    .regex(/^\+?[0-9() .-]+$/, "Enter a valid phone number.")
    .refine((value) => { const count = value.replace(/\D/g, "").length; return count >= 8 && count <= 15; }, "Phone number must contain 8–15 digits.")
    .transform((value) => value.replace(/[() .-]/g, "")),
  city: shortText("City", 2),
  vehicleMake: shortText("Vehicle make", 1, 80),
  vehicleModel: shortText("Vehicle model", 1, 80),
  vehicleYear: z.union([z.number(), z.string().regex(/^\d{4}$/, "Enter a four-digit year.").transform(Number)])
    .pipe(z.number().int().min(1950, "Vehicle year must be 1950 or later.").max(2027, "Enter a valid vehicle year.")),
  driveType: z.enum(["4x4", "AWD", "2WD"], { errorMap: () => ({ message: "Select your vehicle's drive type." }) }),
  experience: z.enum(["first-timer", "enthusiast", "experienced"], { errorMap: () => ({ message: "Select your experience level." }) }),
  teamName: shortText("Team name", 0).optional().default(""),
  notes: z.string().trim().max(1200, "Notes must be 1,200 characters or fewer.")
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value), "Notes contain unsupported characters.").optional().default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree before submitting your application." }) }),
  website: z.string().max(0, "Unable to submit this application.").optional().default(""),
  idempotencyKey: z.string().uuid("Refresh the page and try again."),
}).strict();

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(body, status, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders },
  });
}

async function readJson(request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && !/^\d+$/.test(declaredLength)) throw new RequestError(400, "Invalid request size.");
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) throw new RequestError(413, "Your application is too large.");
  if (!request.body) throw new RequestError(400, "Your application is empty.");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413, "Your application is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError(400, "Send a valid JSON application.");
  }
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const receipt = (reference, replayed) => ({
  reference,
  status: "application_received",
  replayed,
  message: "Your application has been received. Race entry is subject to organizer review; no payment has been collected.",
});

function isSameOrigin(request, origin) {
  const destination = new URL(request.url);
  const host = request.headers.get("host");
  // NextURL normalizes loopback addresses to localhost and may use its internal
  // listener hostname. The HTTP Host still identifies the actual destination.
  if (host && /[/?#@\\\s,]/.test(host)) return false;
  try {
    const expected = host ? new URL(`${destination.protocol}//${host}`).origin : destination.origin;
    return origin === expected;
  } catch {
    return false;
  }
}

/**
 * Storage is injected so validation is independent of the deployment provider.
 * create() must atomically insert or return the existing idempotency-key record.
 */
export function createRegistrationHandler(getStore, { now = Date.now } = {}) {
  return async function handleRegistration(request) {
    try {
      const origin = request.headers.get("origin");
      const fetchSite = request.headers.get("sec-fetch-site");
      if (!isSameOrigin(request, origin) || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")) {
        return json({ error: "Please submit the form from the ROVX website." }, 403);
      }
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return json({ error: "Send your application as JSON." }, 415);
      }
      const parsed = registrationSchema.safeParse(await readJson(request));
      if (!parsed.success) {
        const fieldErrors = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] || "form";
          if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        }
        return json({ error: "Please check the highlighted fields.", fieldErrors }, 400);
      }

      const { idempotencyKey, website: _website, ...application } = parsed.data;
      const payloadHash = await sha256(JSON.stringify(application));
      const store = await getStore();
      const existing = await store.findByKey(idempotencyKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) return json({ error: "This submission key was already used for a different application. Start a new application to make changes." }, 409);
        return json(receipt(existing.reference, true), 200);
      }

      const timestamp = now();
      // Cloudflare overwrites this header at its edge. No raw address is stored.
      const ip = request.headers.get("cf-connecting-ip");
      if (ip && ip.length <= 64 && store.consumeRateLimit) {
        const window = Math.floor(timestamp / RATE_WINDOW_MS);
        const expiresAt = (window + 1) * RATE_WINDOW_MS;
        const bucket = await sha256(`${window}:${ip}`);
        const attempts = await store.consumeRateLimit(bucket, expiresAt, timestamp);
        if (attempts > MAX_APPLICATIONS_PER_WINDOW) {
          return json({ error: "Too many applications were submitted recently. Please try again in a few minutes." }, 429, { "Retry-After": String(Math.max(1, Math.ceil((expiresAt - timestamp) / 1000))) });
        }
      }

      const result = await store.create({
        ...application,
        id: crypto.randomUUID(),
        reference: `ROVX-26-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        idempotencyKey,
        payloadHash,
        event: "rovx-bhaderwah-26",
        status: "application_received",
        consentVersion: "2026-10-15",
        createdAt: timestamp,
      });
      // Also enforce the payload match after a concurrent insert wins the race.
      if (result.payloadHash !== payloadHash) return json({ error: "This submission key was already used for a different application. Start a new application to make changes." }, 409);
      return json(receipt(result.reference, !result.created), result.created ? 201 : 200);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      // Do not expose database errors, request contents, or participant details.
      return json({ error: "Registration is temporarily unavailable. Please retry shortly; keep this page open to avoid a duplicate application." }, 503, { "Retry-After": "30" });
    }
  };
}
