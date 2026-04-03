const requiredEnv = ["TABLE_NAME", "BUCKET_NAME"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  tableName: process.env.TABLE_NAME!,
  bucketName: process.env.BUCKET_NAME!,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
};

/** Solo para rutas que llaman a OpenAI (p. ej. analyze-product). */
export function requireOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }
  return key;
}
