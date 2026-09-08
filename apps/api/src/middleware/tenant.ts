import type { FastifyReply, FastifyRequest } from "fastify";

export interface ResolvedTenant {
  id: string;
  slug: string;
  plan: string;
}

declare module "fastify" {
  interface FastifyRequest {
    tenant?: ResolvedTenant;
  }
}

/**
 * Resolves `x-tenant-id` to a tenant row, or refuses the request.
 *
 * Every route that touches customer data runs this as a preHandler, and
 * every query downstream filters on `request.tenant!.id`. Two deliberate
 * choices:
 *
 * 1. There is **no default tenant**. A request without the header is a 400,
 *    not "assume Fünf Sterne". A silent default is how one customer's data
 *    ends up in another customer's app: the failure would be invisible in
 *    testing (the founding tenant is the one with data) and catastrophic in
 *    production.
 *
 * 2. The header carries the **slug**, not the internal id. The slug is what
 *    a customer's config file and their App Store listing already know; the
 *    internal cuid is never exposed, so a tenant can be renamed without
 *    reissuing every app build.
 *
 * `isActive` is part of the lookup rather than a separate check, so
 * switching a customer off is one UPDATE and takes effect on the next
 * request — an off-boarded shop's app starts answering 404 immediately
 * without anyone deleting their data.
 */
export async function resolveTenant(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers["x-tenant-id"];
  // Fastify gives an array when a header is sent more than once. Taking the
  // first would let a client smuggle a second value past a proxy that only
  // inspected one of them, so a repeated header is simply invalid.
  const tenantSlug = typeof header === "string" ? header.trim() : "";

  if (!tenantSlug) {
    return reply.status(400).send({
      errorCode: "MISSING_TENANT",
      error: "x-tenant-id header is required",
    });
  }

  const tenant = await request.server.prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true, slug: true, plan: true },
  });

  if (!tenant) {
    return reply.status(404).send({
      errorCode: "TENANT_NOT_FOUND",
      error: "Tenant not found or inactive",
    });
  }

  request.tenant = tenant;
}

/**
 * The resolved tenant id, for use inside a handler.
 *
 * A helper rather than `request.tenant!.id` at 60 call sites: the non-null
 * assertion is only sound because `resolveTenant` ran first, and if a route
 * is ever registered without it, this throws a named error at the top of the
 * handler instead of a `TypeError` from somewhere inside a Prisma call.
 */
export function tenantId(request: FastifyRequest): string {
  if (!request.tenant) {
    throw new Error(
      "resolveTenant did not run for this route. Every route that reads or " +
        "writes customer data must register it as a preHandler.",
    );
  }
  return request.tenant.id;
}
