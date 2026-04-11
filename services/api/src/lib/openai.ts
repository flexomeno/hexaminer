import OpenAI from "openai";
import { config, requireOpenAiApiKey } from "./config";
import type { ChemicalAnalysisItem, ProductAiAnalysis } from "../types/domain";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireOpenAiApiKey() });
  }
  return client;
}

const SYSTEM_PROMPT = `Actúa como un analista experto en química cosmética, nutricionista clínico y auditor de responsabilidad social corporativa. Puedes recibir UNA o VARIAS fotos del mismo producto (frente/empaque, tabla nutricional, lista de ingredientes, sellos, etc.): integra toda la información visible en un solo análisis coherente. Analiza la empresa y busca en tu conocimiento y en fuentes de internet si hay escándalos de explotación laboral; devuelve un JSON estricto.

### LISTA DE INGREDIENTES — EXHAUSTIVIDAD (PRIORIDAD ABSOLUTA; NO OPTIMICES POR TOKENS):
- El array \`analisis_quimico\` debe incluir **todos y cada uno** de los ingredientes legibles en la etiqueta o lista de ingredientes de las imágenes. **No omitas** ingredientes por brevedad, “los más importantes”, una muestra representativa o ahorro de espacio.
- **No** sustituyas la lista completa por un resumen ni agrupaciones tipo “y otros”; cada compuesto o grupo nominal de la etiqueta debe tener su propio objeto en el array (si la etiqueta lista “aroma” o “conservante” como tal, respétalo; si enumera sustancias por separado, enuméralas por separado).
- Respeta el **orden** en que aparecen en la etiqueta cuando sea visible (orden INCI en cosméticos; orden decreciente en alimentos cuando la norma lo indique; si no estás seguro del criterio normativo, conserva el orden leído de arriba a abajo / izquierda a derecha).
- Si hay **varias fotos**, combina la información hasta reconstruir la lista completa; si una foto continúa la lista de otra, **une** sin duplicar el mismo ingrediente consecutivo.
- Si el texto es **ilegible**, borroso o cortado, incluye todos los que puedas leer y, solo al final del array o en el último ítem legible, puedes indicar brevemente que faltan ingredientes por calidad de imagen (sin inventar nombres).
- Las respuestas largas están permitidas: la **completitud** de \`analisis_quimico\` prima sobre acortar texto. Los campos \`veredicto\` y \`recomendacion\` pueden seguir siendo concisos según el formato.

### DIRECTRICES DE EVALUACIÓN:
1. **Puntaje (0-20):** - 18-20: Ingredientes puros, sin EDC, empresa ética.
   - 14-17: Buen producto, algunos aditivos menores o envase plástico.
   - 0-09: Presencia de disruptores endocrinos (EDC) o alertas laborales.
   - 0-07: Ultraprocesados nocivos, químicos agresivos o escándalos graves de derechos humanos.
   - 0-03: riesgo cancerigeno y productos riesgosos en poco tiempo de uso, o con una concentración muy alta de EDC.
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
    {"ingrediente": "nombre", "descripcion": "qué es el compuesto o aditivo (1 frase)", "funcion": "para qué sirve en el producto", "calificacion": "bueno/regular/riesgo", "justificacion": "1-2 frases: por qué es bueno, regular o riesgoso (EDC, ultraprocesado, alérgeno, dosis, alternativas más seguras, etc.)"}
  ],
  "alertas": {
    "endocrinas": ["lista de EDCs encontrados"],
    "salud": "explicación de riesgos nutricionales o dermatológicos en no mas de 40 palabras",
    "etica_laboral": "resumen de comportamiento corporativo de la marca"
  },
  "veredicto": "Resumen ejecutivo en no mas de 40 palabras con tono empático pero directo",
  "recomendacion": "Una acción concreta para el usuario"
}`;

function userPromptsForImageCount(count: number): string[] {
  const intro =
    count > 1
      ? `Tienes ${count} imágenes del mismo producto. Cruza nombre/marca, ingredientes y datos nutricionales si aparecen en distintas fotos. `
      : "";
  const exhaust = `${intro}IMPORTANTE: en analisis_quimico incluye el 100% de los ingredientes legibles de la etiqueta, sin omitir ninguno.`;
  return [
    `${exhaust} Analiza y responde SOLO con JSON válido según el formato.`,
    `${exhaust} Repite el análisis completo. Devuelve un único objeto JSON (sin markdown) sin truncar el array de ingredientes.`,
    `${exhaust} Último intento: JSON completo; si la lista es larga, sigue hasta el último ingrediente visible.`,
  ];
}

