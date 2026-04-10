
import joblib
import os
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

models_dir = r"c:\Users\woope\OneDrive\Desktop\Mayo_Web\models"
files_to_check = ['numeric_transformer.joblib', 'cat_imputer.joblib']

def patch_imputer(imputer, name="imputer"):
    if not hasattr(imputer, '_fill_dtype'):
        print(f"    Patching {name}...")
        # Infer dtype from statistics_ or assume float for numeric, object for categorical
        if hasattr(imputer, 'statistics_'):
            dtype = imputer.statistics_.dtype
            print(f"    Inferred dtype from statistics_: {dtype}")
            imputer._fill_dtype = dtype
        else:
            # Fallback based on strategy or known type
            if imputer.strategy in ['mean', 'median']:
                imputer._fill_dtype = np.dtype(np.float64)
            else:
                imputer._fill_dtype = np.dtype(object)
            print(f"    Inferred dtype fallback: {imputer._fill_dtype}")
        return True
    return False

def patch_object(obj, filename):
    modified = False
    
    # Direct SimpleImputer
    if isinstance(obj, SimpleImputer):
        if patch_imputer(obj, filename):
            modified = True
            
    # Pipeline
    elif isinstance(obj, Pipeline):
        for name, step in obj.named_steps.items():
            if isinstance(step, SimpleImputer):
                if patch_imputer(step, f"Pipeline Step {name}"):
                    modified = True
            elif isinstance(step, ColumnTransformer):
                 # Recursive check for ColumnTransformer inside Pipeline
                 for ct_name, ct_trans, _ in step.transformers_:
                    if isinstance(ct_trans, SimpleImputer):
                         if patch_imputer(ct_trans, f"Pipeline Step {name} -> CT {ct_name}"):
                             modified = True
                    elif isinstance(ct_trans, Pipeline):
                        for inner_name, inner_step in ct_trans.named_steps.items():
                             if isinstance(inner_step, SimpleImputer):
                                 if patch_imputer(inner_step, f"Pipeline {name}->CT {ct_name}->Step {inner_name}"):
                                     modified = True

    # ColumnTransformer
    elif isinstance(obj, ColumnTransformer):
        for name, trans, _ in obj.transformers_:
            if isinstance(trans, SimpleImputer):
                if patch_imputer(trans, f"Transformer {name}"):
                    modified = True
            elif isinstance(trans, Pipeline):
                for step_name, step in trans.named_steps.items():
                    if isinstance(step, SimpleImputer):
                        if patch_imputer(step, f"Transformer {name} Step {step_name}"):
                            modified = True
                            
    return modified

for model_name in ['tcmr', 'abmr']:
    print(f"\nProcessing model: {model_name}")
    path = os.path.join(models_dir, model_name)
    for filename in files_to_check:
        filepath = os.path.join(path, filename)
        if os.path.exists(filepath):
            try:
                obj = joblib.load(filepath)
                if patch_object(obj, filename):
                    joblib.dump(obj, filepath)
                    print(f"  [FIXED] Patched and saved {filename}")
                else:
                    print(f"  [OK] {filename} already has _fill_dtype or validation failed")
            except Exception as e:
                print(f"  [FAIL] Failed to process {filename}: {e}")
