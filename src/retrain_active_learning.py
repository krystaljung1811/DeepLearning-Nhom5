import os
import json
import shutil
import time
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.utils.data import Dataset, DataLoader
import pandas as pd
from models_universal import MultiTaskBiLSTMAttention
from build_universal_dataset import clean_text_strictly

class FeedbackDataset(Dataset):
    def __init__(self, samples, vocab, cat2id, prio2id, max_seq_len=80):
        self.samples = samples
        self.vocab = vocab
        self.cat2id = cat2id
        self.prio2id = prio2id
        self.max_seq_len = max_seq_len
        self.pad_idx = vocab.get('<pad>', 0)
        self.unk_idx = vocab.get('<unk>', 1)
        
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        item = self.samples[idx]
        tokens = str(item['clean_text']).split()
        if len(tokens) == 0:
            tokens = ['<unk>']
        token_ids = [self.vocab.get(t, self.unk_idx) for t in tokens[:self.max_seq_len]]
        seq_len = min(len(token_ids), self.max_seq_len)
        if seq_len == 0:
            seq_len = 1
            token_ids = [self.unk_idx]
            
        if len(token_ids) < self.max_seq_len:
            padding_len = self.max_seq_len - len(token_ids)
            input_ids = token_ids + [self.pad_idx] * padding_len
            mask = [1] * len(token_ids) + [0] * padding_len
        else:
            input_ids = token_ids[:self.max_seq_len]
            mask = [1] * self.max_seq_len
            
        cat_id = self.cat2id.get(item['category'], 0)
        prio_id = self.prio2id.get(item['priority'], 0)
        
        return {
            'input_ids': torch.tensor(input_ids, dtype=torch.long),
            'mask': torch.tensor(mask, dtype=torch.bool),
            'length': torch.tensor(seq_len, dtype=torch.long),
            'category': torch.tensor(cat_id, dtype=torch.long),
            'priority': torch.tensor(prio_id, dtype=torch.long)
        }

def retrain_from_human_feedback(data_dir: str = 'data', models_dir: str = 'models', lr: float = 1e-4, epochs: int = 3):
    feedback_path = os.path.join(data_dir, 'feedback.jsonl')
    vocab_path = os.path.join(data_dir, 'vocab_universal.json')
    labels_path = os.path.join(data_dir, 'labels_universal.json')
    model_path = os.path.join(models_dir, 'best_universal_bilstm_attention.pt')
    backup_path = os.path.join(models_dir, 'best_universal_bilstm_attention_backup.pt')
    
    if not os.path.exists(feedback_path):
        return {'success': False, 'message': 'Chưa có file feedback.jsonl nào được ghi nhận.'}
        
    feedback_rows = []
    with open(feedback_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    feedback_rows.append(json.loads(line))
                except:
                    pass
                    
    if len(feedback_rows) == 0:
        return {'success': False, 'message': 'Chưa có bản ghi phản hồi con người nào trong feedback.jsonl.'}
        
    with open(vocab_path, 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    with open(labels_path, 'r', encoding='utf-8') as f:
        label_meta = json.load(f)
        
    cat2id = label_meta['categories']['label2id']
    prio2id = label_meta['priorities']['label2id']
    
    # Chuẩn bị dữ liệu fine-tuning: feedback của con người
    fine_tune_samples = []
    for row in feedback_rows:
        clean_text = clean_text_strictly(row.get('text', ''))
        fine_tune_samples.append({
            'clean_text': clean_text,
            'category': row.get('corrected_category', 'general_inquiry'),
            'priority': row.get('corrected_priority', 'medium')
        })
        
    # Replay samples từ train_universal.csv để chống Catastrophic Forgetting
    train_csv = os.path.join(data_dir, 'train_universal.csv')
    if os.path.exists(train_csv):
        df_train = pd.read_csv(train_csv)
        replay_df = df_train.sample(n=min(len(df_train), 300), random_state=42)
        for _, r in replay_df.iterrows():
            fine_tune_samples.append({
                'clean_text': str(r['clean_text']),
                'category': str(r['category']),
                'priority': str(r['priority'])
            })
            
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = MultiTaskBiLSTMAttention(
        vocab_size=len(vocab),
        num_categories=len(cat2id),
        num_priorities=len(prio2id)
    ).to(device)
    
    if os.path.exists(model_path):
        # Tạo bản sao lưu dự phòng
        shutil.copyfile(model_path, backup_path)
        model.load_state_dict(torch.load(model_path, map_location=device))
        
    ds = FeedbackDataset(fine_tune_samples, vocab, cat2id, prio2id, max_seq_len=80)
    loader = DataLoader(ds, batch_size=32, shuffle=True)
    
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    crit_cat = nn.CrossEntropyLoss()
    crit_prio = nn.CrossEntropyLoss()
    
    model.train()
    history = []
    t0 = time.time()
    for ep in range(1, epochs + 1):
        total_loss = 0.0
        for batch in loader:
            inp = batch['input_ids'].to(device)
            mask = batch['mask'].to(device)
            lens = batch['length'].to(device)
            y_cat = batch['category'].to(device)
            y_prio = batch['priority'].to(device)
            
            optimizer.zero_grad()
            out_c, out_p, _ = model(inp, mask, lens)
            loss = crit_cat(out_c, y_cat) + 0.5 * crit_prio(out_p, y_prio)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            total_loss += loss.item() * inp.size(0)
            
        avg_loss = total_loss / len(ds)
        history.append({'epoch': ep, 'loss': round(avg_loss, 4)})
        
    duration = round(time.time() - t0, 2)
    # Lưu trọng số mô hình mới cập nhật
    torch.save(model.state_dict(), model_path)
    
    # Ghi nhận vào file lịch sử active learning
    history_file = os.path.join('reports', 'active_learning_history.json')
    all_runs = []
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r', encoding='utf-8') as f:
                all_runs = json.load(f)
        except:
            pass
            
    run_record = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'human_feedback_samples': len(feedback_rows),
        'total_training_samples': len(fine_tune_samples),
        'epochs': epochs,
        'learning_rate': lr,
        'duration_seconds': duration,
        'history': history
    }
    all_runs.append(run_record)
    with open(history_file, 'w', encoding='utf-8') as f:
        json.dump(all_runs, f, ensure_ascii=False, indent=2)
        
    return {
        'success': True,
        'message': f'Đã cập nhật thành công mô hình với {len(feedback_rows)} phản hồi con người ({duration}s).',
        'record': run_record
    }

if __name__ == '__main__':
    res = retrain_from_human_feedback()
    print(res)

