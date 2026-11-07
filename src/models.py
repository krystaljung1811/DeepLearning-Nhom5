import torch
import torch.nn as nn
import torch.nn.functional as F

class AttentionLayer(nn.Module):
    """
    Bahdanau-style Additive Self-Attention Pooling Layer.
    Computes attentive representation (context vector) and token-level attention weights.
    """
    def __init__(self, hidden_dim: int, attn_dim: int = 128):
        super(AttentionLayer, self).__init__()
        self.projection = nn.Sequential(
            nn.Linear(hidden_dim, attn_dim),
            nn.Tanh()
        )
        self.context_vector = nn.Linear(attn_dim, 1, bias=False)

    def forward(self, rnn_outputs: torch.Tensor, mask: torch.Tensor = None):
        """
        Args:
            rnn_outputs: Tensor of shape (batch_size, seq_len, hidden_dim)
            mask: Optional boolean tensor of shape (batch_size, seq_len), True for valid tokens, False for padding
        Returns:
            context: Tensor of shape (batch_size, hidden_dim)
            attn_weights: Tensor of shape (batch_size, seq_len)
        """
        # (batch_size, seq_len, attn_dim)
        projected = self.projection(rnn_outputs)
        
        # (batch_size, seq_len, 1) -> squeeze to (batch_size, seq_len)
        scores = self.context_vector(projected).squeeze(-1)
        
        # Mask out padding tokens
        if mask is not None:
            scores = scores.masked_fill(~mask, -1e9)
            
        attn_weights = F.softmax(scores, dim=-1)
        
        # Weighted sum: (batch_size, 1, seq_len) @ (batch_size, seq_len, hidden_dim) -> (batch_size, 1, hidden_dim)
        context = torch.bmm(attn_weights.unsqueeze(1), rnn_outputs).squeeze(1)
        
        return context, attn_weights

class BiLSTMAttention(nn.Module):
    """
    Bidirectional LSTM with Self-Attention Pooling for Customer Support Routing.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        attn_dim: int = 64,
        num_classes: int = 8,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0
    ):
        super(BiLSTMAttention, self).__init__()
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
        
        # BiLSTM outputs hidden_dim * 2
        self.attention = AttentionLayer(hidden_dim * 2, attn_dim)
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, input_ids: torch.Tensor, mask: torch.Tensor = None):
        """
        Args:
            input_ids: (batch_size, seq_len)
            mask: (batch_size, seq_len)
        Returns:
            logits: (batch_size, num_classes)
            attn_weights: (batch_size, seq_len)
        """
        # (batch_size, seq_len, embed_dim)
        embedded = self.drop(self.embedding(input_ids))
        
        # rnn_out: (batch_size, seq_len, hidden_dim * 2)
        rnn_out, _ = self.lstm(embedded)
        
        # Context vector & attention weights
        context, attn_weights = self.attention(rnn_out, mask)
        
        # Classifier logits: (batch_size, num_classes)
        logits = self.fc(context)
        
        return logits, attn_weights

class BaselineLSTM(nn.Module):
    """
    Baseline Standard LSTM (Without Attention) for comparison and ablation study.
    Uses the final hidden state or global average pooling over valid tokens.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        num_classes: int = 8,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0
    ):
        super(BaselineLSTM, self).__init__()
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
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, input_ids: torch.Tensor, mask: torch.Tensor = None):
        embedded = self.drop(self.embedding(input_ids))
        rnn_out, (hn, _) = self.lstm(embedded)
        
        # Use last layer hidden state: (num_layers, batch_size, hidden_dim) -> hn[-1]
        last_hidden = hn[-1]
        logits = self.fc(last_hidden)
        return logits

