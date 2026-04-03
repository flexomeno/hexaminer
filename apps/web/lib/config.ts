const apiFallback = "http://localhost:3001";

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || apiFallback,
  demoUserId: process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "",
};

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  env.apiBaseUrl === apiFallback
) {
  console.warn(
    "[Hexaminer] NEXT_PUBLIC_API_BASE_URL no está definida; usando",
    apiFallback,
    "→ el análisis fallará. Añade la URL del API en apps/web/.env.local y reinicia: npm run dev",
  );
}
