import os
import json
import time
import torch
import torch.nn.functional as F
import numpy as np
from build_universal_dataset import clean_text_strictly
from models_universal import MultiTaskBiLSTMAttention

# BẢNG THÔNG TIN CHI TIẾT CÁC NHÃN PHỔ QUÁT (TIẾNG VIỆT 100% CHUẨN DOANH NGHIỆP)
CATEGORY_INFO = {
    'billing_refund': {
        'name_vi': 'Thanh toán & Hoàn tiền',
        'icon': '💳',
        'description': 'Giao dịch sai, trừ tiền nhầm, hoàn tiền hóa đơn, cước thuê bao, thẻ tín dụng',
        'suggested_reply': 'Kính chào Quý khách, chúng tôi đã tiếp nhận phản ánh về giao dịch/cước phí. Bộ phận Kế toán & Đối soát đang kiểm tra lại sao kê và sẽ hoàn trả khoản tiền trên trong vòng 1-3 ngày làm việc.'
    },
    'shipping_delivery': {
        'name_vi': 'Giao hàng & Vận chuyển',
        'icon': '🚚',
        'description': 'Đơn hàng trễ, sai địa chỉ, thất lạc bưu kiện, tài xế không đến, tình trạng bưu tá',
        'suggested_reply': 'Chào Quý khách, chúng tôi rất tiếc vì sự chậm trễ trong quá trình giao hàng. Bưu kiện của bạn đã được ưu tiên gán cho Đội Điều phối Kho vận để thúc đẩy giao ngay trong hôm nay.'
    },
    'technical_issue': {
        'name_vi': 'Lỗi Kỹ thuật & Hệ thống',
        'icon': '🛠️',
        'description': 'Sập ứng dụng, màn hình đơ, lỗi kết nối mạng, pin sụt nhanh, cập nhật phần mềm',
        'suggested_reply': 'Chào Quý khách, chúng tôi đã ghi nhận sự cố kỹ thuật bạn gặp phải. Đội ngũ Kỹ sư Phần mềm đang kiểm tra nhật ký log hệ thống để xử lý bản vá khắc phục sớm nhất.'
    },
    'account_security': {
        'name_vi': 'Tài khoản & Bảo mật',
        'icon': '🔐',
        'description': 'Quên/đổi mật khẩu, tài khoản bị khóa, mã xác thực OTP/2FA, cảnh báo đăng nhập lạ',
        'suggested_reply': 'Kính chào Quý khách, để bảo vệ an toàn cho tài khoản, hệ thống đã tạm thời khóa bảo vệ. Vui lòng xác thực qua đường dẫn bảo mật gửi đến số điện thoại chính chủ của bạn.'
    },
    'product_quality': {
        'name_vi': 'Chất lượng Sản phẩm',
        'icon': '📦',
        'description': 'Sản phẩm hỏng, bể vỡ, linh kiện lỗi, hàng hết hạn, không đúng mô tả',
        'suggested_reply': 'Chào Quý khách, chúng tôi chân thành xin lỗi vì sự cố chất lượng sản phẩm. Chúng tôi sẽ gửi đơn hàng đổi mới 1-1 miễn phí hoặc hoàn tiền 100% ngay khi thu hồi sản phẩm lỗi.'
    },
    'complaint_escalation': {
        'name_vi': 'Khiếu nại Gay gắt & Pháp lý',
        'icon': '🚨',
        'description': 'Trải nghiệm rất tồi tệ, đe dọa báo công an/luật sư, yêu cầu gặp quản lý cấp cao',
        'suggested_reply': 'Kính gửi Quý khách, chúng tôi vô cùng tiếc vì trải nghiệm không tốt này. Sự việc của Quý khách đã được chuyển thẳng tới Quản lý Cấp cao của Ban Giám đốc CSKH để gọi điện thoại làm việc trực tiếp trong vòng 15 phút tới.'
    },
    'general_inquiry': {
        'name_vi': 'Thắc mắc Chung & Hướng dẫn',
        'icon': 'ℹ️',
        'description': 'Hỏi giờ làm việc, chính sách đổi trả, hướng dẫn thao tác, thông tin chi nhánh',
        'suggested_reply': 'Chào Quý khách, cảm ơn bạn đã quan tâm! Dưới đây là thông tin chi tiết và các bước hướng dẫn cụ thể cho dịch vụ bạn đang quan tâm. Rất hân hạnh được hỗ trợ bạn!'
    }
}

