// API Endpoints Configuration - Connected to Flask Backend

export const API_ENDPOINTS = {
    // Base URL - Flask backend on port 5000
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',

    // Health check
    HEALTH: '/health',

    // Models list
    MODELS: '/models',

    // Prediction endpoint (model_name will be appended)
    PREDICT: (modelName: string) => `/predict/${modelName}`,
} as const;

export type EndpointKey = keyof typeof API_ENDPOINTS;
