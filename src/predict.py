import os
import json
import torch
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt
from preprocess import clean_tweet_text
from models import BiLSTMAttention

class CustomerSupportRouter:
    def __init__(self, model_path: str = 'models/best_bilstm_attention.pt', data_dir: str = 'data'):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        with open(os.path.join(data_dir, 'vocab.json'), 'r', encoding='utf-8') as f:
            self.vocab = json.load(f)
        with open(os.path.join(data_dir, 'label_encoder.json'), 'r', encoding='utf-8') as f:
            self.label_encoder = json.load(f)
            
        self.id2label = {int(k): v for k, v in self.label_encoder['id2label'].items()}
        self.pad_idx = self.vocab.get('<pad>', 0)
        self.unk_idx = self.vocab.get('<unk>', 1)
        
        vocab_size = len(self.vocab)
        num_classes = len(self.id2label)
        
        self.model = BiLSTMAttention(
            vocab_size=vocab_size,
            embed_dim=128,
            hidden_dim=128,
            attn_dim=64,
            num_classes=num_classes,
            num_layers=2,
            dropout=0.3
        ).to(self.device)
        
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        
    def predict(self, raw_text: str, max_seq_len: int = 50):
        cleaned_text = clean_tweet_text(raw_text)
        tokens = cleaned_text.split()
        if len(tokens) == 0:
            tokens = ['<unk>']
            
        token_ids = [self.vocab.get(t, self.unk_idx) for t in tokens[:max_seq_len]]
        actual_tokens = tokens[:max_seq_len]
        seq_len = len(token_ids)
        
        if seq_len < max_seq_len:
            padding_len = max_seq_len - seq_len
            input_ids = token_ids + [self.pad_idx] * padding_len
            mask = [1] * seq_len + [0] * padding_len
        else:
            input_ids = token_ids
            mask = [1] * max_seq_len
            
        input_tensor = torch.tensor([input_ids], dtype=torch.long).to(self.device)
        mask_tensor = torch.tensor([mask], dtype=torch.bool).to(self.device)
        
        with torch.no_grad():
            logits, attn_weights = self.model(input_tensor, mask_tensor)
            probs = F.softmax(logits, dim=-1).squeeze(0).cpu().numpy()
            raw_attn = attn_weights.squeeze(0).cpu().numpy()[:seq_len]
            
        pred_idx = int(np.argmax(probs))
        pred_label = self.id2label[pred_idx]
        confidence = float(probs[pred_idx])
        
        # Normalize attention over actual tokens for visualization
        if np.sum(raw_attn) > 0:
            norm_attn = raw_attn / np.sum(raw_attn)
        else:
            norm_attn = raw_attn
            
        token_attentions = [
            {'token': tok, 'attention_weight': float(w)}
            for tok, w in zip(actual_tokens, norm_attn)
        ]
        
        all_class_probs = {self.id2label[i]: float(probs[i]) for i in range(len(probs))}
        
        return {
            'raw_text': raw_text,
            'clean_text': cleaned_text,
            'predicted_department': pred_label,
            'confidence': confidence,
            'all_class_probabilities': all_class_probs,
            'token_attentions': token_attentions
        }

    def visualize_attention(self, raw_text: str, save_path: str = None):
        res = self.predict(raw_text)
        tokens = [item['token'] for item in res['token_attentions']]
        weights = [item['attention_weight'] for item in res['token_attentions']]
        
        plt.figure(figsize=(max(8, len(tokens) * 0.5), 4))
        bars = plt.bar(range(len(tokens)), weights, color='royalblue', edgecolor='navy', alpha=0.85)
        plt.xticks(range(len(tokens)), tokens, rotation=45, ha='right', fontsize=11)
        plt.ylabel('Attention Weight', fontsize=11)
        plt.title(
            f"Predicted Route: {res['predicted_department']} ({res['confidence']*100:.1f}%)\n"
            f"Input: \"{raw_text[:60]}...\"",
            fontsize=12, fontweight='bold'
        )
        plt.grid(axis='y', linestyle='--', alpha=0.5)
        plt.tight_layout()
        
        if save_path:
            os.makedirs(os.path.dirname(save_path) or '.', exist_ok=True)
            plt.savefig(save_path, dpi=300)
            print(f"Attention visualization saved to: {save_path}")
        plt.close()
        return res

if __name__ == '__main__':
    router = CustomerSupportRouter()
    
    test_queries = [
        "My flight was delayed by 4 hours and I lost my checked baggage at airport, please assist!",
        "The driver cancelled my ride after 15 minutes and I got charged a 5 dollar fee",
        "My iPhone screen is freezing after the latest iOS update and battery drains fast",
        "Where is my package? The delivery tracking number says handed to resident but nothing in my mailbox",
        "Songs keep pausing every 20 seconds and my offline playlist won't download",
        "Ordered groceries online from your store and my delivery slot was missed completely",
        "My Xbox controller won't connect via bluetooth to console and keeps flashing",
        "No cellular network connection or data signal on my SIM card since yesterday morning"
    ]
    
    print("\n" + "="*70)
    print("CUSTOMER SUPPORT ROUTING TEST & ATTENTION EXPLANATIONS")
    print("="*70)
    
    for i, query in enumerate(test_queries, 1):
        res = router.visualize_attention(query, save_path=f"reports/attention_sample_{i}.png")
        print(f"\n[Test Case {i}]")
        print(f"Customer Message : {query}")
        print(f"Routed To        : {res['predicted_department']} (Confidence: {res['confidence']*100:.2f}%)")
        top_tokens = sorted(res['token_attentions'], key=lambda x: x['attention_weight'], reverse=True)[:3]
        top_str = ", ".join([f"'{item['token']}' ({item['attention_weight']:.3f})" for item in top_tokens])
        print(f"Top Attentive Clues: {top_str}")

