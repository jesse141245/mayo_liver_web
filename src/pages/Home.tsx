// Home Page - Mayo Clinic ML Classification Pipeline

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSVUpload } from '../components/CSVUpload';
import './Home.css';

export function Home() {
    const navigate = useNavigate();

    const handleUploadComplete = useCallback(() => {
        navigate('/pipeline');
    }, [navigate]);

    return (
        <div className="home-page">
            {/* Header */}
            <header className="mayo-header">
                <div className="header-content">
                    <div className="mayo-logo">
                        <div className="logo-shield">
                            <svg viewBox="0 0 40 48" fill="currentColor">
                                <path d="M20 0L40 12V36L20 48L0 36V12L20 0Z" />
                            </svg>
                        </div>
                        <div className="logo-text">
                            <span className="logo-title">Mayo Clinic</span>
                            <span className="logo-subtitle">KLEAR</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="home-main">
                <div className="home-content">
                    <div className="welcome-section">
                        <h1>Patient Data Classification</h1>
                        <p>
                            Upload your patient data in CSV format to run the classification model.
                            The system will preprocess your data and provide diagnostic predictions.
                        </p>
                    </div>

                    <div className="upload-card">
                        <div className="card-header">
                            <h2>Upload Dataset</h2>
                            <p>Drag and drop your CSV file or click to browse</p>
                        </div>
                        <CSVUpload onUploadComplete={handleUploadComplete} />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
