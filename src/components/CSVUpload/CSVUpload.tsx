// CSV Upload Component - Drag & Drop File Upload with Validation

import { useState, useRef, useCallback } from 'react';
import { useCSVParser } from '../../hooks/useCSVParser';
import { usePipelineContext } from '../../context/PipelineContext';
import './CSVUpload.css';

interface CSVUploadProps {
    onUploadComplete?: () => void;
    maxFileSizeMB?: number;
}

export function CSVUpload({ onUploadComplete, maxFileSizeMB = 50 }: CSVUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { parseFile, isLoading, error } = useCSVParser();
    const { setFile, setParsedData, setStage, setProgress } = usePipelineContext();

    const validateFile = useCallback((file: File): string | null => {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            return 'Please upload a CSV file';
        }
        if (file.size > maxFileSizeMB * 1024 * 1024) {
            return `File size must be less than ${maxFileSizeMB}MB`;
        }
        return null;
    }, [maxFileSizeMB]);

    const handleFile = useCallback(async (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            alert(validationError);
            return;
        }

        setFile(file);
        setStage('parsing');
        setProgress(10, 'Parsing CSV file...');

        try {
            const parsed = await parseFile(file);
            setParsedData(parsed);
            setStage('idle');
            setProgress(25, 'CSV parsed successfully');
            onUploadComplete?.();
        } catch (err) {
            setStage('error');
            console.error('Parse error:', err);
        }
    }, [validateFile, setFile, setStage, setProgress, parseFile, setParsedData, onUploadComplete]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    return (
        <div className="csv-upload-container">
            <div
                className={`csv-upload-dropzone ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleInputChange}
                    className="csv-upload-input"
                />

                <div className="csv-upload-content">
                    {isLoading ? (
                        <>
                            <div className="csv-upload-spinner"></div>
                            <p className="csv-upload-text">Parsing CSV file...</p>
                        </>
                    ) : (
                        <>
                            <div className="csv-upload-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17,8 12,3 7,8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p className="csv-upload-text">
                                <span className="highlight">Click to upload</span> or drag and drop
                            </p>
                            <p className="csv-upload-hint">CSV files only (max {maxFileSizeMB}MB)</p>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="csv-upload-error">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

export default CSVUpload;
