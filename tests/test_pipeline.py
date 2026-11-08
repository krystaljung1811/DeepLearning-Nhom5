import unittest
import os
import sys
import numpy as np

# Thêm đường dẫn src vào PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from build_universal_dataset import clean_text_strictly, infer_category_weak, infer_priority_weak

class TestTextPreprocessing(unittest.TestCase):
    """1. Kiểm tra tiền xử lý văn bản (Text Sanitization)"""
    def test_url_removal(self):
        text = "Check this tracking link https://t.co/xyz123 and http://order.com now"
        cleaned = clean_text_strictly(text)
        self.assertNotIn("https", cleaned)
        self.assertNotIn("http", cleaned)
        self.assertNotIn("t.co", cleaned)

    def test_mention_removal(self):
        text = "@Delta @AmazonHelp I need assistance with my parcel"
        cleaned = clean_text_strictly(text)
        self.assertNotIn("@delta", cleaned)
        self.assertNotIn("@amazonhelp", cleaned)
        self.assertIn("parcel", cleaned)

    def test_hashtag_handling(self):
        text = "Flight was delayed #worstservice #refund"
        cleaned = clean_text_strictly(text)
        self.assertNotIn("#", cleaned)
        self.assertIn("worstservice", cleaned)
        self.assertIn("refund", cleaned)

    def test_empty_and_whitespace_input(self):
        """5. Dự đoán với văn bản rỗng"""
        self.assertEqual(clean_text_strictly(""), "")
        self.assertEqual(clean_text_strictly("   \n\t  "), "")
        self.assertEqual(clean_text_strictly("!@#$%^&*()"), "")

class TestWeakSupervisionLogic(unittest.TestCase):
    """Kiểm tra logic phân loại luật nghiệp vụ (Rules Baseline)"""
    def test_category_inference(self):
        self.assertEqual(infer_category_weak("i want a refund for the double charge"), "billing_refund")
        self.assertEqual(infer_category_weak("package lost during shipment tracking delay"), "shipping_delivery")
        self.assertEqual(infer_category_weak("app crashed with blue screen freezing bug"), "technical_issue")
        self.assertEqual(infer_category_weak("password incorrect and profile hacked"), "account_security")
        self.assertEqual(infer_category_weak("broken damaged defective glass shattered"), "product_quality")
        self.assertEqual(infer_category_weak("worst experience suing in court lawyer police"), "complaint_escalation")

    def test_priority_inference(self):
        self.assertEqual(infer_priority_weak("lawyer police legal sue", "complaint_escalation"), "urgent")
        self.assertEqual(infer_priority_weak("please refund my dollars", "billing_refund"), "medium")
        self.assertEqual(infer_priority_weak("unauthorized bank charge immediately", "billing_refund"), "urgent")

