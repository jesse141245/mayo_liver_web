// Pipeline Page - Mayo Clinic ML Classification Pipeline

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineContext } from '../context/PipelineContext';
import { usePipeline } from '../hooks/usePipeline';
import { CSVUpload } from '../components/CSVUpload';
import { DataPreview } from '../components/DataPreview';
import { PipelineStatus } from '../components/PipelineStatus';
import { Results } from '../components/Results';
import './Pipeline.css';

type TabType = 'upload' | 'preview' | 'results';

export function Pipeline() {
    const navigate = useNavigate();
    const { state, reset, setSelectedModel } = usePipelineContext();
    const { runClassification, isLoading } = usePipeline();
    const { parsedData, results, file, selectedModel } = state;

    const [activeTab, setActiveTab] = useState<TabType>('upload');

    const tabs: { key: TabType; label: string; disabled: boolean }[] = [
        { key: 'upload', label: '1. Upload', disabled: false },
        { key: 'preview', label: '2. Review Data', disabled: !parsedData },
        { key: 'results', label: '3. Results', disabled: !results },
    ];

    const handleUploadComplete = () => {
        setActiveTab('preview');
    };

    const handleStartNew = () => {
        reset();
        setActiveTab('upload');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    const handleRunAnalysis = async () => {
        if (!file) {
            console.error("No file to process");
            return;
        }
        await runClassification(file);
        setActiveTab('results');
    };

    return (
        <div className="pipeline-page">
            {/* Header */}
            <header className="pipeline-header">
                <div className="header-left">
                    <div className="mayo-logo-small">
                        <div className="logo-shield">
                            <svg viewBox="0 0 40 48" fill="currentColor">
                                <path d="M20 0L40 12V36L20 48L0 36V12L20 0Z" />
                            </svg>
                        </div>
                        <div className="logo-text">
                            <span className="logo-title">Mayo Clinic</span>
                        </div>
                    </div>
                </div>
                <div className="header-center">
                    {parsedData && (
                        <span className="file-indicator">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                            {parsedData.fileName}
                        </span>
                    )}
                </div>
                <div className="header-right">
                    <button className="btn btn-text" onClick={handleGoHome}>
                        Home
                    </button>
                    <button className="btn btn-secondary" onClick={handleStartNew}>
                        New Analysis
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="pipeline-tabs">
                <div className="tabs-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                            onClick={() => !tab.disabled && setActiveTab(tab.key)}
                            disabled={tab.disabled}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="pipeline-main">
                <div className="pipeline-content">
                    {activeTab === 'upload' && (
                        <div className="tab-content">
                            <div className="content-header">
                                <h2>Upload Patient Dataset</h2>
                                <p>Upload your dataset in CSV format. Ensure patient identifiers are properly anonymized.</p>
                            </div>
                            <CSVUpload onUploadComplete={handleUploadComplete} />
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="tab-content">
                            <div className="content-header">
                                <h2>Review Data</h2>
                                <p>Verify the data was parsed correctly. Select feature columns and the target variable for classification.</p>
                            </div>
                            <DataPreview />
                        </div>
                    )}

                    {activeTab === 'results' && (
                        <div className="tab-content">
                            <Results />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="pipeline-sidebar">
                    <PipelineStatus />

                    {parsedData && (!results || Object.keys(results).length === 0) && (
                        <div className="action-card">
                            <h4>Ready to Classify</h4>
                            <p>Select a model and run predictions.</p>

                            <div className="model-selector">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="model"
                                        value="tcmr"
                                        checked={selectedModel === 'tcmr'}
                                        onChange={() => setSelectedModel('tcmr')}
                                        disabled={isLoading}
                                    />
                                    TCMR Model
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="model"
                                        value="abmr"
                                        checked={selectedModel === 'abmr'}
                                        onChange={() => setSelectedModel('abmr')}
                                        disabled={isLoading}
                                    />
                                    ABMR Model
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="model"
                                        value="all"
                                        checked={selectedModel === 'all'}
                                        onChange={() => setSelectedModel('all')}
                                        disabled={isLoading}
                                    />
                                    All Rejection Types
                                </label>
                            </div>

                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleRunAnalysis}
                                disabled={isLoading || !file}
                            >
                                {isLoading ? 'Processing...' : 'Run Classification'}
                            </button>
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}

export default Pipeline;
