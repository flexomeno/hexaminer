export interface ProductCoreInfo {
  nombre: string;
  marca: string;
  categoria: "Alimento" | "Cosmético" | "Aseo" | "Desconocido";
  puntaje_global: number;
}

export interface ChemicalAnalysisItem {
  ingrediente: string;
  funcion: string;
  calificacion: "bueno" | "regular" | "riesgo";
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
}

export interface ShoppingListEvaluateResponse {
  user_id: string;
  shopping_items: ShoppingListItem[];
  evaluation: ShoppingListEvaluation;
}
