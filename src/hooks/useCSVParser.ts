// Custom Hook for CSV Parsing using PapaParse

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { ParsedCSV, CSVColumn } from '../services/api/types';

interface UseCSVParserReturn {
    parsedData: ParsedCSV | null;
    isLoading: boolean;
    error: string | null;
    parseFile: (file: File) => Promise<ParsedCSV>;
    reset: () => void;
}

function inferColumnType(values: unknown[]): CSVColumn['type'] {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) return 'string';

    // Check if all values are booleans
    const booleanCheck = nonNullValues.every(v =>
        typeof v === 'boolean' ||
        (typeof v === 'string' && ['true', 'false', '0', '1'].includes(v.toLowerCase()))
    );
    if (booleanCheck) return 'boolean';

    // Check if all values are numbers
    const numberCheck = nonNullValues.every(v => !isNaN(Number(v)));
    if (numberCheck) return 'number';

    // Check if all values are dates
    const dateCheck = nonNullValues.every(v => {
        const date = new Date(String(v));
        return !isNaN(date.getTime());
    });
    if (dateCheck && nonNullValues.length > 0) return 'date';

    return 'string';
}

function analyzeColumn(name: string, values: unknown[]): CSVColumn {
    const type = inferColumnType(values);
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));

    return {
        name,
        type,
        sampleValues: Array.from(uniqueValues).slice(0, 5) as (string | number | boolean)[],
        nullCount,
        uniqueCount: uniqueValues.size,
    };
}

export function useCSVParser(): UseCSVParserReturn {
    const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseFile = useCallback((file: File): Promise<ParsedCSV> => {
        return new Promise((resolve, reject) => {
            setIsLoading(true);
            setError(null);

            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setIsLoading(false);

                    if (results.errors.length > 0) {
                        const errorMessage = results.errors.map(e => e.message).join(', ');
                        setError(errorMessage);
                        reject(new Error(errorMessage));
                        return;
                    }

                    const data = results.data as Record<string, unknown>[];
                    const columnNames = results.meta.fields || Object.keys(data[0] || {});

                    // Analyze each column
                    const columns: CSVColumn[] = columnNames.map(name => {
                        const values = data.map(row => row[name]);
                        return analyzeColumn(name, values);
                    });

                    const parsed: ParsedCSV = {
                        columns,
                        data,
                        rowCount: data.length,
                        fileName: file.name,
                    };

                    setParsedData(parsed);
                    resolve(parsed);
                },
                error: (err) => {
                    setIsLoading(false);
                    setError(err.message);
                    reject(err);
                },
            });
        });
    }, []);

    const reset = useCallback(() => {
        setParsedData(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        parsedData,
        isLoading,
        error,
        parseFile,
        reset,
    };
}

export default useCSVParser;
