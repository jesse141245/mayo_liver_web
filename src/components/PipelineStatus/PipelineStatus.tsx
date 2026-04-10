// Pipeline Status Component - Display current pipeline progress


import { useRef, useEffect } from 'react';
import { usePipelineContext } from '../../context/PipelineContext';
import type { PipelineStage } from '../../services/api/types';
import './PipelineStatus.css';

interface PipelineStatusProps {
    onRetry?: () => void;
}

const STAGES: { key: PipelineStage; label: string; icon: string }[] = [
    { key: 'uploading', label: 'Upload', icon: '↑' },
    { key: 'processing', label: 'Processing', icon: '⚙' },
    { key: 'complete', label: 'Complete', icon: '✓' },
];

function getStageIndex(stage: PipelineStage): number {
    const index = STAGES.findIndex(s => s.key === stage);
    return index === -1 ? -1 : index;
}

export function PipelineStatus({ onRetry }: PipelineStatusProps) {
    const { state, reset } = usePipelineContext();
    const { stage, progress, message, error, jobId } = state;
    const progressBarRef = useRef<HTMLDivElement>(null);

    const currentStageIndex = getStageIndex(stage);

    useEffect(() => {
        if (progressBarRef.current) {
            progressBarRef.current.style.setProperty('--progress-width', `${progress}%`);
        }
    }, [progress]);

    const getStageStatus = (stageIndex: number): 'completed' | 'active' | 'pending' | 'error' => {
        if (stage === 'error' && stageIndex === currentStageIndex) return 'error';
        if (stageIndex < currentStageIndex) return 'completed';
        if (stageIndex === currentStageIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="pipeline-status-container">
            {/* Progress Header */}
            <div className="pipeline-header">
                <div className="pipeline-title">
                    <h3>Pipeline Status</h3>
                    {jobId && <span className="job-id">Job: {jobId.slice(0, 8)}...</span>}
                </div>
                <div className="pipeline-progress-text">
                    {stage === 'idle' ? 'Ready to start' : `${progress}% Complete`}
                </div>
            </div>

            {/* Progress Bar */}
            <div 
                ref={progressBarRef}
                className="pipeline-progress-bar"
            >
                <div
                    className={`pipeline-progress-fill ${stage === 'error' ? 'error' : ''}`}
                />
            </div>

            {/* Stage Steps */}
            <div className="pipeline-stages">
                {STAGES.map((s, index) => {
                    const status = getStageStatus(index);
                    return (
                        <div key={s.key} className={`pipeline-stage ${status}`}>
                            <div className="stage-icon">
                                {status === 'completed' ? '✓' : status === 'error' ? '✕' : s.icon}
                            </div>
                            <div className="stage-label">{s.label}</div>
                            {index < STAGES.length - 1 && (
                                <div className={`stage-connector ${status === 'completed' ? 'completed' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status Message */}
            <div className={`pipeline-message ${stage === 'error' ? 'error' : ''}`}>
                {error ? (
                    <>
                        <span className="error-icon">⚠</span>
                        <span>{error.message}</span>
                    </>
                ) : message ? (
                    <span>{message}</span>
                ) : (
                    <span className="idle-message">Upload a CSV file to begin</span>
                )}
            </div>

            {/* Action Buttons */}
            {(stage === 'error' || stage === 'complete') && (
                <div className="pipeline-actions">
                    {stage === 'error' && onRetry && (
                        <button className="btn btn-primary" onClick={onRetry}>
                            Retry
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={reset}>
                        Start New
                    </button>
                </div>
            )}
        </div>
    );
}

export default PipelineStatus;
