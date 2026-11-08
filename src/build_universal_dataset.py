import os
import re
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from collections import Counter

# 1. BỘ NHÃN PHỔ QUÁT (UNIVERSAL LABELS)
CATEGORIES = [
    'billing_refund',       # Thanh toán, hoàn tiền, cước phí
    'shipping_delivery',    # Giao hàng, bưu kiện, tài xế, thất lạc
    'technical_issue',      # Lỗi kỹ thuật, phần mềm, kết nối, ứng dụng
    'account_security',     # Tài khoản, đăng nhập, bảo mật, mật khẩu
    'product_quality',      # Chất lượng sản phẩm, hàng hỏng, lỗi vật lý
    'complaint_escalation', # Khiếu nại gay gắt, đe dọa pháp lý, trải nghiệm tồi tệ
    'general_inquiry'       # Thắc mắc chung, chính sách, hướng dẫn
]

PRIORITIES = ['low', 'medium', 'high', 'urgent']

# 2. BỘ LUẬT TỪ KHÓA GIÁM SÁT YẾU (WEAK SUPERVISION RULES)
KEYWORDS = {
    'complaint_escalation': [
        r'\blawyer\b', r'\blawsuit\b', r'\bpolice\b', r'\bscam\b', r'\bfraud\b',
        r'\bunacceptable\b', r'\bdisgusted\b', r'\bfurious\b', r'\bhorrible service\b',
        r'\bworst customer service\b', r'\bmanager\b', r'\bsupervisor\b', r'\bsteal\b',
        r'\bstolen\b', r'\bpathetic\b', r'\bridiculous\b', r'\bnever again\b', r'\bsue\b'
    ],
    'billing_refund': [
        r'\brefund\b', r'\bcharge\b', r'\bcharged\b', r'\bovercharged\b', r'\bbill\b',
        r'\bbilling\b', r'\bpayment\b', r'\bcredit card\b', r'\bdebit\b', r'\binvoice\b',
        r'\bmoney back\b', r'\bfee\b', r'\bpricing\b', r'\btransaction\b', r'\bcost\b',
        r'\bsubscription fee\b', r'\bdeducted\b', r'\bdouble charged\b'
    ],
    'shipping_delivery': [
        r'\bdelivery\b', r'\bdelivered\b', r'\bshipping\b', r'\bshipment\b', r'\bpackage\b',
        r'\bparcel\b', r'\border tracking\b', r'\bcourier\b', r'\btracking number\b',
        r'\bmailbox\b', r'\bflight\b', r'\bdelayed\b', r'\bbaggage\b', r'\bluggage\b',
        r'\bdriver\b', r'\bpickup\b', r'\bcancelled ride\b', r'\bdispatch\b', r'\bwhere is my\b'
    ],
    'technical_issue': [
        r'\bcrash\b', r'\bcrashes\b', r'\bcrashing\b', r'\bfreeze\b', r'\bfreezing\b',
        r'\bbug\b', r'\bglitch\b', r'\berror code\b', r'\bnetwork\b', r'\boffline\b',
        r'\bconnection\b', r'\bdisconnect\b', r'\bwifi\b', r'\bios update\b', r'\bapp update\b',
        r'\bbattery\b', r'\bscreen\b', r'\baudio\b', r'\bplayback\b', r'\bslow\b', r'\bserver\b',
        r'\bnot working\b', r'\bstreaming\b', r'\bsignal\b', r'\bsim card\b', r'\bcontroller\b'
    ],
    'account_security': [
        r'\bpassword\b', r'\breset password\b', r'\blogin\b', r'\blog in\b', r'\blogged out\b',
        r'\baccount\b', r'\blocked account\b', r'\bhacked\b', r'\bverify\b', r'\bverification\b',
        r'\bcode\b', r'\botp\b', r'\b2fa\b', r'\bcredentials\b', r'\bsign in\b', r'\bprofile\b',
        r'\bunauthorized\b', r'\bsecurity alert\b'
    ],
    'product_quality': [
        r'\bbroken\b', r'\bdamaged\b', r'\bdefective\b', r'\bpoor quality\b', r'\bexpired\b',
        r'\bspoiled\b', r'\brotten\b', r'\btorn\b', r'\bhardware fault\b', r'\bscratched\b',
        r'\bfaulty\b', r'\btastes bad\b', r'\bmissing parts\b'
    ],
    'general_inquiry': [
        r'\bhow to\b', r'\bwhere can i\b', r'\bis it possible\b', r'\bhow do i\b',
        r'\bworking hours\b', r'\bopening hours\b', r'\bpolicy\b', r'\binformation\b',
        r'\bcan you tell me\b', r'\bstore location\b', r'\bquestion\b', r'\bguidance\b'
    ]
}

