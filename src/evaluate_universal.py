import os
import json
import re
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from dataset_universal import get_universal_dataloaders, UniversalTicketDataset
from models_universal import MultiTaskBiLSTMAttention, MultiTaskBaselineLSTM, MultiTaskBiLSTMNoAttention
from build_universal_dataset import infer_category_weak, KEYWORDS
from torch.utils.data import DataLoader

def eval_torch_model(model, loader, device, model_type='attention'):
    model.eval()
    cat_preds, prio_preds, all_cat_probs = [], [], []
    y_cat_true, y_prio_true = [], []
    
    with torch.no_grad():
        for batch in loader:
            inp = batch['input_ids'].to(device)
            mask = batch['mask'].to(device)
            lens = batch['length'].to(device)
            
            if model_type == 'attention':
                out_c, out_p, _ = model(inp, mask, lens)
            else:
                out_c, out_p = model(inp, mask, lens)
                
            probs_c = torch.softmax(out_c, dim=-1)
            cat_preds.extend(torch.argmax(out_c, dim=1).cpu().numpy())
            prio_preds.extend(torch.argmax(out_p, dim=1).cpu().numpy())
            all_cat_probs.extend(probs_c.cpu().numpy())
            y_cat_true.extend(batch['category'].numpy())
            y_prio_true.extend(batch['priority'].numpy())
            
    return np.array(cat_preds), np.array(prio_preds), np.array(all_cat_probs), np.array(y_cat_true), np.array(y_prio_true)

