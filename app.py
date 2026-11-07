import os
import sys
import json
from datetime import datetime
from typing import Optional, List

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from predict_universal import UniversalRouter, CATEGORY_INFO, PRIORITY_INFO, INDUSTRY_QUEUE_MAPPINGS

app = FastAPI(title="AutoDesk Support API", version="2.0.0")

# Enable CORS for Vite dev server (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = None

def get_router():
    global router
    if router is None:
        model_path = 'models/best_universal_bilstm_attention.pt'
        if not os.path.exists(model_path):
            model_path = 'models/best_bilstm_attention.pt'
        router = UniversalRouter(model_path=model_path, data_dir='data')
    return router

FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), 'data', 'feedback.jsonl')

class TicketRequest(BaseModel):
    text: str
    industry: str = 'ecommerce'
    confidence_threshold: float = 0.60
    channel: str = 'email'

class FeedbackRequest(BaseModel):
    ticket_id: str
    original_category: str
    corrected_category: str
    original_priority: str
    corrected_priority: str
    agent_comment: Optional[str] = ''

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

@app.post("/api/feedback")
async def api_save_feedback(req: FeedbackRequest):
    os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
    record = {
        "ticket_id": req.ticket_id,
        "original_category": req.original_category,
        "corrected_category": req.corrected_category,
        "original_priority": req.original_priority,
        "corrected_priority": req.corrected_priority,
        "agent_comment": req.agent_comment,
        "timestamp": datetime.now().isoformat()
    }
    with open(FEEDBACK_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(record, ensure_ascii=False) + '\n')
    return JSONResponse({"status": "success", "message": "Feedback saved successfully", "record": record})

@app.get("/api/feedback")
async def api_get_feedback():
    if not os.path.exists(FEEDBACK_FILE):
        return JSONResponse({"feedback": []})
    records = []
    with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except Exception:
                    pass
    return JSONResponse({"feedback": records[::-1]})

@app.get("/api/benchmark")
async def api_get_benchmark():
    benchmark_file = os.path.join(os.path.dirname(__file__), 'reports', 'universal_benchmark_results.json')
    if os.path.exists(benchmark_file):
        with open(benchmark_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return JSONResponse(data)
    return JSONResponse({"error": "Benchmark data not found"})

@app.get("/api/stats")
async def api_get_stats():
    return JSONResponse({
        "total_tickets_today": 25,
        "auto_routed_pct": 72.0,
        "needs_review_pct": 28.0,
        "avg_sla_hours": 2.4,
        "model_accuracy": 99.38
    })

# Serve built React frontend if dist exists
dist_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by FastAPI
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == '__main__':
    print("\n" + "="*65)
    print("🚀 AutoDesk Enterprise CSKH Helpdesk API & Frontend")
    print("👉 Mở trình duyệt và truy cập: http://localhost:8000")
    print("👉 Hoặc truy cập: http://127.0.0.1:8000")
    print("="*65 + "\n")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
