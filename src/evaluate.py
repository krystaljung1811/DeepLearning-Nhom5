import os
import json
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from dataset import get_dataloaders
from models import BiLSTMAttention, BaselineLSTM

def evaluate_test():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Evaluating models on device: {device}...")
    
    _, _, test_loader, vocab_size, num_classes = get_dataloaders('data', batch_size=64)
    with open('data/label_encoder.json', 'r', encoding='utf-8') as f:
        label_encoder = json.load(f)
    id2label = {int(k): v for k, v in label_encoder['id2label'].items()}
    class_names = [id2label[i] for i in range(num_classes)]
    
    # Load Baseline LSTM
    baseline_model = BaselineLSTM(vocab_size=vocab_size, num_classes=num_classes).to(device)
    baseline_model.load_state_dict(torch.load('models/best_baseline_lstm.pt', map_location=device))
    baseline_model.eval()
    
    # Load BiLSTM + Attention
    attn_model = BiLSTMAttention(vocab_size=vocab_size, num_classes=num_classes).to(device)
    attn_model.load_state_dict(torch.load('models/best_bilstm_attention.pt', map_location=device))
    attn_model.eval()
    
    y_true = []
    baseline_preds = []
    attn_preds = []
    
    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch['input_ids'].to(device)
            mask = batch['mask'].to(device)
            labels = batch['label'].to(device)
            
            # Baseline
            out_base = baseline_model(input_ids, mask)
            pred_base = torch.argmax(out_base, dim=1).cpu().numpy()
            
            # BiLSTM + Attention
            out_attn, _ = attn_model(input_ids, mask)
            pred_attn = torch.argmax(out_attn, dim=1).cpu().numpy()
            
            y_true.extend(labels.cpu().numpy())
            baseline_preds.extend(pred_base)
            attn_preds.extend(pred_attn)
            
    y_true = np.array(y_true)
    baseline_preds = np.array(baseline_preds)
    attn_preds = np.array(attn_preds)
    
    # Compute metrics
    def calc_metrics(preds, name):
        acc = accuracy_score(y_true, preds)
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_true, preds, average='macro')
        p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(y_true, preds, average='weighted')
        report = classification_report(y_true, preds, target_names=class_names, output_dict=True)
        return {
            'model_name': name,
            'accuracy': float(acc),
            'macro_precision': float(p_macro),
            'macro_recall': float(r_macro),
            'macro_f1': float(f1_macro),
            'weighted_f1': float(f1_weight),
            'classification_report': report
        }
        
    res_baseline = calc_metrics(baseline_preds, "Baseline LSTM")
    res_attn = calc_metrics(attn_preds, "BiLSTM + Attention")
    
    print("\n" + "="*65)
    print("COMPARATIVE EVALUATION ON TEST SET (2,400 samples)")
    print("="*65)
    print(f"{'Metric':<25} | {'Baseline LSTM':<18} | {'BiLSTM + Attention':<18}")
    print("-" * 65)
    print(f"{'Accuracy':<25} | {res_baseline['accuracy']*100:.2f}%{'':<11} | {res_attn['accuracy']*100:.2f}%")
    print(f"{'Macro Precision':<25} | {res_baseline['macro_precision']*100:.2f}%{'':<11} | {res_attn['macro_precision']*100:.2f}%")
    print(f"{'Macro Recall':<25} | {res_baseline['macro_recall']*100:.2f}%{'':<11} | {res_attn['macro_recall']*100:.2f}%")
    print(f"{'Macro F1-Score':<25} | {res_baseline['macro_f1']*100:.2f}%{'':<11} | {res_attn['macro_f1']*100:.2f}%")
    print(f"{'Weighted F1-Score':<25} | {res_baseline['weighted_f1']*100:.2f}%{'':<11} | {res_attn['weighted_f1']*100:.2f}%")
    print("=" * 65)
    
    # Save metrics JSON
    os.makedirs('reports', exist_ok=True)
    with open('reports/test_metrics.json', 'w', encoding='utf-8') as f:
        json.dump({'baseline': res_baseline, 'bilstm_attention': res_attn}, f, indent=2)
        
    # Plot Confusion Matrix
    cm_base = confusion_matrix(y_true, baseline_preds)
    cm_attn = confusion_matrix(y_true, attn_preds)
    
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    sns.heatmap(cm_base, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names, ax=axes[0])
    axes[0].set_title(f"Baseline LSTM (Acc: {res_baseline['accuracy']*100:.2f}%)", fontsize=12, fontweight='bold')
    axes[0].set_xlabel("Predicted Department", fontsize=11)
    axes[0].set_ylabel("True Department", fontsize=11)
    axes[0].tick_params(axis='x', rotation=45)
    
    sns.heatmap(cm_attn, annot=True, fmt='d', cmap='Greens', xticklabels=class_names, yticklabels=class_names, ax=axes[1])
    axes[1].set_title(f"BiLSTM + Attention (Acc: {res_attn['accuracy']*100:.2f}%)", fontsize=12, fontweight='bold')
    axes[1].set_xlabel("Predicted Department", fontsize=11)
    axes[1].set_ylabel("True Department", fontsize=11)
    axes[1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig('reports/confusion_matrix.png', dpi=300)
    plt.close()
    print("Saved confusion matrix to reports/confusion_matrix.png")
    
    # Plot Training Loss and Validation Accuracy Curves
    if os.path.exists('reports/training_history.json'):
        with open('reports/training_history.json', 'r', encoding='utf-8') as f:
            hist = json.load(f)
            
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        epochs = range(1, len(hist['baseline_lstm']['train_loss']) + 1)
        
        # Loss Curve
        axes[0].plot(epochs, hist['baseline_lstm']['train_loss'], 'b--', label='Baseline LSTM (Train)')
        axes[0].plot(epochs, hist['baseline_lstm']['val_loss'], 'b-', label='Baseline LSTM (Val)')
        axes[0].plot(epochs, hist['bilstm_attention']['train_loss'], 'g--', label='BiLSTM+Attn (Train)')
        axes[0].plot(epochs, hist['bilstm_attention']['val_loss'], 'g-', label='BiLSTM+Attn (Val)')
        axes[0].set_title('Cross-Entropy Loss Across Epochs', fontweight='bold')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Loss')
        axes[0].legend()
        axes[0].grid(True, linestyle=':', alpha=0.6)
        
        # Val Accuracy & F1
        axes[1].plot(epochs, hist['baseline_lstm']['val_acc'], 'b-o', label='Baseline LSTM (Val Acc)')
        axes[1].plot(epochs, hist['baseline_lstm']['val_f1'], 'b--s', label='Baseline LSTM (Val F1)')
        axes[1].plot(epochs, hist['bilstm_attention']['val_acc'], 'g-o', label='BiLSTM+Attn (Val Acc)')
        axes[1].plot(epochs, hist['bilstm_attention']['val_f1'], 'g--s', label='BiLSTM+Attn (Val F1)')
        axes[1].set_title('Validation Performance Comparison', fontweight='bold')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Score')
        axes[1].legend()
        axes[1].grid(True, linestyle=':', alpha=0.6)
        
        plt.tight_layout()
        plt.savefig('reports/loss_acc_curves.png', dpi=300)
        plt.close()
        print("Saved learning curves to reports/loss_acc_curves.png")

if __name__ == '__main__':
    evaluate_test()

