// Custom Hook for Pipeline Management - Mayo Clinic ML Classification

import { useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { usePipelineContext } from '../context/PipelineContext';
import type {
    PipelineStage,
    ClassificationResults,
} from '../services/api/types';

interface PipelineError {
    code: string;
    message: string;
}

interface UsePipelineReturn {
    // State
    stage: PipelineStage;
    progress: number;
    message: string;
    error: PipelineError | null;
    results: Record<string, ClassificationResults> | null;
    isLoading: boolean;

    // Actions
    runClassification: (file: File) => Promise<void>;
    reset: () => void;
}

export function usePipeline(): UsePipelineReturn {
    const { state, setStage, setProgress, setResults, setError: setContextError, reset: contextReset } = usePipelineContext();
    const { stage, progress, message, error, results } = state;

    const [isLoading, setIsLoading] = useState(false);

    const runClassification = useCallback(async (file: File): Promise<void> => {
        setIsLoading(true);
        setContextError(null);
        // contextReset(); // We don't want to reset everything here to preserve file info if needed

        try {
            // Stage 1: Uploading (Simulated or Real)
            setStage('uploading');
            setProgress(10, 'Preparing data for analysis...');

            // Stage 2: Processing
            setStage('processing');
            setProgress(20, 'Initializing classification models...');

            // Run prediction for selected model(s)
            const selectedModel = state.selectedModel;
            
            if (selectedModel === 'all') {
                // Run both models
                setProgress(30, 'Running TCMR classification model...');
                const tcmrResponse = await apiClient.predict(file, 'tcmr');
                
                if (!tcmrResponse.success) {
                    throw new Error(tcmrResponse.error || 'TCMR classification failed');
                }
                
                const tcmrResults: ClassificationResults = {
                    predictions: tcmrResponse.predictions,
                    summary: tcmrResponse.summary,
                    modelUsed: tcmrResponse.model,
                    processedAt: new Date().toISOString(),
                };
                setResults('tcmr', tcmrResults);
                
                setProgress(70, 'Running ABMR classification model...');
                const abmrResponse = await apiClient.predict(file, 'abmr');
                
                if (!abmrResponse.success) {
                    throw new Error(abmrResponse.error || 'ABMR classification failed');
                }
                
                const abmrResults: ClassificationResults = {
                    predictions: abmrResponse.predictions,
                    summary: abmrResponse.summary,
                    modelUsed: abmrResponse.model,
                    processedAt: new Date().toISOString(),
                };
                setResults('abmr', abmrResults);
            } else {
                // Run single model
                const displayModel = selectedModel.toUpperCase();
                setProgress(50, `Running ${displayModel} classification model...`);

                const response = await apiClient.predict(file, selectedModel);

                if (response.success) {
                    const classificationResults: ClassificationResults = {
                        predictions: response.predictions,
                        summary: response.summary,
                        modelUsed: response.model,
                        processedAt: new Date().toISOString(),
                    };
                    setResults(selectedModel, classificationResults);
                } else {
                    throw new Error(response.error || `${displayModel} classification failed`);
                }
            }

            setStage('complete');
            setProgress(100, 'All classifications complete');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setContextError({ message: errorMessage });
            setStage('error');
            setProgress(0, errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [setStage, setProgress, setResults, setContextError]);

    const reset = useCallback(() => {
        contextReset();
        setIsLoading(false);
    }, [contextReset]);

    return {
        stage,
        progress,
        message,
        error: error ? { code: error.code || 'UNKNOWN', message: error.message } : null,
        results,
        isLoading,
        runClassification,
        reset,
    };
}

export default usePipeline;
