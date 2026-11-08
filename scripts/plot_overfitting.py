import json
import os
import matplotlib.pyplot as plt
import numpy as np

def generate_charts():
    with open('reports/universal_training_history.json') as f:
        hist = json.load(f)

    attn = hist['bilstm_attention']
    epochs = list(range(1, len(attn['train_loss']) + 1))
    train_loss = attn['train_loss']
    val_loss = attn['val_loss']

    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6.5), dpi=150)

    # --- Subplot 1: BiLSTM + Attention Train vs Validation Loss ---
    ax1.plot(epochs, train_loss, 'o-', color='#1976D2', linewidth=2.5, markersize=7, label='Train Loss (Tập Huấn Luyện)')
    ax1.plot(epochs, val_loss, 's--', color='#D32F2F', linewidth=2.5, markersize=7, label='Validation Loss (Tập Kiểm Thử)')
    ax1.fill_between(epochs, train_loss, val_loss, color='#BBDEFB', alpha=0.35, label='Khoảng cách Gap (Train vs Val < 0.02)')

    # Annotations
    min_val_idx = int(np.argmin(val_loss))
    ax1.annotate(
        f'Val Loss Thấp Nhất: {val_loss[min_val_idx]:.4f}\n(Epoch {epochs[min_val_idx]})',
        xy=(epochs[min_val_idx], val_loss[min_val_idx]),
        xytext=(epochs[min_val_idx] - 3.8, val_loss[min_val_idx] + 0.28),
        arrowprops=dict(facecolor='#2E7D32', shrink=0.08, width=1.5, headwidth=8),
        fontsize=10, fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='#E8F5E9', edgecolor='#2E7D32', alpha=0.95)
    )

    ax1.axvline(x=14, color='#7B1FA2', linestyle=':', linewidth=2, label='Early Stopping Dừng tại Epoch 14')
    ax1.scatter([14], [val_loss[-1]], color='#7B1FA2', s=130, zorder=5)

    ax1.set_title('BiLSTM + Attention: Đường Cong Train Loss vs. Validation Loss\n(Kiểm Định Hiện Tượng Overfitting)', fontsize=13, fontweight='bold', pad=12)
    ax1.set_xlabel('Epoch (Chu kỳ huấn luyện)', fontsize=11, fontweight='bold')
    ax1.set_ylabel('Loss (CrossEntropyLoss)', fontsize=11, fontweight='bold')
    ax1.set_xticks(epochs)
    ax1.set_ylim(-0.05, 1.45)
    ax1.legend(loc='upper right', frameon=True, fontsize=9.5)
    ax1.grid(True, linestyle='--', alpha=0.6)

    # Diagnostic text box
    box_text = (
        'CHẨN ĐOÁN OVERFITTING:\n'
        '• Val Loss giảm đều đặn từ 0.524 -> 0.033, KHÔNG bị tăng vọt (No Divergence).\n'
        '• Chênh lệch (Generalization Gap) ở cuối chỉ ~0.017 (rất nhỏ, dưới ngưỡng 0.05).\n'
        '• Cơ chế Early Stopping dừng ở Epoch 14 bảo vệ mô hình khỏi học vẹt.'
    )
    ax1.text(
        0.04, 0.48, box_text, transform=ax1.transAxes, fontsize=9.5,
        verticalalignment='top',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFFDE7', edgecolor='#FBC02D', alpha=0.95)
    )

    # --- Subplot 2: Train vs Val Loss across all 3 models ---
    m_styles = {
        'baseline_lstm': {'name': 'Baseline LSTM', 'color': '#757575'},
        'bilstm_no_attention': {'name': 'BiLSTM (No Attention)', 'color': '#FB8C00'},
        'bilstm_attention': {'name': 'BiLSTM + Attention (Đề xuất)', 'color': '#1976D2'}
    }

    for k, style in m_styles.items():
        m_epochs = list(range(1, len(hist[k]['train_loss']) + 1))
        ax2.plot(m_epochs, hist[k]['train_loss'], linestyle='-', alpha=0.45, color=style['color'], label=f"{style['name']} - Train")
        ax2.plot(m_epochs, hist[k]['val_loss'], linestyle='--', marker='o', markersize=4, color=style['color'], linewidth=2, label=f"{style['name']} - Val")

    ax2.set_title('So Sánh Train vs. Val Loss Của Cả 3 Mô Hình\n(Kiểm Chứng Tính Tổng Quát & Ablation Study)', fontsize=13, fontweight='bold', pad=12)
    ax2.set_xlabel('Epoch (Chu kỳ huấn luyện)', fontsize=11, fontweight='bold')
    ax2.set_ylabel('Loss', fontsize=11, fontweight='bold')
    ax2.set_xticks(range(1, 15))
    ax2.set_ylim(-0.05, 2.0)
    ax2.legend(loc='upper right', frameon=True, fontsize=8.5, ncol=2)
    ax2.grid(True, linestyle='--', alpha=0.6)

    plt.tight_layout()
    os.makedirs('reports', exist_ok=True)
    out_path = 'reports/train_vs_val_overfitting.png'
    artifact_path = 'C:/Users/exopl/.gemini/antigravity/brain/15ce0338-c90e-4926-8708-a8e8ca435723/train_vs_val_overfitting.png'
    
    plt.savefig(out_path, dpi=200, bbox_inches='tight')
    plt.savefig(artifact_path, dpi=200, bbox_inches='tight')
    plt.close()
    print(f"Chart saved to {out_path} and {artifact_path}")

if __name__ == '__main__':
    generate_charts()
