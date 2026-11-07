import os
import json
import time
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from sklearn.metrics import accuracy_score, f1_score
from dataset import get_dataloaders
from models import BiLSTMAttention, BaselineLSTM

def train_epoch(model, dataloader, criterion, optimizer, device, is_attention=True):
    model.train()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    
    for batch in dataloader:
        input_ids = batch['input_ids'].to(device)
        mask = batch['mask'].to(device)
        targets = batch['label'].to(device)
        
        optimizer.zero_grad()
        if is_attention:
            logits, _ = model(input_ids, mask)
        else:
            logits = model(input_ids, mask)
            
        loss = criterion(logits, targets)
        loss.backward()
        
        # Gradient clipping to prevent exploding gradients in LSTM
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()
        
        total_loss += loss.item() * input_ids.size(0)
        preds = torch.argmax(logits, dim=1).detach().cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.detach().cpu().numpy())
        
    avg_loss = total_loss / len(dataloader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    f1 = f1_score(all_targets, all_preds, average='macro')
    return avg_loss, acc, f1

def evaluate(model, dataloader, criterion, device, is_attention=True):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            mask = batch['mask'].to(device)
            targets = batch['label'].to(device)
            
            if is_attention:
                logits, _ = model(input_ids, mask)
            else:
                logits = model(input_ids, mask)
                
            loss = criterion(logits, targets)
            total_loss += loss.item() * input_ids.size(0)
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())
            
    avg_loss = total_loss / len(dataloader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    f1 = f1_score(all_targets, all_preds, average='macro')
    return avg_loss, acc, f1

def run_training():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device for training: {device}")
    
    train_loader, val_loader, test_loader, vocab_size, num_classes = get_dataloaders('data', batch_size=64)
    print(f"Vocab size: {vocab_size}, Number of classes: {num_classes}")
    
    criterion = nn.CrossEntropyLoss()
    epochs = 6
    history = {}
    
    # -------------------------------------------------------------
    # 1. Train Baseline LSTM
    # -------------------------------------------------------------
    print("\n" + "="*60)
    print("Training Baseline LSTM (Without Attention)...")
    print("="*60)
    
    baseline_model = BaselineLSTM(
        vocab_size=vocab_size,
        embed_dim=128,
        hidden_dim=128,
        num_classes=num_classes,
        num_layers=2,
        dropout=0.3
    ).to(device)
    
    optimizer = AdamW(baseline_model.parameters(), lr=1.5e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
    
    best_baseline_f1 = 0.0
    baseline_history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': [], 'val_f1': []}
    
    t0 = time.time()
    for ep in range(1, epochs + 1):
        tr_loss, tr_acc, tr_f1 = train_epoch(baseline_model, train_loader, criterion, optimizer, device, is_attention=False)
        val_loss, val_acc, val_f1 = evaluate(baseline_model, val_loader, criterion, device, is_attention=False)
        scheduler.step(val_f1)
        
        baseline_history['train_loss'].append(tr_loss)
        baseline_history['train_acc'].append(tr_acc)
        baseline_history['val_loss'].append(val_loss)
        baseline_history['val_acc'].append(val_acc)
        baseline_history['val_f1'].append(val_f1)
        
        print(f"Epoch {ep}/{epochs} - Train Loss: {tr_loss:.4f}, Acc: {tr_acc:.4f} | Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}, Val F1: {val_f1:.4f}")
        
        if val_f1 > best_baseline_f1:
            best_baseline_f1 = val_f1
            torch.save(baseline_model.state_dict(), 'models/best_baseline_lstm.pt')
            
    print(f"Baseline LSTM training finished in {time.time()-t0:.1f}s. Best Val F1: {best_baseline_f1:.4f}")
    history['baseline_lstm'] = baseline_history
    
    # -------------------------------------------------------------
    # 2. Train Proposed BiLSTM + Attention
    # -------------------------------------------------------------
    print("\n" + "="*60)
    print("Training Proposed BiLSTM + Attention Mechanism...")
    print("="*60)
    
    bilstm_attn_model = BiLSTMAttention(
        vocab_size=vocab_size,
        embed_dim=128,
        hidden_dim=128,
        attn_dim=64,
        num_classes=num_classes,
        num_layers=2,
        dropout=0.3
    ).to(device)
    
    optimizer = AdamW(bilstm_attn_model.parameters(), lr=1.5e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=1)
    
    best_attn_f1 = 0.0
    attn_history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': [], 'val_f1': []}
    
    t0 = time.time()
    for ep in range(1, epochs + 1):
        tr_loss, tr_acc, tr_f1 = train_epoch(bilstm_attn_model, train_loader, criterion, optimizer, device, is_attention=True)
        val_loss, val_acc, val_f1 = evaluate(bilstm_attn_model, val_loader, criterion, device, is_attention=True)
        scheduler.step(val_f1)
        
        attn_history['train_loss'].append(tr_loss)
        attn_history['train_acc'].append(tr_acc)
        attn_history['val_loss'].append(val_loss)
        attn_history['val_acc'].append(val_acc)
        attn_history['val_f1'].append(val_f1)
        
        print(f"Epoch {ep}/{epochs} - Train Loss: {tr_loss:.4f}, Acc: {tr_acc:.4f} | Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}, Val F1: {val_f1:.4f}")
        
        if val_f1 > best_attn_f1:
            best_attn_f1 = val_f1
            torch.save(bilstm_attn_model.state_dict(), 'models/best_bilstm_attention.pt')
            
    print(f"BiLSTM + Attention training finished in {time.time()-t0:.1f}s. Best Val F1: {best_attn_f1:.4f}")
    history['bilstm_attention'] = attn_history
    
    # Save history
    with open('reports/training_history.json', 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)
    print("Saved training history to reports/training_history.json")

if __name__ == '__main__':
    run_training()

