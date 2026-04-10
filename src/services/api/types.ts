// API Types - Mayo Clinic ML Classification

// ============================================
// Prediction Types
// ============================================

export interface Prediction {
  rowIndex: number;
  predictedClass: number;
  confidence: number;
  probabilities: {
    class_0: number;
    class_1: number;
  };
}

export interface PredictionSummary {
  averageConfidence: number;
  predictedPositive: number;
  predictedNegative: number;
}

// ============================================
// API Response Types
// ============================================

export interface PredictResponse {
  success: boolean;
  model: string;
  totalRows: number;
  predictions: Prediction[];
  summary: PredictionSummary;
  error?: string;
}

export interface HealthResponse {
  status: string;
  models_available: string[];
}

export interface ModelInfo {
  name: string;
  available: boolean;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

export interface ApiError {
  message: string;
  code?: string;
}

// ============================================
// CSV Data Types
// ============================================

export interface CSVColumn {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'date';
  uniqueCount: number;
  nullCount: number;
  sampleValues: (string | number | boolean | null)[];
}

export interface ParsedCSV {
  fileName: string;
  data: Record<string, unknown>[];
  columns: CSVColumn[];
  rowCount: number;
}

// ============================================
// Preprocessing Config Types (for UI state)
// ============================================

export type MissingValueStrategy = 'drop' | 'mean' | 'median' | 'mode' | 'constant';
export type ScalingStrategy = 'none' | 'standard' | 'minmax' | 'robust';
export type EncodingStrategy = 'none' | 'onehot' | 'label' | 'target';

export interface ColumnPreprocessConfig {
  columnName: string;
  isFeature: boolean;
  isTarget: boolean;
  missingValueStrategy: MissingValueStrategy;
  constantValue?: string | number;
  scalingStrategy: ScalingStrategy;
  encodingStrategy: EncodingStrategy;
}

export interface PreprocessConfig {
  columns: ColumnPreprocessConfig[];
  trainTestSplit: number;
  randomSeed: number;
}

// ============================================
// Pipeline State Types
// ============================================

export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'processing'
  | 'complete'
  | 'error';


export type ModelType = 'tcmr' | 'abmr' | 'all';

export interface PipelineStatus {
  stage: PipelineStage;
  progress: number;
  message?: string;
}

// ============================================
// Classification Results (for display)
// ============================================

export interface ClassificationResults {
  predictions: Prediction[];
  summary: PredictionSummary;
  modelUsed: string;
  processedAt: string;
}
