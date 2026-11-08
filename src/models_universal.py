import torch
import torch.nn as nn
import torch.nn.functional as F

class UniversalAttentionLayer(nn.Module):
    """
    Additive Self-Attention Pooling Layer.
    Computes token-level attention weights alpha_t and attentive context vector.
    """
    def __init__(self, hidden_dim: int, attn_dim: int = 64):
        super(UniversalAttentionLayer, self).__init__()
        self.projection = nn.Sequential(
            nn.Linear(hidden_dim, attn_dim),
            nn.Tanh()
        )
        self.context_vector = nn.Linear(attn_dim, 1, bias=False)

    def forward(self, rnn_outputs: torch.Tensor, mask: torch.Tensor = None):
        """
        rnn_outputs: (batch_size, seq_len, hidden_dim)
        mask: (batch_size, seq_len) True for valid tokens, False for padding
        """
        projected = self.projection(rnn_outputs) # (batch_size, seq_len, attn_dim)
        scores = self.context_vector(projected).squeeze(-1) # (batch_size, seq_len)
        
        if mask is not None:
            scores = scores.masked_fill(~mask, -1e9)
            
        attn_weights = F.softmax(scores, dim=-1) # (batch_size, seq_len)
        context = torch.bmm(attn_weights.unsqueeze(1), rnn_outputs).squeeze(1) # (batch_size, hidden_dim)
        return context, attn_weights

class MultiTaskBiLSTMAttention(nn.Module):
    """
    Multi-Task BiLSTM + Attention Network for Universal Ticket Classification:
    - Task 1: Category Prediction (7 classes)
    - Task 2: Priority Prediction (4 classes)
    - Explainability: Token Attention Weights
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        attn_dim: int = 64,
        num_categories: int = 7,
        num_priorities: int = 4,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0
    ):
        super(MultiTaskBiLSTMAttention, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.drop = nn.Dropout(dropout)
        
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            bidirectional=True,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # BiLSTM hidden size is hidden_dim * 2
        self.attention = UniversalAttentionLayer(hidden_dim * 2, attn_dim)
        
        # Task 1 Head: Category Classifier (Thanh toán, Giao hàng, Lỗi kỹ thuật, Tài khoản...)
        self.category_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_categories)
        )
        
        # Task 2 Head: Priority Classifier (Low, Medium, High, Urgent)
        self.priority_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_priorities)
        )

    def forward(self, input_ids: torch.Tensor, mask: torch.Tensor = None, lengths: torch.Tensor = None):
        """
        input_ids: (batch_size, seq_len)
        mask: (batch_size, seq_len)
        lengths: (batch_size,) actual sequence lengths
        Returns:
            cat_logits: (batch_size, num_categories)
            prio_logits: (batch_size, num_priorities)
            attn_weights: (batch_size, seq_len)
        """
        batch_size, seq_len = input_ids.size()
        embedded = self.drop(self.embedding(input_ids))
        
        # Tính lengths nếu chưa truyền vào
        if lengths is None:
            if mask is not None:
                lengths = mask.sum(dim=1).clamp(min=1)
            else:
                lengths = torch.full((batch_size,), seq_len, dtype=torch.long, device=input_ids.device)
                
        # Khắc phục lỗi Padding Contamination bằng PackedSequence
        # Giúp backward LSTM chạy từ đúng độ dài thực tế L_i thay vì từ cuối chuỗi đệm padding
        packed_embeds = nn.utils.rnn.pack_padded_sequence(
            embedded, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        packed_out, _ = self.lstm(packed_embeds)
        rnn_out, _ = nn.utils.rnn.pad_packed_sequence(
            packed_out, batch_first=True, total_length=seq_len
        )
        
        # Áp dụng Attention Masking
        context, attn_weights = self.attention(rnn_out, mask)
        
        cat_logits = self.category_head(context)
        prio_logits = self.priority_head(context)
        
        return cat_logits, prio_logits, attn_weights

class MultiTaskBiLSTMNoAttention(nn.Module):
    """
    Ablation Study Model: Multi-Task BiLSTM KHÔNG có Attention.
    Sử dụng Masked Average Pooling để tổng hợp biểu diễn từ các token thực (bỏ qua padding).
    Dùng để chứng minh độc lập phần đóng góp của Attention so với chỉ dùng Bi-directional.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        num_categories: int = 7,
        num_priorities: int = 4,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0
    ):
        super(MultiTaskBiLSTMNoAttention, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.drop = nn.Dropout(dropout)
        
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            bidirectional=True,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        self.category_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_categories)
        )
        
        self.priority_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_priorities)
        )

    def forward(self, input_ids: torch.Tensor, mask: torch.Tensor = None, lengths: torch.Tensor = None):
        batch_size, seq_len = input_ids.size()
        embedded = self.drop(self.embedding(input_ids))
        
        if lengths is None:
            if mask is not None:
                lengths = mask.sum(dim=1).clamp(min=1)
            else:
                lengths = torch.full((batch_size,), seq_len, dtype=torch.long, device=input_ids.device)
                
        packed_embeds = nn.utils.rnn.pack_padded_sequence(
            embedded, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        packed_out, _ = self.lstm(packed_embeds)
        rnn_out, _ = nn.utils.rnn.pad_packed_sequence(
            packed_out, batch_first=True, total_length=seq_len
        )
        
        # Masked Average Pooling
        if mask is not None:
            mask_expanded = mask.unsqueeze(-1).float() # (batch_size, seq_len, 1)
            sum_vectors = (rnn_out * mask_expanded).sum(dim=1) # (batch_size, hidden_dim * 2)
            context = sum_vectors / mask_expanded.sum(dim=1).clamp(min=1e-9)
        else:
            context = rnn_out.mean(dim=1)
            
        cat_logits = self.category_head(context)
        prio_logits = self.priority_head(context)
        
        return cat_logits, prio_logits

class MultiTaskBaselineLSTM(nn.Module):
    """
    Baseline Standard Unidirectional LSTM without Attention for benchmark comparison.
    Sử dụng PackedSequence để lấy đúng hidden state tại token cuối cùng của câu.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        num_categories: int = 7,
        num_priorities: int = 4,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0
    ):
        super(MultiTaskBaselineLSTM, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.drop = nn.Dropout(dropout)
        
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            bidirectional=False, # Unidirectional standard LSTM
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        self.category_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_categories)
        )
        
        self.priority_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_priorities)
        )

    def forward(self, input_ids: torch.Tensor, mask: torch.Tensor = None, lengths: torch.Tensor = None):
        batch_size, seq_len = input_ids.size()
        embedded = self.drop(self.embedding(input_ids))
        
        if lengths is None:
            if mask is not None:
                lengths = mask.sum(dim=1).clamp(min=1)
            else:
                lengths = torch.full((batch_size,), seq_len, dtype=torch.long, device=input_ids.device)
                
        packed_embeds = nn.utils.rnn.pack_padded_sequence(
            embedded, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        _, (hn, _) = self.lstm(packed_embeds)
        last_hidden = hn[-1] # (batch_size, hidden_dim) - Lấy đúng trạng thái tại độ dài thực tế L_i!
        
        cat_logits = self.category_head(last_hidden)
        prio_logits = self.priority_head(last_hidden)
        
        return cat_logits, prio_logits

