import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
from predict_universal import UniversalRouter, CATEGORY_INFO, PRIORITY_INFO, INDUSTRY_QUEUE_MAPPINGS

app = FastAPI(title="AutoDesk Enterprise Helpdesk Workspace")

router = None

def get_router():
    global router
    if router is None:
        model_path = 'models/best_universal_bilstm_attention.pt'
        if not os.path.exists(model_path):
            model_path = 'models/best_bilstm_attention.pt'
        router = UniversalRouter(model_path=model_path, data_dir='data')
    return router

class TicketRequest(BaseModel):
    text: str
    industry: str = 'ecommerce'
    confidence_threshold: float = 0.60
    channel: str = 'email'

@app.post("/api/route")
async def api_route_ticket(req: TicketRequest):
    r = get_router()
    result = r.route_ticket(
        raw_text=req.text,
        confidence_threshold=req.confidence_threshold,
        selected_industry=req.industry
    )
    result['channel'] = req.channel
    return JSONResponse(result)

@app.get("/", response_class=HTMLResponse)
async def index():
    html_content = """<!DOCTYPE html>
<html lang="vi" class="h-full bg-slate-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoDesk AI • Hệ Thống Định Tuyến CSKH Đa Kênh Thông Minh</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        code, .font-mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* Hiệu ứng highlighter màu vàng cam tự nhiên như Notion AI / Zendesk */
        .attn-highlighter {
            background-color: #fef08a;
            color: #854d0e;
            font-weight: 700;
            padding: 2px 5px;
            border-radius: 4px;
            border-bottom: 2px solid #eab308;
            cursor: help;
            transition: all 0.15s ease-in-out;
            display: inline-block;
            margin: 1px 1px;
        }
        .attn-highlighter:hover {
            background-color: #fde047;
            color: #713f12;
            transform: translateY(-1px);
        }
        .attn-normal {
            color: #334155;
            display: inline-block;
            margin: 1px 1px;
        }

        .tab-btn.active {
            color: #1d4ed8;
            border-bottom: 2px solid #2563eb;
            font-weight: 700;
        }
        .tab-btn:not(.active) {
            color: #64748b;
            border-bottom: 2px solid transparent;
        }
        .tab-btn:not(.active):hover {
            color: #0f172a;
        }
    </style>
</head>
<body class="min-h-full flex flex-col text-slate-800 antialiased selection:bg-blue-500 selection:text-white">

    <!-- 1. TOP NAVIGATION BAR (RỘNG RÃI, CHUẨN ZENDESK / LINEAR) -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                
                <!-- Brand & Logo -->
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                        🛡️
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-base tracking-tight text-slate-900">AutoDesk AI</span>
                            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                BiLSTM + Attention
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 hidden sm:block">Hệ Thống Phân Loại & Định Tuyến Yêu Cầu CSKH Đa Kênh Tự Động</p>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <nav class="flex items-center gap-1 sm:gap-6 text-xs sm:text-sm font-semibold h-full">
                    <button onclick="switchTab('workbench')" id="tab-btn-workbench" class="tab-btn active h-full flex items-center gap-1.5 px-2 cursor-pointer transition">
                        <span>⚡</span> <span>Bàn Làm Việc Định Tuyến</span>
                    </button>
                    <button onclick="switchTab('benchmark')" id="tab-btn-benchmark" class="tab-btn h-full flex items-center gap-1.5 px-2 cursor-pointer transition">
                        <span>📊</span> <span>Hiệu Năng & Thực Nghiệm</span>
                    </button>
                    <button onclick="switchTab('theory')" id="tab-btn-theory" class="tab-btn h-full flex items-center gap-1.5 px-2 cursor-pointer transition">
                        <span>📖</span> <span>Nguyên Tắc Thiết Kế</span>
                    </button>
                </nav>

                <!-- Industry Selector & Agent Profile -->
                <div class="flex items-center gap-3">
                    <div class="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span class="text-xs font-bold text-slate-500">Ngành:</span>
                        <select id="industrySelect" onchange="runTicketAnalysis()" class="bg-white text-xs font-bold text-slate-800 py-1 px-2.5 rounded-lg border border-slate-200 shadow-2xs focus:ring-1 focus:ring-blue-500 cursor-pointer">
                            <option value="ecommerce" selected>🏬 E-Commerce / Bán lẻ</option>
                            <option value="fintech">🏦 Ngân hàng & Fintech</option>
                            <option value="saas">💻 Phần mềm & SaaS</option>
                        </select>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs border border-blue-200">
                        NV
                    </div>
                </div>

            </div>
        </div>
    </header>

    <!-- 2. MAIN CONTAINER -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <!-- TAB 1: WORKBENCH (BÀN LÀM VIỆC ĐỊNH TUYẾN 2 CỘT CỰC KỲ RỘNG RÃI, THOÁNG ĐÃNG) -->
        <div id="view-workbench" class="space-y-6">

            <!-- Banner tóm tắt bài toán -->
            <div class="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1.5 max-w-3xl">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold">
                            Universal Routing Engine
                        </span>
                        <span class="text-xs text-blue-200">• Không phụ thuộc Twitter • Áp dụng mọi kênh</span>
                    </div>
                    <h2 class="text-lg sm:text-xl font-extrabold tracking-tight">
                        Tự động dự đoán Loại Vấn Đề, Mức Ưu Tiên & Điều Phối Hàng Đợi
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Mô hình áp dụng mạng BiLSTM kết hợp cơ chế Bahdanau Attention để bóc tách từ khóa mấu chốt, tự động định tuyến các yêu cầu an toàn và chuyển yêu cầu rủi ro cho người duyệt (Safety Triage Gate).
                    </p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <div class="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                        <span class="text-[11px] text-blue-200 block font-medium">Độ chính xác Test</span>
                        <span class="text-xl font-extrabold text-emerald-400">99.38%</span>
                    </div>
                    <div class="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                        <span class="text-[11px] text-blue-200 block font-medium">Top-3 Acc</span>
                        <span class="text-xl font-extrabold text-blue-300">99.95%</span>
                    </div>
                </div>
            </div>

            <!-- 2-COLUMN BALANCED WORKSPACE -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                <!-- CỘT TRÁI (5 CỘT TRÊN 12 - INPUT & TEST CONTROLS) -->
                <div class="lg:col-span-5 space-y-5">
                    
                    <!-- Card 1: Chọn Nhanh Kịch Bản Mẫu -->
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⚡</span> Chọn Nhanh Kịch Bản Thử Nghiệm:
                            </span>
                            <span class="text-[11px] text-slate-400 font-medium">6 tình huống phổ biến</span>
                        </div>

                        <!-- 6 Quick-Pick Buttons -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="sampleButtonsContainer">
                            <!-- Injected via JavaScript -->
                        </div>
                    </div>

                    <!-- Card 2: Khung Nhập Liệu Yêu Cầu Hỗ Trợ Khách Hàng -->
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                        
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>📝</span> Nội Dung Yêu Cầu Cần Phân Tích:
                            </span>
                            <button onclick="clearInputText()" class="text-xs text-slate-400 hover:text-slate-600 transition font-medium cursor-pointer">
                                Xóa trắng
                            </button>
                        </div>

                        <!-- Kênh tiếp nhận (Channel Selection) -->
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-600 block">Kênh tiếp nhận (Channel):</label>
                            <div class="grid grid-cols-3 gap-2">
                                <button type="button" onclick="setChannel('email')" id="btn-chan-email" class="channel-btn py-2 px-3 text-xs font-bold rounded-xl border border-blue-600 bg-blue-50 text-blue-700 flex items-center justify-center gap-1.5 transition">
                                    <span>✉️</span> <span>Email</span>
                                </button>
                                <button type="button" onclick="setChannel('livechat')" id="btn-chan-livechat" class="channel-btn py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition">
                                    <span>💬</span> <span>Live Chat</span>
                                </button>
                                <button type="button" onclick="setChannel('web')" id="btn-chan-web" class="channel-btn py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition">
                                    <span>🎫</span> <span>Web Ticket</span>
                                </button>
                            </div>
                        </div>

                        <!-- Textarea -->
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-slate-600 block">Nội dung văn bản (Tin nhắn / Thư điện tử):</label>
                            <textarea id="inputText" rows="6" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition leading-relaxed" placeholder="Dán nội dung tin nhắn của khách hàng vào đây (tiếng Anh hoặc đoạn văn bản mẫu)..."></textarea>
                        </div>

                        <!-- Thiết lập Ngưỡng Tự Động Hóa (Confidence Threshold) -->
                        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-700">Ngưỡng Tự Động Hóa (Threshold):</span>
                                <span id="thresholdValDisplay" class="font-mono font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">60%</span>
                            </div>
                            <input type="range" id="thresholdRange" min="40" max="95" value="60" oninput="onThresholdChange(this.value)" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
                            <p class="text-[11px] text-slate-500 leading-normal">
                                Nếu độ tin cậy mô hình &lt; ngưỡng này, hoặc độ ưu tiên là P1 (Khẩn cấp), hệ thống tự kích hoạt chế độ <strong class="text-rose-600">Chuyển Người Duyệt</strong>.
                            </p>
                        </div>

                        <!-- Nút kích hoạt phân loại -->
                        <button onclick="runTicketAnalysis()" id="analyzeBtn" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
                            <span>⚡</span> <span>PHÂN LOẠI & ĐỊNH TUYẾN NGAY</span>
                        </button>

                    </div>

                </div>

                <!-- CỘT PHẢI (7 CỘT TRÊN 12 - KẾT QUẢ AI & ĐIỀU PHỐI HÀNG ĐỢI RỘNG RÃI) -->
                <div class="lg:col-span-7 space-y-5">
                    
                    <!-- Card 1: 4 Khối Quyết Định Định Tuyến Chính (Grid 2x2 Cực Kỳ Thoáng Đãng) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <!-- 1. Loại Vấn Đề (Universal Category) -->
                        <div class="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">1. Loại Vấn Đề (Universal Category)</span>
                                <span id="resCatConf" class="text-xs font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    99.9%
                                </span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span id="resCatIcon" class="text-3xl shrink-0">💳</span>
                                <div class="min-w-0">
                                    <h3 id="resCatName" class="text-sm sm:text-base font-extrabold text-slate-900 truncate">Thanh toán & Hoàn tiền</h3>
                                    <p id="resCatDesc" class="text-[11px] text-slate-500 line-clamp-2">Giao dịch sai, trừ tiền nhầm, hoàn tiền hóa đơn...</p>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Mức Ưu Tiên & Cam Kết SLA -->
                        <div class="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">2. Mức Độ Ưu Tiên & SLA</span>
                                <span id="resPrioSla" class="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    SLA: 4 giờ
                                </span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span id="resPrioBadge" class="text-3xl shrink-0">🟡</span>
                                <div>
                                    <h3 id="resPrioName" class="text-sm sm:text-base font-extrabold text-slate-900">Trung bình (P3)</h3>
                                    <p id="resPrioConf" class="text-[11px] text-slate-500">Độ tin cậy ưu tiên: 96.9%</p>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Hàng Đợi Nội Bộ Phụ Trách -->
                        <div class="bg-white rounded-2xl p-4.5 border border-blue-200 bg-blue-50/40 shadow-2xs space-y-2">
                            <span class="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">3. Hàng Đợi Nội Bộ Tiếp Nhận</span>
                            <div class="flex items-start gap-2.5">
                                <span class="text-2xl shrink-0">🏢</span>
                                <div>
                                    <h3 id="resQueueName" class="text-sm sm:text-base font-extrabold text-blue-950">Phòng Kế toán & Đối soát Hoàn tiền</h3>
                                    <p id="resQueueDesc" class="text-[11px] text-blue-700">Tự động ánh xạ theo tổ chức: E-Commerce / Bán lẻ</p>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Cổng Kiểm Soát Triage Gate -->
                        <div id="resTriageCard" class="bg-white rounded-2xl p-4.5 border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">4. Cổng Kiểm Soát An Toàn (Triage)</span>
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            </div>
                            <div class="flex items-start gap-2.5">
                                <span id="resTriageIcon" class="text-2xl shrink-0">✅</span>
                                <div>
                                    <h3 id="resTriageTitle" class="text-sm sm:text-base font-extrabold text-emerald-950">TỰ ĐỘNG ĐỊNH TUYẾN</h3>
                                    <p id="resTriageDetail" class="text-[11px] text-emerald-800">Đạt chuẩn an toàn tự động hóa. Đã chuyển thẳng đến hàng đợi chuyên môn.</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Card 2: Cơ Chế Attention Giải Thích (Self-Attention Token Heatmap) -->
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div class="space-y-0.5">
                                <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🔍</span> Cơ Chế Attention Giải Thích (Self-Attention Heatmap):
                                </h3>
                                <p class="text-[11px] text-slate-500">Các từ khóa mang trọng số chú ý cao nhất chi phối quyết định của mô hình BiLSTM</p>
                            </div>
                            
                            <!-- Toggle switch -->
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-medium text-slate-600">Bật Highlight:</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="attentionHighlightToggle" checked onchange="onToggleHighlight()" class="sr-only peer">
                                    <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        <!-- Top Attention Token Chips -->
                        <div class="flex flex-wrap items-center gap-1.5 pt-1" id="topAttentionChips">
                            <!-- Injected via JS -->
                        </div>

                        <!-- Rendered Text Box with Highlighter -->
                        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed min-h-[90px]" id="attentionTextBox">
                            <!-- Injected via JS -->
                        </div>

                        <div class="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                            <span class="inline-block px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 border-b-2 border-yellow-500 font-bold text-[10px]">từ khóa</span>
                            <span>Màu vàng sáng thể hiện các từ khóa mang trọng số chú ý cao nhất được cơ chế Bahdanau Attention soi sáng.</span>
                        </div>
                    </div>

                    <!-- Card 3: Phân Phối Xác Suất Đầy Đủ Của 7 Loại Vấn Đề (100% TIẾNG VIỆT) -->
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>📊</span> Phân Phối Xác Suất 7 Loại Vấn Đề Phổ Quát (Tiếng Việt):
                            </h3>
                            <span class="text-[11px] text-slate-400">Đã sắp xếp theo xác suất giảm dần</span>
                        </div>

                        <div id="fullProbDistribution" class="space-y-2.5 pt-1">
                            <!-- Injected via JS -->
                        </div>
                    </div>

                    <!-- Card 4: Gợi Ý Trả Lời Nhanh AI Copilot -->
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                                <span>🤖</span> <span>Gợi Ý Trả Lời Nhanh Từ AI Copilot</span>
                            </div>
                            <button onclick="copySuggestedReply()" class="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1">
                                <span>📋</span> <span>Sao chép mẫu</span>
                            </button>
                        </div>
                        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic" id="suggestedReplyContent">
                            Đang chuẩn bị câu trả lời mẫu...
                        </div>
                    </div>

                </div>

            </div>

        </div>

        <!-- TAB 2: BENCHMARK & METRICS (BÁO CÁO ĐÁNH GIÁ CHÍNH XÁC & CÔNG BẰNG) -->
        <div id="view-benchmark" class="hidden space-y-6">
            
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
                
                <div>
                    <h2 class="text-lg font-extrabold text-slate-900">Kết Quả Thực Nghiệm & So Sánh Mô Hình Độc Lập</h2>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">
                        Đánh giá trên tập kiểm thử độc lập gồm 2,100 mẫu dữ liệu chuẩn hóa, đo lường toàn diện qua Macro-F1, Top-3 Accuracy và Khả năng tổng quát hóa sang ngành mới.
                    </p>
                </div>

                <!-- 4 KPI Metrics -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
                        <span class="text-xs font-bold text-blue-700 block mb-1">Macro-F1 (Loại Vấn Đề)</span>
                        <span class="text-2xl font-black text-blue-950">99.38%</span>
                        <span class="text-[10px] text-blue-600 font-semibold block mt-1">+6.67% so với TF-IDF</span>
                    </div>
                    <div class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                        <span class="text-xs font-bold text-emerald-700 block mb-1">Top-3 Accuracy</span>
                        <span class="text-2xl font-black text-emerald-950">99.95%</span>
                        <span class="text-[10px] text-emerald-600 font-semibold block mt-1">Gần như tuyệt đối</span>
                    </div>
                    <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
                        <span class="text-xs font-bold text-purple-700 block mb-1">Giữ ra theo ngành (Hold-out)</span>
                        <span class="text-2xl font-black text-purple-950">91.43%</span>
                        <span class="text-[10px] text-purple-600 font-semibold block mt-1">Ngành vận tải chưa từng thấy</span>
                    </div>
                    <div class="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                        <span class="text-xs font-bold text-amber-700 block mb-1">Độ chính xác tự động (70% Cov.)</span>
                        <span class="text-2xl font-black text-amber-950">100.0%</span>
                        <span class="text-[10px] text-amber-600 font-semibold block mt-1">0% sai sót khi tự động duyệt</span>
                    </div>
                </div>

                <!-- Comparison Table -->
                <div class="space-y-3">
                    <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                        Bảng Đối Sánh Các Kiến Trúc Mô Hình (Benchmark Comparison)
                    </h3>
                    <div class="overflow-x-auto border border-slate-200 rounded-xl">
                        <table class="w-full text-left text-xs divide-y divide-slate-200">
                            <thead class="bg-slate-50 text-slate-700 font-extrabold uppercase text-[11px]">
                                <tr>
                                    <th class="py-3 px-4">Kiến Trúc Mô Hình</th>
                                    <th class="py-3 px-4">Độ chính xác (Accuracy)</th>
                                    <th class="py-3 px-4">Macro-F1 (Category)</th>
                                    <th class="py-3 px-4">Phân loại Mức Ưu Tiên</th>
                                    <th class="py-3 px-4">Khả năng giải thích</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr class="hover:bg-slate-50">
                                    <td class="py-3 px-4 font-bold text-slate-800">1. TF-IDF + Logistic Regression (Baseline)</td>
                                    <td class="py-3 px-4">92.71%</td>
                                    <td class="py-3 px-4">92.71%</td>
                                    <td class="py-3 px-4 text-slate-400">Không hỗ trợ đa nhiệm</td>
                                    <td class="py-3 px-4 text-slate-500">Trọng số tuyến tính</td>
                                </tr>
                                <tr class="hover:bg-slate-50">
                                    <td class="py-3 px-4 font-bold text-slate-800">2. Multi-Task Baseline LSTM</td>
                                    <td class="py-3 px-4">97.48%</td>
                                    <td class="py-3 px-4">97.49%</td>
                                    <td class="py-3 px-4">97.10%</td>
                                    <td class="py-3 px-4 text-slate-400">Hộp đen (Last Hidden State)</td>
                                </tr>
                                <tr class="bg-blue-50/60 font-bold text-blue-900">
                                    <td class="py-3 px-4 flex items-center gap-1.5">
                                        <span>⭐</span> <span>3. Multi-Task BiLSTM + Attention (Đề Xuất)</span>
                                    </td>
                                    <td class="py-3 px-4 text-emerald-700">99.38%</td>
                                    <td class="py-3 px-4 text-emerald-700">99.38%</td>
                                    <td class="py-3 px-4 text-emerald-700">98.43%</td>
                                    <td class="py-3 px-4 text-blue-700">Bahdanau Attention Heatmap</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Đánh giá Tỷ lệ Tự Động Hóa (Risk-Coverage Tradeoff) -->
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Đường Cong Rủi Ro & Tỷ Lệ Tự Động Hóa (Risk vs. Coverage Curve)
                    </h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        Hệ thống không cố gắng tự động 100% các yêu cầu một cách mù quáng. Bằng cách thiết lập ngưỡng tin cậy (Confidence Threshold):
                    </p>
                    <ul class="text-xs text-slate-700 space-y-1 list-disc pl-5">
                        <li>Ở mức độ bao phủ <strong>70% yêu cầu</strong> (tự động hóa 7/10 ticket): Độ chính xác đạt <strong>100.0% tuyệt đối</strong> (không có bất kỳ sai sót nào lọt qua).</li>
                        <li>Ở mức độ bao phủ <strong>90% yêu cầu</strong>: Độ chính xác vẫn đạt <strong>99.89%</strong>.</li>
                        <li>10% yêu cầu có độ tin cậy thấp hoặc thuộc nhóm khiếu nại gay gắt được tự động đưa qua Cổng Triage để nhân viên hỗ trợ duyệt bằng tay.</li>
                    </ul>
                </div>

            </div>

        </div>

        <!-- TAB 3: THEORY & DESIGN PRINCIPLES (NGUYÊN TẮC THIẾT KẾ & GIỚI HẠN THỰC TẾ) -->
        <div id="view-theory" class="hidden space-y-6">
            
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
                
                <div>
                    <h2 class="text-lg font-extrabold text-slate-900">3 Nguyên Tắc Thiết Kế Cốt Lõi Của Hệ Thống</h2>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">
                        Thiết kế giúp bài toán thoát ly khỏi hạn chế riêng của Twitter và giải quyết trọn vẹn nhu cầu CSKH thực tế tại Việt Nam.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    <!-- Nguyên tắc 1 -->
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center">1</div>
                        <h3 class="text-sm font-bold text-slate-900">Bộ Nhãn Phổ Quát Theo Nội Dung</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            Không phân loại "hãng nào trả lời" (chỉ có nghĩa trên Twitter). Thay vào đó, mô hình dự đoán 7 loại vấn đề phổ quát (Thanh toán, Vận chuyển, Kỹ thuật, Bảo mật, Chất lượng, Khiếu nại, Hướng dẫn). Mỗi tổ chức chỉ cần một bảng ánh xạ nội bộ mà không cần huấn luyện lại mô hình.
                        </p>
                    </div>

                    <!-- Nguyên tắc 2 -->
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center">2</div>
                        <h3 class="text-sm font-bold text-slate-900">Triệt Tiêu Đường Tắt Twitter</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            Làm sạch triệt để các dấu vết riêng của Twitter: che/bỏ @mention (lộ tên hãng), hashtag, ký tự RT, URL rút gọn. Điều này ngăn chặn mô hình học các tương quan giả tạo, đảm bảo độ chính xác không bị tụt dốc khi tiếp nhận email dài hoặc live chat.
                        </p>
                    </div>

                    <!-- Nguyên tắc 3 -->
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-extrabold text-sm flex items-center justify-center">3</div>
                        <h3 class="text-sm font-bold text-slate-900">Cơ Chế Attention Giải Quyết Độ Dài</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            Email hay ticket thường dài hơn nhiều so với tweet (280 ký tự). Cơ chế Bahdanau Additive Attention gộp chuỗi đa độ dài bằng cách tính trọng số chú ý cho từng token, tập trung chính xác vào câu/đoạn mang nội dung then chốt và bỏ qua các lời chào hỏi xã giao.
                        </p>
                    </div>

                </div>

                <!-- Giới hạn & Khả năng ứng dụng tại Việt Nam -->
                <div class="border-t border-slate-100 pt-5 space-y-3">
                    <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                        Phân Tích Giới Hạn & Lộ Trình Triển Khai Tại Doanh Nghiệp Việt Nam
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
                        <div class="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                            <span class="font-bold text-amber-900 block">⚠️ Giới Hạn Hiện Tại:</span>
                            <p>• Twitter là kênh công khai, thiên về phàn nàn nên phân bố nhãn có thể lệch so với ticket nội bộ.</p>
                            <p>• Mô hình cốt lõi hiện được huấn luyện bằng tập dữ liệu tiếng Anh lớn. Chưa thể kết luận đã giải quyết hoàn toàn nhu cầu Việt Nam nếu chưa có dữ liệu thực nghiệm bản địa.</p>
                        </div>
                        <div class="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                            <span class="font-bold text-blue-900 block">🚀 Lộ Trình Mở Rộng Tiếng Việt:</span>
                            <p>• Thay thế lớp Embedding bằng PhoBERT hoặc multilingual embedding (mBERT / XLM-R).</p>
                            <p>• Giữ nguyên toàn bộ cấu trúc định tuyến Universal Categories và cơ chế Triage Gate.</p>
                            <p>• Thu thập phản hồi (human-in-the-loop feedback) khi nhân viên chỉnh sửa nhãn để định kỳ fine-tune lại mô hình.</p>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </main>

    <!-- 3. FOOTER -->
    <footer class="bg-white border-t border-slate-200 py-4 mt-8">
        <div class="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
            Ứng dụng Mạng Nơ-ron BiLSTM kết hợp Cơ chế Attention trong Tự động Phân loại & Định tuyến Yêu cầu CSKH • Đề tài Nghiên cứu Chuyên sâu
        </div>
    </footer>

    <!-- JAVASCRIPT LOGIC -->
    <script>
        const QUICK_SAMPLES = [
            {
                name: '💳 Hoàn tiền sai thẻ',
                sub: 'Trừ sai cước tín dụng',
                channel: 'email',
                text: "Dear support team, I noticed an unauthorized charge of 99 dollars on my credit card invoice yesterday for a subscription fee that I explicitly cancelled last month. Please process a full refund to my card immediately."
            },
            {
                name: '🚚 Giao hàng trễ 5 ngày',
                sub: 'Bưu kiện thất lạc',
                channel: 'email',
                text: "Hello, my shipment delivery order number 4890 has been delayed for five days. The courier tracking status is not updating and the driver did not show up. I urgently need this package delivered before my flight."
            },
            {
                name: '🛠️ Sập ứng dụng liên tục',
                sub: 'Đơ màn hình, lỗi phần mềm',
                channel: 'livechat',
                text: "Good afternoon, our enterprise team is facing a severe software application crash after installing the new system update. The screen freezes on the main dashboard and disconnects active network sessions."
            },
            {
                name: '🔐 Tài khoản bị khóa',
                sub: 'Không nhận được mã OTP 2FA',
                channel: 'web',
                text: "I cannot log in to my account. It says password incorrect and I am not receiving the two-factor authentication OTP code on my phone. Please help unlock my profile."
            },
            {
                name: '🚨 Khiếu nại đe dọa kiện',
                sub: 'Yêu cầu gặp quản lý cấp cao',
                channel: 'email',
                text: "This is the worst customer service experience I have ever had! Your manager hung up on me and refused to take responsibility. I will report this scam to the police and hire a lawyer for lawsuit if you don't resolve this today!"
            },
            {
                name: 'ℹ️ Hỏi chính sách đổi trả',
                sub: 'Thắc mắc giờ làm việc',
                channel: 'web',
                text: "Hi there, can you please tell me what the return policy is for items purchased during the promotion, and where can I find your nearest store working hours?"
            }
        ];

        let currentChannel = 'email';
        let currentApiData = null;

        function initQuickSamples() {
            const container = document.getElementById('sampleButtonsContainer');
            container.innerHTML = '';

            QUICK_SAMPLES.forEach((sample, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer group';
                btn.onclick = () => selectQuickSample(idx);
                btn.innerHTML = `
                    <div class="text-xs font-bold text-slate-800 group-hover:text-blue-700 flex items-center justify-between">
                        <span>${sample.name}</span>
                        <span class="text-[10px] text-slate-400 group-hover:text-blue-500">➔</span>
                    </div>
                    <div class="text-[10px] text-slate-500 truncate mt-0.5">${sample.sub}</div>
                `;
                container.appendChild(btn);
            });
        }

        function selectQuickSample(idx) {
            const sample = QUICK_SAMPLES[idx];
            document.getElementById('inputText').value = sample.text;
            setChannel(sample.channel);
            runTicketAnalysis();
        }

        function setChannel(ch) {
            currentChannel = ch;
            ['email', 'livechat', 'web'].forEach(c => {
                const b = document.getElementById('btn-chan-' + c);
                if (c === ch) {
                    b.className = 'channel-btn py-2 px-3 text-xs font-bold rounded-xl border border-blue-600 bg-blue-50 text-blue-700 flex items-center justify-center gap-1.5 transition';
                } else {
                    b.className = 'channel-btn py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition';
                }
            });
        }

        function clearInputText() {
            document.getElementById('inputText').value = '';
            document.getElementById('inputText').focus();
        }

        function onThresholdChange(val) {
            document.getElementById('thresholdValDisplay').innerText = val + '%';
            if (currentApiData) {
                runTicketAnalysis();
            }
        }

        async function runTicketAnalysis() {
            const text = document.getElementById('inputText').value.trim();
            if (!text) {
                alert('Vui lòng nhập hoặc chọn một nội dung tin nhắn để phân loại.');
                return;
            }

            const industry = document.getElementById('industrySelect').value;
            const threshold = parseFloat(document.getElementById('thresholdRange').value) / 100.0;
            const btn = document.getElementById('analyzeBtn');

            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> <span>Đang phân tích mô hình BiLSTM...</span>';

            try {
                const res = await fetch('/api/route', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        text: text,
                        industry: industry,
                        confidence_threshold: threshold,
                        channel: currentChannel
                    })
                });

                const data = await res.json();
                currentApiData = data;
                renderResults(data, text);

            } catch (err) {
                console.error('Error during inference:', err);
                alert('Có lỗi xảy ra khi gọi mô hình dự đoán.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>⚡</span> <span>PHÂN LOẠI & ĐỊNH TUYẾN NGAY</span>';
            }
        }

        function renderResults(data, originalText) {
            // 1. Universal Category
            document.getElementById('resCatIcon').innerText = data.category.icon;
            document.getElementById('resCatName').innerText = data.category.name_vi;
            document.getElementById('resCatDesc').innerText = data.category.description;
            document.getElementById('resCatConf').innerText = data.category.confidence_str;

            // 2. Priority & SLA
            document.getElementById('resPrioBadge').innerText = data.priority.badge;
            document.getElementById('resPrioName').innerText = data.priority.name_vi;
            document.getElementById('resPrioConf').innerText = `Độ tin cậy: ${data.priority.confidence_str}`;
            document.getElementById('resPrioSla').innerText = `SLA: ${data.priority.sla}`;

            // 3. Routing Target Queue
            document.getElementById('resQueueName').innerText = data.routing.target_queue;
            document.getElementById('resQueueDesc').innerText = `Ánh xạ theo tổ chức: ${data.routing.industry}`;

            // 4. Safety Triage Gate
            const triageCard = document.getElementById('resTriageCard');
            const triageIcon = document.getElementById('resTriageIcon');
            const triageTitle = document.getElementById('resTriageTitle');
            const triageDetail = document.getElementById('resTriageDetail');

            if (data.triage.human_review_required) {
                triageCard.className = 'bg-white rounded-2xl p-4.5 border border-rose-200 bg-rose-50/50 shadow-2xs space-y-2';
                triageIcon.innerText = '⚠️';
                triageTitle.className = 'text-sm sm:text-base font-extrabold text-rose-950';
                triageTitle.innerText = 'CHUYỂN NGƯỜI DUYỆT';
                triageDetail.className = 'text-[11px] text-rose-800 leading-relaxed';
                triageDetail.innerHTML = data.triage.reasons.map(r => `• ${r}`).join('<br>');
            } else {
                triageCard.className = 'bg-white rounded-2xl p-4.5 border border-emerald-200 bg-emerald-50/50 shadow-2xs space-y-2';
                triageIcon.innerText = '✅';
                triageTitle.className = 'text-sm sm:text-base font-extrabold text-emerald-950';
                triageTitle.innerText = 'TỰ ĐỘNG ĐỊNH TUYẾN';
                triageDetail.className = 'text-[11px] text-emerald-800 leading-relaxed';
                triageDetail.innerText = 'Đạt chuẩn an toàn tự động hóa. Đã chuyển thẳng đến hàng đợi chuyên môn.';
            }

            // Attention Heatmap & Top Chips
            renderAttentionDetails(originalText, data.token_attentions);

            // 100% Vietnamese Probabilities
            renderFullProbabilities(data.category.all_probabilities, data.category.id);

            // Suggested Reply
            document.getElementById('suggestedReplyContent').innerText = data.category.suggested_reply;
        }

        function renderAttentionDetails(text, tokens) {
            const textBox = document.getElementById('attentionTextBox');
            const chipsBox = document.getElementById('topAttentionChips');
            const showHighlight = document.getElementById('attentionHighlightToggle').checked;

            if (!tokens || tokens.length === 0) {
                textBox.innerText = text;
                chipsBox.innerHTML = '';
                return;
            }

            // Top Attention Tokens (Chips)
            const sortedTokens = [...tokens].sort((a, b) => b.weight - a.weight);
            const top5 = sortedTokens.slice(0, 5).filter(t => t.weight > 0.05);

            chipsBox.innerHTML = '<span class="text-[11px] font-bold text-slate-500 mr-1">Từ khóa chú ý hàng đầu:</span>';
            top5.forEach(t => {
                const chip = document.createElement('span');
                chip.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300';
                chip.innerHTML = `<span>${t.token}</span> <span class="text-[10px] text-amber-700 font-mono font-normal">(${(t.weight * 100).toFixed(1)}%)</span>`;
                chipsBox.appendChild(chip);
            });

            // Render text with highlight
            if (!showHighlight) {
                textBox.innerText = text;
                return;
            }

            textBox.innerHTML = '';
            const maxW = Math.max(...tokens.map(t => t.weight), 0.0001);

            tokens.forEach(item => {
                const norm = item.weight / maxW;
                const span = document.createElement('span');

                if (norm > 0.18) {
                    span.className = 'attn-highlighter';
                    span.title = `Trọng số chú ý BiLSTM: ${(item.weight * 100).toFixed(2)}%`;
                } else {
                    span.className = 'attn-normal';
                }

                span.innerText = item.token + ' ';
                textBox.appendChild(span);
            });
        }

        function onToggleHighlight() {
            if (currentApiData) {
                const text = document.getElementById('inputText').value;
                renderAttentionDetails(text, currentApiData.token_attentions);
            }
        }

        function renderFullProbabilities(probs, selectedId) {
            const container = document.getElementById('fullProbDistribution');
            container.innerHTML = '';

            // Sắp xếp giảm dần theo xác suất
            const sorted = [...probs].sort((a, b) => b.probability - a.probability);

            sorted.forEach(cat => {
                const isTop = cat.id === selectedId;
                const row = document.createElement('div');
                row.className = 'space-y-1';
                row.innerHTML = `
                    <div class="flex items-center justify-between text-xs">
                        <span class="flex items-center gap-1.5 ${isTop ? 'font-extrabold text-blue-700' : 'text-slate-600'}">
                            <span>${cat.icon}</span> <span>${cat.name_vi}</span>
                        </span>
                        <span class="${isTop ? 'font-mono font-black text-blue-700' : 'font-mono text-slate-400'}">${cat.percent_str}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div class="${isTop ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-slate-300'} h-2 rounded-full transition-all duration-300" style="width: ${Math.max(cat.probability * 100, 1)}%"></div>
                    </div>
                `;
                container.appendChild(row);
            });
        }

        function copySuggestedReply() {
            if (currentApiData) {
                navigator.clipboard.writeText(currentApiData.category.suggested_reply).then(() => {
                    alert('Đã sao chép phản hồi mẫu vào bộ nhớ tạm!');
                });
            }
        }

        function switchTab(tabId) {
            ['workbench', 'benchmark', 'theory'].forEach(t => {
                const view = document.getElementById('view-' + t);
                const btn = document.getElementById('tab-btn-' + t);
                if (t === tabId) {
                    view.classList.remove('hidden');
                    btn.classList.add('active');
                } else {
                    view.classList.add('hidden');
                    btn.classList.remove('active');
                }
            });
        }

        window.addEventListener('DOMContentLoaded', () => {
            initQuickSamples();
            selectQuickSample(0);
        });
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

if __name__ == '__main__':
    print("\n" + "="*65)
    print("🚀 AutoDesk Enterprise Universal Routing Web App is running!")
    print("👉 Mở trình duyệt và truy cập: http://localhost:8000")
    print("👉 Hoặc truy cập: http://127.0.0.1:8000")
    print("="*65 + "\n")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
