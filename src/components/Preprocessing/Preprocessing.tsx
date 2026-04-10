// Preprocessing Component - Configure data preprocessing options

import { useState, useCallback } from 'react';
import { usePipelineContext } from '../../context/PipelineContext';
import type {
    PreprocessConfig,
    ColumnPreprocessConfig,
    MissingValueStrategy,
    ScalingStrategy,
    EncodingStrategy
} from '../../services/api/types';
import './Preprocessing.css';

interface PreprocessingProps {
    onConfigChange?: (config: PreprocessConfig) => void;
    onApply?: () => void;
}

const MISSING_VALUE_OPTIONS: { value: MissingValueStrategy; label: string }[] = [
    { value: 'drop', label: 'Drop Rows' },
    { value: 'mean', label: 'Fill with Mean' },
    { value: 'median', label: 'Fill with Median' },
    { value: 'mode', label: 'Fill with Mode' },
    { value: 'constant', label: 'Fill with Constant' },
];

const SCALING_OPTIONS: { value: ScalingStrategy; label: string }[] = [
    { value: 'none', label: 'No Scaling' },
    { value: 'standard', label: 'Standardization (Z-score)' },
    { value: 'minmax', label: 'Min-Max Scaling' },
    { value: 'robust', label: 'Robust Scaling' },
];

const ENCODING_OPTIONS: { value: EncodingStrategy; label: string }[] = [
    { value: 'none', label: 'No Encoding' },
    { value: 'onehot', label: 'One-Hot Encoding' },
    { value: 'label', label: 'Label Encoding' },
    { value: 'target', label: 'Target Encoding' },
];

