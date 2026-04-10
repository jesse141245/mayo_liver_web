// API Client - Connects React frontend to Flask ML backend

import { API_ENDPOINTS } from './endpoints';

// ============================================
// Types
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

export interface PredictResponse {
    success: boolean;
    model: string;
    totalRows: number;
    predictions: Prediction[];
    summary: {
        averageConfidence: number;
        predictedPositive: number;
        predictedNegative: number;
    };
    error?: string;
}

export interface ModelInfo {
    name: string;
    available: boolean;
}

export interface HealthResponse {
    status: string;
    models_available: string[];
}

export interface ModelsResponse {
    models: ModelInfo[];
}

// ============================================
// API Client
// ============================================

const BASE_URL = API_ENDPOINTS.BASE_URL;

export const apiClient = {
    /**
     * Health check - verify backend is running
     */
    async healthCheck(): Promise<HealthResponse> {
        const response = await fetch(`${BASE_URL}${API_ENDPOINTS.HEALTH}`);
        if (!response.ok) {
            throw new Error('Backend not available');
        }
        return response.json();
    },

    /**
     * Get list of available models
     */
    async getModels(): Promise<ModelsResponse> {
        const response = await fetch(`${BASE_URL}${API_ENDPOINTS.MODELS}`);
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        return response.json();
    },

    /**
     * Upload CSV and get predictions
     */
    async predict(file: File, modelName: string = 'tcmr'): Promise<PredictResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BASE_URL}${API_ENDPOINTS.PREDICT(modelName)}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Prediction failed');
        }

        return data;
    },
};

export default apiClient;
