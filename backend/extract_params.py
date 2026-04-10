
import os
import joblib
import json
import optuna

MODELS_DIR = r"c:\Users\woope\OneDrive\Desktop\Mayo_Web\models"

def extract_params():
    for model_name in os.listdir(MODELS_DIR):
        model_path = os.path.join(MODELS_DIR, model_name)
        if os.path.isdir(model_path):
            pickle_path = os.path.join(model_path, 'optuna_study.pkl')
            json_path = os.path.join(model_path, 'optuna_params.json')
            
            if os.path.exists(pickle_path):
                print(f"Processing {model_name}...")
                try:
                    study = joblib.load(pickle_path)
                    best_params = study.best_trial.params
                    
                    with open(json_path, 'w') as f:
                        json.dump(best_params, f, indent=2)
                    print(f"Successfully extracted params to {json_path}")
                except Exception as e:
                    with open('error.log', 'a') as log:
                        log.write(f"Failed to process {model_name}: {str(e)}\n")
                    print(f"Failed to process {model_name}")
            else:
                print(f"No pickle found for {model_name}")

if __name__ == "__main__":
    extract_params()
