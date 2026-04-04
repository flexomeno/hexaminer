#!/usr/bin/env node
/**
 * Prueba el prompt de análisis de etiqueta contra OpenAI (API Responses, igual que services/api).
 *
 * Uso (desde la raíz del repo hexaminer):
 *   export OPENAI_API_KEY=sk-...
 *   node scripts/test-openai-label-prompt.mjs foto1.jpg foto2.jpg ...
 *
 * Variables: OPENAI_MODEL, PROMPT_FILE, USER_MESSAGE (opcional; si hay varias fotos y no defines
 * USER_MESSAGE, se añade instrucción de cruzar tablas/ingredientes).
 *
 * Edita scripts/openai-prompt-system.txt para iterar el system prompt.
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY = (process.env.OPENAI_API_KEY || process.env.TF_VAR_openaikey || "").trim();
const MODEL = (process.env.OPENAI_MODEL || "gpt-4o").trim();

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function usage() {
  console.error(`
Uso: node scripts/test-openai-label-prompt.mjs <imagen> [imagen2 ...]

Variables: OPENAI_API_KEY (o TF_VAR_openaikey), OPENAI_MODEL (opcional),
           PROMPT_FILE, USER_MESSAGE (opcional)
`);
  process.exit(1);
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const out = data.output;
  if (!Array.isArray(out)) return null;
  const chunks = [];
  for (const item of out) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text" && typeof c.text === "string") chunks.push(c.text);
      }
    }
  }
  return chunks.length ? chunks.join("") : null;
}

function defaultUserMessage(imageCount) {
  const fromEnv = process.env.USER_MESSAGE?.trim();
  if (fromEnv) return fromEnv;
  if (imageCount > 1) {
    return `Tienes ${imageCount} imágenes del mismo producto. Cruza nombre/marca, ingredientes y datos nutricionales si aparecen en distintas fotos. Responde SOLO con JSON válido según el formato.`;
  }
  return "Analiza esta etiqueta y responde SOLO con JSON válido según el formato.";
}

function main() {
  const paths = process.argv.slice(2).filter((p) => p && !p.startsWith("-"));
  if (paths.length === 0 || paths.some((p) => !existsSync(p))) usage();
  if (!KEY) {
    console.error("Falta OPENAI_API_KEY (o TF_VAR_openaikey).");
    process.exit(1);
  }

  const promptPath =
    process.env.PROMPT_FILE?.trim() || join(__dirname, "openai-prompt-system.txt");
  if (!existsSync(promptPath)) {
    console.error("No existe PROMPT_FILE:", promptPath);
    process.exit(1);
  }
  const systemPrompt = readFileSync(promptPath, "utf8");

  const imageParts = [];
  for (const imagePath of paths) {
    const ext = extname(imagePath).toLowerCase();
    const mime = MIME[ext];
    if (!mime) {
      console.error("Extensión no soportada:", ext, "→ usa .jpg, .jpeg, .png o .webp");
      process.exit(1);
    }
    const b64 = readFileSync(imagePath).toString("base64");
    imageParts.push({
      type: "input_image",
      image_url: `data:${mime};base64,${b64}`,
      detail: "high",
    });
  }

  const userMessage = defaultUserMessage(paths.length);

  const body = {
    model: MODEL,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userMessage }, ...imageParts],
      },
    ],
    text: { format: { type: "json_object" } },
  };

  const run = async () => {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Respuesta no JSON. HTTP", res.status, raw.slice(0, 2000));
      process.exit(1);
    }
    if (!res.ok) {
      console.error("Error API:", res.status, JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const text = extractOutputText(data);
    if (process.env.DEBUG_FULL === "1") {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    if (!text) {
      console.error("No se encontró texto en la respuesta. Usa DEBUG_FULL=1 para ver el JSON.");
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    try {
      const parsed = JSON.parse(text);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(text);
    }
  };

  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

main();
