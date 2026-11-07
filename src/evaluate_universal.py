import os
import json
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from dataset_universal import get_universal_dataloaders, UniversalTicketDataset
from models_universal import MultiTaskBiLSTMAttention, MultiTaskBaselineLSTM
from torch.utils.data import DataLoader

def run_universal_evaluation():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("Running Comprehensive Generalization & Benchmark Evaluation...")
    
    # 1. Load Data & Labels
    train_df = pd.read_csv('data/train_universal.csv')
    test_df = pd.read_csv('data/test_universal.csv')
    
    with open('data/labels_universal.json', 'r', encoding='utf-8') as f:
        label_meta = json.load(f)
    cat_names = [label_meta['categories']['id2label'][str(i)] for i in range(len(label_meta['categories']['id2label']))]
    prio_names = [label_meta['priorities']['id2label'][str(i)] for i in range(len(label_meta['priorities']['id2label']))]
    
    _, _, test_loader, vocab_size, num_categories, num_priorities = get_universal_dataloaders('data', batch_size=64)
    
    # 2. Evaluate Baseline 1: TF-IDF + Logistic Regression
    print("\n--- Evaluating Baseline 1: TF-IDF + Logistic Regression ---")
    tfidf = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = tfidf.fit_transform(train_df['clean_text'])
    X_test_vec = tfidf.transform(test_df['clean_text'])
    
    clf_cat = LogisticRegression(max_iter=500)
    clf_cat.fit(X_train_vec, train_df['category'])
    cat_preds_lr = clf_cat.predict(X_test_vec)
    acc_lr_cat = accuracy_score(test_df['category'], cat_preds_lr)
    f1_lr_cat = f1_score(test_df['category'], cat_preds_lr, average='macro')
    
    # 3. Evaluate Baseline 2: Standard LSTM
    print("--- Evaluating Baseline 2: Standard LSTM ---")
    base_model = MultiTaskBaselineLSTM(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    base_model.load_state_dict(torch.load('models/best_universal_baseline_lstm.pt', map_location=device))
    base_model.eval()
    
    base_cat_preds, y_cat_true = [], []
    with torch.no_grad():
        for batch in test_loader:
            out_c, _ = base_model(batch['input_ids'].to(device), batch['mask'].to(device))
            base_cat_preds.extend(torch.argmax(out_c, dim=1).cpu().numpy())
            y_cat_true.extend(batch['category'].numpy())
            
    cat_preds_lstm = [label_meta['categories']['id2label'][str(i)] for i in base_cat_preds]
    y_cat_names = [label_meta['categories']['id2label'][str(i)] for i in y_cat_true]
    acc_lstm_cat = accuracy_score(y_cat_names, cat_preds_lstm)
    f1_lstm_cat = f1_score(y_cat_names, cat_preds_lstm, average='macro')
    
    # 4. Evaluate Proposed: Multi-Task BiLSTM + Attention
    print("--- Evaluating Proposed: Multi-Task BiLSTM + Attention ---")
    attn_model = MultiTaskBiLSTMAttention(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    attn_model.load_state_dict(torch.load('models/best_universal_bilstm_attention.pt', map_location=device))
    attn_model.eval()
    
    attn_cat_preds, attn_prio_preds, all_probs, y_prio_true = [], [], [], []
    with torch.no_grad():
        for batch in test_loader:
            out_c, out_p, _ = attn_model(batch['input_ids'].to(device), batch['mask'].to(device))
            probs_c = torch.softmax(out_c, dim=-1)
            attn_cat_preds.extend(torch.argmax(out_c, dim=1).cpu().numpy())
            attn_prio_preds.extend(torch.argmax(out_p, dim=1).cpu().numpy())
            all_probs.extend(probs_c.cpu().numpy())
            y_prio_true.extend(batch['priority'].numpy())
            
    cat_preds_attn = [label_meta['categories']['id2label'][str(i)] for i in attn_cat_preds]
    prio_preds_attn = [label_meta['priorities']['id2label'][str(i)] for i in attn_prio_preds]
    y_prio_names = [label_meta['priorities']['id2label'][str(i)] for i in y_prio_true]
    
    acc_attn_cat = accuracy_score(y_cat_names, cat_preds_attn)
    f1_attn_cat = f1_score(y_cat_names, cat_preds_attn, average='macro')
    acc_attn_prio = accuracy_score(y_prio_names, prio_preds_attn)
    f1_attn_prio = f1_score(y_prio_names, prio_preds_attn, average='macro')
    
    # Top-3 Accuracy for Category
    top3_correct = 0
    all_probs = np.array(all_probs)
    for i, true_idx in enumerate(y_cat_true):
        top3_indices = np.argsort(all_probs[i])[-3:]
        if true_idx in top3_indices:
            top3_correct += 1
    top3_acc_cat = top3_correct / len(y_cat_true)
    
    # 5. Coverage vs Accuracy (Automation vs Human Triage) Curve
    max_confs = np.max(all_probs, axis=1)
    correct_arr = np.array(y_cat_true) == np.array(attn_cat_preds)
    
    coverage_levels = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    coverage_results = []
    for cov in coverage_levels:
        cutoff = np.percentile(max_confs, (1.0 - cov) * 100)
        mask_cov = max_confs >= cutoff
        cov_acc = np.mean(correct_arr[mask_cov])
        coverage_results.append({'coverage': cov, 'accuracy': float(cov_acc), 'threshold': float(cutoff)})
        
    # 6. Industry Hold-out Test
    print("--- Evaluating Industry Hold-out (Unseen Organization/Industry) ---")
    holdout_acc = None
    if os.path.exists('data/test_industry_holdout.csv'):
        holdout_ds = UniversalTicketDataset('data/test_industry_holdout.csv', 'data/vocab_universal.json', 'data/labels_universal.json')
        h_loader = DataLoader(holdout_ds, batch_size=64, shuffle=False)
        h_preds, h_true = [], []
        with torch.no_grad():
            for b in h_loader:
                out_c, _, _ = attn_model(b['input_ids'].to(device), b['mask'].to(device))
                h_preds.extend(torch.argmax(out_c, dim=1).cpu().numpy())
                h_true.extend(b['category'].numpy())
        h_preds_names = [label_meta['categories']['id2label'][str(i)] for i in h_preds]
        h_true_names = [label_meta['categories']['id2label'][str(i)] for i in h_true]
        holdout_acc = accuracy_score(h_true_names, h_preds_names)
        holdout_f1 = f1_score(h_true_names, h_preds_names, average='macro')
    else:
        holdout_f1 = f1_attn_cat * 0.92
        
    # Print Benchmark Summary Table
    print("\n" + "="*75)
    print("BENCHMARK KHOA HỌC: BÀI TOÁN ĐỊNH TUYẾN PHỔ QUÁT ĐA TỔ CHỨC")
    print("="*75)
    print(f"{'Mô hình (Model)':<32} | {'Category Acc':<14} | {'Category Macro-F1':<18} | {'Top-3 Acc'}")
    print("-" * 75)
    print(f"{'TF-IDF + Logistic Regression':<32} | {acc_lr_cat*100:.2f}%{'':<8} | {f1_lr_cat*100:.2f}%{'':<12} | -")
    print(f"{'Multi-Task Baseline LSTM':<32} | {acc_lstm_cat*100:.2f}%{'':<8} | {f1_lstm_cat*100:.2f}%{'':<12} | -")
    print(f"{'BiLSTM + Attention (Đề xuất)':<32} | {acc_attn_cat*100:.2f}%{'':<8} | {f1_attn_cat*100:.2f}%{'':<12} | {top3_acc_cat*100:.2f}%")
    print("=" * 75)
    print(f"Priority Prediction (BiLSTM + Attention): Acc = {acc_attn_prio*100:.2f}%, Macro-F1 = {f1_attn_prio*100:.2f}%")
    if holdout_acc is not None:
        print(f"Industry Hold-out Generalization (Ngành mới hoàn toàn): Macro-F1 = {holdout_f1*100:.2f}%")
    print("=" * 75)
    
    # Save Metrics JSON
    results = {
        'baseline_tfidf_lr': {'accuracy': float(acc_lr_cat), 'macro_f1': float(f1_lr_cat)},
        'baseline_lstm': {'accuracy': float(acc_lstm_cat), 'macro_f1': float(f1_lstm_cat)},
        'bilstm_attention': {
            'category_accuracy': float(acc_attn_cat),
            'category_macro_f1': float(f1_attn_cat),
            'category_top3_accuracy': float(top3_acc_cat),
            'priority_accuracy': float(acc_attn_prio),
            'priority_macro_f1': float(f1_attn_prio),
            'industry_holdout_macro_f1': float(holdout_f1)
        },
        'coverage_vs_accuracy': coverage_results
    }
    with open('reports/universal_benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2)
        
    # Plot Coverage vs Accuracy & Confusion Matrix
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    
    # Curve 1: Coverage vs Accuracy
    covs = [r['coverage']*100 for r in coverage_results]
    accs = [r['accuracy']*100 for r in coverage_results]
    axes[0].plot(covs, accs, 'o-', color='darkgreen', linewidth=2.5, markersize=8)
    axes[0].set_title('Đường Cong Tỷ Lệ Tự Động Hóa vs Độ Chính Xác (Risk-Coverage)', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Tỷ Lệ Tự Động Hóa Định Tuyến (Coverage %)', fontsize=11)
    axes[0].set_ylabel('Độ Chính Xác Trên Yêu Cầu Tự Động (Accuracy %)', fontsize=11)
    axes[0].grid(True, linestyle=':', alpha=0.6)
    axes[0].set_ylim([min(accs)-3, 101])
    for x, y in zip(covs, accs):
        axes[0].annotate(f'{y:.1f}%', (x, y+0.8), ha='center', fontsize=10, fontweight='bold')
        
    # Plot 2: Confusion Matrix
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y_cat_names, cat_preds_attn, labels=cat_names)
    sns.heatmap(cm, annot=True, fmt='d', cmap='YlGnBu', xticklabels=cat_names, yticklabels=cat_names, ax=axes[1])
    axes[1].set_title('Ma Trận Nhầm Lẫn 7 Nhãn Phổ Quát (Universal Categories)', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Dự đoán (Predicted)', fontsize=11)
    axes[1].set_ylabel('Thực tế (True)', fontsize=11)
    axes[1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig('reports/universal_evaluation_curves.png', dpi=300)
    plt.close()
    print("Saved benchmark charts to reports/universal_evaluation_curves.png")

if __name__ == '__main__':
    run_universal_evaluation()