# BẢNG MẪU PHẢN HỒI ĐA NGÔN NGỮ (MULTILINGUAL SUGGESTED REPLIES)
SUGGESTED_REPLIES = {
    'billing_refund': {
        'en': "Hello, thank you for contacting us. We have received your payment inquiry. Our billing and finance team is actively investigating the transaction and will issue a refund or confirmation within 1-3 business days.",
        'vi': "Kính chào Quý khách, chúng tôi đã tiếp nhận phản ánh về giao dịch/cước phí. Bộ phận Kế toán & Đối soát đang kiểm tra lại sao kê và sẽ hoàn trả khoản tiền trên trong vòng 1-3 ngày làm việc."
    },
    'shipping_delivery': {
        'en': "Hello, we sincerely apologize for the delay with your delivery. Your parcel has been escalated to our logistics and dispatch team for expedited delivery today.",
        'vi': "Chào Quý khách, chúng tôi rất tiếc vì sự chậm trễ trong quá trình giao hàng. Bưu kiện của bạn đã được ưu tiên gán cho Đội Điều phối Kho vận để thúc đẩy giao ngay trong hôm nay."
    },
    'technical_issue': {
        'en': "Hi, thank you for reporting this technical glitch. Our software engineering team is inspecting system error logs to resolve the issue as quickly as possible.",
        'vi': "Chào Quý khách, chúng tôi đã ghi nhận sự cố kỹ thuật bạn gặp phải. Đội ngũ Kỹ sư Phần mềm đang kiểm tra nhật ký log hệ thống để xử lý bản vá khắc phục sớm nhất."
    },
    'account_security': {
        'en': "Hello, to safeguard your account against unauthorized access, safety measures have been activated. Please verify your identity using the secure link sent to your registered phone or email.",
        'vi': "Kính chào Quý khách, để bảo vệ an toàn cho tài khoản, hệ thống đã tạm thời khóa bảo vệ. Vui lòng xác thực qua đường dẫn bảo mật gửi đến số điện thoại chính chủ của bạn."
    },
    'product_quality': {
        'en': "Hello, we deeply apologize for the product quality issue. We will arrange a free 1-to-1 replacement or provide a 100% refund immediately upon verification.",
        'vi': "Chào Quý khách, chúng tôi chân thành xin lỗi vì sự cố chất lượng sản phẩm. Chúng tôi sẽ gửi đơn hàng đổi mới 1-1 miễn phí hoặc hoàn tiền 100% ngay khi thu hồi sản phẩm lỗi."
    },
    'complaint_escalation': {
        'en': "Dear Customer, we are extremely sorry for your unsatisfactory experience. Your ticket has been escalated directly to our Senior Operations Manager for a direct resolution within 15 minutes.",
        'vi': "Kính gửi Quý khách, chúng tôi vô cùng tiếc vì trải nghiệm không tốt này. Sự việc của Quý khách đã được chuyển thẳng tới Quản lý Cấp cao của Ban Giám đốc CSKH để gọi điện thoại làm việc trực tiếp trong vòng 15 phút tới."
    },
    'general_inquiry': {
        'en': "Hello! Thank you for reaching out to us. Below are the details and step-by-step instructions for your inquiry. Please let us know if you need any further assistance!",
        'vi': "Chào Quý khách, cảm ơn bạn đã quan tâm! Dưới đây là thông tin chi tiết và các bước hướng dẫn cụ thể cho dịch vụ bạn đang quan tâm. Rất hân hạnh được hỗ trợ bạn!"
    }
}

def detect_language(text: str) -> str:
    """
    Nhận diện ngôn ngữ đầu vào (Tiếng Việt 'vi' hoặc Tiếng Anh 'en').
    """
    vn_chars = set('àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ'
                   'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ')
    if any(c in vn_chars for c in text):
        return 'vi'
    
    vn_common_words = {'tôi', 'bạn', 'của', 'không', 'được', 'cho', 'với', 'xin', 'chào', 'đơn', 'hàng', 'tiền', 'gấp', 'lỗi'}
    words = set(text.lower().split())
    if len(words.intersection(vn_common_words)) >= 2:
        return 'vi'
        
    return 'en'

PRIORITY_INFO = {
    'urgent': {'name_vi': 'Khẩn cấp (P1)', 'color': 'red', 'badge': '🔴', 'sla': '15 phút'},
    'high': {'name_vi': 'Cao (P2)', 'color': 'orange', 'badge': '🟠', 'sla': '1 giờ'},
    'medium': {'name_vi': 'Trung bình (P3)', 'color': 'yellow', 'badge': '🟡', 'sla': '4 giờ'},
    'low': {'name_vi': 'Thấp (P4)', 'color': 'green', 'badge': '🟢', 'sla': '24 giờ'}
}

