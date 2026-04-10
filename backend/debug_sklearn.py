
import joblib
import os
import sklearn
print(f"Scikit-learn version: {sklearn.__version__}")

models_dir = r"c:\Users\woope\OneDrive\Desktop\Mayo_Web\models"
files_to_check = ['numeric_transformer.joblib', 'cat_imputer.joblib']

for model_name in ['tcmr', 'abmr']:
    print(f"\nChecking model: {model_name}")
    path = os.path.join(models_dir, model_name)
    for filename in files_to_check:
        filepath = os.path.join(path, filename)
        if os.path.exists(filepath):
            try:
                obj = joblib.load(filepath)
                print(f"  [OK] Loaded {filename} (Type: {type(obj)})")
                
                # Check for SimpleImputer and _fill_dtype
                if hasattr(obj, 'get_params'): # It's an estimator
                    # It might be a pipeline/column transformer, or the imputer itself
                    pass
                
                if 'SimpleImputer' in str(type(obj)):
                     print(f"    Has _fill_dtype: {hasattr(obj, '_fill_dtype')}")
                elif hasattr(obj, 'named_steps'): # Pipeline
                    for step_name, step in obj.named_steps.items():
                        if 'SimpleImputer' in str(type(step)):
                            print(f"    Step {step_name} has _fill_dtype: {hasattr(step, '_fill_dtype')}")
                elif hasattr(obj, 'transformers_'): # ColumnTransformer
                     for name, trans, cols in obj.transformers_:
                        if 'SimpleImputer' in str(type(trans)):
                             print(f"    Transformer {name} has _fill_dtype: {hasattr(trans, '_fill_dtype')}")
                        elif hasattr(trans, 'named_steps'): # Pipeline in ColumnTransformer
                             for step_name, step in trans.named_steps.items():
                                if 'SimpleImputer' in str(type(step)):
                                    print(f"    Transformer {name} Step {step_name} has _fill_dtype: {hasattr(step, '_fill_dtype')}")

            except Exception as e:
                print(f"  [FAIL] Failed to load {filename}: {e}")
        else:
            print(f"  [MISSING] {filename}")