def clean_text_strictly(text: str) -> str:
    """Loại bỏ hoàn toàn các dấu vết đặc thù của Twitter để mô hình tổng quát hóa tốt sang Email, Web Chat."""
    if not isinstance(text, str):
        return ""
    # 1. Bỏ URL rút gọn hoặc đầy đủ
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    # 2. Bỏ @mentions hoàn toàn (tránh lộ tên hãng)
    text = re.sub(r'@[A-Za-z0-9_]+', ' ', text)
    # 3. Bỏ RT (Retweet header)
    text = re.sub(r'\bRT\b', ' ', text)
    # 4. Giữ lại chữ từ hashtag (bỏ dấu #)
    text = re.sub(r'#([A-Za-z0-9_]+)', r'\1', text)
    # 5. Xóa ký tự rác và số rời rạc, chuẩn hóa chữ thường
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

def infer_category_weak(text: str):
    """Gán nhãn loại vấn đề dựa trên bộ luật giám sát yếu có thứ tự ưu tiên."""
    # 1. Khiếu nại gay gắt được ưu tiên bắt đầu tiên
    for pattern in KEYWORDS['complaint_escalation']:
        if re.search(pattern, text):
            return 'complaint_escalation'
            
    # Đếm số điểm cho các nhãn còn lại
    scores = {}
    for cat in ['billing_refund', 'shipping_delivery', 'technical_issue', 'account_security', 'product_quality', 'general_inquiry']:
        score = sum(1 for p in KEYWORDS[cat] if re.search(p, text))
        if score > 0:
            scores[cat] = score
            
    if scores:
        return max(scores.items(), key=lambda x: x[1])[0]
        
    return 'general_inquiry'

def infer_priority_weak(text: str, category: str):
    """Gán nhãn mức ưu tiên: urgent, high, medium, low."""
    if category == 'complaint_escalation':
        return 'urgent'
        
    urgent_patterns = [r'\burgent\b', r'\basap\b', r'\bimmediately\b', r'\bpolice\b', r'\blawyer\b', r'\bstranded\b', r'\bemergency\b']
    if any(re.search(p, text) for p in urgent_patterns):
        return 'urgent'
        
    if category in ['billing_refund', 'account_security']:
        high_patterns = [r'\bovercharged\b', r'\bdouble charged\b', r'\bhacked\b', r'\bunauthorized\b', r'\blost luggage\b', r'\bmissed flight\b']
        if any(re.search(p, text) for p in high_patterns):
            return 'high'
        return 'medium'
        
    if category in ['shipping_delivery', 'technical_issue']:
        if any(re.search(p, text) for p in [r'\bcancelled\b', r'\bnot working\b', r'\bbroken\b', r'\bcrash\b']):
            return 'high'
        return 'medium'
        
    if category == 'product_quality':
        return 'medium'
        
    return 'low'

def map_industry(raw_text: str):
    """Phân nhóm ngành dựa trên brand handles và từ khóa trong tweet/ticket."""
    t = str(raw_text).lower()
    if any(k in t for k in ['delta', 'americanair', 'british_airways', 'southwestair', 'virgintrains', 'virginatlantic']):
        return 'transport_airline'
    if any(k in t for k in ['uber']):
        return 'ride_hailing'
    if any(k in t for k in ['amazon', 'tesco', 'sainsburys', 'chipotle', 'marksandspencer', 'walmart']):
        return 'ecommerce_retail'
    if any(k in t for k in ['apple', 'xbox', 'spotify', 'hulu']):
        return 'tech_entertainment'
    if any(k in t for k in ['tmobile', 'verizon', 'sprint', 'o2', 'idea_cares']):
        return 'telecom'
    return 'other'

