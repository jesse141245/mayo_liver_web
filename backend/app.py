"""
Mayo Clinic ML Classification API
Flask backend that receives CSV uploads from the website and returns predictions.
"""

import os
import io
import torch
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.calibration import CalibratedClassifierCV
from sklearn.base import BaseEstimator, ClassifierMixin

# === CONFIGURATION ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Model directories
MODEL_DIRS = {
    "tcmr": os.path.join(PROJECT_ROOT, "models", "tcmr"),
    "abmr": os.path.join(PROJECT_ROOT, "models", "abmr"),
}

# Columns to drop before processing
DROP_COLS = ["outcome_tcmr", "outcome_banff", "outcome_abmr", "outcome_rej", "pid"]

# === FLASK APP ===
app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# === HELPER CLASSES ===
class TorchWrapper(BaseEstimator, ClassifierMixin):
    """Wrapper to make PyTorch model compatible with sklearn calibration."""
    def __init__(self, pt_model):
        self.pt_model = pt_model
        self.model = pt_model
        
    def fit(self, X, y=None):
        return self
    
    def predict_proba(self, X):
        self.pt_model.eval()
        with torch.no_grad():
            X_tensor = torch.tensor(X, dtype=torch.float32)
            logits = self.pt_model(X_tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
        return probs


class PyTorchDNN(torch.nn.Module):
    """DNN model architecture matching the trained model."""
    def __init__(self, input_dim, num_neurons, dropout_rate, l2_reg, num_classes=2):
        super(PyTorchDNN, self).__init__()
        self.model = torch.nn.Sequential(
            torch.nn.Linear(input_dim, num_neurons),
            torch.nn.ReLU(),
            torch.nn.Dropout(dropout_rate),
            torch.nn.Linear(num_neurons, num_neurons // 2),
            torch.nn.ReLU(),
            torch.nn.Dropout(dropout_rate),
            torch.nn.Linear(num_neurons // 2, num_classes),
        )
        self.l2_reg = l2_reg

    def forward(self, x):
        return self.model(x)


def flatten_leaf_indices(leaf_indices):
    """Reshapes the leaf indices output from XGBoost for multi-class models."""
    if leaf_indices.ndim == 3:
        n_samples, n_estimators, n_outputs = leaf_indices.shape
        leaf_indices = leaf_indices.reshape(n_samples, n_estimators * n_outputs)
    return leaf_indices


# === MODEL CACHE ===
# Cache loaded models to avoid reloading on each request
loaded_models = {}

def load_model_pipeline(model_name):
    """Load all model artifacts for a given model name."""
    if model_name in loaded_models:
        return loaded_models[model_name]
    
    model_dir = MODEL_DIRS.get(model_name)
    if not model_dir or not os.path.exists(model_dir):
        raise ValueError(f"Model '{model_name}' not found")
    
    print(f"Loading model pipeline from: {model_dir}")
    
    # Load XGBoost model
    xgb_model = xgb.XGBClassifier()
    xgb_model.load_model(os.path.join(model_dir, f"unknown_outcome_{model_name}_xgb_model.bin"))
    
    # Load feature lists
    numeric_features = joblib.load(os.path.join(model_dir, 'numeric_features.joblib'))
    high_card_cols = joblib.load(os.path.join(model_dir, 'high_card_cols.joblib'))
    low_card_cols = joblib.load(os.path.join(model_dir, 'low_card_cols.joblib'))
    
    # Load transformers
    numeric_transformer = joblib.load(os.path.join(model_dir, 'numeric_transformer.joblib'))
    cat_imputer = joblib.load(os.path.join(model_dir, 'cat_imputer.joblib'))
    target_encoder = joblib.load(os.path.join(model_dir, 'target_encoder.joblib'))
    train_ohe_cols = joblib.load(os.path.join(model_dir, 'ohe_low_card_cols.joblib'))
    ohe_leaf_encoder = joblib.load(os.path.join(model_dir, 'ohe_leaf_encoder.joblib'))
    
    # Load Optuna study for hyperparameters
    # study = joblib.load(os.path.join(model_dir, 'optuna_study.pkl'))
    # best_params = study.best_trial.params
    import json
    with open(os.path.join(model_dir, 'optuna_params.json'), 'r') as f:
        best_params = json.load(f)
    
    pipeline = {
        'model_dir': model_dir,
        'xgb_model': xgb_model,
        'numeric_features': numeric_features,
        'high_card_cols': high_card_cols,
        'low_card_cols': low_card_cols,
        'categorical_features': high_card_cols + low_card_cols,
        'numeric_transformer': numeric_transformer,
        'cat_imputer': cat_imputer,
        'target_encoder': target_encoder,
        'train_ohe_cols': train_ohe_cols,
        'ohe_leaf_encoder': ohe_leaf_encoder,
        'best_params': best_params,
        'dnn_model': None,  # Will be created after we know input dim
    }
    
    loaded_models[model_name] = pipeline
    print(f"Model pipeline loaded successfully")
    return pipeline


def preprocess_data(df, pipeline):
    """Apply preprocessing pipeline to input dataframe."""
    X = df.drop(columns=DROP_COLS, errors="ignore")
    
    numeric_features = pipeline['numeric_features']
    categorical_features = pipeline['categorical_features']
    high_card_cols = pipeline['high_card_cols']
    low_card_cols = pipeline['low_card_cols']
    
    # Ensure all required columns exist
    for col in numeric_features + categorical_features:
        if col not in X.columns:
            X[col] = 0 if col in numeric_features else "missing"
    
    X = X[numeric_features + categorical_features]
    
    # Process numeric features
    X_numeric = pipeline['numeric_transformer'].transform(X[numeric_features])
    
    # Process categorical features
    X_cat_imp = pd.DataFrame(
        pipeline['cat_imputer'].transform(X[categorical_features]), 
        columns=categorical_features
    )
    X_high = pipeline['target_encoder'].transform(X_cat_imp[high_card_cols])
    X_low = pd.get_dummies(X_cat_imp[low_card_cols], drop_first=True, dtype=float)
    X_low_ohe = X_low.reindex(columns=pipeline['train_ohe_cols'], fill_value=0.0)
    
    # Combine base features
    X_processed = np.hstack([X_numeric, X_high.values, X_low_ohe.values])
    X_processed = np.nan_to_num(X_processed).astype(float)
    
    # Get XGBoost leaf indices
    leaf_flat = flatten_leaf_indices(pipeline['xgb_model'].apply(X_processed))
    X_leaf_ohe = pipeline['ohe_leaf_encoder'].transform(leaf_flat)
    
    # Final combined features
    X_combined = np.hstack([X_processed, X_leaf_ohe])
    X_combined = np.nan_to_num(X_combined).astype(float)
    
    return X_combined


def get_predictions(X_combined, pipeline, model_name):
    """Get predictions from the DNN model."""
    model_dir = pipeline['model_dir']
    best_params = pipeline['best_params']
    input_dim = X_combined.shape[1]
    
    # Create and load DNN model
    model = PyTorchDNN(
        input_dim=input_dim,
        num_neurons=best_params['dnn_num_neurons'],
        dropout_rate=best_params['dnn_dropout_rate'],
        l2_reg=best_params['dnn_l2_regularizer']
    )
    
    model_path = os.path.join(model_dir, f"unknown_outcome_{model_name}_best_model.pt")
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()
    
    # Get predictions
    with torch.no_grad():
        X_tensor = torch.FloatTensor(X_combined)
        logits = model(X_tensor)
        probs = torch.nn.functional.softmax(logits, dim=1).numpy()
    
    return probs


# === API ENDPOINTS ===

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'models_available': list(MODEL_DIRS.keys())
    })


@app.route('/api/models', methods=['GET'])
def list_models():
    """List available models."""
    models = []
    for name, path in MODEL_DIRS.items():
        models.append({
            'name': name,
            'available': os.path.exists(path)
        })
    return jsonify({'models': models})


@app.route('/api/predict/<model_name>', methods=['POST'])
def predict(model_name):
    """
    Receive CSV file and return predictions.
    
    Expected: multipart/form-data with 'file' field containing CSV
    Returns: JSON with predictions for each row
    """
    if model_name not in MODEL_DIRS:
        return jsonify({'error': f'Model "{model_name}" not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be a CSV'}), 400
    
    try:
        # Read CSV from upload
        csv_content = file.read().decode('utf-8')
        df = pd.read_csv(io.StringIO(csv_content))
        
        # Load model pipeline
        pipeline = load_model_pipeline(model_name)
        
        # Preprocess data
        X_combined = preprocess_data(df, pipeline)
        
        # Get predictions
        probs = get_predictions(X_combined, pipeline, model_name)
        
        # Format results
        predictions = []
        for i in range(len(probs)):
            predictions.append({
                'rowIndex': i,
                'predictedClass': int(probs[i].argmax()),
                'confidence': float(probs[i].max()),
                'probabilities': {
                    'class_0': float(probs[i][0]),
                    'class_1': float(probs[i][1])
                }
            })
        
        # Calculate summary metrics
        pred_classes = probs.argmax(axis=1)
        avg_confidence = float(probs.max(axis=1).mean())
        
        return jsonify({
            'success': True,
            'model': model_name,
            'totalRows': len(predictions),
            'predictions': predictions,
            'summary': {
                'averageConfidence': avg_confidence,
                'predictedPositive': int((pred_classes == 1).sum()),
                'predictedNegative': int((pred_classes == 0).sum())
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


# === MAIN ===
if __name__ == '__main__':
    print("=" * 50)
    print("Mayo Clinic ML Classification API")
    print("=" * 50)
    print(f"Models directory: {os.path.join(PROJECT_ROOT, 'models')}")
    print(f"Available models: {list(MODEL_DIRS.keys())}")
    print("=" * 50)
    
    # Run Flask server
    app.run(host='0.0.0.0', port=5000, debug=True)
