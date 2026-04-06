export interface ProductCoreInfo {
  nombre: string;
  marca: string;
  categoria: "Alimento" | "Cosmético" | "Aseo" | "Desconocido";
  puntaje_global: number;
}

export interface ChemicalAnalysisItem {
  ingrediente: string;
  /** Descripción del ingrediente (catálogo / modelo). */
  descripcion?: string;
  funcion: string;
  calificacion: "bueno" | "regular" | "riesgo";
  /** Por qué tiene esa calificación. */
  justificacion?: string;
}

export type AnalysisJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AnalysisJobSummary {
  jobId: string;
  status: AnalysisJobStatus;
  productUid?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface StartAnalyzeJobResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface ProductAnalysisResponse {
  uid: string;
  product: {
    uid: string;
    id: string;
    barcode?: string;
    name: string;
    brand: string;
    category: "Alimento" | "Cosmético" | "Aseo" | "Desconocido";
    ingredients: string[];
    score: number;
    disruptors_summary: string;
    labor_ethics: string;
    endocrine_alerts: string[];
    health_alert: string;
    chemical_analysis: ChemicalAnalysisItem[];
    verdict: string;
    recommendation: string;
    last_updated: string;
  };
  analysis: {
    producto: ProductCoreInfo;
    analisis_quimico: ChemicalAnalysisItem[];
    alertas: {
      endocrinas: string[];
      salud: string;
      etica_laboral: string;
    };
    veredicto: string;
    recomendacion: string;
  };
  source: "cache" | "openai";
}

export type AnalyzeProductResponse = ProductAnalysisResponse;
export type ProductRecord = ProductAnalysisResponse["product"];

export interface AnalyzeJobPollResponse {
  job: {
    jobId: string;
    status: AnalysisJobStatus;
    productUid?: string;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
  };
  product: ProductRecord | null;
}

export interface UploadUrlResponse {
  key: string;
  uploadUrl: string;
}

export interface UserScanRecord {
  productUid: string;
  productName: string;
  score: number;
  scannedAt: string;
}

export interface ShoppingListItem {
  productUid: string;
  productName: string;
  score: number;
  endocrineRiskCount: number;
  addedAt: string;
}

export interface ShoppingListEvaluation {
  listSize: number;
  averageScore: number;
  riskProductCount: number;
  riskPercentage: number;
  basketGrade: "CANASTA_SALUDABLE" | "CANASTA_MIXTA" | "CANASTA_CRITICA";
  tooManyEndocrineRisk: boolean;
  recommendation: string;
}

export interface DashboardResponse {
  user: {
    userId: string;
    email?: string;
    name?: string;
    image?: string;
  };
  recent_scans: UserScanRecord[];
  shopping_list: ShoppingListItem[];
  shopping_list_summary: ShoppingListEvaluation;
  /** Análisis en cola o en proceso (revisa el historial cuando terminen). */
  pending_jobs?: AnalysisJobSummary[];
}

export interface ShoppingListEvaluateResponse {
  user_id: string;
  shopping_items: ShoppingListItem[];
  evaluation: ShoppingListEvaluation;
}
