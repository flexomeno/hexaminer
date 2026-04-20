import { GoogleAuth } from "google-auth-library";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON: falta project_id, client_email o private_key");
  }
  return parsed;
}

/** Envía notificación vía FCM HTTP v1 (Firebase Cloud Messaging). */
export async function sendFcmNotification(params: {
  serviceAccountJson: string;
  deviceToken: string;
  title: string;
  body: string;
}): Promise<void> {
  const sa = parseServiceAccount(params.serviceAccountJson);
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const access = await client.getAccessToken();
  const bearer = access.token;
  if (!bearer) {
    throw new Error("No se obtuvo access token para FCM");
  }

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: params.deviceToken,
        notification: {
          title: params.title,
          body: params.body,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM HTTP ${res.status}: ${text}`);
  }
}