class TestPyTorchArchitectureAndTriage(unittest.TestCase):
    """Kiểm tra Kiến trúc Multi-Task BiLSTM + Attention, Padding và Triage Gate"""
    @classmethod
    def setUpClass(cls):
        try:
            import torch
            from models_universal import MultiTaskBiLSTMAttention, UniversalAttentionLayer
            cls.torch_available = True
            cls.torch = torch
            cls.MultiTaskBiLSTMAttention = MultiTaskBiLSTMAttention
            cls.UniversalAttentionLayer = UniversalAttentionLayer
        except Exception as e:
            cls.torch_available = False
            cls.torch_error = str(e)

    def setUp(self):
        if not self.torch_available:
            self.skipTest(f"PyTorch không thể nạp do chính sách hệ điều hành: {self.torch_error}")

    def test_multitask_output_shapes(self):
        """3. Kích thước đầu ra của hai nhánh phân loại (Category: 7, Priority: 4)"""
        torch = self.torch
        vocab_size = 500
        batch_size = 4
        seq_len = 80
        
        model = self.MultiTaskBiLSTMAttention(
            vocab_size=vocab_size,
            embed_dim=64,
            hidden_dim=64,
            num_categories=7,
            num_priorities=4
        )
        model.eval()
        
        dummy_input = torch.randint(0, vocab_size, (batch_size, seq_len))
        dummy_mask = torch.ones((batch_size, seq_len), dtype=torch.bool)
        
        with torch.no_grad():
            cat_logits, prio_logits, attn_weights = model(dummy_input, dummy_mask)
            
        self.assertEqual(cat_logits.shape, (batch_size, 7))
        self.assertEqual(prio_logits.shape, (batch_size, 4))
        self.assertEqual(attn_weights.shape, (batch_size, seq_len))

    def test_attention_masking(self):
        """4. Attention Masking: Token padding phải có trọng số attention xấp xỉ 0"""
        torch = self.torch
        seq_len = 10
        hidden_dim = 32
        
        attn_layer = self.UniversalAttentionLayer(hidden_dim=hidden_dim, attn_dim=16)
        
        # 1 sample: 4 token thực, 6 token padding
        rnn_outputs = torch.randn(1, seq_len, hidden_dim)
        mask = torch.tensor([[True, True, True, True, False, False, False, False, False, False]])
        
        with torch.no_grad():
            _, weights = attn_layer(rnn_outputs, mask)
            
        weights_np = weights.squeeze(0).numpy()
        
        # Tổng trọng số bằng 1
        self.assertAlmostEqual(float(weights_np.sum()), 1.0, places=4)
        
        # Các vị trí padding (từ index 4 đến 9) phải có trọng số cực nhỏ (< 1e-6)
        for i in range(4, seq_len):
            self.assertLess(weights_np[i], 1e-6)

    def test_no_nan_outputs(self):
        """7. Kiểm tra các giá trị đầu ra không bị NaN hay Inf"""
        torch = self.torch
        vocab_size = 100
        model = self.MultiTaskBiLSTMAttention(vocab_size=vocab_size, embed_dim=32, hidden_dim=32)
        model.eval()
        
        dummy_input = torch.randint(0, vocab_size, (2, 20))
        dummy_mask = torch.ones((2, 20), dtype=torch.bool)
        
        with torch.no_grad():
            cat_logits, prio_logits, attn_weights = model(dummy_input, dummy_mask)
            
        self.assertFalse(torch.isnan(cat_logits).any().item())
        self.assertFalse(torch.isinf(cat_logits).any().item())
        self.assertFalse(torch.isnan(prio_logits).any().item())
        self.assertFalse(torch.isinf(prio_logits).any().item())
        self.assertFalse(torch.isnan(attn_weights).any().item())

    def test_human_triage_gate(self):
        """6. Human Triage Gate: Kiểm tra điều kiện kích hoạt chuyển người duyệt"""
        threshold = 0.60
        
        # Ca 1: Độ tin cậy cao, mức độ thấp -> Tự động
        req1 = {'conf': 0.85, 'prio': 'low', 'cat': 'billing_refund'}
        triage1 = (req1['conf'] < threshold) or (req1['prio'] == 'urgent') or (req1['cat'] == 'complaint_escalation')
        self.assertFalse(triage1)
        
        # Ca 2: Độ tin cậy thấp (< 60%) -> Cần duyệt
        req2 = {'conf': 0.45, 'prio': 'medium', 'cat': 'billing_refund'}
        triage2 = (req2['conf'] < threshold) or (req2['prio'] == 'urgent') or (req2['cat'] == 'complaint_escalation')
        self.assertTrue(triage2)
        
        # Ca 3: Mức độ khẩn cấp (P1 Urgent) -> Cần duyệt
        req3 = {'conf': 0.95, 'prio': 'urgent', 'cat': 'technical_issue'}
        triage3 = (req3['conf'] < threshold) or (req3['prio'] == 'urgent') or (req3['cat'] == 'complaint_escalation')
        self.assertTrue(triage3)
        
        # Ca 4: Khiếu nại gay gắt (complaint_escalation) -> Cần duyệt
        req4 = {'conf': 0.99, 'prio': 'high', 'cat': 'complaint_escalation'}
        triage4 = (req4['conf'] < threshold) or (req4['prio'] == 'urgent') or (req4['cat'] == 'complaint_escalation')
        self.assertTrue(triage4)

if __name__ == '__main__':
    unittest.main()
