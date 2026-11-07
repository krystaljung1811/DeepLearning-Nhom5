import os
import sys
import json
import sqlite3
import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from predict_universal import UniversalRouter, CATEGORY_INFO, PRIORITY_INFO, INDUSTRY_QUEUE_MAPPINGS

app = FastAPI(title="AutoDesk Support API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, 'helpdesk.db')
FEEDBACK_FILE = os.path.join(DATA_DIR, 'feedback.jsonl')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        email TEXT,
        channel TEXT,
        subject TEXT,
        body TEXT,
        status TEXT,
        created_at TEXT,
        prediction TEXT,
        trace TEXT,
        final_category TEXT,
        final_priority TEXT,
        final_queue TEXT,
        reviewed_by_human INTEGER DEFAULT 0,
        agent_comment TEXT DEFAULT ''
    );
    """)
    conn.commit()
    conn.close()

init_db()

router = None

def get_router():
    global router
    if router is None:
        model_path = 'models/best_universal_bilstm_attention.pt'
        if not os.path.exists(model_path):
            model_path = 'models/best_bilstm_attention.pt'
        router = UniversalRouter(model_path=model_path, data_dir='data')
    return router

def generate_ticket_id():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM tickets")
    count = cursor.fetchone()[0]
    conn.close()
    return f"TK-{1001 + count}"

class CreateTicketRequest(BaseModel):
    customer_name: str
    email: str
    channel: str = 'email'
    subject: str
    body: str
    industry: str = 'ecommerce'
    confidence_threshold: float = 0.60

class PatchTicketRequest(BaseModel):
    final_category: Optional[str] = None
    final_priority: Optional[str] = None
    final_queue: Optional[str] = None
    status: Optional[str] = None
    agent_comment: Optional[str] = None

@app.post("/api/tickets")
async def api_create_ticket(req: CreateTicketRequest):
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Nội dung yêu cầu không được để trống")
    
    r = get_router()
    route_res = r.route_ticket(
        raw_text=req.body,
        confidence_threshold=req.confidence_threshold,
        selected_industry=req.industry
    )
    route_res['channel'] = req.channel

    ticket_id = generate_ticket_id()
    created_at = datetime.now().isoformat()
    status = 'needs_review' if route_res['triage']['human_review_required'] else 'auto_routed'
    final_category = route_res['category']['id']
    final_priority = route_res['priority']['id']
    final_queue = route_res['routing']['target_queue']
    
    trace = route_res.get('trace', {})

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tickets (
            id, customer_name, email, channel, subject, body, status, created_at,
            prediction, trace, final_category, final_priority, final_queue, reviewed_by_human, agent_comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')
    """, (
        ticket_id, req.customer_name, req.email, req.channel, req.subject, req.body, status, created_at,
        json.dumps(route_res, ensure_ascii=False),
        json.dumps(trace, ensure_ascii=False),
        final_category, final_priority, final_queue
    ))
    conn.commit()
    conn.close()

    return JSONResponse({
        'id': ticket_id,
        'customer_name': req.customer_name,
        'email': req.email,
        'channel': req.channel,
        'subject': req.subject,
        'body': req.body,
        'status': status,
        'created_at': created_at,
        'prediction': route_res,
        'trace': trace,
        'final_category': final_category,
        'final_priority': final_priority,
        'final_queue': final_queue,
        'reviewed_by_human': 0
    })

