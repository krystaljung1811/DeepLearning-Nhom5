import json
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd

class CustomerSupportDataset(Dataset):
    def __init__(self, csv_path: str, vocab_path: str, label_encoder_path: str, max_seq_len: int = 50):
        self.df = pd.read_csv(csv_path)
        with open(vocab_path, 'r', encoding='utf-8') as f:
            self.vocab = json.load(f)
        with open(label_encoder_path, 'r', encoding='utf-8') as f:
            self.label_encoder = json.load(f)
            
        self.label2id = self.label_encoder['label2id']
        self.pad_idx = self.vocab.get('<pad>', 0)
        self.unk_idx = self.vocab.get('<unk>', 1)
        self.max_seq_len = max_seq_len
        
    def __len__(self):
        return len(self.df)
        
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        text = str(row['clean_text'])
        label_str = str(row['company'])
        
        tokens = text.split()
        if len(tokens) == 0:
            token_ids = [self.unk_idx]
        else:
            token_ids = [self.vocab.get(t, self.unk_idx) for t in tokens[:self.max_seq_len]]
            
        seq_len = len(token_ids)
        
        # Padding
        if seq_len < self.max_seq_len:
            padding_len = self.max_seq_len - seq_len
            input_ids = token_ids + [self.pad_idx] * padding_len
            mask = [1] * seq_len + [0] * padding_len
        else:
            input_ids = token_ids[:self.max_seq_len]
            mask = [1] * self.max_seq_len
            seq_len = self.max_seq_len
            
        label_id = self.label2id[label_str]
        
        return {
            'input_ids': torch.tensor(input_ids, dtype=torch.long),
            'lengths': torch.tensor(seq_len, dtype=torch.long),
            'mask': torch.tensor(mask, dtype=torch.bool),
            'label': torch.tensor(label_id, dtype=torch.long)
        }

def get_dataloaders(data_dir: str = 'data', batch_size: int = 64, max_seq_len: int = 50, num_workers: int = 0):
    train_dataset = CustomerSupportDataset(
        f"{data_dir}/train.csv",
        f"{data_dir}/vocab.json",
        f"{data_dir}/label_encoder.json",
        max_seq_len=max_seq_len
    )
    val_dataset = CustomerSupportDataset(
        f"{data_dir}/val.csv",
        f"{data_dir}/vocab.json",
        f"{data_dir}/label_encoder.json",
        max_seq_len=max_seq_len
    )
    test_dataset = CustomerSupportDataset(
        f"{data_dir}/test.csv",
        f"{data_dir}/vocab.json",
        f"{data_dir}/label_encoder.json",
        max_seq_len=max_seq_len
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    
    return train_loader, val_loader, test_loader, len(train_dataset.vocab), len(train_dataset.label2id)

