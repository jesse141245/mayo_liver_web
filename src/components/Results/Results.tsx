// Results Component - Classification Output Display for Mayo Clinic

import { useState, useMemo } from 'react';
import { usePipelineContext } from '../../context/PipelineContext';
import type { ClassificationResults } from '../../services/api/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './Results.css';

/** Display ID is 1-based (rowIndex + 1) */
function getDisplayId(rowIndex: number): number {
    return rowIndex + 1;
}

export function Results() {
    const { state } = usePipelineContext();
    const { results } = state;
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [idSearchInput, setIdSearchInput] = useState('');

    const firstModelResults = useMemo(() => {
        if (!results) return null;
        const entries = Object.entries(results);
        return entries.length > 0 ? entries[0][1] : null;
    }, [results]);

    if (!results) {
        return (
            <div className="results-empty">
                <div className="empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </div>
                <h3>No Results Available</h3>
                <p>Classification results will appear here once the pipeline completes.</p>
            </div>
        );
    }

    const handleExport = (modelName: string, data: ClassificationResults) => {
        if (!data.predictions) return;

        // 1. Define CSV Headers
        const headers = ['ID', 'Risk Score (%)', 'Confidence (%)'];

        // 2. Format Data Rows
        const rows = data.predictions.map(pred => {
            const riskScore = (pred.probabilities.class_1 * 100).toFixed(1);
            const confidence = (pred.confidence * 100).toFixed(0);

            return [
                pred.rowIndex + 1,
                riskScore,
                confidence
            ].join(',');
        });

        // 3. Combine Headers and Rows
        const csvContent = [
            headers.join(','),
            ...rows
        ].join('\n');

        // 4. Create Blob and Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${modelName}_classification_results_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPatients = firstModelResults?.predictions.length ?? 0;
    const effectiveSelectedId =
        totalPatients === 1 ? 1 : selectedPatientId;
    const showPieForPatient =
        totalPatients === 1 || (effectiveSelectedId != null && effectiveSelectedId >= 1 && effectiveSelectedId <= totalPatients);

    const handleIdSearch = () => {
        const num = parseInt(idSearchInput.trim(), 10);
        if (!Number.isNaN(num) && num >= 1 && num <= totalPatients) {
            setSelectedPatientId(num);
        } else {
            setSelectedPatientId(null);
            setIdSearchInput('');
        }
    };

    const clearPatientSelection = () => {
        setSelectedPatientId(null);
        setIdSearchInput('');
    };

    return (
        <div className="results-container">
            {/* Classification results at top: header + summary per model */}
            {Object.entries(results).map(([modelName, modelResults]) => (
                <div key={modelName} className="model-results-section model-results-section--header">
                    <div className="results-header">
                        <div>
                            <h2 className="model-results-title">{modelName} Classification Results</h2>
                            <p className="results-timestamp">
                                Completed: {new Date(modelResults.processedAt).toLocaleString()}
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleExport(modelName, modelResults)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7,10 12,15 17,10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export {modelName.toUpperCase()} Results
                        </button>
                    </div>
                    <div className="summary-card">
                        <h3>Overview</h3>
                        <div className="summary-stats">
                            <div className="stat-item">
                                <span className="stat-label">Records Analyzed: </span>
                                <span className="stat-value">{modelResults.predictions.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Avg. Confidence: </span>
                                <span className="stat-value">{(modelResults.summary.averageConfidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">High Risk Detected: </span>
                                <span className="stat-value highlight-high-risk">{modelResults.summary.predictedPositive}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Low Risk Detected: </span>
                                <span className="stat-value highlight-low-risk">{modelResults.summary.predictedNegative}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Patient table */}
            {firstModelResults && totalPatients > 0 && (
                <div className="results-patient-nav">
                    <h3>Patients</h3>
                    <div className="patient-list-header">
                        <div className="patient-id-search">
                            <label htmlFor="patient-id-search">Go to patient ID</label>
                            <div className="patient-id-search-row">
                                <input
                                    id="patient-id-search"
                                    type="number"
                                    min={1}
                                    max={totalPatients}
                                    placeholder={`1–${totalPatients}`}
                                    value={idSearchInput}
                                    onChange={(e) => setIdSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                                />
                                <button type="button" className="btn btn-primary" onClick={handleIdSearch}>
                                    Go
                                </button>
                            </div>
                        </div>
                        {totalPatients > 1 && showPieForPatient && effectiveSelectedId != null && (
                            <button type="button" className="btn btn-outline" onClick={clearPatientSelection}>
                                Show all patients
                            </button>
                        )}
                    </div>
                    <div className="patient-list-wrapper">
                        <table className="patient-list-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Risk (%)</th>
                                    <th>Confidence (%)</th>
                                    <th aria-hidden />
                                </tr>
                            </thead>
                            <tbody>
                                {firstModelResults.predictions.map((pred) => {
                                    const displayId = getDisplayId(pred.rowIndex);
                                    const riskPct = (pred.probabilities.class_1 * 100).toFixed(1);
                                    const confPct = (pred.confidence * 100).toFixed(0);
                                    const isSelected = effectiveSelectedId === displayId;
                                    return (
                                        <tr
                                            key={pred.rowIndex}
                                            className={isSelected ? 'selected' : ''}
                                            onClick={() => setSelectedPatientId(displayId)}
                                        >
                                            <td className="row-id">{displayId}</td>
                                            <td className="risk-pct">{riskPct}%</td>
                                            <td className="conf-pct">{confPct}%</td>
                                            <td className="action">{isSelected ? 'Viewing' : 'View'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pie chart(s) right below the table */}
            {Object.entries(results).map(([modelName, modelResults]) => {
                const predictionToShow =
                    showPieForPatient && effectiveSelectedId != null
                        ? modelResults.predictions.find((p) => getDisplayId(p.rowIndex) === effectiveSelectedId)
                        : null;

                if (!predictionToShow) return null;

                const prediction = predictionToShow;
                const highRiskPercent = (prediction.probabilities.class_1 * 100).toFixed(1);
                const lowRiskPercent = (prediction.probabilities.class_0 * 100).toFixed(1);
                const displayId = getDisplayId(prediction.rowIndex);

                /* Same colors as header: mayo-shield (dark blue), logo/primary (mayo-blue) for low risk */
                const pieData = [
                    { name: 'High Risk', value: parseFloat(highRiskPercent), color: '#00263e' },
                    { name: 'Low Risk', value: parseFloat(lowRiskPercent), color: '#0057b8' }
                ];

                return (
                    <div key={modelName} className="risk-chart-container">
                        <h3>Risk Score — Patient ID {displayId} ({modelName})</h3>
                        <div className="pie-chart-wrapper">
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(1)}%` : ''}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })}
            {/* Export Reminder */}
            <div className="export-reminder">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p>
                    Export the results to download a complete CSV file with all classification data for clinical documentation.
                </p>
            </div>
        </div>
    );
}

export default Results;
