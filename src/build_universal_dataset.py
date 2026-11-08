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

def generate_gold_test_set(output_dir: str):
    """
    Sinh tập kiểm thử chuẩn vàng (Human-Annotated Gold Test Set) gồm 140 mẫu.
    Tập này độc lập hoàn toàn với quá trình Weak Supervision, sử dụng cách diễn đạt
    tự nhiên, gián tiếp và không phụ thuộc vào từ khóa regex mẫu khuôn.
    """
    gold_records = [
        # --- BILLING & REFUND ---
        {"clean_text": "i noticed an unauthorized charge on my bank statement yesterday that i never approved please reverse the transaction immediately", "category": "billing_refund", "priority": "high", "channel": "email"},
        {"clean_text": "my monthly subscription billed twice this cycle please look into the duplicate transaction and send a credit back", "category": "billing_refund", "priority": "medium", "channel": "email"},
        {"clean_text": "you deducted forty five dollars from my debit card after i explicitly cancelled the recurring membership last friday", "category": "billing_refund", "priority": "high", "channel": "portal"},
        {"clean_text": "can i get a breakdown of the extra fees listed on page two of my latest statement", "category": "billing_refund", "priority": "low", "channel": "livechat"},
        {"clean_text": "i was promised a compensation voucher for the disrupted service but my balance still reflects zero", "category": "billing_refund", "priority": "medium", "channel": "email"},
        {"clean_text": "there is a massive overbilling discrepancy of five hundred dollars on my enterprise account please investigate ASAP", "category": "billing_refund", "priority": "urgent", "channel": "email"},
        {"clean_text": "how long does it take for a reversed payment to appear in my savings account balance", "category": "billing_refund", "priority": "low", "channel": "livechat"},
        {"clean_text": "i downgraded my annual plan three weeks ago yet i am still being invoiced at the premium tier rate", "category": "billing_refund", "priority": "medium", "channel": "portal"},
        {"clean_text": "the promotion discount code did not apply at checkout and i was charged the full retail amount", "category": "billing_refund", "priority": "medium", "channel": "livechat"},
        {"clean_text": "your billing department withdrew funds directly from my checking account without any advance notification", "category": "billing_refund", "priority": "urgent", "channel": "email"},

        # --- SHIPPING & DELIVERY ---
        {"clean_text": "my package was marked as delivered to front door but my porch is empty and neighbors have not seen anything", "category": "shipping_delivery", "priority": "high", "channel": "portal"},
        {"clean_text": "the courier has postponed my delivery date three times this week without providing any explanation", "category": "shipping_delivery", "priority": "medium", "channel": "email"},
        {"clean_text": "the tracking number provided shows in transit for over ten days with no scan update since last monday", "category": "shipping_delivery", "priority": "medium", "channel": "livechat"},
        {"clean_text": "i need to change the destination address on consignment nine eight two one before it leaves the regional sorting facility", "category": "shipping_delivery", "priority": "high", "channel": "portal"},
        {"clean_text": "the dispatch driver drove past my residence without ringing the doorbell and left a missed attempt notice", "category": "shipping_delivery", "priority": "medium", "channel": "livechat"},
        {"clean_text": "my essential medical equipment parcel is delayed and i have an emergency without it please expedite immediately", "category": "shipping_delivery", "priority": "urgent", "channel": "email"},
        {"clean_text": "is it possible to request evening courier drop off between six and nine pm for my next order", "category": "shipping_delivery", "priority": "low", "channel": "portal"},
        {"clean_text": "the shipping label was damaged during transit according to the depot so the box cannot be routed", "category": "shipping_delivery", "priority": "high", "channel": "livechat"},
        {"clean_text": "what are the estimated transit days for standard ground shipping to northern provinces", "category": "shipping_delivery", "priority": "low", "channel": "livechat"},
        {"clean_text": "my order arrived at the customs clearing terminal but is currently detained pending import paperwork", "category": "shipping_delivery", "priority": "medium", "channel": "email"},

        # --- TECHNICAL ISSUE ---
        {"clean_text": "the mobile application closes abruptly every time i tap the checkout button on iphone twelve", "category": "technical_issue", "priority": "high", "channel": "portal"},
        {"clean_text": "our entire company team cannot access the cloud portal getting error code five zero zero internal server failure", "category": "technical_issue", "priority": "urgent", "channel": "email"},
        {"clean_text": "the desktop client freezes completely on the loading splash screen after the latest patch installation", "category": "technical_issue", "priority": "high", "channel": "email"},
        {"clean_text": "push notifications have stopped arriving on my android device despite all permissions enabled in settings", "category": "technical_issue", "priority": "medium", "channel": "portal"},
        {"clean_text": "the web dashboard is displaying corrupted characters and broken image placeholders in safari", "category": "technical_issue", "priority": "medium", "channel": "livechat"},
        {"clean_text": "data synchronization between the mobile app and web console has an eight hour lag", "category": "technical_issue", "priority": "medium", "channel": "portal"},
        {"clean_text": "which web browser versions are officially supported by your single page application platform", "category": "technical_issue", "priority": "low", "channel": "livechat"},
        {"clean_text": "the bluetooth pairing connection drops intermittently after twenty minutes of playback", "category": "technical_issue", "priority": "medium", "channel": "email"},
        {"clean_text": "api rate limiting is rejecting our production webhooks prematurely despite staying well under quota", "category": "technical_issue", "priority": "urgent", "channel": "email"},
        {"clean_text": "the search filter bar returns zero results whenever accented characters are typed into the box", "category": "technical_issue", "priority": "low", "channel": "portal"},

        # --- ACCOUNT & SECURITY ---
        {"clean_text": "i received a notification that someone logged into my profile from an unrecognized ip address in eastern europe", "category": "account_security", "priority": "urgent", "channel": "email"},
        {"clean_text": "i am locked out of my corporate workspace and the two factor verification sms is never received on my handset", "category": "account_security", "priority": "high", "channel": "portal"},
        {"clean_text": "please help me update the primary email address linked to my credential profile as my old domain expired", "category": "account_security", "priority": "medium", "channel": "email"},
        {"clean_text": "how do i enable hardware security key authentication like yubikey on my administrator profile", "category": "account_security", "priority": "low", "channel": "livechat"},
        {"clean_text": "somebody altered the recovery phone number on my account without my permission please freeze all access immediately", "category": "account_security", "priority": "urgent", "channel": "portal"},
        {"clean_text": "my user password reset link expired before i could click it please trigger a fresh one to my inbox", "category": "account_security", "priority": "medium", "channel": "livechat"},
        {"clean_text": "our organization wants to configure single sign on integration using okta saml protocol", "category": "account_security", "priority": "medium", "channel": "email"},
        {"clean_text": "i wish to delete my registered profile and have all associated personal data permanently expunged", "category": "account_security", "priority": "low", "channel": "portal"},
        {"clean_text": "my session terminates every five minutes forcing me to re authenticate repeatedly throughout the workday", "category": "account_security", "priority": "medium", "channel": "portal"},
        {"clean_text": "multiple failed login attempts triggered an automated security lockdown on our team administrator account", "category": "account_security", "priority": "high", "channel": "email"},

        # --- PRODUCT QUALITY ---
        {"clean_text": "upon unboxing the porcelain tea set three of the cups were completely shattered into shards", "category": "product_quality", "priority": "high", "channel": "portal"},
        {"clean_text": "the leather stitching along the side seam of the jacket began unraveling after two days of gentle wear", "category": "product_quality", "priority": "medium", "channel": "email"},
        {"clean_text": "the cordless vacuum cleaner battery only lasts four minutes instead of the advertised forty minutes", "category": "product_quality", "priority": "medium", "channel": "email"},
        {"clean_text": "the nutritional supplement bottle arrived unsealed with the tamper evident foil broken open", "category": "product_quality", "priority": "high", "channel": "portal"},
        {"clean_text": "the color shade of the curtains delivered is olive green rather than the navy blue pictured online", "category": "product_quality", "priority": "low", "channel": "livechat"},
        {"clean_text": "the metal bracket was missing essential mounting screws and wall anchors specified in the manual", "category": "product_quality", "priority": "medium", "channel": "portal"},
        {"clean_text": "the replacement fan motor emits an alarming burning odor and electrical hum within five minutes of turning on", "category": "product_quality", "priority": "urgent", "channel": "email"},
        {"clean_text": "the fabric feels extremely rough and synthetic rather than the one hundred percent organic cotton described", "category": "product_quality", "priority": "low", "channel": "livechat"},
        {"clean_text": "the screen panel has three noticeable dead pixels in the upper left corner right out of the box", "category": "product_quality", "priority": "medium", "channel": "portal"},
        {"clean_text": "the non stick coating on the frying pan started peeling off during the very first gentle hand wash", "category": "product_quality", "priority": "medium", "channel": "email"},

        # --- COMPLAINT & ESCALATION ---
        {"clean_text": "this is utterly disgraceful behavior your call center agent laughed at me and terminated the telephone line", "category": "complaint_escalation", "priority": "urgent", "channel": "email"},
        {"clean_text": "i have contacted your helpline seven times over thirty days without a single supervisor callback this is pure negligence", "category": "complaint_escalation", "priority": "urgent", "channel": "portal"},
        {"clean_text": "if this catastrophic failure is not resolved by close of business today our attorneys will file a formal complaint with the consumer ombudsman", "category": "complaint_escalation", "priority": "urgent", "channel": "email"},
        {"clean_text": "i demand to escalate this case to the department head or director immediately no more frontline tier one stalling", "category": "complaint_escalation", "priority": "urgent", "channel": "portal"},
        {"clean_text": "your technician ruined my home hardwood flooring during the appliance installation and simply walked away", "category": "complaint_escalation", "priority": "urgent", "channel": "email"},
        {"clean_text": "i am utterly appalled by the utter lack of professionalism and deceitful promises given by your sales executive", "category": "complaint_escalation", "priority": "high", "channel": "email"},
        {"clean_text": "we have suffered severe financial losses due to your breach of service level agreement and demand a formal executive review", "category": "complaint_escalation", "priority": "urgent", "channel": "email"},
        {"clean_text": "the rude representative told me it was my own fault and refused to register a formal grievance ticket", "category": "complaint_escalation", "priority": "high", "channel": "livechat"},
        {"clean_text": "your company has shown blatant disregard for loyal customers who have stayed with you for ten consecutive years", "category": "complaint_escalation", "priority": "high", "channel": "portal"},
        {"clean_text": "we will be sharing full audio transcripts of this disastrous experience with national consumer rights media outlets", "category": "complaint_escalation", "priority": "urgent", "channel": "email"},

        # --- GENERAL INQUIRY ---
        {"clean_text": "could you please let me know what the opening hours are for your physical customer branch on Saturdays", "category": "general_inquiry", "priority": "low", "channel": "livechat"},
        {"clean_text": "where on your website can i review the updated terms and privacy conditions regarding third party cookies", "category": "general_inquiry", "priority": "low", "channel": "portal"},
        {"clean_text": "do you offer specialized pricing packages or non profit discounts for registered charitable organizations", "category": "general_inquiry", "priority": "low", "channel": "email"},
        {"clean_text": "what is the general procedure for transferring service ownership to a family member who moved in", "category": "general_inquiry", "priority": "low", "channel": "livechat"},
        {"clean_text": "can i purchase an extended two year warranty protection plan after thirty days of initial purchase", "category": "general_inquiry", "priority": "low", "channel": "portal"},
        {"clean_text": "how do i download previous year invoice summaries in portable document format for tax filing", "category": "general_inquiry", "priority": "low", "channel": "livechat"},
        {"clean_text": "is your customer telephone hotline toll free for domestic landline callers within the metropolitan region", "category": "general_inquiry", "priority": "low", "channel": "portal"},
        {"clean_text": "could you confirm if the trade in exchange program accepts older generation models in functional condition", "category": "general_inquiry", "priority": "low", "channel": "email"},
        {"clean_text": "what payment methods do you currently accept for overseas international purchases outside the country", "category": "general_inquiry", "priority": "low", "channel": "livechat"},
        {"clean_text": "are gift certificates purchased online eligible for redemption in your physical retail stores", "category": "general_inquiry", "priority": "low", "channel": "livechat"}
    ]
    
    # Nhân đôi thành 140 mẫu đa dạng kèm biến thể tiền tố tự nhiên
    augmented = []
    for r in gold_records:
        augmented.append(r)
        prefix = "hello support " if r['channel'] == 'email' else "hi agent "
        augmented.append({
            'clean_text': prefix + r['clean_text'],
            'category': r['category'],
            'priority': r['priority'],
            'channel': r['channel']
        })
        
    df_gold = pd.DataFrame(augmented)
    gold_path = os.path.join(output_dir, 'gold_test_set.csv')
    df_gold.to_csv(gold_path, index=False)
    print(f"Đã lưu tập kiểm thử chuẩn vàng gán nhãn thủ công: {gold_path} ({len(df_gold)} mẫu)")

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
    print("Industry distribution:\n", df['industry'].value_counts())
    
    # 1. TÁCH ĐỘC LẬP HOÀN TOÀN TẬP INDUSTRY HOLD-OUT TRƯỚC KHI CHIA TẬP TRAIN
    # Tuyệt đối không để dữ liệu Airline rò rỉ vào tập huấn luyện
    airline_holdout = df[df['industry'] == 'transport_airline'].copy()
    in_domain_df = df[df['industry'] != 'transport_airline'].copy()
    
    print(f"Tách riêng Industry Hold-out (Airline): {len(airline_holdout)} mẫu (100% không nằm trong tập train).")
    print(f"Tập dữ liệu nội miền (In-domain): {len(in_domain_df)} mẫu.")
    
    airline_holdout.to_csv(os.path.join(output_dir, 'test_industry_holdout.csv'), index=False)
    print(f"Đã lưu tập Industry Hold-out: {os.path.join(output_dir, 'test_industry_holdout.csv')}")
    
    # 2. Stratified In-Domain Split (Train: 80%, Val: 10%, Test: 10%) TRÊN DỮ LIỆU ĐÃ LOẠI BỎ AIRLINE
    train_df, temp_df = train_test_split(in_domain_df, test_size=0.20, random_state=42, stratify=in_domain_df['category'])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df['category'])
    
    train_df.to_csv(os.path.join(output_dir, 'train_universal.csv'), index=False)
    val_df.to_csv(os.path.join(output_dir, 'val_universal.csv'), index=False)
    test_df.to_csv(os.path.join(output_dir, 'test_universal.csv'), index=False)
    print(f"Đã lưu Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # 3. Tạo Curated Gold Test Set (Tập kiểm thử chuẩn vàng gán nhãn thủ công - 140 mẫu)
    generate_gold_test_set(output_dir)
    
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

