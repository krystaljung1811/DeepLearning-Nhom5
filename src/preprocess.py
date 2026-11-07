import os
import re
import json
import pandas as pd
import numpy as np
from collections import Counter
from sklearn.model_selection import train_test_split

TARGET_COMPANIES = [
    'AmazonHelp',
    'AppleSupport',
    'Uber_Support',
    'SpotifyCares',
    'Delta',
    'Tesco',
    'XboxSupport',
    'TMobileHelp'
]

SAMPLES_PER_CLASS = 3000
MAX_VOCAB_SIZE = 15000
MIN_WORD_FREQ = 2

def clean_tweet_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    # 1. Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    # 2. Remove @mentions to force semantic understanding
    text = re.sub(r'@[A-Za-z0-9_]+', ' ', text)
    # 3. Clean hashtags symbol (keep the word)
    text = re.sub(r'#([A-Za-z0-9_]+)', r'\1', text)
    # 4. Remove special characters and numbers (keep letters and basic apostrophes)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    # 5. Lowercase and collapse spaces
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

def extract_and_preprocess(raw_csv_path: str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    print(f"Loading raw dataset from {raw_csv_path}...")
    
    collected_data = {comp: [] for comp in TARGET_COMPANIES}
    total_needed = SAMPLES_PER_CLASS * len(TARGET_COMPANIES)
    
    # Read in chunks to be memory-efficient
    chunksize = 100000
    for chunk in pd.read_csv(raw_csv_path, chunksize=chunksize, low_memory=False):
        # We look for inbound tweets
        inbounds = chunk[chunk['inbound'] == True]
        
        for comp in TARGET_COMPANIES:
            current_count = len(collected_data[comp])
            if current_count >= SAMPLES_PER_CLASS:
                continue
            
            # Match tweets mentioning the company handle
            pattern = re.compile(r'@' + re.escape(comp) + r'\b', re.IGNORECASE)
            mask = inbounds['text'].apply(lambda x: bool(pattern.search(str(x))))
            candidates = inbounds[mask]
            
            for _, row in candidates.iterrows():
                if len(collected_data[comp]) >= SAMPLES_PER_CLASS:
                    break
                raw_text = str(row['text'])
                clean_text = clean_tweet_text(raw_text)
                
                # Filter out very short texts (less than 4 words)
                if len(clean_text.split()) >= 4:
                    collected_data[comp].append({
                        'tweet_id': row['tweet_id'],
                        'clean_text': clean_text,
                        'company': comp
                    })
                    
        total_collected = sum(len(v) for v in collected_data.values())
        print(f"Collected: {total_collected}/{total_needed} samples...")
        if all(len(v) >= SAMPLES_PER_CLASS for v in collected_data.values()):
            break
            
    # Combine collected records
    all_records = []
    for comp, rows in collected_data.items():
        all_records.extend(rows)
        print(f"Class '{comp}': {len(rows)} samples")
        
    df = pd.DataFrame(all_records)
    print(f"Total dataset size: {len(df)} samples across {len(TARGET_COMPANIES)} classes.")
    
    # Stratified Train/Val/Test Split (80/10/10)
    train_df, temp_df = train_test_split(df, test_size=0.20, random_state=42, stratify=df['company'])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df['company'])
    
    print(f"Split sizes: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")
    
    # Save CSVs
    train_df.to_csv(os.path.join(output_dir, 'train.csv'), index=False)
    val_df.to_csv(os.path.join(output_dir, 'val.csv'), index=False)
    test_df.to_csv(os.path.join(output_dir, 'test.csv'), index=False)
    
    # Build Vocabulary from Train split
    word_counter = Counter()
    for text in train_df['clean_text']:
        word_counter.update(text.split())
        
    vocab = {
        '<pad>': 0,
        '<unk>': 1
    }
    
    # Sort by frequency
    sorted_words = [w for w, c in word_counter.most_common(MAX_VOCAB_SIZE) if c >= MIN_WORD_FREQ]
    for idx, word in enumerate(sorted_words, start=2):
        vocab[word] = idx
        
    print(f"Vocabulary size: {len(vocab)} tokens (including <pad>, <unk>)")
    with open(os.path.join(output_dir, 'vocab.json'), 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)
        
    # Build Label Encoder
    label2id = {comp: idx for idx, comp in enumerate(TARGET_COMPANIES)}
    id2label = {idx: comp for idx, comp in enumerate(TARGET_COMPANIES)}
    label_encoder = {
        'label2id': label2id,
        'id2label': id2label
    }
    with open(os.path.join(output_dir, 'label_encoder.json'), 'w', encoding='utf-8') as f:
        json.dump(label_encoder, f, ensure_ascii=False, indent=2)
        
    print(f"Data preprocessing finished! Saved all files to {output_dir}")

if __name__ == '__main__':
    raw_path = os.path.join('archive', 'twcs', 'twcs.csv')
    if not os.path.exists(raw_path):
        raw_path = os.path.join('archive', 'sample.csv')
        print(f"Using fallback dataset: {raw_path}")
    extract_and_preprocess(raw_path, 'data')

