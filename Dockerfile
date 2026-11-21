FROM python:3.11-slim

WORKDIR /app

# Cài đặt thư viện hệ thống
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt PyTorch bản CPU (siêu nhẹ, tối ưu RAM) và các thư viện cần thiết
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn ứng dụng
COPY . .

# Hugging Face Spaces yêu cầu ứng dụng lắng nghe tại cổng 7860
ENV HOST=0.0.0.0
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
