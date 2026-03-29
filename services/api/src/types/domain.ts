export type ProductCategory = "Alimento" | "Cosmético" | "Aseo" | "Desconocido";

export interface ProductCoreInfo {
  nombre: string;
  marca: string;
  categoria: ProductCategory;
  puntaje_global: number;
}

export interface ChemicalAnalysisItem {
  ingrediente: string;
  funcion: string;
  calificacion: "bueno" | "regular" | "riesgo";
}

export interface ProductAlerts {
  endocrinas: string[];
  salud: string;
  etica_laboral: string;
}

export interface ProductAiAnalysis {
  producto: ProductCoreInfo;
  analisis_quimico: ChemicalAnalysisItem[];
  alertas: ProductAlerts;
  veredicto: string;
  recomendacion: string;
}

export type AiAnalysisPayload = ProductAiAnalysis;

export interface ProductRecord {
  uid: string;
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  category: ProductCategory;
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
}

export interface UserIdentity {
  userId: string;
  email?: string;
  name?: string;
  image?: string;
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

export type DbEntityType =
  | "PRODUCT"
  | "USER_PROFILE"
  | "USER_SCAN"
  | "SHOPPING_ITEM";

export interface BaseDbItem {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: DbEntityType;
}

export interface ProductDbItem extends BaseDbItem, ProductRecord {
  entityType: "PRODUCT";
  created_at: string;
  analysis: ProductAiAnalysis;
}

export interface UserProfileDbItem extends BaseDbItem {
  entityType: "USER_PROFILE";
  id: string;
  email?: string;
  name?: string;
  image?: string;
  total_scans: number;
  created_at: string;
  updated_at: string;
}

export interface UserScanDbItem extends BaseDbItem {
  entityType: "USER_SCAN";
  user_id: string;
  product_uid: string;
  product_name: string;
  score: number;
  scanned_at: string;
}

export interface ShoppingListItemDb extends BaseDbItem {
  entityType: "SHOPPING_ITEM";
  user_id: string;
  product_uid: string;
  product_name: string;
  product_score: number;
  endocrine_risk_count: number;
  added_at: string;
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