def run_universal_evaluation():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("="*85)
    print("HỆ THỐNG ĐÁNH GIÁ ĐA CHIỀU & BÁO CÁO THỰC NGHIỆM KHOA HỌC")
    print("="*85)
    
    # 1. Load Data & Labels
    train_df = pd.read_csv('data/train_universal.csv')
    test_df = pd.read_csv('data/test_universal.csv')
    
    with open('data/labels_universal.json', 'r', encoding='utf-8') as f:
        label_meta = json.load(f)
    id2cat = label_meta['categories']['id2label']
    id2prio = label_meta['priorities']['id2label']
    cat_names = [id2cat[str(i)] for i in range(len(id2cat))]
    prio_names = [id2prio[str(i)] for i in range(len(id2prio))]
    
    _, _, test_loader, vocab_size, num_categories, num_priorities = get_universal_dataloaders('data', batch_size=64, max_seq_len=80)
    
    # 2. Baseline 0: Weak Supervision Regex Baseline (Luật Từ Khóa Gốc)
    print("\n--- 1. Đánh giá Baseline 0: Regex Rule Baseline ---")
    regex_cat_preds = [infer_category_weak(str(t)) for t in test_df['clean_text']]
    acc_regex_cat = accuracy_score(test_df['category'], regex_cat_preds)
    f1_regex_cat = f1_score(test_df['category'], regex_cat_preds, average='macro')
    
    # 3. Baseline 1: TF-IDF + Logistic Regression
    print("--- 2. Đánh giá Baseline 1: TF-IDF + Logistic Regression ---")
    tfidf = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = tfidf.fit_transform(train_df['clean_text'])
    X_test_vec = tfidf.transform(test_df['clean_text'])
    
    clf_cat = LogisticRegression(max_iter=500)
    clf_cat.fit(X_train_vec, train_df['category'])
    cat_preds_lr = clf_cat.predict(X_test_vec)
    acc_lr_cat = accuracy_score(test_df['category'], cat_preds_lr)
    f1_lr_cat = f1_score(test_df['category'], cat_preds_lr, average='macro')
    
    # 4. Baseline 2: Unidirectional LSTM
    print("--- 3. Đánh giá Baseline 2: Unidirectional LSTM ---")
    base_model = MultiTaskBaselineLSTM(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    base_model.load_state_dict(torch.load('models/best_universal_baseline_lstm.pt', map_location=device))
    cat_preds_lstm, _, _, y_cat_true, y_prio_true = eval_torch_model(base_model, test_loader, device, 'base')
    cat_preds_lstm_names = [id2cat[str(i)] for i in cat_preds_lstm]
    y_cat_names = [id2cat[str(i)] for i in y_cat_true]
    acc_lstm_cat = accuracy_score(y_cat_names, cat_preds_lstm_names)
    f1_lstm_cat = f1_score(y_cat_names, cat_preds_lstm_names, average='macro')

    # 5. Ablation Model: BiLSTM without Attention
    print("--- 4. Đánh giá Ablation Model: BiLSTM (No Attention) ---")
    bilstm_noattn = MultiTaskBiLSTMNoAttention(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    bilstm_noattn.load_state_dict(torch.load('models/best_universal_bilstm_no_attention.pt', map_location=device))
    cat_preds_noattn, _, _, _, _ = eval_torch_model(bilstm_noattn, test_loader, device, 'bilstm_noattn')
    cat_preds_noattn_names = [id2cat[str(i)] for i in cat_preds_noattn]
    acc_noattn_cat = accuracy_score(y_cat_names, cat_preds_noattn_names)
    f1_noattn_cat = f1_score(y_cat_names, cat_preds_noattn_names, average='macro')
    
    # 6. Proposed Model: Multi-Task BiLSTM + Attention
    print("--- 5. Đánh giá Mô hình Đề xuất: Multi-Task BiLSTM + Attention ---")
    attn_model = MultiTaskBiLSTMAttention(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    attn_model.load_state_dict(torch.load('models/best_universal_bilstm_attention.pt', map_location=device))
    cat_preds_attn, prio_preds_attn, all_probs, _, _ = eval_torch_model(attn_model, test_loader, device, 'attention')
    
    cat_preds_attn_names = [id2cat[str(i)] for i in cat_preds_attn]
    prio_preds_attn_names = [id2prio[str(i)] for i in prio_preds_attn]
    y_prio_names = [id2prio[str(i)] for i in y_prio_true]
    
    acc_attn_cat = accuracy_score(y_cat_names, cat_preds_attn_names)
    f1_attn_cat = f1_score(y_cat_names, cat_preds_attn_names, average='macro')
    acc_attn_prio = accuracy_score(y_prio_names, prio_preds_attn_names)
    f1_attn_prio = f1_score(y_prio_names, prio_preds_attn_names, average='macro')
    
    # Top-3 Accuracy
    top3_correct = 0
    for i, true_idx in enumerate(y_cat_true):
        top3_indices = np.argsort(all_probs[i])[-3:]
        if true_idx in top3_indices:
            top3_correct += 1
    top3_acc_cat = top3_correct / len(y_cat_true)
    
    # 7. Curated Human Gold Test Set Benchmark (Tập Kiểm thử Chuẩn Vàng Gán Thủ Công)
    print("--- 6. Đánh giá trên Human Curated Gold Test Set (Tập kiểm thử độc lập) ---")
    gold_df = pd.read_csv('data/gold_test_set.csv')
    gold_ds = UniversalTicketDataset('data/gold_test_set.csv', 'data/vocab_universal.json', 'data/labels_universal.json', max_seq_len=80)
    gold_loader = DataLoader(gold_ds, batch_size=64, shuffle=False)
    
    # Regex on Gold
    gold_regex_preds = [infer_category_weak(str(t)) for t in gold_df['clean_text']]
    gold_regex_acc = accuracy_score(gold_df['category'], gold_regex_preds)
    gold_regex_f1 = f1_score(gold_df['category'], gold_regex_preds, average='macro')
    
    # TF-IDF on Gold
    gold_vec = tfidf.transform(gold_df['clean_text'])
    gold_lr_preds = clf_cat.predict(gold_vec)
    gold_lr_acc = accuracy_score(gold_df['category'], gold_lr_preds)
    gold_lr_f1 = f1_score(gold_df['category'], gold_lr_preds, average='macro')
    
    # LSTM on Gold
    gold_lstm_preds, _, _, gold_y_cat, _ = eval_torch_model(base_model, gold_loader, device, 'base')
    gold_lstm_names = [id2cat[str(i)] for i in gold_lstm_preds]
    gold_y_names = [id2cat[str(i)] for i in gold_y_cat]
    gold_lstm_acc = accuracy_score(gold_y_names, gold_lstm_names)
    gold_lstm_f1 = f1_score(gold_y_names, gold_lstm_names, average='macro')
    
    # BiLSTM No Attn on Gold
    gold_noattn_preds, _, _, _, _ = eval_torch_model(bilstm_noattn, gold_loader, device, 'bilstm_noattn')
    gold_noattn_names = [id2cat[str(i)] for i in gold_noattn_preds]
    gold_noattn_acc = accuracy_score(gold_y_names, gold_noattn_names)
    gold_noattn_f1 = f1_score(gold_y_names, gold_noattn_names, average='macro')

    # BiLSTM + Attention on Gold
    gold_attn_preds, gold_attn_prio, _, _, gold_y_prio = eval_torch_model(attn_model, gold_loader, device, 'attention')
    gold_attn_names = [id2cat[str(i)] for i in gold_attn_preds]
    gold_attn_acc = accuracy_score(gold_y_names, gold_attn_names)
    gold_attn_f1 = f1_score(gold_y_names, gold_attn_names, average='macro')
    gold_prio_names = [id2prio[str(i)] for i in gold_attn_prio]
    gold_y_prio_names = [id2prio[str(i)] for i in gold_y_prio]
    gold_prio_acc = accuracy_score(gold_y_prio_names, gold_prio_names)
    
    # 8. True Industry Hold-out Benchmark (Độc lập 100% ngành Airline chưa từng học)
    print("--- 7. Đánh giá Industry Hold-out (Ngành Hàng Không - Hoàn Toàn Chưa Từng Học) ---")
    holdout_ds = UniversalTicketDataset('data/test_industry_holdout.csv', 'data/vocab_universal.json', 'data/labels_universal.json', max_seq_len=80)
    holdout_loader = DataLoader(holdout_ds, batch_size=64, shuffle=False)
    
    h_preds_attn, _, _, h_y_cat, _ = eval_torch_model(attn_model, holdout_loader, device, 'attention')
    h_preds_names = [id2cat[str(i)] for i in h_preds_attn]
    h_true_names = [id2cat[str(i)] for i in h_y_cat]
    holdout_acc = accuracy_score(h_true_names, h_preds_names)
    holdout_f1 = f1_score(h_true_names, h_preds_names, average='macro')
    
    # 9. Thí Nghiệm Che Từ Khóa (Keyword Masking / Perturbation Test)
    # Chứng minh mô hình học ngữ cảnh và cấu trúc câu chứ không phụ thuộc cứng vào từ khóa regex
    print("--- 8. Thí nghiệm Che Từ Khóa (Keyword Masking Semantic Robustness) ---")
    all_regex_words = set()
    for cat, pats in KEYWORDS.items():
        for p in pats:
            words = re.findall(r'[a-zA-Z]+', p)
            all_regex_words.update(words)
            
    def mask_text(t):
        toks = str(t).split()
        masked = [tok if tok.lower() not in all_regex_words else '<unk>' for tok in toks]
        return " ".join(masked)
        
    masked_test_df = test_df.copy()
    masked_test_df['clean_text'] = masked_test_df['clean_text'].apply(mask_text)
    masked_test_df.to_csv('data/temp_masked_test.csv', index=False)
    
    # Regex on masked data (will catastrophically collapse to general_inquiry)
    masked_regex_preds = [infer_category_weak(t) for t in masked_test_df['clean_text']]
    masked_regex_acc = accuracy_score(masked_test_df['category'], masked_regex_preds)
    
    # BiLSTM + Attention on masked data
    masked_ds = UniversalTicketDataset('data/temp_masked_test.csv', 'data/vocab_universal.json', 'data/labels_universal.json', max_seq_len=80)
    masked_loader = DataLoader(masked_ds, batch_size=64, shuffle=False)
    m_preds, _, _, m_true, _ = eval_torch_model(attn_model, masked_loader, device, 'attention')
    m_preds_names = [id2cat[str(i)] for i in m_preds]
    m_true_names = [id2cat[str(i)] for i in m_true]
    masked_attn_acc = accuracy_score(m_true_names, m_preds_names)
    masked_attn_f1 = f1_score(m_true_names, m_preds_names, average='macro')
    
    if os.path.exists('data/temp_masked_test.csv'):
        os.remove('data/temp_masked_test.csv')

    # 10. Coverage vs Accuracy (Risk-Coverage Automation Gate)
    max_confs = np.max(all_probs, axis=1)
    correct_arr = np.array(y_cat_true) == np.array(cat_preds_attn)
    coverage_levels = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    coverage_results = []
    for cov in coverage_levels:
        cutoff = np.percentile(max_confs, (1.0 - cov) * 100)
        mask_cov = max_confs >= cutoff
        cov_acc = np.mean(correct_arr[mask_cov])
        coverage_results.append({'coverage': cov, 'accuracy': float(cov_acc), 'threshold': float(cutoff)})
        
    # IN BẢNG SO SÁNH BENCHMARK CHÍNH THỨC
    print("\n" + "="*85)
    print("BẢNG 1: ĐÁNH GIÁ ĐA MÔ HÌNH TRÊN TẬP KIỂM THỬ IN-DOMAIN (TEST UNIVERSAL)")
    print("="*85)
    print(f"{'Mô hình (Model)':<32} | {'Category Acc':<14} | {'Category Macro-F1':<18} | {'Top-3 Acc'}")
    print("-" * 85)
    print(f"{'Regex Weak Rules (Baseline 0)':<32} | {acc_regex_cat*100:.2f}%{'':<8} | {f1_regex_cat*100:.2f}%{'':<12} | -")
    print(f"{'TF-IDF + Logistic Regression':<32} | {acc_lr_cat*100:.2f}%{'':<8} | {f1_lr_cat*100:.2f}%{'':<12} | -")
    print(f"{'Multi-Task Uni-LSTM':<32} | {acc_lstm_cat*100:.2f}%{'':<8} | {f1_lstm_cat*100:.2f}%{'':<12} | -")
    print(f"{'Multi-Task BiLSTM (No Attn)':<32} | {acc_noattn_cat*100:.2f}%{'':<8} | {f1_noattn_cat*100:.2f}%{'':<12} | -")
    print(f"{'BiLSTM + Attention (Đề xuất)':<32} | {acc_attn_cat*100:.2f}%{'':<8} | {f1_attn_cat*100:.2f}%{'':<12} | {top3_acc_cat*100:.2f}%")
    print("=" * 85)

    print("\n" + "="*85)
    print("BẢNG 2: ĐÁNH GIÁ TRÊN GOLD TEST SET GÁN NHÃN THỦ CÔNG (140 SAMPLES)")
    print("="*85)
    print(f"{'Mô hình (Model)':<32} | {'Category Acc':<14} | {'Category Macro-F1':<18} | Ghi chú")
    print("-" * 85)
    print(f"{'Regex Weak Rules':<32} | {gold_regex_acc*100:.2f}%{'':<8} | {gold_regex_f1*100:.2f}%{'':<12} | Bị lỡ câu không có từ khóa cứng")
    print(f"{'TF-IDF + Logistic Regression':<32} | {gold_lr_acc*100:.2f}%{'':<8} | {gold_lr_f1*100:.2f}%{'':<12} | Tuyến tính, dễ nhầm khi diễn đạt gián tiếp")
    print(f"{'Multi-Task Uni-LSTM':<32} | {gold_lstm_acc*100:.2f}%{'':<8} | {gold_lstm_f1*100:.2f}%{'':<12} | LSTM 1 chiều")
    print(f"{'Multi-Task BiLSTM (No Attn)':<32} | {gold_noattn_acc*100:.2f}%{'':<8} | {gold_noattn_f1*100:.2f}%{'':<12} | BiLSTM trung bình hóa biểu diễn")
    print(f"{'BiLSTM + Attention (Đề xuất)':<32} | {gold_attn_acc*100:.2f}%{'':<8} | {gold_attn_f1*100:.2f}%{'':<12} | Độ chính xác cao nhất & giải thích được")
    print("=" * 85)
    print(f"Độ chính xác Priority trên Gold Set: {gold_prio_acc*100:.2f}%")
    print(f"Khả năng thích ứng Industry Hold-out (Hàng Không 100% Chưa Học): Macro-F1 = {holdout_f1*100:.2f}%, Acc = {holdout_acc*100:.2f}%")
    print(f"Thí nghiệm che từ khóa (Masked Regex Acc: {masked_regex_acc*100:.2f}% vs Masked BiLSTM Acc: {masked_attn_acc*100:.2f}%)")
    print("=" * 85)

    # Lưu kết quả khoa học
    results = {
        'in_domain_test': {
            'regex_baseline': {'accuracy': float(acc_regex_cat), 'macro_f1': float(f1_regex_cat)},
            'tfidf_lr': {'accuracy': float(acc_lr_cat), 'macro_f1': float(f1_lr_cat)},
            'uni_lstm': {'accuracy': float(acc_lstm_cat), 'macro_f1': float(f1_lstm_cat)},
            'bilstm_no_attention': {'accuracy': float(acc_noattn_cat), 'macro_f1': float(f1_noattn_cat)},
            'bilstm_attention': {
                'category_accuracy': float(acc_attn_cat),
                'category_macro_f1': float(f1_attn_cat),
                'category_top3_accuracy': float(top3_acc_cat),
                'priority_accuracy': float(acc_attn_prio),
                'priority_macro_f1': float(f1_attn_prio)
            }
        },
        'gold_test_set': {
            'regex_baseline': {'accuracy': float(gold_regex_acc), 'macro_f1': float(gold_regex_f1)},
            'tfidf_lr': {'accuracy': float(gold_lr_acc), 'macro_f1': float(gold_lr_f1)},
            'uni_lstm': {'accuracy': float(gold_lstm_acc), 'macro_f1': float(gold_lstm_f1)},
            'bilstm_no_attention': {'accuracy': float(gold_noattn_acc), 'macro_f1': float(gold_noattn_f1)},
            'bilstm_attention': {
                'accuracy': float(gold_attn_acc),
                'macro_f1': float(gold_attn_f1),
                'priority_accuracy': float(gold_prio_acc)
            }
        },
        'industry_holdout': {
            'domain': 'transport_airline',
            'sample_count': len(holdout_ds),
            'accuracy': float(holdout_acc),
            'macro_f1': float(holdout_f1)
        },
        'keyword_masking_experiment': {
            'masked_regex_accuracy': float(masked_regex_acc),
            'masked_bilstm_accuracy': float(masked_attn_acc),
            'masked_bilstm_macro_f1': float(masked_attn_f1)
        },
        'coverage_vs_accuracy': coverage_results
    }
    
    with open('reports/universal_benchmark_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Vẽ biểu đồ khoa học
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    covs = [r['coverage']*100 for r in coverage_results]
    accs = [r['accuracy']*100 for r in coverage_results]
    axes[0].plot(covs, accs, 'o-', color='darkgreen', linewidth=2.5, markersize=8)
    axes[0].set_title('Tỷ Lệ Tự Động Hóa Định Tuyến vs Độ Chính Xác (Risk-Coverage)', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Tỷ Lệ Tự Động Hóa Định Tuyến (Coverage %)', fontsize=11)
    axes[0].set_ylabel('Độ Chính Xác Trên Ticket Tự Động (Accuracy %)', fontsize=11)
    axes[0].grid(True, linestyle=':', alpha=0.6)
    axes[0].set_ylim([min(accs)-3, 101])
    for x, y in zip(covs, accs):
        axes[0].annotate(f'{y:.1f}%', (x, y+0.8), ha='center', fontsize=10, fontweight='bold')
        
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y_cat_names, cat_preds_attn_names, labels=cat_names)
    sns.heatmap(cm, annot=True, fmt='d', cmap='YlGnBu', xticklabels=cat_names, yticklabels=cat_names, ax=axes[1])
    axes[1].set_title('Ma Trận Nhầm Lẫn 7 Nhãn Phổ Quát (Universal Categories)', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Dự đoán (Predicted)', fontsize=11)
    axes[1].set_ylabel('Thực tế (True)', fontsize=11)
    axes[1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig('reports/universal_evaluation_dashboard.png', dpi=300)
    plt.close()
    print("Dashboard saved to reports/universal_evaluation_dashboard.png and results to reports/universal_benchmark_results.json")

if __name__ == '__main__':
    run_universal_evaluation()
