import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { UserIdentity } from "../types/domain";

function normalizeEmail(email?: string): string | undefined {
  if (!email) {
    return undefined;
  }
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

function makeIdFromEmail(email: string): string {
  return `email#${email}`;
}

function normalizeProvidedUserId(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 150);
}

function fallbackAnonymousId(event: APIGatewayProxyEventV2): string {
  if (event.requestContext.requestId) {
    return `anon#${event.requestContext.requestId}`;
  }
  return "anon#unknown";
}

export function getUserIdentityFromEvent(
  event: APIGatewayProxyEventV2,
  explicitUserId?: string,
): UserIdentity {
  const requestContext = event.requestContext as unknown as {
    authorizer?: {
      jwt?: {
        claims?: Record<string, string | undefined>;
      };
    };
  };

  const authorizer = requestContext.authorizer as
    | {
        jwt?: {
          claims?: Record<string, string | undefined>;
        };
      }
    | undefined;
  const claims = (authorizer?.jwt?.claims ??
    {}) as Record<string, string | undefined>;

  const email = normalizeEmail(claims.email);
  const sub = claims.sub;
  const name = claims.name;
  const image = claims.picture;
  const providedUserId = normalizeProvidedUserId(explicitUserId);

  if (providedUserId) {
    const maybeEmail = normalizeEmail(
      providedUserId.includes("@") ? providedUserId : undefined,
    );
    return {
      userId: maybeEmail ? makeIdFromEmail(maybeEmail) : `provided#${providedUserId}`,
      email: maybeEmail,
      name,
      image,
    };
  }

  if (sub) {
    return {
      userId: `sub#${sub}`,
      email,
      name,
      image,
    };
  }

  if (email) {
    return {
      userId: makeIdFromEmail(email),
      email,
      name,
      image,
    };
  }

  return {
    userId: fallbackAnonymousId(event),
    name,
    image,
  };
}

export function getUserIdFromQuery(event: APIGatewayProxyEventV2): string | undefined {
  return normalizeProvidedUserId(event.queryStringParameters?.userId);
}

export function resolveRequestedUserId(
  event: APIGatewayProxyEventV2,
  bodyUserId?: string,
): string {
  return (
    normalizeProvidedUserId(bodyUserId) ??
    getUserIdFromQuery(event) ??
    "anonymous"
  );
}