INDUSTRY_QUEUE_MAPPINGS = {
    'ecommerce': {
        'name': 'Doanh nghiệp E-Commerce / Bán lẻ',
        'queues': {
            'billing_refund': 'Phòng Kế toán & Đối soát Hoàn tiền',
            'shipping_delivery': 'Bộ phận Điều phối Vận chuyển & Kho vận',
            'technical_issue': 'Đội Hỗ trợ Kỹ thuật Website & App',
            'account_security': 'Bộ phận CSKH - Xác thực Tài khoản',
            'product_quality': 'Đội Đổi trả & Kiểm định Chất lượng Hàng hóa',
            'complaint_escalation': 'Hàng đợi Ban Quản trị CSKH VIP (Escalation)',
            'general_inquiry': 'Bộ phận Chăm sóc Khách hàng Tổng đài L1'
        }
    },
    'fintech': {
        'name': 'Ngân hàng số & Fintech',
        'queues': {
            'billing_refund': 'Phòng Tra soát Khiếu nại Giao dịch & Thẻ',
            'shipping_delivery': 'Đơn vị Phát chuyển Thẻ & Hồ sơ Hợp đồng',
            'technical_issue': 'Bộ phận Kỹ thuật Core Banking & Mobile App',
            'account_security': 'Đội An ninh Thông tin & Gian lận (Fraud)',
            'product_quality': 'Bộ phận Vận hành Sản phẩm Tài chính',
            'complaint_escalation': 'Văn phòng Giám đốc Trải nghiệm Khách hàng',
            'general_inquiry': 'Tổng đài Hotline 24/7'
        }
    },
    'saas': {
        'name': 'Công ty Phần mềm & Dịch vụ SaaS',
        'queues': {
            'billing_refund': 'Bộ phận Quản lý Gói cước & Hóa đơn Doanh nghiệp',
            'shipping_delivery': 'Bộ phận Triển khai & Bàn giao Tài khoản',
            'technical_issue': 'Kỹ sư Hỗ trợ Cấp 2 (Tier 2 Tech Support)',
            'account_security': 'Đội Quản trị Định danh & Truy cập (IAM)',
            'product_quality': 'Đội ngũ Quản lý Sản phẩm (Product Team)',
            'complaint_escalation': 'Quản lý Khách hàng Trọng yếu (Key Account Manager)',
            'general_inquiry': 'Bộ phận Hướng dẫn Khách hàng Onboarding'
        }
    }
}

