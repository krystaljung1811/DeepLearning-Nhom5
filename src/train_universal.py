import os
import json
import time
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from sklearn.metrics import accuracy_score, f1_score
from dataset_universal import get_universal_dataloaders
from models_universal import MultiTaskBiLSTMAttention, MultiTaskBaselineLSTM, MultiTaskBiLSTMNoAttention

def train_epoch(model, loader, crit_cat, crit_prio, optimizer, device, model_type='attention'):
    model.train()
    total_loss = 0.0
    all_cat_preds, all_cat_true = [], []
    all_prio_preds, all_prio_true = [], []
    
    for batch in loader:
        input_ids = batch['input_ids'].to(device)
        mask = batch['mask'].to(device)
        lengths = batch['length'].to(device)
        y_cat = batch['category'].to(device)
        y_prio = batch['priority'].to(device)
        
        optimizer.zero_grad()
        if model_type == 'attention':
            out_cat, out_prio, _ = model(input_ids, mask, lengths)
        else:
            out_cat, out_prio = model(input_ids, mask, lengths)
            
        loss_cat = crit_cat(out_cat, y_cat)
        loss_prio = crit_prio(out_prio, y_prio)
        total_batch_loss = loss_cat + 0.5 * loss_prio
        
        total_batch_loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()
        
        total_loss += total_batch_loss.item() * input_ids.size(0)
        all_cat_preds.extend(torch.argmax(out_cat, dim=1).detach().cpu().numpy())
        all_cat_true.extend(y_cat.detach().cpu().numpy())
        all_prio_preds.extend(torch.argmax(out_prio, dim=1).detach().cpu().numpy())
        all_prio_true.extend(y_prio.detach().cpu().numpy())
        
    avg_loss = total_loss / len(loader.dataset)
    f1_cat = f1_score(all_cat_true, all_cat_preds, average='macro')
    f1_prio = f1_score(all_prio_true, all_prio_preds, average='macro')
    return avg_loss, f1_cat, f1_prio

def eval_epoch(model, loader, crit_cat, crit_prio, device, model_type='attention'):
    model.eval()
    total_loss = 0.0
    all_cat_preds, all_cat_true = [], []
    all_prio_preds, all_prio_true = [], []
    
    with torch.no_grad():
        for batch in loader:
            input_ids = batch['input_ids'].to(device)
            mask = batch['mask'].to(device)
            lengths = batch['length'].to(device)
            y_cat = batch['category'].to(device)
            y_prio = batch['priority'].to(device)
            
            if model_type == 'attention':
                out_cat, out_prio, _ = model(input_ids, mask, lengths)
            else:
                out_cat, out_prio = model(input_ids, mask, lengths)
                
            loss = crit_cat(out_cat, y_cat) + 0.5 * crit_prio(out_prio, y_prio)
            total_loss += loss.item() * input_ids.size(0)
            
            all_cat_preds.extend(torch.argmax(out_cat, dim=1).cpu().numpy())
            all_cat_true.extend(y_cat.cpu().numpy())
            all_prio_preds.extend(torch.argmax(out_prio, dim=1).cpu().numpy())
            all_prio_true.extend(y_prio.cpu().numpy())
            
    avg_loss = total_loss / len(loader.dataset)
    acc_cat = accuracy_score(all_cat_true, all_cat_preds)
    f1_cat = f1_score(all_cat_true, all_cat_preds, average='macro')
    f1_prio = f1_score(all_prio_true, all_prio_preds, average='macro')
    return avg_loss, acc_cat, f1_cat, f1_prio

class EarlyStopping:
    """
    Early Stopping để tự động dừng huấn luyện khi metric theo dõi không còn cải thiện sau `patience` epochs,
    tránh lãng phí tài nguyên tính toán và chống Overfitting.
    """
    def __init__(self, patience: int = 3, min_delta: float = 1e-4, mode: str = 'max'):
        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode
        self.best_score = None
        self.counter = 0
        self.early_stop = False

    def step(self, score: float) -> bool:
        if self.best_score is None:
            self.best_score = score
            return False

        if self.mode == 'max':
            improved = score > (self.best_score + self.min_delta)
        else:
            improved = score < (self.best_score - self.min_delta)

        if improved:
            self.best_score = score
            self.counter = 0
            return False
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
                return True
            return False

