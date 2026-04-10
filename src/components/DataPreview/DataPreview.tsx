// Data Preview Component - Display parsed CSV data with column stats

import { useState, useMemo, useEffect, useRef, startTransition } from 'react';
import { usePipelineContext } from '../../context/PipelineContext';
import type { CSVColumn } from '../../services/api/types';
import './DataPreview.css';

interface DataPreviewProps {
    maxRows?: number;
    onColumnSelect?: (columnName: string, role: 'feature') => void;
}

export function DataPreview({ onColumnSelect }: DataPreviewProps) {
    const { state } = usePipelineContext();
    const { parsedData } = state;
    /*
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(0);
    */
    // Compute all column names as a string for comparison
    const columns = parsedData?.columns;
    const columnNamesKey = useMemo(() => {
        if (!columns) return '';
        return columns.map(col => col.name).sort().join(',');
    }, [columns]);

    // Initialize selected columns with all columns
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() => {
        if (!parsedData?.columns) return new Set();
        return new Set(parsedData.columns.map(col => col.name));
    });

    const prevColumnNamesKeyRef = useRef<string>('');

    // Auto-select all columns as features when column names change
    // Using startTransition to mark the update as non-urgent and avoid cascading renders
    useEffect(() => {
        if (columnNamesKey && columnNamesKey !== prevColumnNamesKeyRef.current) {
            prevColumnNamesKeyRef.current = columnNamesKey;
            if (parsedData?.columns) {
                startTransition(() => {
                    setSelectedColumns(new Set(parsedData.columns.map(col => col.name)));
                });
            }
        }
    }, [columnNamesKey, parsedData?.columns]);
    {/*
    const rowsPerPage = 20;

    const sortedData = useMemo(() => {
        if (!parsedData) return [];

        const data = [...parsedData.data];

        if (sortColumn) {
            data.sort((a, b) => {
                const aVal = a[sortColumn];
                const bVal = b[sortColumn];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const comparison = aVal < bVal ? -1 : 1;
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return data.slice(0, maxRows);
    }, [parsedData, sortColumn, sortDirection, maxRows]);
    
    const paginatedData = useMemo(() => {
        const start = currentPage * rowsPerPage;
        return sortedData.slice(start, start + rowsPerPage);
    }, [sortedData, currentPage]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    const handleSort = (columnName: string) => {
        if (sortColumn === columnName) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnName);
            setSortDirection('asc');
        }
    };
    */}

    const handleColumnToggle = (columnName: string) => {
        const newSelected = new Set(selectedColumns);
        if (newSelected.has(columnName)) {
            newSelected.delete(columnName);
        } else {
            newSelected.add(columnName);
        }
        setSelectedColumns(newSelected);
        onColumnSelect?.(columnName, 'feature');
    };

    const getTypeIcon = (type: CSVColumn['type']) => {
        switch (type) {
            case 'number': return '#';
            case 'boolean': return '⊙';
            case 'date': return '◷';
            default: return 'Aa';
        }
    };

    const getTypeBadgeClass = (type: CSVColumn['type']) => {
        return `type-badge type-${type}`;
    };

    if (!parsedData) {
        return (
            <div className="data-preview-empty">
                <p>No data loaded. Please upload a CSV file first.</p>
            </div>
        );
    }

    return (
        <div className="data-preview-container">
            {/* Summary Stats */}
            <div className="data-preview-summary">
                <div className="summary-stat">
                    <span className="stat-value">{parsedData.rowCount.toLocaleString()}</span>
                    <span className="stat-label">Rows</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{parsedData.columns.length}</span>
                    <span className="stat-label">Columns</span>
                </div>
                <div className="summary-stat">
                    <span className="stat-value">{selectedColumns.size}</span>
                    <span className="stat-label">Features Selected</span>
                </div>
            </div>

            {/* Column Overview */}
            <div className="data-preview-columns">
                <h3>Column Overview</h3>
                <div className="columns-grid">
                    {parsedData.columns.map(col => (
                        <div
                            key={col.name}
                            className={`column-card ${selectedColumns.has(col.name) ? 'selected' : ''}`}
                        >
                            <div className="column-header">
                                <span className={getTypeBadgeClass(col.type)}>{getTypeIcon(col.type)}</span>
                                <span className="column-name">{col.name}</span>
                            </div>
                            <div className="column-stats">
                                <span>Unique: {col.uniqueCount}</span>
                                <span>Missing: {col.nullCount}</span>
                            </div>
                            <div className="column-actions">
                                <button
                                    className={`action-btn feature ${selectedColumns.has(col.name) ? 'active' : ''}`}
                                    onClick={() => handleColumnToggle(col.name)}
                                >
                                    Feature
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Table 
            <div className="data-preview-table-container">
                <h3>Data Preview</h3>
                <div className="table-wrapper">
                    <table className="data-preview-table">
                        <thead>
                            <tr>
                                <th className="row-number">#</th>
                                {parsedData.columns.map(col => (
                                    <th
                                        key={col.name}
                                        onClick={() => handleSort(col.name)}
                                        className={sortColumn === col.name ? 'sorted' : ''}
                                    >
                                        <div className="th-content">
                                            <span>{col.name}</span>
                                            {sortColumn === col.name && (
                                                <span className="sort-indicator">
                                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="row-number">{currentPage * rowsPerPage + idx + 1}</td>
                                    {parsedData.columns.map(col => (
                                        <td key={col.name}>
                                            {row[col.name] === null || row[col.name] === undefined
                                                ? <span className="null-value">null</span>
                                                : String(row[col.name])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                Pagination 
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(0)}
                            disabled={currentPage === 0}
                            className="pagination-btn"
                        >
                            ««
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="pagination-btn"
                        >
                            «
                        </button>
                        <span className="pagination-info">
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage === totalPages - 1}
                            className="pagination-btn"
                        >
                            »
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages - 1)}
                            disabled={currentPage === totalPages - 1}
                            className="pagination-btn"
                        >
                            »»
                        </button>
                    </div>
                )}
            </div>
            */}
        </div>
    );
}

export default DataPreview;
