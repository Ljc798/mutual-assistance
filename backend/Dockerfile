FROM python:3.11-slim

WORKDIR /app

# 可选系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

# 以 context=./backend 为根，所以直接 COPY 文件名
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝 backend 目录下的所有代码
COPY . .

ENV PORT=8000 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]