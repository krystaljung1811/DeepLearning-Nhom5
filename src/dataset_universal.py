import json
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd

class UniversalTicketDataset(Dataset):
    def __init__(self, csv_path: str, vocab_path: str, labels_path: str, max_seq_len: int = 60):
        self.df = pd.read_csv(csv_path)
        with open(vocab_path, 'r', encoding='utf-8') as f:
            self.vocab = json.load(f)
        with open(labels_path, 'r', encoding='utf-8') as f:
            self.labels = json.load(f)
            
        self.cat2id = self.labels['categories']['label2id']
        self.prio2id = self.labels['priorities']['label2id']
        self.pad_idx = self.vocab.get('<pad>', 0)
        self.unk_idx = self.vocab.get('<unk>', 1)
        self.max_seq_len = max_seq_len
        
    def __len__(self):
        return len(self.df)
        
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        text = str(row['clean_text'])
        cat_str = str(row['category'])
        prio_str = str(row['priority'])
        
        tokens = text.split()
        if len(tokens) == 0:
            token_ids = [self.unk_idx]
        else:
            token_ids = [self.vocab.get(t, self.unk_idx) for t in tokens[:self.max_seq_len]]
            
        seq_len = len(token_ids)
        
        if seq_len < self.max_seq_len:
            padding_len = self.max_seq_len - seq_len
            input_ids = token_ids + [self.pad_idx] * padding_len
            mask = [1] * seq_len + [0] * padding_len
        else:
            input_ids = token_ids[:self.max_seq_len]
            mask = [1] * self.max_seq_len
            
        cat_id = self.cat2id.get(cat_str, 0)
        prio_id = self.prio2id.get(prio_str, 0)
        
        return {
            'input_ids': torch.tensor(input_ids, dtype=torch.long),
            'mask': torch.tensor(mask, dtype=torch.bool),
            'category': torch.tensor(cat_id, dtype=torch.long),
            'priority': torch.tensor(prio_id, dtype=torch.long)
        }

def get_universal_dataloaders(data_dir: str = 'data', batch_size: int = 64, max_seq_len: int = 60):
    train_ds = UniversalTicketDataset(f"{data_dir}/train_universal.csv", f"{data_dir}/vocab_universal.json", f"{data_dir}/labels_universal.json", max_seq_len)
    val_ds = UniversalTicketDataset(f"{data_dir}/val_universal.csv", f"{data_dir}/vocab_universal.json", f"{data_dir}/labels_universal.json", max_seq_len)
    test_ds = UniversalTicketDataset(f"{data_dir}/test_universal.csv", f"{data_dir}/vocab_universal.json", f"{data_dir}/labels_universal.json", max_seq_len)
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)
    
    vocab_size = len(train_ds.vocab)
    num_categories = len(train_ds.cat2id)
    num_priorities = len(train_ds.prio2id)
    
    return train_loader, val_loader, test_loader, vocab_size, num_categories, num_priorities

