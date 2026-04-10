# Mayo Clinic ML Models Directory

This directory contains trained classification models and their associated artifacts.

## Directory Structure

```
models/
├── model_1/                    # First model (e.g., high_res)
│   ├── [type]_[outcome]_best_model.pt         # PyTorch DNN weights
│   ├── [type]_[outcome]_xgb_model.bin         # XGBoost model
│   ├── numeric_transformer.joblib             # Fitted numeric scaler/imputer
│   ├── cat_imputer.joblib                     # Categorical imputer
│   ├── target_encoder.joblib                  # Target encoder for high-cardinality
│   ├── ohe_leaf_encoder.joblib                # OneHot encoder for XGB leaves
│   ├── numeric_features.joblib                # List of numeric column names
│   ├── high_card_cols.joblib                  # High-cardinality categorical columns
│   ├── low_card_cols.joblib                   # Low-cardinality categorical columns
│   ├── ohe_low_card_cols.joblib               # OHE columns for low-card features
│   ├── optuna_study.pkl                       # Hyperparameter optimization results
│   └── [percentage]%/                         # Results per test percentage
│       ├── bootstrap_test_metrics.csv
│       ├── roc_curve.png
│       ├── precision_recall_curve.png
│       ├── confusion_matrix.png
│       └── dca.png
│
├── model_2/                    # Second model (e.g., low_res)
│   └── (same structure as model_1)
│
└── README.md                   # This file
```

## Required Files Per Model

Each model directory must contain these files for the evaluation script to work:

| File | Description |
|------|-------------|
| `*_best_model.pt` | PyTorch DNN model weights |
| `*_xgb_model.bin` | Trained XGBoost model |
| `numeric_transformer.joblib` | Fitted StandardScaler + SimpleImputer pipeline |
| `cat_imputer.joblib` | SimpleImputer for categorical features |
| `target_encoder.joblib` | Fitted TargetEncoder for high-cardinality columns |
| `ohe_leaf_encoder.joblib` | OneHotEncoder for XGBoost leaf indices |
| `numeric_features.joblib` | List of numeric feature column names |
| `high_card_cols.joblib` | List of high-cardinality categorical columns |
| `low_card_cols.joblib` | List of low-cardinality categorical columns |
| `ohe_low_card_cols.joblib` | OHE column names from training |
| `optuna_study.pkl` | Optuna study with best hyperparameters |

## Usage

To evaluate a model on a test set:

```bash
python evaluate_model.py \
    --model_dir models/model_1 \
    --test_paths data/test_15.csv data/test_10.csv \
    --outcome_col outcome_tcmr \
    --type high_res
```
