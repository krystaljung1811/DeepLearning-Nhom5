import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from predict_universal import UniversalRouter, INDUSTRY_QUEUE_MAPPINGS

def print_banner():
    print("\n" + "="*75)
    print("🎯 UNIVERSAL CUSTOMER SUPPORT TICKET ROUTER (BiLSTM + ATTENTION)")
    print("   Hệ thống định tuyến thông minh theo nội dung & mức độ ưu tiên")
    print("="*75)

def run_interactive_cli():
    print_banner()
    print("Đang nạp mô hình học sâu Universal BiLSTM + Attention...")
    router = UniversalRouter(model_path='models/best_universal_bilstm_attention.pt', data_dir='data')
    print("✅ Đã sẵn sàng!")
    
    industries = ['ecommerce', 'fintech', 'saas']
    current_ind_idx = 0
    
    while True:
        curr_ind = industries[current_ind_idx]
        ind_name = INDUSTRY_QUEUE_MAPPINGS[curr_ind]['name']
        print("\n" + "-"*75)
        print(f"🏢 Ngành nghề ánh xạ hiện tại: [{ind_name}] (Gõ ':switch' để đổi ngành, ':exit' để thoát)")
        print("-" * 75)
        
        try:
            user_input = input("👉 Nhập nội dung Email / Chat / Ticket của khách hàng:\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nTạm biệt!")
            break
            
        if not user_input:
            continue
            
        if user_input.lower() == ':exit':
            print("Tạm biệt!")
            break
            
        if user_input.lower() == ':switch':
            current_ind_idx = (current_ind_idx + 1) % len(industries)
            print(f"Đã chuyển sang ngành: {INDUSTRY_QUEUE_MAPPINGS[industries[current_ind_idx]]['name']}")
            continue
            
        res = router.route_ticket(user_input, confidence_threshold=0.60, selected_industry=curr_ind)
        
        cat = res['category']
        prio = res['priority']
        triage = res['triage']
        routing = res['routing']
        
        print("\n" + "="*75)
        print("📊 KẾT QUẢ PHÂN TÍCH & ĐỊNH TUYẾN")
        print("="*75)
        print(f"• Loại vấn đề        : {cat['icon']} {cat['name_vi']} ({cat['id']})")
        print(f"• Độ tin cậy         : {cat['confidence']*100:.2f}%")
        print(f"• Mức độ ưu tiên     : {prio['badge']} {prio['name_vi']} (Confidence: {prio['confidence']*100:.1f}%)")
        print(f"• Trạng thái xử lý   : [{triage['status']}]")
        if triage['human_review_required']:
            for reason in triage['reasons']:
                print(f"  ⚠️ Lý do: {reason}")
        print(f"• Hàng đợi tiếp nhận : 📥 {routing['target_queue']} ({routing['industry']})")
        
        top_tokens = sorted(res['token_attentions'], key=lambda x: x['weight'], reverse=True)[:5]
        print("\n🔍 Top 5 từ khóa được Cơ chế Attention chú ý nhất:")
        for rank, item in enumerate(top_tokens, 1):
            bar_len = int(item['weight'] * 40)
            bar_str = "█" * bar_len
            print(f"  {rank}. '{item['token']:<15}' | Trọng số: {item['weight']:.4f} {bar_str}")
        print("="*75)

if __name__ == '__main__':
    run_interactive_cli()