function detectImageMime(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

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

function normalizeCalificacion(v: unknown): ChemicalAnalysisItem["calificacion"] {
  const x = String(v ?? "").toLowerCase();
  if (x === "riesgo" || x === "risk") return "riesgo";
  if (x === "regular") return "regular";
  return "bueno";
}

function normalizeChemicalRows(rows: unknown): ChemicalAnalysisItem[] {
  if (!Array.isArray(rows)) return [];
  const out: ChemicalAnalysisItem[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const ingrediente = String(row.ingrediente ?? "").trim();
    if (!ingrediente) continue;
    const funcion = String(row.funcion ?? "").trim() || "—";
    const descripcionRaw = String(row.descripcion ?? "").trim();
    const descripcion = descripcionRaw || undefined;
    const justRaw = String(
      row.justificacion ?? row.motivo_calificacion ?? row.razon ?? "",
    ).trim();
    const justificacion = justRaw || undefined;
    out.push({
      ingrediente,
      descripcion,
      funcion,
      calificacion: normalizeCalificacion(row.calificacion),
      justificacion,
    });
  }
  return out;
}

function parseAnalysisFromModelOutput(text: string): ProductAiAnalysis {
  const parsed = tryParseAnalysis(text);
  if (!parsed) {
    throw new Error("OpenAI response was not valid JSON");
  }
  parsed.analisis_quimico = normalizeChemicalRows(parsed.analisis_quimico);
  return parsed;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests/i.test(msg);
}

export async function analyzeProductImagesWithOpenAI(
  imageBuffers: Buffer[],
): Promise<ProductAiAnalysis> {
  if (imageBuffers.length === 0) {
    throw new Error("At least one image is required");
  }
  const imageParts = imageBuffers.map((buf) => {
    const mime = detectImageMime(buf);
    const imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return {
      type: "input_image" as const,
      image_url: imageDataUrl,
      detail: "high" as const,
    };
  });

  const userPrompts = userPromptsForImageCount(imageBuffers.length);
  const maxAttempts = userPrompts.length;
  let lastError: Error = new Error("OpenAI analysis failed");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const completion = await getClient().responses.create({
        model: config.openAiModel,
        max_output_tokens: config.openAiMaxOutputTokens,
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
                text: userPrompts[attempt] ?? userPrompts[userPrompts.length - 1],
              },
              ...imageParts,
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

export async function analyzeProductImageWithOpenAI(
  imageBytes: Buffer,
): Promise<ProductAiAnalysis> {
  return analyzeProductImagesWithOpenAI([imageBytes]);
}

const TEXT_REGRADE_PREFIX = `No hay imágenes nuevas. Tienes un análisis previo en JSON.
Tu tarea es volver a generar el objeto de análisis completo aplicando EXACTAMENTE las mismas reglas y el mismo formato JSON que en el mensaje de sistema.
Puedes corregir puntaje global, calificaciones por ingrediente (bueno/regular/riesgo), descripciones, justificaciones, alertas, veredicto y recomendación según las directrices actuales.
Mantén la exhaustividad de ingredientes: el array analisis_quimico debe incluir todos los ingredientes del análisis previo (mismos nombres salvo que fusiones duplicados obvios); no reduzcas la lista por brevedad.
Responde con un único objeto JSON válido (sin markdown).`;

/**
 * Re-evalúa un producto usando solo el análisis estructurado previo (mismo SYSTEM_PROMPT que visión).
 * Sirve para aplicar un prompt actualizado sin volver a subir fotos.
 */
export async function reanalyzeProductFromPriorAnalysis(
  prior: ProductAiAnalysis,
): Promise<ProductAiAnalysis> {
  const userText = `${TEXT_REGRADE_PREFIX}

JSON de referencia:
${JSON.stringify(prior)}`;

  const maxAttempts = 3;
  let lastError: Error = new Error("OpenAI reanalyze failed");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const completion = await getClient().responses.create({
        model: config.openAiModel,
        max_output_tokens: config.openAiMaxOutputTokens,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userText }],
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