def build_universal_dataset(raw_csv_path: str, output_dir: str, target_samples: int = 28000):
    os.makedirs(output_dir, exist_ok=True)
    print(f"Reading raw dataset from: {raw_csv_path}")
    
    samples_per_cat = target_samples // len(CATEGORIES)
    collected = {cat: [] for cat in CATEGORIES}
    
    chunksize = 100000
    for chunk in pd.read_csv(raw_csv_path, chunksize=chunksize, low_memory=False):
        inbounds = chunk[chunk['inbound'] == True]
        
        for _, row in inbounds.iterrows():
            raw_text = str(row['text'])
            clean_text = clean_text_strictly(raw_text)
            
            # Bỏ các câu quá ngắn
            if len(clean_text.split()) < 4:
                continue
                
            cat = infer_category_weak(clean_text)
            if len(collected[cat]) < samples_per_cat:
                priority = infer_priority_weak(clean_text, cat)
                industry = map_industry(raw_text)
                
                collected[cat].append({
                    'tweet_id': row['tweet_id'],
                    'clean_text': clean_text,
                    'raw_text': raw_text,
                    'category': cat,
                    'priority': priority,
                    'industry': industry,
                    'created_at': row.get('created_at', '')
                })
                
        total_curr = sum(len(v) for v in collected.values())
        print(f"Collected: {total_curr}/{target_samples} samples across universal categories...")
        if all(len(v) >= samples_per_cat for v in collected.values()):
            break
            
    all_data = []
    for cat, rows in collected.items():
        all_data.extend(rows)
        print(f"  Category '{cat}': {len(rows)} samples")
        
    df = pd.DataFrame(all_data)
    print(f"Total universal dataset size: {len(df)} samples.")
    print("Priority distribution:\n", df['priority'].value_counts())
    
    # 1. Stratified In-Domain Split (Train: 80%, Val: 10%, Test: 10%)
    train_df, temp_df = train_test_split(df, test_size=0.20, random_state=42, stratify=df['category'])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df['category'])
    
    train_df.to_csv(os.path.join(output_dir, 'train_universal.csv'), index=False)
    val_df.to_csv(os.path.join(output_dir, 'val_universal.csv'), index=False)
    test_df.to_csv(os.path.join(output_dir, 'test_universal.csv'), index=False)
    
    # 2. Industry Hold-out Test Set (Thử nghiệm khả năng tổng quát sang tổ chức/ngành mới)
    # Giữ ra toàn bộ ngành 'transport_airline' làm tập kiểm thử chưa từng thấy trong huấn luyện
    airline_holdout = df[df['industry'] == 'transport_airline'].copy()
    if len(airline_holdout) > 300:
        airline_holdout.head(1000).to_csv(os.path.join(output_dir, 'test_industry_holdout.csv'), index=False)
        print(f"Saved {min(len(airline_holdout), 1000)} samples for Industry Hold-out test.")
    
    # 3. External Multi-Channel Synthetic Test Set (Mô phỏng Email dài và Live Chat ngoài Twitter)
    external_samples = [
        # Long Email - Billing
        {"clean_text": "dear support team i am writing this email regarding an unauthorized transaction on my account yesterday morning i noticed a charge of ninety nine dollars for a renewal fee that i explicitly cancelled last week please issue a full refund immediately to my credit card as this is unacceptable", "category": "billing_refund", "priority": "high", "channel": "email"},
        # Long Email - Shipping
        {"clean_text": "hello customer care department my shipment order number four eight nine zero has been delayed for five days the tracking link has not been updated since wednesday i urgently need this package delivered before my travel trip tomorrow morning please advise on the courier status", "category": "shipping_delivery", "priority": "high", "channel": "email"},
        # Long Email - Technical
        {"clean_text": "good afternoon our enterprise team has encountered a continuous software application crash after installing the version two update the system freezes on the main dashboard screen and disconnects all active sessions please escalate this bug to your technical engineering team", "category": "technical_issue", "priority": "high", "channel": "email"},
        # Live Chat - Security
        {"clean_text": "hi i cannot log in to my account it says password incorrect even though i reset it ten minutes ago please unlock my profile", "category": "account_security", "priority": "medium", "channel": "livechat"},
        # Live Chat - Complaint
        {"clean_text": "this is the worst customer service experience i have ever had your staff refused to assist and hung up on me i want to speak with a supervisor right now or i will file a lawsuit and police report for fraud", "category": "complaint_escalation", "priority": "urgent", "channel": "livechat"},
        # Live Chat - Inquiry
        {"clean_text": "can you tell me what the return policy is for products bought during promotional sales thanks", "category": "general_inquiry", "priority": "low", "channel": "livechat"},
        # Email - Product Quality
        {"clean_text": "i received the parcel today but upon opening the box the glass bottle was completely broken and damaged liquid leaked all over the package unusable defective condition please replace", "category": "product_quality", "priority": "medium", "channel": "email"}
    ]
    pd.DataFrame(external_samples).to_csv(os.path.join(output_dir, 'test_cross_channel.csv'), index=False)
    
    # 4. Build Universal Vocabulary
    word_counter = Counter()
    for text in train_df['clean_text']:
        word_counter.update(text.split())
        
    vocab = {'<pad>': 0, '<unk>': 1}
    for idx, (word, count) in enumerate(word_counter.most_common(12000), start=2):
        if count >= 2:
            vocab[word] = idx
            
    with open(os.path.join(output_dir, 'vocab_universal.json'), 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)
        
    # 5. Label Encoders
    cat2id = {c: i for i, c in enumerate(CATEGORIES)}
    id2cat = {i: c for i, c in enumerate(CATEGORIES)}
    prio2id = {p: i for i, p in enumerate(PRIORITIES)}
    id2prio = {i: p for i, p in enumerate(PRIORITIES)}
    
    label_meta = {
        'categories': {'label2id': cat2id, 'id2label': id2cat},
        'priorities': {'label2id': prio2id, 'id2label': id2prio}
    }
    with open(os.path.join(output_dir, 'labels_universal.json'), 'w', encoding='utf-8') as f:
        json.dump(label_meta, f, ensure_ascii=False, indent=2)
        
    print(f"Universal dataset creation completed in {output_dir}!")

if __name__ == '__main__':
    raw_path = os.path.join('archive', 'twcs', 'twcs.csv')
    if not os.path.exists(raw_path):
        raw_path = os.path.join('archive', 'sample.csv')
    build_universal_dataset(raw_path, 'data', target_samples=21000)