export function Preprocessing({ onConfigChange, onApply }: PreprocessingProps) {
    const { state, setPreprocessConfig } = usePipelineContext();
    const { parsedData, preprocessConfig } = state;

    const [trainTestSplit, setTrainTestSplit] = useState(0.2);
    const [randomSeed, setRandomSeed] = useState(42);
    const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

    // Initialize column configs from parsed data
    const initializeColumnConfigs = useCallback((): ColumnPreprocessConfig[] => {
        if (!parsedData) return [];

        return parsedData.columns.map(col => ({
            columnName: col.name,
            missingValueStrategy: col.nullCount > 0 ? 'mean' : 'drop',
            scalingStrategy: col.type === 'number' ? 'standard' : 'none',
            encodingStrategy: col.type === 'string' ? 'onehot' : 'none',
            isFeature: true,
            isTarget: false,
        }));
    }, [parsedData]);

    const [columnConfigs, setColumnConfigs] = useState<ColumnPreprocessConfig[]>(() =>
        preprocessConfig?.columns || initializeColumnConfigs()
    );

    const updateColumnConfig = useCallback((columnName: string, updates: Partial<ColumnPreprocessConfig>) => {
        setColumnConfigs(prev => {
            const updated = prev.map(col =>
                col.columnName === columnName ? { ...col, ...updates } : col
            );
            return updated;
        });
    }, []);

    const handleApply = useCallback(() => {
        const config: PreprocessConfig = {
            columns: columnConfigs,
            trainTestSplit,
            randomSeed,
        };
        setPreprocessConfig(config);
        onConfigChange?.(config);
        onApply?.();
    }, [columnConfigs, trainTestSplit, randomSeed, setPreprocessConfig, onConfigChange, onApply]);

    const handleResetDefaults = useCallback(() => {
        setColumnConfigs(initializeColumnConfigs());
        setTrainTestSplit(0.2);
        setRandomSeed(42);
    }, [initializeColumnConfigs]);

    if (!parsedData) {
        return (
            <div className="preprocessing-empty">
                <p>No data loaded. Please upload a CSV file first.</p>
            </div>
        );
    }

    return (
        <div className="preprocessing-container">
            {/* Global Settings */}
            <div className="preprocessing-section">
                <h3>Global Settings</h3>
                <div className="global-settings-grid">
                    <div className="setting-group">
                        <label htmlFor="train-test-split">Train/Test Split</label>
                        <div className="slider-container">
                            <input
                                id="train-test-split"
                                type="range"
                                min="0.1"
                                max="0.5"
                                step="0.05"
                                value={trainTestSplit}
                                onChange={(e) => setTrainTestSplit(parseFloat(e.target.value))}
                            />
                            <span className="slider-value">{Math.round(trainTestSplit * 100)}% Test</span>
                        </div>
                    </div>
                    <div className="setting-group">
                        <label htmlFor="random-seed">Random Seed</label>
                        <input
                            id="random-seed"
                            type="number"
                            value={randomSeed}
                            onChange={(e) => setRandomSeed(parseInt(e.target.value) || 0)}
                            className="number-input"
                        />
                    </div>
                </div>
            </div>

            {/* Column-specific Settings */}
            <div className="preprocessing-section">
                <h3>Column Configuration</h3>
                <div className="columns-list">
                    {columnConfigs.map(col => {
                        const columnInfo = parsedData.columns.find(c => c.name === col.columnName);
                        const isExpanded = expandedColumn === col.columnName;

                        return (
                            <div
                                key={col.columnName}
                                className={`column-config-card ${isExpanded ? 'expanded' : ''}`}
                            >
                                <div
                                    className="column-config-header"
                                    onClick={() => setExpandedColumn(isExpanded ? null : col.columnName)}
                                >
                                    <div className="column-info">
                                        <span className={`type-indicator type-${columnInfo?.type || 'string'}`}>
                                            {columnInfo?.type === 'number' ? '#' : 'Aa'}
                                        </span>
                                        <span className="column-name">{col.columnName}</span>
                                        {columnInfo && columnInfo.nullCount > 0 && (
                                            <span className="missing-badge">{columnInfo.nullCount} missing</span>
                                        )}
                                    </div>
                                    <div className="column-actions">
                                        <button
                                            className={`toggle-btn ${col.isFeature ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); updateColumnConfig(col.columnName, { isFeature: !col.isFeature, isTarget: false }); }}
                                        >
                                            Feature
                                        </button>
                                        <button
                                            className={`toggle-btn target ${col.isTarget ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); updateColumnConfig(col.columnName, { isTarget: !col.isTarget, isFeature: false }); }}
                                        >
                                            Target
                                        </button>
                                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="column-config-body">
                                        <div className="config-row">
                                            <label htmlFor={`missing-${col.columnName}`}>Missing Values</label>
                                            <select
                                                id={`missing-${col.columnName}`}
                                                value={col.missingValueStrategy}
                                                onChange={(e) => updateColumnConfig(col.columnName, {
                                                    missingValueStrategy: e.target.value as MissingValueStrategy
                                                })}
                                            >
                                                {MISSING_VALUE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {col.missingValueStrategy === 'constant' && (
                                            <div className="config-row">
                                                <label htmlFor={`fill-value-${col.columnName}`}>Fill Value</label>
                                                <input
                                                    id={`fill-value-${col.columnName}`}
                                                    type="text"
                                                    value={col.constantValue || ''}
                                                    onChange={(e) => updateColumnConfig(col.columnName, { constantValue: e.target.value })}
                                                    placeholder="Enter fill value"
                                                />
                                            </div>
                                        )}

                                        <div className="config-row">
                                            <label htmlFor={`scaling-${col.columnName}`}>Scaling</label>
                                            <select
                                                id={`scaling-${col.columnName}`}
                                                value={col.scalingStrategy}
                                                onChange={(e) => updateColumnConfig(col.columnName, {
                                                    scalingStrategy: e.target.value as ScalingStrategy
                                                })}
                                            >
                                                {SCALING_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="config-row">
                                            <label htmlFor={`encoding-${col.columnName}`}>Encoding</label>
                                            <select
                                                id={`encoding-${col.columnName}`}
                                                value={col.encodingStrategy}
                                                onChange={(e) => updateColumnConfig(col.columnName, {
                                                    encodingStrategy: e.target.value as EncodingStrategy
                                                })}
                                            >
                                                {ENCODING_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="preprocessing-actions">
                <button className="btn btn-secondary" onClick={handleResetDefaults}>
                    Reset to Defaults
                </button>
                <button className="btn btn-primary" onClick={handleApply}>
                    Apply Configuration
                </button>
            </div>
        </div>
    );
}

export default Preprocessing;
