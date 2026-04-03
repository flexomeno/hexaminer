import OpenAI from "openai";
import { config, requireOpenAiApiKey } from "./config";
import type { ProductAiAnalysis } from "../types/domain";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireOpenAiApiKey() });
  }
  return client;
}

const SYSTEM_PROMPT = `Actúa como un analista experto en química cosmética (estilo INCI Beauty), nutricionista clínico y auditor de responsabilidad social corporativa. Tu objetivo es procesar una imagen de una etiqueta y devolver un JSON estricto.

### DIRECTRICES DE EVALUACIÓN:
1. **Puntaje (0-20):** - 18-20: Ingredientes puros, sin EDC, empresa ética.
   - 14-17: Buen producto, algunos aditivos menores o envase plástico.
   - 08-13: Presencia de disruptores endocrinos (EDC) o alertas laborales.
   - 0-07: Ultraprocesados nocivos, químicos agresivos o escándalos graves de derechos humanos.
2. **Disruptores Endocrinos (EDC):** Identifica específicamente: Ftalatos, Bisfenoles (BPA/S), Parabenos, Benzofenonas, Triclosán, BHT/BHA y liberadores de Formaldehído.
3. **Ética Laboral:** Utiliza tu base de datos interna para buscar antecedentes de la marca (ej. casos de maltrato, huelgas, certificaciones Empresa B).

### FORMATO DE RESPUESTA (JSON):
{
  "producto": {
    "nombre": "Nombre comercial",
    "marca": "Nombre de la empresa",
    "categoria": "Alimento / Cosmético / Aseo",
    "puntaje_global": 0-20
  },
  "analisis_quimico": [
    {"ingrediente": "nombre", "funcion": "para qué sirve", "calificacion": "bueno/regular/riesgo"}
  ],
  "alertas": {
    "endocrinas": ["lista de EDCs encontrados"],
    "salud": "explicación breve de riesgos nutricionales o dermatológicos",
    "etica_laboral": "resumen de comportamiento corporativo de la marca"
  },
  "veredicto": "Resumen ejecutivo de 2 frases con tono empático pero directo",
  "recomendacion": "Una acción concreta para el usuario"
}`;

const USER_PROMPTS = [
  "Analiza esta etiqueta y responde SOLO con JSON válido según el formato.",
  "Repite el análisis. Devuelve únicamente un único objeto JSON (sin markdown, sin texto antes ni después) que cumpla el esquema del sistema.",
  "Último intento: responde solo el JSON del producto, sin comillas tipográficas ni bloques de código.",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Quita cercas tipo ```json ... ``` si el modelo las añade pese a json_object. */
function stripMarkdownFences(s: string): string {
  const t = s.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) return fence[1].trim();
  const inner = /```(?:json)?\s*([\s\S]*?)```/m.exec(t);
  if (inner) return inner[1].trim();
  return t;
}

/** Primer objeto `{ ... }` balanceado respecto a strings JSON. */
function extractBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

function tryParseAnalysis(candidate: string): ProductAiAnalysis | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  const attempts = [
    trimmed,
    stripMarkdownFences(trimmed),
    extractBalancedObject(trimmed) ?? "",
    extractBalancedObject(stripMarkdownFences(trimmed)) ?? "",
  ];
  const seen = new Set<string>();
  for (const raw of attempts) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    try {
      const parsed = JSON.parse(raw) as ProductAiAnalysis;
      if (parsed?.producto?.nombre && typeof parsed.producto.nombre === "string") {
        return parsed;
      }
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

function parseAnalysisFromModelOutput(text: string): ProductAiAnalysis {
  const parsed = tryParseAnalysis(text);
  if (!parsed) {
    throw new Error("OpenAI response was not valid JSON");
  }
  return parsed;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests/i.test(msg);
}

export async function analyzeProductImageWithOpenAI(
  imageBytes: Buffer,
): Promise<ProductAiAnalysis> {
  const imageDataUrl = `data:image/jpeg;base64,${imageBytes.toString("base64")}`;
  const maxAttempts = USER_PROMPTS.length;
  let lastError: Error = new Error("OpenAI analysis failed");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const completion = await getClient().responses.create({
        model: config.openAiModel,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: USER_PROMPTS[attempt] ?? USER_PROMPTS[USER_PROMPTS.length - 1],
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
                detail: "high",
              },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      });

      const text = completion.output_text?.trim();
      if (!text) {
        throw new Error("OpenAI did not return output_text");
      }

      const result = parseAnalysisFromModelOutput(text);
      if (result.producto.puntaje_global < 0) {
        result.producto.puntaje_global = 0;
      }
      if (result.producto.puntaje_global > 20) {
        result.producto.puntaje_global = 20;
      }
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const waitMs = isRateLimitError(err) ? 2500 * (attempt + 1) : 900 * (attempt + 1);
      if (attempt < maxAttempts - 1) {
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}
