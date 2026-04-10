/* eslint-disable react-refresh/only-export-components */
// Pipeline Context - Global State Management for ML Pipeline

import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
    ParsedCSV,
    PreprocessConfig,
    PipelineStage,
    ClassificationResults,
    ApiError,
    ColumnPreprocessConfig,
    ModelType,
} from '../services/api/types';

// ============================================
// State Types
// ============================================

interface PipelineState {
    // Data
    file: File | null;
    parsedData: ParsedCSV | null;
    preprocessConfig: PreprocessConfig | null;
    selectedModel: ModelType;

    // Pipeline Status
    jobId: string | null;
    stage: PipelineStage;
    progress: number;
    message: string;

    // Results (Map)
    results: Record<string, ClassificationResults> | null;

    // Error
    error: ApiError | null;
}

// ============================================
// Action Types
// ============================================

type PipelineAction =
    | { type: 'SET_FILE'; payload: File }
    | { type: 'SET_PARSED_DATA'; payload: ParsedCSV }
    | { type: 'SET_PREPROCESS_CONFIG'; payload: PreprocessConfig }
    | { type: 'UPDATE_COLUMN_CONFIG'; payload: ColumnPreprocessConfig }
    | { type: 'SET_SELECTED_MODEL'; payload: ModelType }
    | { type: 'SET_JOB_ID'; payload: string }
    | { type: 'SET_STAGE'; payload: PipelineStage }
    | { type: 'SET_PROGRESS'; payload: { progress: number; message: string } }
    | { type: 'SET_RESULTS'; payload: { model: string; results: ClassificationResults } }
    | { type: 'SET_ERROR'; payload: ApiError | null }
    | { type: 'RESET' };

// ============================================
// Initial State
// ============================================

const initialState: PipelineState = {
    file: null,
    parsedData: null,
    preprocessConfig: null,
    selectedModel: 'tcmr',
    jobId: null,
    stage: 'idle',
    progress: 0,
    message: '',
    results: null,
    error: null,
};

// ============================================
// Reducer
// ============================================

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
    switch (action.type) {
        case 'SET_FILE':
            return { ...state, file: action.payload, results: null, error: null };

        case 'SET_PARSED_DATA':
            return { ...state, parsedData: action.payload, results: null };

        case 'SET_PREPROCESS_CONFIG':
            return { ...state, preprocessConfig: action.payload };

        case 'UPDATE_COLUMN_CONFIG': {
            if (!state.preprocessConfig) return state;
            const updatedColumns = state.preprocessConfig.columns.map(col =>
                col.columnName === action.payload.columnName ? action.payload : col
            );
            return {
                ...state,
                preprocessConfig: { ...state.preprocessConfig, columns: updatedColumns },
            };
        }

        case 'SET_SELECTED_MODEL':
            return { ...state, selectedModel: action.payload };

        case 'SET_JOB_ID':
            return { ...state, jobId: action.payload };

        case 'SET_STAGE':
            return { ...state, stage: action.payload };

        case 'SET_PROGRESS':
            return { ...state, progress: action.payload.progress, message: action.payload.message };

        case 'SET_RESULTS':
            return {
                ...state,
                results: {
                    ...(state.results || {}),
                    [action.payload.model]: action.payload.results
                },
                stage: 'complete'
            };

        case 'SET_ERROR':
            return { ...state, error: action.payload, stage: action.payload ? 'error' : state.stage };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// ============================================
// Context
// ============================================

interface PipelineContextValue {
    state: PipelineState;
    dispatch: React.Dispatch<PipelineAction>;

    // Convenience actions
    setFile: (file: File) => void;
    setParsedData: (data: ParsedCSV) => void;
    setPreprocessConfig: (config: PreprocessConfig) => void;
    updateColumnConfig: (config: ColumnPreprocessConfig) => void;
    setSelectedModel: (model: ModelType) => void;
    setJobId: (jobId: string) => void;
    setStage: (stage: PipelineStage) => void;
    setProgress: (progress: number, message: string) => void;
    setResults: (model: string, results: ClassificationResults) => void;
    setError: (error: ApiError | null) => void;
    reset: () => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

// ============================================
// Provider
// ============================================

const STORAGE_KEY = 'mayo_pipeline_state';

interface PipelineProviderProps {
    children: ReactNode;
}

// Helper to load initial state from storage
const loadInitialState = (): PipelineState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsedState = JSON.parse(stored);
            // Ensure 'results' is a Record<string, ClassificationResults> if it exists
            if (parsedState.results && !Array.isArray(parsedState.results) && typeof parsedState.results === 'object') {
                return parsedState;
            } else if (parsedState.results) {
                // If results was previously a single object, convert it to a map with a default key
                // Or, if it's in an unexpected format, reset it to null.
                console.warn("Stored 'results' was not in expected Record<string, ClassificationResults> format. Resetting.");
                return { ...parsedState, results: null };
            }
            return parsedState;
        }
    } catch (e) {
        console.warn('Failed to load pipeline state', e);
    }
    return initialState;
};

export function PipelineProvider({ children }: PipelineProviderProps) {
    // Initialize with function to avoid expensive parsing on every render
    const [state, dispatch] = useReducer(pipelineReducer, initialState, loadInitialState);

    // Persistence Effect
    useEffect(() => {
        try {
            // Determine what to persist - maybe exclude massive files if they cause issues
            // For now, persist everything as requested.
            // Note: File objects cannot be stringified, so 'file' will be lost on reload naturally.
            // We need to be careful with 'file'.

            // Create a persistable version of state (File object becomes empty object in JSON)
            const stateToSave = {
                ...state,
                file: null, // Cannot persist File object
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Failed to save pipeline state', e);
        }
    }, [state]);

    const value: PipelineContextValue = {
        state,
        dispatch,
        setFile: (file) => dispatch({ type: 'SET_FILE', payload: file }),
        setParsedData: (data) => dispatch({ type: 'SET_PARSED_DATA', payload: data }),
        setPreprocessConfig: (config) => dispatch({ type: 'SET_PREPROCESS_CONFIG', payload: config }),
        updateColumnConfig: (config) => dispatch({ type: 'UPDATE_COLUMN_CONFIG', payload: config }),
        setSelectedModel: (model) => dispatch({ type: 'SET_SELECTED_MODEL', payload: model }),
        setJobId: (jobId) => dispatch({ type: 'SET_JOB_ID', payload: jobId }),
        setStage: (stage) => dispatch({ type: 'SET_STAGE', payload: stage }),
        setProgress: (progress, message) => dispatch({ type: 'SET_PROGRESS', payload: { progress, message } }),
        setResults: (model, results) => dispatch({ type: 'SET_RESULTS', payload: { model, results } }),
        setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
        reset: () => {
            localStorage.removeItem(STORAGE_KEY);
            dispatch({ type: 'RESET' });
        },
    };

    return (
        <PipelineContext.Provider value={value}>
            {children}
        </PipelineContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function usePipelineContext(): PipelineContextValue {
    const context = useContext(PipelineContext);
    if (!context) {
        throw new Error('usePipelineContext must be used within a PipelineProvider');
    }
    return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export default PipelineContext;