@app.get("/api/tickets")
async def api_get_tickets(status: str = 'all', search: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM tickets WHERE 1=1"
    params = []
    
    if status == 'needs_review':
        query += " AND status = 'needs_review'"
    elif status == 'auto_routed':
        query += " AND status = 'auto_routed'"
    elif status == 'resolved':
        query += " AND status = 'resolved'"
        
    if search:
        query += " AND (subject LIKE ? OR body LIKE ? OR customer_name LIKE ? OR id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])
        
    query += " ORDER BY rowid DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        t = dict(row)
        t['prediction'] = json.loads(t['prediction']) if t['prediction'] else None
        t['trace'] = json.loads(t['trace']) if t['trace'] else None
        result.append(t)

    return JSONResponse({'tickets': result})

@app.get("/api/tickets/{ticket_id}")
async def api_get_ticket_detail(ticket_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy ticket")
    t = dict(row)
    t['prediction'] = json.loads(t['prediction']) if t['prediction'] else None
    t['trace'] = json.loads(t['trace']) if t['trace'] else None
    return JSONResponse(t)

@app.patch("/api/tickets/{ticket_id}")
async def api_patch_ticket(ticket_id: str, req: PatchTicketRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy ticket")
        
    old_data = dict(row)
    pred = json.loads(old_data['prediction']) if old_data['prediction'] else {}
    
    new_cat = req.final_category if req.final_category is not None else old_data['final_category']
    new_prio = req.final_priority if req.final_priority is not None else old_data['final_priority']
    new_queue = req.final_queue if req.final_queue is not None else old_data['final_queue']
    new_status = req.status if req.status is not None else old_data['status']
    new_comment = req.agent_comment if req.agent_comment is not None else old_data['agent_comment']
    
    cursor.execute("""
        UPDATE tickets SET
            final_category = ?,
            final_priority = ?,
            final_queue = ?,
            status = ?,
            reviewed_by_human = 1,
            agent_comment = ?
        WHERE id = ?
    """, (new_cat, new_prio, new_queue, new_status, new_comment, ticket_id))
    conn.commit()
    conn.close()

    # Append to feedback.jsonl (Active Learning log)
    feedback_entry = {
        'ticket_id': ticket_id,
        'text': old_data['body'],
        'predicted_category': pred.get('category', {}).get('id', old_data['final_category']),
        'corrected_category': new_cat,
        'predicted_priority': pred.get('priority', {}).get('id', old_data['final_priority']),
        'corrected_priority': new_prio,
        'agent_comment': new_comment,
        'timestamp': datetime.now().isoformat()
    }
    with open(FEEDBACK_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(feedback_entry, ensure_ascii=False) + '\n')

    return JSONResponse({
        'status': 'success',
        'message': 'Đã cập nhật ticket và ghi nhận phản hồi Active Learning',
        'ticket_id': ticket_id
    })

@app.post("/api/tickets/import")
async def api_import_tickets(
    file: UploadFile = File(...),
    industry: str = Form('ecommerce'),
    confidence_threshold: float = Form(0.60)
):
    content = await file.read()
    try:
        text_stream = io.StringIO(content.decode('utf-8'))
    except UnicodeDecodeError:
        text_stream = io.StringIO(content.decode('latin-1'))
        
    reader = csv.DictReader(text_stream)
    r = get_router()
    
    imported_tickets = []
    labeled_count = 0
    correct_count = 0
    all_categories = list(CATEGORY_INFO.keys())
    confusion_matrix = {c: {c2: 0 for c2 in all_categories} for c in all_categories}

    conn = get_db()
    cursor = conn.cursor()

    for idx, row in enumerate(reader):
        text = row.get('text') or row.get('body') or row.get('content') or ''
        if not text.strip():
            continue
            
        subj = row.get('subject') or (text[:45] + '...' if len(text) > 45 else text)
        name = row.get('customer_name') or row.get('name') or f"Khách hàng #{idx+1}"
        email = row.get('email') or f"user{idx+1}@example.com"
        channel = row.get('channel') or 'email'
        ground_truth = row.get('label') or row.get('category') or None

        route_res = r.route_ticket(
            raw_text=text,
            confidence_threshold=confidence_threshold,
            selected_industry=industry
        )
        route_res['channel'] = channel

        ticket_id = f"TK-{2001 + idx}"
        created_at = datetime.now().isoformat()
        status = 'needs_review' if route_res['triage']['human_review_required'] else 'auto_routed'
        pred_cat = route_res['category']['id']
        pred_prio = route_res['priority']['id']
        target_queue = route_res['routing']['target_queue']
        trace = route_res.get('trace', {})

        cursor.execute("""
            INSERT OR REPLACE INTO tickets (
                id, customer_name, email, channel, subject, body, status, created_at,
                prediction, trace, final_category, final_priority, final_queue, reviewed_by_human, agent_comment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')
        """, (
            ticket_id, name, email, channel, subj, text, status, created_at,
            json.dumps(route_res, ensure_ascii=False),
            json.dumps(trace, ensure_ascii=False),
            pred_cat, pred_prio, target_queue
        ))

        imported_tickets.append({
            'id': ticket_id,
            'subject': subj,
            'predicted_category': pred_cat,
            'ground_truth': ground_truth,
            'confidence': route_res['category']['confidence_str'],
            'status': status
        })

        if ground_truth and ground_truth in all_categories:
            labeled_count += 1
            if ground_truth == pred_cat:
                correct_count += 1
            if pred_cat in confusion_matrix[ground_truth]:
                confusion_matrix[ground_truth][pred_cat] += 1

    conn.commit()
    conn.close()

    eval_result = None
    if labeled_count > 0:
        accuracy = round(correct_count / labeled_count * 100, 2)
        eval_result = {
            'total_labeled': labeled_count,
            'correct_count': correct_count,
            'accuracy': accuracy,
            'confusion_matrix': confusion_matrix,
            'labels': all_categories
        }

    return JSONResponse({
        'imported_count': len(imported_tickets),
        'tickets': imported_tickets[:15],
        'evaluation': eval_result
    })

@app.delete("/api/tickets")
async def api_reset_tickets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tickets")
    conn.commit()
    conn.close()
    return JSONResponse({"status": "success", "message": "Đã làm trống toàn bộ hộp thư demo"})

@app.get("/api/stats")
async def api_get_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM tickets")
    total = cursor.fetchone()[0]
    
    if total == 0:
        conn.close()
        return JSONResponse({
            "total_tickets": 0,
            "auto_routed_count": 0,
            "needs_review_count": 0,
            "reviewed_by_human_count": 0,
            "auto_routed_pct": 0,
            "needs_review_pct": 0,
            "by_queue": [],
            "by_priority": [],
            "by_category": [],
            "avg_inference_ms": 0
        })

    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'auto_routed'")
    auto_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'needs_review'")
    review_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE reviewed_by_human = 1")
    human_corrected = cursor.fetchone()[0]

    cursor.execute("SELECT final_queue, COUNT(*) as c FROM tickets GROUP BY final_queue ORDER BY c DESC")
    by_queue = [{'name': r['final_queue'].replace('Phòng ', '').replace('Bộ phận ', ''), 'count': r['c']} for r in cursor.fetchall()]

    cursor.execute("SELECT final_priority, COUNT(*) as c FROM tickets GROUP BY final_priority")
    prio_map = {'urgent': 'P1 - Khẩn cấp', 'high': 'P2 - Cao', 'medium': 'P3 - Trung bình', 'low': 'P4 - Thấp'}
    by_prio = [{'name': prio_map.get(r['final_priority'], r['final_priority']), 'count': r['c']} for r in cursor.fetchall()]

    cursor.execute("SELECT final_category, COUNT(*) as c FROM tickets GROUP BY final_category")
    by_cat = [{'name': CATEGORY_INFO.get(r['final_category'], {}).get('name_vi', r['final_category']), 'count': r['c']} for r in cursor.fetchall()]

    cursor.execute("SELECT trace FROM tickets")
    traces = cursor.fetchall()
    times = []
    for tr in traces:
        if tr[0]:
            try:
                data = json.loads(tr[0])
                if 'inference_ms' in data:
                    times.append(data['inference_ms'])
            except Exception:
                pass
    avg_ms = round(sum(times) / max(len(times), 1), 1)

    conn.close()

    return JSONResponse({
        "total_tickets": total,
        "auto_routed_count": auto_count,
        "needs_review_count": review_count,
        "reviewed_by_human_count": human_corrected,
        "auto_routed_pct": round((auto_count / total) * 100, 1),
        "needs_review_pct": round((review_count / total) * 100, 1),
        "by_queue": by_queue,
        "by_priority": by_prio,
        "by_category": by_cat,
        "avg_inference_ms": avg_ms
    })

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

# Serve static build
dist_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == '__main__':
    print("\n" + "="*65)
    print("🚀 AutoDesk Enterprise CSKH Helpdesk API & Pipeline")
    print("👉 Mở trình duyệt và truy cập: http://localhost:8000")
    print("👉 Hoặc truy cập: http://127.0.0.1:8000")
    print("="*65 + "\n")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
