const requiredEnv = ["TABLE_NAME", "BUCKET_NAME", "OPENAI_API_KEY"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  tableName: process.env.TABLE_NAME!,
  bucketName: process.env.BUCKET_NAME!,
  openAiApiKey: process.env.OPENAI_API_KEY!,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
};