def run_universal_training(max_epochs: int = 20, patience: int = 3):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training Universal Routing Models on Device: {device} (Max Epochs: {max_epochs}, EarlyStopping Patience: {patience})")
    
    train_loader, val_loader, test_loader, vocab_size, num_categories, num_priorities = get_universal_dataloaders('data', batch_size=64, max_seq_len=80)
    print(f"Vocab size: {vocab_size}, Categories: {num_categories}, Priorities: {num_priorities}")
    
    crit_cat = nn.CrossEntropyLoss()
    crit_prio = nn.CrossEntropyLoss()
    os.makedirs('models', exist_ok=True)
    os.makedirs('reports', exist_ok=True)
    history = {}
    
    # 1. Baseline LSTM (Unidirectional)
    print("\n" + "="*60)
    print("1. Training Multi-Task Baseline LSTM (Unidirectional, No Attention)...")
    print("="*60)
    base_model = MultiTaskBaselineLSTM(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    optimizer = AdamW(base_model.parameters(), lr=1.5e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
    early_stopper = EarlyStopping(patience=patience, mode='max')
    
    best_base_f1 = 0.0
    base_hist = {'val_cat_f1': [], 'val_prio_f1': [], 'val_loss': []}
    
    for ep in range(1, max_epochs + 1):
        tr_loss, tr_c_f1, _ = train_epoch(base_model, train_loader, crit_cat, crit_prio, optimizer, device, 'base')
        v_loss, v_c_acc, v_c_f1, v_p_f1 = eval_epoch(base_model, val_loader, crit_cat, crit_prio, device, 'base')
        scheduler.step(v_c_f1)
        
        base_hist['val_loss'].append(v_loss)
        base_hist['val_cat_f1'].append(v_c_f1)
        base_hist['val_prio_f1'].append(v_p_f1)
        print(f"Epoch {ep}/{max_epochs} - Train Loss: {tr_loss:.4f} | Val Cat Acc: {v_c_acc*100:.2f}%, Cat F1: {v_c_f1*100:.2f}%, Prio F1: {v_p_f1*100:.2f}%")
        
        if v_c_f1 > best_base_f1:
            best_base_f1 = v_c_f1
            torch.save(base_model.state_dict(), 'models/best_universal_baseline_lstm.pt')
            
        if early_stopper.step(v_c_f1):
            print(f"--> Early stopping kích hoạt tại epoch {ep} (không cải thiện sau {patience} epochs).")
            break
            
    history['baseline_lstm'] = base_hist

    # 2. BiLSTM Without Attention (Ablation Component)
    print("\n" + "="*60)
    print("2. Training Multi-Task BiLSTM (Without Attention - Mean Pooling)...")
    print("="*60)
    bilstm_noattn = MultiTaskBiLSTMNoAttention(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    optimizer = AdamW(bilstm_noattn.parameters(), lr=1.5e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
    early_stopper = EarlyStopping(patience=patience, mode='max')
    
    best_noattn_f1 = 0.0
    noattn_hist = {'val_cat_f1': [], 'val_prio_f1': [], 'val_loss': []}
    
    for ep in range(1, max_epochs + 1):
        tr_loss, tr_c_f1, _ = train_epoch(bilstm_noattn, train_loader, crit_cat, crit_prio, optimizer, device, 'bilstm_noattn')
        v_loss, v_c_acc, v_c_f1, v_p_f1 = eval_epoch(bilstm_noattn, val_loader, crit_cat, crit_prio, device, 'bilstm_noattn')
        scheduler.step(v_c_f1)
        
        noattn_hist['val_loss'].append(v_loss)
        noattn_hist['val_cat_f1'].append(v_c_f1)
        noattn_hist['val_prio_f1'].append(v_p_f1)
        print(f"Epoch {ep}/{max_epochs} - Train Loss: {tr_loss:.4f} | Val Cat Acc: {v_c_acc*100:.2f}%, Cat F1: {v_c_f1*100:.2f}%, Prio F1: {v_p_f1*100:.2f}%")
        
        if v_c_f1 > best_noattn_f1:
            best_noattn_f1 = v_c_f1
            torch.save(bilstm_noattn.state_dict(), 'models/best_universal_bilstm_no_attention.pt')
            
        if early_stopper.step(v_c_f1):
            print(f"--> Early stopping kích hoạt tại epoch {ep} (không cải thiện sau {patience} epochs).")
            break
            
    history['bilstm_no_attention'] = noattn_hist
    
    # 3. Multi-Task BiLSTM + Attention (Proposed Model)
    print("\n" + "="*60)
    print("3. Training Proposed Multi-Task BiLSTM + Attention (PackedSequence + Masked Attention)...")
    print("="*60)
    attn_model = MultiTaskBiLSTMAttention(vocab_size, num_categories=num_categories, num_priorities=num_priorities).to(device)
    optimizer = AdamW(attn_model.parameters(), lr=1.5e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
    early_stopper = EarlyStopping(patience=patience, mode='max')
    
    best_attn_f1 = 0.0
    attn_hist = {'val_cat_f1': [], 'val_prio_f1': [], 'val_loss': []}
    
    for ep in range(1, max_epochs + 1):
        tr_loss, tr_c_f1, _ = train_epoch(attn_model, train_loader, crit_cat, crit_prio, optimizer, device, 'attention')
        v_loss, v_c_acc, v_c_f1, v_p_f1 = eval_epoch(attn_model, val_loader, crit_cat, crit_prio, device, 'attention')
        scheduler.step(v_c_f1)
        
        attn_hist['val_loss'].append(v_loss)
        attn_hist['val_cat_f1'].append(v_c_f1)
        attn_hist['val_prio_f1'].append(v_p_f1)
        print(f"Epoch {ep}/{max_epochs} - Train Loss: {tr_loss:.4f} | Val Cat Acc: {v_c_acc*100:.2f}%, Cat F1: {v_c_f1*100:.2f}%, Prio F1: {v_p_f1*100:.2f}%")
        
        if v_c_f1 > best_attn_f1:
            best_attn_f1 = v_c_f1
            torch.save(attn_model.state_dict(), 'models/best_universal_bilstm_attention.pt')
            
        if early_stopper.step(v_c_f1):
            print(f"--> Early stopping kích hoạt tại epoch {ep} (không cải thiện sau {patience} epochs).")
            break
            
    history['bilstm_attention'] = attn_hist
    with open('reports/universal_training_history.json', 'w') as f:
        json.dump(history, f, indent=2)
    print("Universal models training completed successfully!")

if __name__ == '__main__':
    run_universal_training()