class UniversalRouter:
    def __init__(self, model_path='models/best_universal_bilstm_attention.pt', data_dir='data'):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        with open(os.path.join(data_dir, 'vocab_universal.json'), 'r', encoding='utf-8') as f:
            self.vocab = json.load(f)
        with open(os.path.join(data_dir, 'labels_universal.json'), 'r', encoding='utf-8') as f:
            self.labels = json.load(f)
            
        self.id2cat = {int(k): v for k, v in self.labels['categories']['id2label'].items()}
        self.id2prio = {int(k): v for k, v in self.labels['priorities']['id2label'].items()}
        self.pad_idx = self.vocab.get('<pad>', 0)
        self.unk_idx = self.vocab.get('<unk>', 1)
        
        self.model = MultiTaskBiLSTMAttention(
            vocab_size=len(self.vocab),
            embed_dim=128,
            hidden_dim=128,
            attn_dim=64,
            num_categories=len(self.id2cat),
            num_priorities=len(self.id2prio),
            num_layers=2,
            dropout=0.3
        ).to(self.device)
        
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()

    def route_ticket(self, raw_text: str, confidence_threshold: float = 0.60, selected_industry: str = 'ecommerce', max_seq_len: int = 80):
        t0 = time.perf_counter()
        
        # 1. Phát hiện ngôn ngữ & Làm sạch văn bản (Sanitization)
        detected_lang = detect_language(raw_text)
        clean_text = clean_text_strictly(raw_text)
        tokens = clean_text.split()
        if len(tokens) == 0:
            tokens = ['<unk>']
            
        # 2. Tokenize & OOV analysis
        oov_tokens = [t for t in tokens if t not in self.vocab]
        oov_count = len(oov_tokens)
        oov_rate = oov_count / max(len(tokens), 1)
        oov_warning = None
        if oov_rate > 0.40:
            oov_warning = f"Tỷ lệ từ ngoài từ điển cao ({oov_rate*100:.1f}%). Mô hình được huấn luyện bằng tiếng Anh; nếu nhập tiếng Việt hoặc ký hiệu đặc biệt, kết quả có thể kém chính xác."
            
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
            
        inp_tensor = torch.tensor([input_ids], dtype=torch.long).to(self.device)
        mask_tensor = torch.tensor([mask], dtype=torch.bool).to(self.device)
        
        with torch.no_grad():
            cat_logits, prio_logits, attn_weights = self.model(inp_tensor, mask_tensor)
            cat_probs = F.softmax(cat_logits, dim=-1).squeeze(0).cpu().numpy()
            prio_probs = F.softmax(prio_logits, dim=-1).squeeze(0).cpu().numpy()
            raw_attn = attn_weights.squeeze(0).cpu().numpy()[:seq_len]
            
        inference_ms = round((time.perf_counter() - t0) * 1000, 2)
            
        cat_idx = int(np.argmax(cat_probs))
        prio_idx = int(np.argmax(prio_probs))
        
        pred_cat = self.id2cat[cat_idx]
        pred_prio = self.id2prio[prio_idx]
        cat_conf = float(cat_probs[cat_idx])
        prio_conf = float(prio_probs[prio_idx])
        
        human_review_required = False
        triage_reasons = []
        
        if cat_conf < confidence_threshold:
            human_review_required = True
            triage_reasons.append(f"Độ tin cậy loại vấn đề ({cat_conf*100:.1f}%) dưới ngưỡng an toàn ({confidence_threshold*100:.1f}%)")
            
        if pred_prio == 'urgent':
            human_review_required = True
            triage_reasons.append("Yêu cầu mức ưu tiên Khẩn cấp (P1) cần nhân sự kiểm duyệt ngay")
            
        if pred_cat == 'complaint_escalation':
            human_review_required = True
            triage_reasons.append("Khiếu nại gay gắt / rủi ro pháp lý cần quản lý can thiệp")
            
        norm_attn = raw_attn / (np.sum(raw_attn) + 1e-9)
        token_attentions = [{'token': t, 'weight': float(w)} for t, w in zip(actual_tokens, norm_attn)]
        sorted_tokens = sorted(token_attentions, key=lambda x: x['weight'], reverse=True)
        top_tokens = [t for t in sorted_tokens if t['weight'] > 0.05][:5]
        
        industry_info = INDUSTRY_QUEUE_MAPPINGS.get(selected_industry, INDUSTRY_QUEUE_MAPPINGS['ecommerce'])
        target_queue = industry_info['queues'].get(pred_cat, 'Hàng đợi CSKH Chung')
        
        # Format Vietnamese probabilities list
        all_prob_items = []
        for i in range(len(cat_probs)):
            cat_key = self.id2cat[i]
            info = CATEGORY_INFO[cat_key]
            all_prob_items.append({
                'id': cat_key,
                'name_vi': info['name_vi'],
                'icon': info['icon'],
                'probability': float(cat_probs[i]),
                'percent_str': f"{float(cat_probs[i])*100:.1f}%"
            })
        all_prob_items.sort(key=lambda x: x['probability'], reverse=True)
        
        trace = {
            'cleaned_text': clean_text,
            'token_count': len(tokens),
            'seq_len_clipped': seq_len,
            'oov_count': oov_count,
            'oov_tokens': oov_tokens[:8],
            'oov_rate': round(oov_rate, 4),
            'oov_rate_pct': f"{oov_rate*100:.1f}%",
            'oov_warning': oov_warning,
            'embed_dim': 128,
            'bilstm_dim': 256,
            'bilstm_layers': 2,
            'attn_dim': 64,
            'top_attention_tokens': top_tokens,
            'inference_ms': inference_ms,
            'vocab_size': len(self.vocab)
        }
        
        suggested_reply = SUGGESTED_REPLIES.get(pred_cat, {}).get(detected_lang, CATEGORY_INFO[pred_cat]['suggested_reply'])
        
        return {
            'raw_text': raw_text,
            'clean_text': clean_text,
            'detected_language': detected_lang,
            'category': {
                'id': pred_cat,
                'name_vi': CATEGORY_INFO[pred_cat]['name_vi'],
                'icon': CATEGORY_INFO[pred_cat]['icon'],
                'description': CATEGORY_INFO[pred_cat]['description'],
                'confidence': cat_conf,
                'confidence_str': f"{cat_conf*100:.1f}%",
                'suggested_reply': suggested_reply,
                'all_probabilities': all_prob_items
            },
            'priority': {
                'id': pred_prio,
                'name_vi': PRIORITY_INFO[pred_prio]['name_vi'],
                'badge': PRIORITY_INFO[pred_prio]['badge'],
                'color': PRIORITY_INFO[pred_prio]['color'],
                'sla': PRIORITY_INFO[pred_prio]['sla'],
                'confidence': prio_conf,
                'confidence_str': f"{prio_conf*100:.1f}%"
            },
            'triage': {
                'human_review_required': human_review_required,
                'status': 'CẦN DUYỆT THỦ CÔNG' if human_review_required else 'TỰ ĐỘNG ĐỊNH TUYẾN',
                'status_color': 'red' if human_review_required else 'green',
                'reasons': triage_reasons
            },
            'routing': {
                'industry': industry_info['name'],
                'target_queue': target_queue
            },
            'token_attentions': token_attentions,
            'trace': trace
        }
