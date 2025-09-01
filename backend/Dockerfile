# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ddddocr 需要的系统依赖（OpenCV）
RUN apt-get update && \
    apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装依赖（利用缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再拷代码（包含 app/、services/、main.py 等）
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]