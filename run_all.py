import os
import sys
import subprocess

def run_step(step_name, command):
    print("\n" + "="*70)
    print(f"STEP: {step_name}")
    print(f"Command: {command}")
    print("="*70)
    ret = subprocess.run(command, shell=True)
    if ret.returncode != 0:
        print(f"Error during step: {step_name}. Exited with code {ret.returncode}")
        sys.exit(ret.returncode)

if __name__ == '__main__':
    print("Starting Universal Customer Support Routing Pipeline...")
    
    # 1. Dataset Generation
    if not os.path.exists('data/train_universal.csv'):
        run_step("1. Universal Dataset Construction (Weak Supervision & Sanitization)", "python src/build_universal_dataset.py")
    else:
        print("Universal dataset found in data/. Skipping extraction.")
        
    # 2. Training
    if not os.path.exists('models/best_universal_bilstm_attention.pt'):
        run_step("2. Multi-Task Training (BiLSTM + Attention & Baseline)", "python src/train_universal.py")
    else:
        print("Trained universal models found in models/. Skipping training.")
        
    # 3. Comprehensive Benchmark Evaluation
    run_step("3. Comprehensive Benchmark & Generalization Evaluation", "python src/evaluate_universal.py")
    
    # 4. Predictor Test
    run_step("4. Testing Universal Predictor & Triage Gate", "python src/predict_universal.py")
    
    print("\n" + "="*70)
    print("ALL UNIVERSAL PIPELINE STEPS COMPLETED SUCCESSFULLY!")
    print("Start the Web Helpdesk App using: python app.py")
    print("Access at: http://localhost:8000 or http://127.0.0.1:8000")
    print("="*70)
